/**
 * BudgetArk - Connections Manager
 * File: src/components/ConnectionsModal.tsx
 *
 * Modal-as-sub-screen (ManageCategoriesModal pattern) listing the user's
 * bank connections with a per-connection detail view: mapped accounts, last
 * sync, sync-now, and remove-with-confirm. The Add Connection wizard itself
 * is rendered by ProfileScreen; this modal only signals `onAddConnection`.
 *
 * Each linked account is editable here - import on/off, whose card it is,
 * and where its balance lands (including creating a new Bridge account).
 * The wizard asks these once at setup; without this editor a "None" chosen
 * on day one was permanent, which blocked e.g. designating that savings
 * account as the emergency fund later.
 *
 * Manual syncs report back inline (cooldown, rate limit, reconnect needed)
 * instead of spinning and showing nothing, each account row says how old
 * the BANK's data is (the bridge's balance-date, not our last fetch), and a
 * SimpleFIN connection the bridge stopped accepting can be reconnected in
 * place with a new setup token - links and history stay.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import {
  type AssetAccount,
  type AssetAccountCategory,
  type BankConnection,
  type Debt,
  type ExternalAccountLink,
} from "../types";
import { describeError } from "../utils/errorMessage";
import { formatBankBalance } from "../utils/money";
import TagPillPicker from "./TagPillPicker";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";
import { useConnections } from "../connections/ConnectionsProvider";
import {
  getLinksForConnection,
  updateLink,
} from "../storage/externalAccountLinksStorage";
import { usePeople } from "../people/PeopleProvider";
import {
  addAssetAccount,
  getAssetAccounts,
} from "../storage/assetAccountStorage";
import { getDebts } from "../storage/debtStorage";
import {
  MAPPABLE_ASSET_CATEGORIES,
  reconnectSimplefin,
  removeConnection,
  updateLinkPreferences,
} from "../services/connections/connectionsService";
import type { ConnectionSyncResult } from "../services/connections/connectionsSyncService";
import {
  STALE_BANK_DATA_DAYS,
  bankDataAge,
} from "../services/connections/bankDataAge";
import { MAX_GAP_BACKFILL_DAYS } from "../services/connections/syncGate";
import type { LinkPreferenceChange } from "../services/connections/linkPreferences";
import { suggestAssetCategory } from "../services/connections/assetCategoryHint";
import { generateUUID } from "../utils/uuid";
import { useValueChanged } from "../hooks/useValueChanged";
import type { TFunction } from "i18next";

interface ConnectionsModalProps {
  visible: boolean;
  onClose: () => void;
  onAddConnection: () => void;
  /** Add another bank to an existing Teller connection (reuses its setup). */
  onAddBank: (connectionId: string) => void;
  /**
   * Finish an interrupted SimpleFIN setup (token claimed, but account mapping
   * never ran). Re-opens the wizard at the account listing step.
   */
  onFinishSetup: (connectionId: string) => void;
  /**
   * Check a working SimpleFIN connection for accounts added on the bridge
   * after setup. Opens the wizard's rediscover step to map only the new ones.
   */
  onRediscover: (connectionId: string) => void;
  /**
   * The add-connection wizard, rendered INSIDE this Modal's tree as an
   * overlay rather than presented as a second native Modal beside it -
   * stacking two native modals is what froze the app on the wizard's Done
   * screen (see AddConnectionModal's header). Rendered last, above the
   * list and Close button.
   */
  overlay?: React.ReactNode;
  /**
   * While the overlay is showing, the hardware back button (this Modal's
   * onRequestClose - a native dialog swallows the key before BackHandler
   * sees it) goes here instead of closing the manager.
   */
  onOverlayRequestClose?: () => void;
}

const PROVIDER_GLYPHS: Record<string, string> = {
  simplefin: "🏦",
  teller: "🔗",
};

const timeAgo = (t: TFunction, iso?: string): string => {
  if (!iso) return t("modals.connections.timeAgo.never");
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return t("modals.connections.timeAgo.justNow");
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return t("modals.connections.timeAgo.justNow");
  if (minutes < 60) return t("modals.connections.timeAgo.minutes", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("modals.connections.timeAgo.hours", { count: hours });
  const days = Math.floor(hours / 24);
  return t("modals.connections.timeAgo.days", { count: days });
};

/** "Jun 25" in the app language for a bank balance-date, or null. */
const formatBankDate = (iso: string | undefined, locale: string): string | null => {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  try {
    return parsed.toLocaleDateString(locale, { month: "short", day: "numeric" });
  } catch {
    return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
};

/** "3:45 PM" in the app language for the cooldown's next-allowed time, or null. */
const formatSyncTime = (iso: string | undefined, locale: string): string | null => {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  try {
    return parsed.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  } catch {
    return parsed.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
};

/** Inline result of a manual sync, shown under the button that was tapped. */
interface SyncNotice {
  text: string;
  tone: "ok" | "warn";
  /** Which button it belongs under: list "Sync all" or the detail's "Sync now". */
  where: "all" | "detail";
}

/** One result -> its notice ("disabled" says nothing: the user paused it). */
const noticeForResult = (
  t: TFunction,
  locale: string,
  result: ConnectionSyncResult,
): Omit<SyncNotice, "where"> | null => {
  switch (result.outcome) {
    case "updated":
      return (result.providerWarnings?.length ?? 0) > 0
        ? { text: t("modals.connections.syncNotice.updatedWithWarnings"), tone: "warn" }
        : { text: t("modals.connections.syncNotice.updated"), tone: "ok" };
    case "fresh": {
      const time = formatSyncTime(result.nextSyncAt, locale);
      return {
        text: time
          ? t("modals.connections.syncNotice.fresh", { time })
          : t("modals.connections.syncNotice.freshSoon"),
        tone: "warn",
      };
    }
    case "rate-limited":
      return { text: t("modals.connections.syncNotice.rateLimited"), tone: "warn" };
    case "needs-reauth":
      return { text: t("modals.connections.syncNotice.needsReauth"), tone: "warn" };
    case "unavailable":
      return {
        text: result.errorMessage ?? t("modals.connections.syncNotice.failed"),
        tone: "warn",
      };
    case "disabled":
    default:
      return null;
  }
};

/**
 * Summarise a "Sync all" (or single) pass: all blocked by the cooldown ->
 * the cooldown notice (earliest retry time); any updated -> synced (with the
 * bridge caveat if one still reports a bank); otherwise the first problem.
 */
const summariseSyncResults = (
  t: TFunction,
  locale: string,
  results: readonly ConnectionSyncResult[],
): Omit<SyncNotice, "where"> | null => {
  const active = results.filter((r) => r.outcome !== "disabled");
  if (active.length === 0) return null;
  if (active.every((r) => r.outcome === "fresh")) {
    const earliest = active
      .map((r) => r.nextSyncAt)
      .filter((iso): iso is string => !!iso && Number.isFinite(Date.parse(iso)))
      .sort((a, b) => Date.parse(a) - Date.parse(b))[0];
    return noticeForResult(t, locale, { ...active[0], nextSyncAt: earliest });
  }
  const updated = active.filter((r) => r.outcome === "updated");
  if (updated.length > 0) {
    const withWarnings = updated.find((r) => (r.providerWarnings?.length ?? 0) > 0);
    return noticeForResult(t, locale, withWarnings ?? updated[0]);
  }
  const problem = active.find((r) => r.outcome !== "fresh" && r.outcome !== "updated");
  return problem ? noticeForResult(t, locale, problem) : null;
};

const ConnectionsModal: React.FC<ConnectionsModalProps> = ({
  visible,
  onClose,
  onAddConnection,
  onAddBank,
  onFinishSetup,
  onRediscover,
  overlay,
  onOverlayRequestClose,
}) => {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { connections, isSyncing, refresh, syncNow } = useConnections();

  /** Last manual sync's inline result (null = nothing to say). */
  const [syncNotice, setSyncNotice] = useState<SyncNotice | null>(null);
  // SimpleFIN reconnect form (detail view, re-auth state only).
  const [reconnectToken, setReconnectToken] = useState("");
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectError, setReconnectError] = useState<string | null>(null);
  /**
   * "Now" for the bank-data age on account rows. Captured when the links
   * load (each detail open and after every sync), never read during render.
   */
  const [nowMs, setNowMs] = useState(() => Date.now());

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [links, setLinks] = useState<ExternalAccountLink[]>([]);
  /** Distinguishes "no links" from "links not fetched yet" in the detail view. */
  const [linksLoaded, setLinksLoaded] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  /** Live people, for the per-account "whose card is this" picker. */
  const { people } = usePeople();
  /** Live Bridge accounts, for the per-account "balance updates" picker. */
  const [assetAccounts, setAssetAccounts] = useState<AssetAccount[]>([]);
  /**
   * Live debts: credit cards feed the "Cards on Debts" picker, and every
   * debt resolves a link's card name in its row subtext.
   */
  const [debts, setDebts] = useState<Debt[]>([]);
  const cardDebts = useMemo(
    () => debts.filter((d) => !d.deletedAt && d.debtClass === "personal_credit"),
    [debts],
  );
  /** Link whose preference write is in flight (guards double taps). */
  const [savingLinkId, setSavingLinkId] = useState<string | null>(null);
  // Inline "+ New account" mini-form state (one at a time, per link).
  const [newAccountFor, setNewAccountFor] = useState<string | null>(null);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountCategory, setNewAccountCategory] =
    useState<AssetAccountCategory>("checking");

  // Every Bridge account can take the balance, 401k/brokerage included (the
  // synced balance shows as their Cash line) - see MAPPABLE_ASSET_CATEGORIES.
  const mappableAccounts = assetAccounts;

  const selected: BankConnection | undefined = connections.find(
    (c) => c.id === selectedId,
  );

  /** Last failed link load/edit for the selected connection. */
  const [linkError, setLinkError] = useState<string | null>(null);

  // Structural stale-links guard: whenever the selected connection changes -
  // no matter which code path changed it - drop the previous connection's
  // account list before the fetch effect below repopulates it. Render-time
  // adjustment (see useValueChanged), not a per-call-site convention.
  if (useValueChanged(selectedId)) {
    setLinks([]);
    setLinksLoaded(false);
    setLinkError(null);
    // Switching list <-> detail (or between connections) drops the last
    // sync's notice and any half-typed reconnect token.
    setSyncNotice(null);
    setReconnectToken("");
    setReconnectError(null);
  }

  // Closed (by us or the parent): the next open starts without a stale notice.
  if (useValueChanged(visible)) {
    if (!visible) setSyncNotice(null);
  }

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    void getLinksForConnection(selectedId)
      .then((result) => {
        if (!cancelled) {
          setLinks(result);
          setLinksLoaded(true);
          setNowMs(Date.now());
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLinksLoaded(true);
        setLinkError(describeError(error, t("modals.connections.detail.errors.loadAccounts")));
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, isSyncing, t]);

  useEffect(() => {
    if (visible) void refresh();
  }, [visible, refresh]);

  // Bridge accounts load per open (edits made elsewhere between opens must
  // show in the picker); people come from PeopleProvider.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    // Picker sources: a failed read leaves the previous list in place (the
    // pickers just offer fewer choices) rather than blocking the modal.
    void getAssetAccounts()
      .then((result) => {
        if (!cancelled) setAssetAccounts(result);
      })
      .catch(() => undefined);
    void getDebts()
      .then((result) => {
        if (!cancelled) setDebts(result);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const assignPerson = useCallback(
    async (linkId: string, personId: string | null) => {
      if (!selectedId) return;
      setLinkError(null);
      try {
        const all = await updateLink(linkId, { personId });
        setLinks(all.filter((link) => link.connectionId === selectedId));
      } catch (error) {
        setLinkError(describeError(error, t("modals.connections.detail.errors.savePerson")));
      }
    },
    [selectedId, t],
  );

  const applyPreference = useCallback(
    async (linkId: string, change: LinkPreferenceChange) => {
      if (!selectedId || savingLinkId) return;
      setSavingLinkId(linkId);
      setLinkError(null);
      try {
        const updated = await updateLinkPreferences(linkId, change);
        setLinks(updated);
        setNewAccountFor(null);
        // A seeded balance changed an account or card; keep the pickers'
        // copies fresh.
        setAssetAccounts(await getAssetAccounts());
        setDebts(await getDebts());
      } catch (error) {
        setLinkError(describeError(error, t("modals.connections.detail.errors.savePreferences")));
      } finally {
        setSavingLinkId(null);
      }
    },
    [savingLinkId, selectedId, t],
  );

  const openNewAccountForm = useCallback((link: ExternalAccountLink) => {
    setNewAccountFor((current) => (current === link.id ? null : link.id));
    setNewAccountName(link.externalName.slice(0, 80));
    // Default the category from the bank's name ("401(k)", "High Yield
    // Savings") rather than always Checking.
    setNewAccountCategory(suggestAssetCategory(link.externalName));
  }, []);

  const createAndMap = useCallback(
    async (link: ExternalAccountLink) => {
      const name = newAccountName.trim();
      if (!name || savingLinkId) return;
      const now = new Date().toISOString();
      const account: AssetAccount = {
        id: generateUUID(),
        name: name.slice(0, 80),
        category: newAccountCategory,
        // Seeded here as well so the account never flashes $0 before the
        // link's preference write seeds it again (same clamp as sync).
        balance: Math.max(0, link.lastExternalBalance ?? 0),
        createdAt: now,
        updatedAt: now,
      };
      setLinkError(null);
      try {
        await addAssetAccount(account);
      } catch (error) {
        // Nothing was created - keep the typed name so the user can retry.
        setLinkError(describeError(error, t("modals.connections.detail.errors.createAccount")));
        return;
      }
      setNewAccountName("");
      await applyPreference(link.id, { assetAccountId: account.id });
    },
    [applyPreference, newAccountCategory, newAccountName, savingLinkId, t],
  );

  const handleBack = useCallback(() => {
    setSelectedId(null);
    setConfirmingRemove(false);
    setNewAccountFor(null);
  }, []);

  const handleClose = useCallback(() => {
    handleBack();
    onClose();
  }, [handleBack, onClose]);

  const handleRemove = useCallback(async () => {
    if (!selectedId) return;
    setRemoving(true);
    try {
      await removeConnection(selectedId);
      await refresh();
      handleBack();
    } finally {
      setRemoving(false);
      setConfirmingRemove(false);
    }
  }, [handleBack, refresh, selectedId]);

  /** Manual sync that reports back inline under the tapped button. */
  const runSync = useCallback(
    async (
      where: SyncNotice["where"],
      connectionId?: string,
      opts?: { backfillDays?: number },
    ) => {
      setSyncNotice(null);
      try {
        const results = await syncNow(connectionId, opts);
        const notice = summariseSyncResults(t, i18n.language, results);
        setSyncNotice(notice ? { ...notice, where } : null);
      } catch (error) {
        setSyncNotice({
          text: describeError(error, t("modals.connections.syncNotice.failed")),
          tone: "warn",
          where,
        });
      }
    },
    [i18n.language, syncNow, t],
  );

  const handleReconnect = useCallback(
    async (connectionId: string) => {
      const token = reconnectToken.trim();
      if (!token || reconnecting) return;
      setReconnecting(true);
      setReconnectError(null);
      setSyncNotice(null);
      let reconnected = false;
      try {
        const result = await reconnectSimplefin(connectionId, token);
        if (result.ok) {
          reconnected = true;
          setReconnectToken("");
          await refresh();
        } else {
          setReconnectError(result.message);
        }
      } catch (error) {
        setReconnectError(describeError(error, t("modals.connections.detail.errors.reconnect")));
      } finally {
        setReconnecting(false);
      }
      // Fetch right away so the user sees it worked (or what's still wrong).
      if (reconnected) await runSync("detail", connectionId);
    },
    [reconnectToken, reconnecting, refresh, runSync, t],
  );

  const renderSyncNotice = (where: SyncNotice["where"]) =>
    syncNotice && syncNotice.where === where ? (
      <Text
        style={[
          styles.hint,
          { color: syncNotice.tone === "ok" ? colors.success : colors.warning },
        ]}
      >
        {syncNotice.text}
      </Text>
    ) : null;

  const statusLine = (connection: BankConnection): { text: string; tone: string } => {
    if (connection.authStatus === "needs-reauth") {
      return { text: t("modals.connections.status.reconnectNeeded"), tone: colors.warning };
    }
    if (connection.authStatus === "error") {
      return {
        text: connection.lastErrorMessage ?? t("modals.connections.status.lastSyncFailed"),
        tone: colors.danger,
      };
    }
    if ((connection.providerWarnings?.length ?? 0) > 0) {
      return {
        text: t("modals.connections.status.bridgeAttention"),
        tone: colors.warning,
      };
    }
    return {
      text: t("modals.connections.status.lastSynced", { when: timeAgo(t, connection.lastSyncedAt) }),
      tone: colors.textMuted,
    };
  };

  const renderList = () => (
    <>
      <Text style={styles.title}>{t("modals.connections.list.title")}</Text>
      <Text style={styles.subtitle}>{t("modals.connections.list.subtitle")}</Text>

      {connections.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>{t("modals.connections.list.empty")}</Text>
        </View>
      ) : (
        <View style={styles.groupedCard}>
          {connections.map((connection, index) => {
            const status = statusLine(connection);
            return (
              <React.Fragment key={connection.id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => setSelectedId(connection.id)}
                >
                  <Text style={styles.rowGlyph}>
                    {PROVIDER_GLYPHS[connection.provider] ?? "🏦"}
                  </Text>
                  <View style={styles.rowTextWrap}>
                    <Text style={styles.rowTitle}>{connection.name}</Text>
                    <Text style={[styles.rowSubtext, { color: status.tone }]} numberOfLines={1}>
                      {status.text}
                    </Text>
                  </View>
                  <Text style={styles.rowArrow}>›</Text>
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </View>
      )}

      <TouchableOpacity style={styles.primaryButton} onPress={onAddConnection}>
        <Text style={styles.primaryButtonText}>{t("modals.connections.list.addConnection")}</Text>
      </TouchableOpacity>
      {connections.length > 0 ? (
        <TouchableOpacity
          style={[styles.secondaryButton, isSyncing && styles.buttonDisabled]}
          onPress={() => void runSync("all")}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color={colors.textDim} />
          ) : (
            <Text style={styles.secondaryButtonText}>{t("modals.connections.list.syncAll")}</Text>
          )}
        </TouchableOpacity>
      ) : null}
      {connections.length > 0 ? renderSyncNotice("all") : null}
    </>
  );

  const renderDetail = (connection: BankConnection) => {
    const status = statusLine(connection);
    // SimpleFIN can be reconnected in place with a new setup token; Teller
    // keeps the remove-and-re-add banner.
    const canReconnect =
      connection.provider === "simplefin" &&
      (connection.authStatus === "needs-reauth" ||
        connection.lastErrorCode === "auth-expired");
    const ages = links.map((link) => bankDataAge(link.lastExternalBalanceAt, nowMs));
    const anyStale = ages.some((age) => age?.stale === true);
    return (
      <>
        <TouchableOpacity onPress={handleBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backLink}>{t("modals.connections.detail.back")}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {PROVIDER_GLYPHS[connection.provider] ?? "🏦"} {connection.name}
        </Text>
        <Text style={[styles.subtitle, { color: status.tone }]}>{status.text}</Text>
        {linkError ? (
          <Text style={[styles.subtitle, { color: colors.danger }]}>{linkError}</Text>
        ) : null}

        {canReconnect ? (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>{t("modals.connections.detail.reconnectHint")}</Text>
            <TextInput
              style={[styles.input, styles.tokenInput]}
              placeholder={t("modals.connections.detail.reconnectPlaceholder")}
              placeholderTextColor={colors.textMuted}
              value={reconnectToken}
              onChangeText={setReconnectToken}
              multiline
              autoCorrect={false}
              autoCapitalize="none"
              spellCheck={false}
              secureTextEntry={false}
              editable={!reconnecting}
            />
            {reconnectError ? (
              <Text style={[styles.hint, { color: colors.danger }]}>{reconnectError}</Text>
            ) : null}
            <TouchableOpacity
              style={[
                styles.warningButton,
                (!reconnectToken.trim() || reconnecting || isSyncing) && styles.buttonDisabled,
              ]}
              onPress={() => void handleReconnect(connection.id)}
              disabled={!reconnectToken.trim() || reconnecting || isSyncing}
            >
              {reconnecting ? (
                <ActivityIndicator size="small" color={colors.accentButtonText} />
              ) : (
                <Text style={styles.warningButtonText}>{t("modals.connections.detail.reconnect")}</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : connection.authStatus === "needs-reauth" ? (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>{t("modals.connections.detail.reauthBanner")}</Text>
          </View>
        ) : null}

        {(connection.providerWarnings?.length ?? 0) > 0 ? (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>{t("modals.connections.detail.bridgeWarningIntro")}</Text>
            {connection.providerWarnings?.map((warning) => (
              <Text key={warning} style={styles.warningText}>
                • {warning}
              </Text>
            ))}
            <Text style={styles.warningText}>{t("modals.connections.detail.bridgeWarningOutro")}</Text>
          </View>
        ) : null}

        {connection.provider === "simplefin" && linksLoaded && links.length === 0 ? (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>{t("modals.connections.detail.unfinishedSetup")}</Text>
            <TouchableOpacity
              style={styles.warningButton}
              onPress={() => onFinishSetup(connection.id)}
            >
              <Text style={styles.warningButtonText}>{t("modals.connections.detail.finishSetup")}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>{t("modals.connections.detail.linkedAccounts")}</Text>
        {anyStale ? (
          <Text style={[styles.hint, { color: colors.warning }]}>
            {t("modals.connections.detail.staleHint", { count: STALE_BANK_DATA_DAYS })}
          </Text>
        ) : null}
        <View style={styles.groupedCard}>
          {links.length === 0 ? (
            <Text style={styles.emptyText}>{t("modals.connections.detail.noAccounts")}</Text>
          ) : (
            links.map((link, index) => {
              const target = link.assetAccountId
                ? assetAccounts.find((a) => a.id === link.assetAccountId)
                : undefined;
              const linkedCard = link.debtId
                ? debts.find((d) => d.id === link.debtId && !d.deletedAt)
                : undefined;
              const mirrorsCard = link.updateDebtBalance !== false;
              const noTarget = !link.assetAccountId && !link.debtId;
              const saving = savingLinkId === link.id;
              const age = ages[index];
              const bankDate = formatBankDate(link.lastExternalBalanceAt, i18n.language);
              return (
              <React.Fragment key={link.id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <View style={styles.row}>
                  <View style={styles.rowTextWrap}>
                    <Text style={styles.rowTitle}>{link.externalName}</Text>
                    <Text style={styles.rowSubtext}>
                      {link.importTransactions
                        ? t("modals.connections.detail.importsOn")
                        : t("modals.connections.detail.importsOff")}
                      {link.assetAccountId
                        ? t("modals.connections.detail.updatesAccount", {
                            name: target?.name ?? t("modals.connections.detail.balanceFallback"),
                          })
                        : link.debtId
                          ? linkedCard
                            ? mirrorsCard
                              ? t("modals.connections.detail.balanceToCard", {
                                  card: linkedCard.name,
                                })
                              : t("modals.connections.detail.linkedToCardOff", {
                                  card: linkedCard.name,
                                })
                            : mirrorsCard
                              ? t("modals.connections.detail.updatesDebtCard")
                              : t("modals.connections.detail.linkedDebtCardOff")
                          : t("modals.connections.detail.balanceNotTracked")}
                      {typeof link.lastExternalBalance === "number"
                        ? t("modals.connections.detail.balanceValue", {
                            amount: formatBankBalance(link.lastExternalBalance, link.currency),
                          })
                        : ""}
                    </Text>
                    <Text style={[styles.rowSubtext, age?.stale && { color: colors.warning }]}>
                      {bankDate
                        ? t("modals.connections.detail.bankDataAsOf", { date: bankDate })
                        : t("modals.connections.detail.bankDataNoDate")}
                      {bankDate && age?.stale
                        ? t("modals.connections.detail.bankDataDaysOld", { count: age.days })
                        : ""}
                    </Text>
                  </View>
                  {saving ? (
                    <ActivityIndicator size="small" color={colors.textDim} />
                  ) : null}
                </View>

                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() =>
                    void applyPreference(link.id, {
                      importTransactions: !link.importTransactions,
                    })
                  }
                  disabled={saving}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.checkbox,
                      link.importTransactions && styles.checkboxActive,
                    ]}
                  >
                    {link.importTransactions ? (
                      <Text style={styles.checkboxCheck}>✓</Text>
                    ) : null}
                  </View>
                  <Text style={styles.checkboxLabel}>{t("modals.connections.mapping.importTransactions")}</Text>
                </TouchableOpacity>

                {link.importTransactions && people.length > 0 ? (
                  <View style={styles.personPickerWrap}>
                    <Text style={styles.personPickerLabel}>{t("modals.connections.mapping.whoseCard")}</Text>
                    <TagPillPicker
                      options={people}
                      value={link.personId}
                      onChange={(id) => void assignPerson(link.id, id ?? null)}
                      noneLabel={t("modals.connections.mapping.noOne")}
                    />
                  </View>
                ) : null}

                <View style={styles.personPickerWrap}>
                  <Text style={styles.personPickerLabel}>{t("modals.connections.mapping.balanceUpdates")}</Text>
                  <View style={styles.pillWrap}>
                    <TouchableOpacity
                      style={[styles.pill, noTarget && styles.pillActive]}
                      onPress={() =>
                        void applyPreference(link.id, {
                          assetAccountId: null,
                          debtId: null,
                        })
                      }
                      disabled={saving}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          noTarget && styles.pillTextActive,
                        ]}
                      >
                        {t("modals.connections.mapping.none")}
                      </Text>
                    </TouchableOpacity>
                    {mappableAccounts.map((asset) => (
                      <TouchableOpacity
                        key={asset.id}
                        style={[
                          styles.pill,
                          link.assetAccountId === asset.id && styles.pillActive,
                        ]}
                        onPress={() =>
                          void applyPreference(link.id, { assetAccountId: asset.id })
                        }
                        disabled={saving}
                      >
                        <Text
                          style={[
                            styles.pillText,
                            link.assetAccountId === asset.id && styles.pillTextActive,
                          ]}
                          numberOfLines={1}
                        >
                          {asset.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      style={styles.pill}
                      onPress={() => openNewAccountForm(link)}
                      disabled={saving}
                    >
                      <Text style={styles.pillText}>{t("modals.connections.mapping.newAccount")}</Text>
                    </TouchableOpacity>
                  </View>
                  {newAccountFor === link.id ? (
                    <View style={styles.newAccountForm}>
                      <TextInput
                        style={styles.input}
                        placeholder={t("modals.connections.mapping.accountNamePlaceholder")}
                        placeholderTextColor={colors.textMuted}
                        value={newAccountName}
                        onChangeText={setNewAccountName}
                        maxLength={80}
                      />
                      <View style={styles.pillWrap}>
                        {MAPPABLE_ASSET_CATEGORIES.map((category) => (
                          <TouchableOpacity
                            key={category}
                            style={[
                              styles.pill,
                              newAccountCategory === category && styles.pillActive,
                            ]}
                            onPress={() => setNewAccountCategory(category)}
                          >
                            <Text
                              style={[
                                styles.pillText,
                                newAccountCategory === category && styles.pillTextActive,
                              ]}
                            >
                              {t(`bridge.screen.accounts.categories.${category}`)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.smallButton,
                          (!newAccountName.trim() || saving) && styles.buttonDisabled,
                        ]}
                        disabled={!newAccountName.trim() || saving}
                        onPress={() => void createAndMap(link)}
                      >
                        <Text style={styles.smallButtonText}>{t("modals.connections.mapping.createAndMap")}</Text>
                      </TouchableOpacity>
                      {newAccountCategory === "savings" ? (
                        <Text style={styles.hint}>{t("modals.connections.mapping.savingsHint")}</Text>
                      ) : null}
                      {newAccountCategory === "retirement" ||
                      newAccountCategory === "investment" ? (
                        <Text style={styles.hint}>{t("modals.connections.mapping.investmentHint")}</Text>
                      ) : null}
                    </View>
                  ) : null}
                </View>

                <View style={styles.personPickerWrap}>
                  <Text style={styles.personPickerLabel}>{t("modals.connections.mapping.cardsOnDebts")}</Text>
                  {cardDebts.length > 0 ? (
                    <View style={styles.pillWrap}>
                      {cardDebts.map((debt) => (
                        <TouchableOpacity
                          key={debt.id}
                          style={[
                            styles.pill,
                            link.debtId === debt.id && styles.pillActive,
                          ]}
                          onPress={() =>
                            void applyPreference(link.id, { debtId: debt.id })
                          }
                          disabled={saving}
                        >
                          <Text
                            style={[
                              styles.pillText,
                              link.debtId === debt.id && styles.pillTextActive,
                            ]}
                            numberOfLines={1}
                          >
                            {debt.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.hint}>{t("modals.connections.mapping.noCardsHint")}</Text>
                  )}
                </View>
              </React.Fragment>
              );
            })
          )}
        </View>

        {connection.provider === "teller" ? (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => onAddBank(connection.id)}
          >
            <Text style={styles.secondaryButtonText}>{t("modals.connections.detail.addAnotherBank")}</Text>
          </TouchableOpacity>
        ) : null}

        {/* SimpleFIN with zero links is covered by the Finish Setup banner
            above; this is for picking up accounts added AFTER setup. */}
        {connection.provider === "simplefin" && linksLoaded && links.length > 0 ? (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => onRediscover(connection.id)}
          >
            <Text style={styles.secondaryButtonText}>{t("modals.connections.detail.checkNewAccounts")}</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={[styles.secondaryButton, isSyncing && styles.buttonDisabled]}
          onPress={() => void runSync("detail", connection.id)}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color={colors.textDim} />
          ) : (
            <Text style={styles.secondaryButtonText}>{t("modals.connections.detail.syncNow")}</Text>
          )}
        </TouchableOpacity>
        {renderSyncNotice("detail")}

        {/* Manual safety net for a bank that came back after going dark when
            the automatic gap detection had nothing to go on. Skips the
            15-minute cooldown; the ledger keeps reviewed items from
            resurfacing, so it's safe to tap. */}
        {linksLoaded && links.length > 0 ? (
          <>
            <TouchableOpacity
              style={[styles.secondaryButton, isSyncing && styles.buttonDisabled]}
              onPress={() =>
                void runSync("detail", connection.id, {
                  backfillDays: MAX_GAP_BACKFILL_DAYS,
                })
              }
              disabled={isSyncing}
            >
              <Text style={styles.secondaryButtonText}>
                {t("modals.connections.detail.reimport", { count: MAX_GAP_BACKFILL_DAYS })}
              </Text>
            </TouchableOpacity>
            <Text style={styles.hint}>{t("modals.connections.detail.reimportHint")}</Text>
          </>
        ) : null}

        <TouchableOpacity
          style={styles.dangerButton}
          onPress={() => setConfirmingRemove(true)}
        >
          <Text style={styles.dangerButtonText}>{t("modals.connections.detail.remove")}</Text>
        </TouchableOpacity>
      </>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onOverlayRequestClose ?? handleClose}
    >
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {selected ? renderDetail(selected) : renderList()}
        </ScrollView>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Text style={styles.closeButtonText}>{t("common.close")}</Text>
        </TouchableOpacity>
        {overlay}
      </View>

      <Modal
        visible={confirmingRemove}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmingRemove(false)}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogBox}>
            <Text style={styles.dialogTitle}>{t("modals.connections.removeDialog.title")}</Text>
            <Text style={styles.dialogBody}>{t("modals.connections.removeDialog.body")}</Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.dialogCancel}
                onPress={() => setConfirmingRemove(false)}
                disabled={removing}
              >
                <Text style={styles.dialogCancelText}>{t("modals.connections.removeDialog.keep")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogRemove, removing && styles.buttonDisabled]}
                onPress={() => void handleRemove()}
                disabled={removing}
              >
                <Text style={styles.dialogRemoveText}>
                  {removing ? t("modals.connections.removeDialog.removing") : t("modals.connections.removeDialog.remove")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    scrollContent: {
      padding: 24,
      paddingTop: 64,
      gap: 14,
    },
    title: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.text,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textDim,
      lineHeight: 20,
    },
    backLink: {
      color: colors.accent,
      fontSize: 14,
      fontWeight: "600",
    },
    sectionLabel: {
      fontSize: 11,
      color: colors.textDim,
      fontWeight: "600",
      letterSpacing: 0.5,
      marginTop: 6,
    },
    groupedCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 4,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      gap: 10,
    },
    rowGlyph: {
      fontSize: 20,
    },
    rowTextWrap: {
      flex: 1,
    },
    rowTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "600",
    },
    rowSubtext: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    rowArrow: {
      color: colors.textMuted,
      fontSize: 22,
    },
    divider: {
      height: 1,
      backgroundColor: colors.cardBorder,
    },
    personPickerWrap: {
      paddingBottom: 12,
    },
    personPickerLabel: {
      color: colors.textDim,
      fontSize: 11,
      fontWeight: "600",
      letterSpacing: 0.5,
      textTransform: "uppercase",
      marginBottom: 6,
    },
    pillWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    pill: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 14,
      paddingHorizontal: 10,
      paddingVertical: 5,
      maxWidth: 160,
    },
    pillActive: {
      borderColor: colors.accent,
      backgroundColor: `${colors.accent}22`,
    },
    pillText: {
      color: colors.textDim,
      fontSize: 12,
      fontWeight: "600",
    },
    pillTextActive: {
      color: colors.accent,
    },
    checkboxRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingBottom: 12,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.cardBorder,
      backgroundColor: colors.bg,
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    checkboxCheck: {
      color: colors.accentButtonText,
      fontSize: 13,
      fontWeight: "700",
      lineHeight: 16,
    },
    checkboxLabel: {
      color: colors.text,
      fontSize: 14,
    },
    newAccountForm: {
      gap: 10,
      paddingTop: 10,
    },
    input: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.text,
      fontSize: 15,
    },
    tokenInput: {
      minHeight: 72,
      fontSize: 13,
      textAlignVertical: "top",
    },
    smallButton: {
      alignSelf: "flex-start",
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    smallButtonText: {
      color: colors.accentButtonText,
      fontSize: 13,
      fontWeight: "700",
    },
    hint: {
      color: colors.textMuted,
      fontSize: 12,
      lineHeight: 17,
    },
    emptyCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 14,
      padding: 18,
    },
    emptyText: {
      color: colors.textDim,
      fontSize: 13,
      lineHeight: 19,
      paddingVertical: 8,
    },
    warningBanner: {
      backgroundColor: `${colors.warning}18`,
      borderWidth: 1,
      borderColor: colors.warning,
      borderRadius: 12,
      padding: 14,
      gap: 10,
    },
    warningText: {
      color: colors.text,
      fontSize: 13,
      lineHeight: 19,
    },
    warningButton: {
      alignSelf: "flex-start",
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    warningButtonText: {
      color: colors.accentButtonText,
      fontSize: 13,
      fontWeight: "700",
    },
    primaryButton: {
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.accent,
      alignItems: "center",
    },
    primaryButtonText: {
      color: colors.accentButtonText,
      fontSize: 15,
      fontWeight: "700",
    },
    secondaryButton: {
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: "center",
    },
    secondaryButtonText: {
      color: colors.textDim,
      fontSize: 15,
      fontWeight: "600",
    },
    dangerButton: {
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.danger,
      alignItems: "center",
    },
    dangerButtonText: {
      color: colors.danger,
      fontSize: 15,
      fontWeight: "600",
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    closeButton: {
      margin: 24,
      marginTop: 8,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: "center",
    },
    closeButtonText: {
      color: colors.textDim,
      fontSize: 15,
      fontWeight: "600",
    },
    dialogOverlay: {
      flex: 1,
      backgroundColor: colors.overlayStrong,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 28,
    },
    dialogBox: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 16,
      padding: 20,
      gap: 12,
      alignSelf: "stretch",
    },
    dialogTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "700",
    },
    dialogBody: {
      color: colors.textDim,
      fontSize: 14,
      lineHeight: 20,
    },
    dialogActions: {
      flexDirection: "row",
      gap: 12,
      marginTop: 4,
    },
    dialogCancel: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: "center",
    },
    dialogCancelText: {
      color: colors.textDim,
      fontSize: 14,
      fontWeight: "600",
    },
    dialogRemove: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.danger,
      alignItems: "center",
    },
    dialogRemoveText: {
      color: colors.white,
      fontSize: 14,
      fontWeight: "700",
    },
  });

export default React.memo(ConnectionsModal);
