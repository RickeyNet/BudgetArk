/**
 * BudgetArk - Connections Manager
 * File: src/components/ConnectionsModal.tsx
 *
 * Modal-as-sub-screen (ManageCategoriesModal pattern) listing the user's
 * bank connections with a per-connection detail view: mapped accounts, last
 * sync, sync-now, and remove-with-confirm. The Add Connection wizard itself
 * is rendered by ProfileScreen; this modal only signals `onAddConnection`.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { BankConnection, ExternalAccountLink, Person } from "../types";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";
import { useConnections } from "../connections/ConnectionsProvider";
import {
  getLinksForConnection,
  updateLink,
} from "../storage/externalAccountLinksStorage";
import { getPeople } from "../storage/personStorage";
import { removeConnection } from "../services/connections/connectionsService";
import { useValueChanged } from "../hooks/useValueChanged";

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
}

const PROVIDER_GLYPHS: Record<string, string> = {
  simplefin: "🏦",
  teller: "🔗",
};

const timeAgo = (iso?: string): string => {
  if (!iso) return "never";
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return "just now";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const ConnectionsModal: React.FC<ConnectionsModalProps> = ({
  visible,
  onClose,
  onAddConnection,
  onAddBank,
  onFinishSetup,
  onRediscover,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { connections, isSyncing, refresh, syncNow } = useConnections();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [links, setLinks] = useState<ExternalAccountLink[]>([]);
  /** Distinguishes "no links" from "links not fetched yet" in the detail view. */
  const [linksLoaded, setLinksLoaded] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  /** Live people, for the per-account "whose card is this" picker. */
  const [people, setPeople] = useState<Person[]>([]);

  const selected: BankConnection | undefined = connections.find(
    (c) => c.id === selectedId,
  );

  // Structural stale-links guard: whenever the selected connection changes -
  // no matter which code path changed it - drop the previous connection's
  // account list before the fetch effect below repopulates it. Render-time
  // adjustment (see useValueChanged), not a per-call-site convention.
  if (useValueChanged(selectedId)) {
    setLinks([]);
    setLinksLoaded(false);
  }

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    void getLinksForConnection(selectedId).then((result) => {
      if (!cancelled) {
        setLinks(result);
        setLinksLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedId, isSyncing]);

  useEffect(() => {
    if (visible) void refresh();
  }, [visible, refresh]);

  // People load per open (Profile -> People edits between opens must show).
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    void getPeople().then((result) => {
      if (!cancelled) setPeople(result);
    });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const assignPerson = useCallback(
    async (linkId: string, personId: string | null) => {
      if (!selectedId) return;
      const all = await updateLink(linkId, { personId });
      setLinks(all.filter((link) => link.connectionId === selectedId));
    },
    [selectedId],
  );

  const handleBack = useCallback(() => {
    setSelectedId(null);
    setConfirmingRemove(false);
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

  const statusLine = (connection: BankConnection): { text: string; tone: string } => {
    if (connection.authStatus === "needs-reauth") {
      return { text: "Reconnect needed", tone: colors.warning };
    }
    if (connection.authStatus === "error") {
      return {
        text: connection.lastErrorMessage ?? "Last sync failed",
        tone: colors.danger,
      };
    }
    return {
      text: `Last synced ${timeAgo(connection.lastSyncedAt)}`,
      tone: colors.textMuted,
    };
  };

  const renderList = () => (
    <>
      <Text style={styles.title}>Bank Connections</Text>
      <Text style={styles.subtitle}>
        Connections fetch transactions and balances directly from your
        providers using credentials stored on this device.
      </Text>

      {connections.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            No connections yet. Connect a bank to import transactions and keep
            balances current automatically.
          </Text>
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
        <Text style={styles.primaryButtonText}>+ Add Connection</Text>
      </TouchableOpacity>
      {connections.length > 0 ? (
        <TouchableOpacity
          style={[styles.secondaryButton, isSyncing && styles.buttonDisabled]}
          onPress={() => void syncNow()}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color={colors.textDim} />
          ) : (
            <Text style={styles.secondaryButtonText}>Sync All Now</Text>
          )}
        </TouchableOpacity>
      ) : null}
    </>
  );

  const renderDetail = (connection: BankConnection) => {
    const status = statusLine(connection);
    return (
      <>
        <TouchableOpacity onPress={handleBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backLink}>‹ All connections</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {PROVIDER_GLYPHS[connection.provider] ?? "🏦"} {connection.name}
        </Text>
        <Text style={[styles.subtitle, { color: status.tone }]}>{status.text}</Text>

        {connection.authStatus === "needs-reauth" ? (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              This connection needs to be re-authorized. Remove it and add it
              again to reconnect.
            </Text>
          </View>
        ) : null}

        {connection.provider === "simplefin" && linksLoaded && links.length === 0 ? (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              Setup didn't finish - no accounts are mapped yet, so nothing
              imports. Your setup token was already claimed, so you can finish
              without a new one.
            </Text>
            <TouchableOpacity
              style={styles.warningButton}
              onPress={() => onFinishSetup(connection.id)}
            >
              <Text style={styles.warningButtonText}>Finish Account Setup</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>LINKED ACCOUNTS</Text>
        <View style={styles.groupedCard}>
          {links.length === 0 ? (
            <Text style={styles.emptyText}>No accounts mapped.</Text>
          ) : (
            links.map((link, index) => (
              <React.Fragment key={link.id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <View style={styles.row}>
                  <View style={styles.rowTextWrap}>
                    <Text style={styles.rowTitle}>{link.externalName}</Text>
                    <Text style={styles.rowSubtext}>
                      {link.importTransactions ? "Imports transactions" : "Import off"}
                      {link.assetAccountId ? " · updates balance" : ""}
                      {typeof link.lastExternalBalance === "number"
                        ? ` · $${link.lastExternalBalance.toFixed(2)}`
                        : ""}
                    </Text>
                  </View>
                </View>
                {link.importTransactions && people.length > 0 ? (
                  <View style={styles.personPickerWrap}>
                    <Text style={styles.personPickerLabel}>Whose card is this?</Text>
                    <View style={styles.pillWrap}>
                      <TouchableOpacity
                        style={[styles.pill, !link.personId && styles.pillActive]}
                        onPress={() => void assignPerson(link.id, null)}
                      >
                        <Text
                          style={[
                            styles.pillText,
                            !link.personId && styles.pillTextActive,
                          ]}
                        >
                          No one
                        </Text>
                      </TouchableOpacity>
                      {people.map((person) => (
                        <TouchableOpacity
                          key={person.id}
                          style={[
                            styles.pill,
                            link.personId === person.id && styles.pillActive,
                          ]}
                          onPress={() => void assignPerson(link.id, person.id)}
                        >
                          <Text
                            style={[
                              styles.pillText,
                              link.personId === person.id && styles.pillTextActive,
                            ]}
                            numberOfLines={1}
                          >
                            {person.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ) : null}
              </React.Fragment>
            ))
          )}
        </View>

        {connection.provider === "teller" ? (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => onAddBank(connection.id)}
          >
            <Text style={styles.secondaryButtonText}>+ Add another bank</Text>
          </TouchableOpacity>
        ) : null}

        {/* SimpleFIN with zero links is covered by the Finish Setup banner
            above; this is for picking up accounts added AFTER setup. */}
        {connection.provider === "simplefin" && linksLoaded && links.length > 0 ? (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => onRediscover(connection.id)}
          >
            <Text style={styles.secondaryButtonText}>+ Check for New Accounts</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={[styles.secondaryButton, isSyncing && styles.buttonDisabled]}
          onPress={() => void syncNow(connection.id)}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color={colors.textDim} />
          ) : (
            <Text style={styles.secondaryButtonText}>Sync Now</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dangerButton}
          onPress={() => setConfirmingRemove(true)}
        >
          <Text style={styles.dangerButtonText}>Remove Connection</Text>
        </TouchableOpacity>
      </>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {selected ? renderDetail(selected) : renderList()}
        </ScrollView>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={confirmingRemove}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmingRemove(false)}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogBox}>
            <Text style={styles.dialogTitle}>Remove this connection?</Text>
            <Text style={styles.dialogBody}>
              Its credentials are deleted from this device and syncing stops.
              Budget entries you already approved stay. Unreviewed inbox items
              from this connection are discarded.
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.dialogCancel}
                onPress={() => setConfirmingRemove(false)}
                disabled={removing}
              >
                <Text style={styles.dialogCancelText}>Keep</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogRemove, removing && styles.buttonDisabled]}
                onPress={() => void handleRemove()}
                disabled={removing}
              >
                <Text style={styles.dialogRemoveText}>
                  {removing ? "Removing..." : "Remove"}
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
      backgroundColor: "rgba(0, 0, 0, 0.85)",
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
