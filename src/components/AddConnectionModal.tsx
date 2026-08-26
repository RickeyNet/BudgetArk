/**
 * BudgetArk - Add Connection Wizard
 * File: src/components/AddConnectionModal.tsx
 *
 * Multi-step modal for connecting a bank with the user's OWN credentials:
 *   provider -> simplefinToken -> mapAccounts -> done
 *   provider -> tellerSetup -> tellerEnroll -> mapAccounts -> done
 *
 * Layout follows AddBudgetEntryModal's sheet (scrollable body, pinned button
 * row); errors render inline under the active field, never as Alerts.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ASSET_ACCOUNT_CATEGORY_LABELS,
  AssetAccount,
  AssetAccountCategory,
  BankProvider,
  Person,
  categoryIsPureHoldings,
} from "../types";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";
import ProviderSetupGuideModal from "./ProviderSetupGuideModal";
import SheetKeyboardAvoider from "./SheetKeyboardAvoider";
import {
  addTellerEnrollment,
  createSimplefinConnection,
  createTellerConnection,
  discoverSimplefinAccounts,
  finalizeAccountLinks,
  MAPPABLE_ASSET_CATEGORIES,
  type AccountSelection,
} from "../services/connections/connectionsService";
import { getLinksForConnection } from "../storage/externalAccountLinksStorage";
import { getPeople } from "../storage/personStorage";
import type { NormalizedAccount } from "../services/connections/types";
import { addAssetAccount } from "../storage/assetAccountStorage";
import { generateUUID } from "../utils/uuid";
import { openDocumentPicker } from "../utils/importData";
import { File as ExpoFile } from "expo-file-system";
import TellerConnectModal, {
  type TellerEnvironment,
} from "./TellerConnectModal";

type WizardStep =
  | "provider"
  | "simplefinToken"
  | "tellerSetup"
  | "tellerEnroll"
  | "mapAccounts"
  | "done";

const TELLER_ENVIRONMENTS: TellerEnvironment[] = [
  "development",
  "production",
  "sandbox",
];

/** Balance targets must hold a cash balance - see MAPPABLE_ASSET_CATEGORIES. */
const MAPPABLE_CATEGORIES = MAPPABLE_ASSET_CATEGORIES;

interface DraftSelection {
  account: NormalizedAccount;
  importTransactions: boolean;
  assetAccountId: string | null;
  /** "Whose card is this" - imported expenses suggest this person. */
  personId: string | null;
}

interface AddConnectionModalProps {
  visible: boolean;
  onClose: () => void;
  /** Called after a connection is fully set up (links saved). */
  onComplete: (connectionId: string) => void;
  /**
   * iOS only: fires after the sheet's dismissal animation fully completes
   * (RN Modal onDismiss). The post-setup sync is kicked from here so its
   * state churn can't race the native dismissal - re-rendering the modal
   * stack mid-dismissal freezes it (the same family as the silent-present
   * failure this codebase keeps hitting).
   */
  onDismissed?: () => void;
  assetAccounts: AssetAccount[];
  /**
   * "Add another bank" mode: skip provider choice and Teller setup, and open
   * Teller Connect directly for this existing connection. Only its brand-new
   * accounts are offered for mapping, so existing mappings are untouched.
   */
  addBank?: {
    connectionId: string;
    applicationId: string;
    environment: TellerEnvironment;
  };
  /**
   * "Finish setup" mode for a saved SimpleFIN connection whose token was
   * claimed but whose first account fetch failed: skip the token step and
   * re-list accounts from the stored access URL (no new token needed).
   */
  resumeSimplefin?: { connectionId: string };
  /**
   * "Check for new accounts" mode for a working SimpleFIN connection:
   * re-list accounts from the stored access URL and offer only the ones
   * without a link yet, so accounts added to the bridge after setup can
   * start importing. Existing mappings are untouched.
   */
  rediscoverSimplefin?: { connectionId: string };
}

const AddConnectionModal: React.FC<AddConnectionModalProps> = ({
  visible,
  onClose,
  onComplete,
  onDismissed,
  assetAccounts,
  addBank,
  resumeSimplefin,
  rediscoverSimplefin,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<WizardStep>("provider");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** When set, the full setup + privacy guide is shown for this provider. */
  const [guideProvider, setGuideProvider] = useState<BankProvider | null>(null);

  const [setupToken, setSetupToken] = useState("");

  const [tellerAppId, setTellerAppId] = useState("");
  const [tellerEnvironment, setTellerEnvironment] =
    useState<TellerEnvironment>("development");
  const [tellerCertPem, setTellerCertPem] = useState("");
  const [tellerKeyPem, setTellerKeyPem] = useState("");
  const [showTellerConnect, setShowTellerConnect] = useState(false);

  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [selections, setSelections] = useState<DraftSelection[]>([]);
  const [localAccounts, setLocalAccounts] = useState<AssetAccount[]>(assetAccounts);
  /** Live people, for the per-account "whose card is this" picker. */
  const [people, setPeople] = useState<Person[]>([]);

  // Inline "+ New account" mini-form state (one at a time, per provider account).
  const [newAccountFor, setNewAccountFor] = useState<string | null>(null);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountCategory, setNewAccountCategory] =
    useState<AssetAccountCategory>("checking");

  const mappableAccounts = useMemo(
    () => localAccounts.filter((a) => !categoryIsPureHoldings(a.category)),
    [localAccounts],
  );

  const reset = useCallback(() => {
    // Both modes reuse the SimpleFIN step against a saved connection.
    const savedSimplefin = resumeSimplefin ?? rediscoverSimplefin;
    setBusy(false);
    setError(null);
    setGuideProvider(null);
    setSetupToken("");
    setTellerCertPem("");
    setTellerKeyPem("");
    setShowTellerConnect(false);
    setSelections([]);
    setNewAccountFor(null);
    setLocalAccounts(assetAccounts);
    if (addBank) {
      // Jump straight to Teller Connect for the existing connection.
      setConnectionId(addBank.connectionId);
      setTellerAppId(addBank.applicationId);
      setTellerEnvironment(addBank.environment);
      setStep("tellerEnroll");
    } else if (savedSimplefin) {
      // A set connectionId on the SimpleFIN step means "already claimed" -
      // the step renders its resume/rediscover variant (no token input).
      setConnectionId(savedSimplefin.connectionId);
      setTellerAppId("");
      setTellerEnvironment("development");
      setStep("simplefinToken");
    } else {
      setConnectionId(null);
      setTellerAppId("");
      setTellerEnvironment("development");
      setStep("provider");
    }
  }, [addBank, assetAccounts, resumeSimplefin, rediscoverSimplefin]);

  // No reset() when closing: the wizard re-initializes on the next open (see
  // the visibility effect below), and resetting while the close animation
  // runs swaps the visible content back to step 1 mid-slide.
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // The modal stays mounted between uses; re-initialize the flow each time it
  // opens so it starts fresh at the provider picker.
  const wasVisible = useRef(false);
  useEffect(() => {
    if (visible && !wasVisible.current) reset();
    wasVisible.current = visible;
  }, [visible, reset]);

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

  const enterMapStep = useCallback((id: string, accounts: NormalizedAccount[]) => {
    setConnectionId(id);
    setSelections(
      accounts.map((account) => ({
        account,
        importTransactions: true,
        assetAccountId: null,
        personId: null,
      })),
    );
    setStep("mapAccounts");
  }, []);

  /* ── SimpleFIN ── */

  const submitSimplefinToken = useCallback(async () => {
    setBusy(true);
    setError(null);
    const result = await createSimplefinConnection(setupToken);
    setBusy(false);
    if (!result.ok) {
      // Token claimed but the first fetch failed: the connection was saved,
      // so flip this step into its resume variant (Load Accounts) instead of
      // letting the user burn another token.
      if (result.savedConnectionId) setConnectionId(result.savedConnectionId);
      setError(result.message);
      return;
    }
    enterMapStep(result.connectionId, result.accounts);
  }, [enterMapStep, setupToken]);

  /** Resume/rediscover path: the token is already claimed; list accounts from stored secrets. */
  const loadSavedSimplefinAccounts = useCallback(async () => {
    if (!connectionId) return;
    setBusy(true);
    setError(null);
    const result = await discoverSimplefinAccounts(connectionId);
    if (!result.ok) {
      setBusy(false);
      setError(result.message);
      return;
    }
    let accounts = result.accounts;
    if (rediscoverSimplefin) {
      // Checking for new accounts: only offer ones without a link yet, so
      // existing mappings are never reset (mirrors the Teller add-bank path).
      const existing = await getLinksForConnection(connectionId);
      const linkedIds = new Set(existing.map((l) => l.externalAccountId));
      accounts = accounts.filter((a) => !linkedIds.has(a.externalAccountId));
      if (accounts.length === 0) {
        setBusy(false);
        setStep("done");
        return;
      }
    }
    setBusy(false);
    enterMapStep(result.connectionId, accounts);
  }, [connectionId, enterMapStep, rediscoverSimplefin]);

  /* ── Teller ── */

  const pickTellerPem = useCallback(
    async (which: "cert" | "key") => {
      setError(null);
      try {
        const result = await openDocumentPicker({
          copyToCacheDirectory: true,
          // PEM files carry no reliable mime type across pickers - allow all.
          type: "*/*",
        });
        if (result.canceled) return;
        const uri = result.assets?.[0]?.uri;
        if (!uri) return;
        const text = await new ExpoFile(uri).text();
        if (which === "cert") setTellerCertPem(text);
        else setTellerKeyPem(text);
      } catch {
        setError("Couldn't read that file. Unzip teller.zip and pick the .pem files directly.");
      }
    },
    [],
  );

  const submitTellerSetup = useCallback(async () => {
    setBusy(true);
    setError(null);
    const result = await createTellerConnection({
      applicationId: tellerAppId,
      environment: tellerEnvironment,
      certificatePem: tellerCertPem,
      privateKeyPem: tellerKeyPem,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setConnectionId(result.connectionId);
    setStep("tellerEnroll");
  }, [tellerAppId, tellerEnvironment, tellerCertPem, tellerKeyPem]);

  const handleTellerEnrollment = useCallback(
    async (enrollment: { enrollmentId: string; accessToken: string }) => {
      setShowTellerConnect(false);
      if (!connectionId) return;
      setBusy(true);
      setError(null);
      const result = await addTellerEnrollment(
        connectionId,
        enrollment.enrollmentId,
        enrollment.accessToken,
      );
      if (!result.ok) {
        setBusy(false);
        setError(result.message);
        return;
      }
      let accounts = result.accounts;
      if (addBank) {
        // Adding a bank to an existing connection: only map accounts that
        // aren't already linked, so we never reset existing mappings (links
        // upsert by externalAccountId).
        const existing = await getLinksForConnection(connectionId);
        const linkedIds = new Set(existing.map((l) => l.externalAccountId));
        accounts = accounts.filter((a) => !linkedIds.has(a.externalAccountId));
        if (accounts.length === 0) {
          // The new bank's accounts are all already mapped - nothing to do.
          setBusy(false);
          setStep("done");
          return;
        }
      }
      setBusy(false);
      enterMapStep(result.connectionId, accounts);
    },
    [addBank, connectionId, enterMapStep],
  );

  /* ── Account mapping ── */

  const toggleImport = useCallback((externalAccountId: string) => {
    setSelections((prev) =>
      prev.map((s) =>
        s.account.externalAccountId === externalAccountId
          ? { ...s, importTransactions: !s.importTransactions }
          : s,
      ),
    );
  }, []);

  const setPerson = useCallback(
    (externalAccountId: string, personId: string | null) => {
      setSelections((prev) =>
        prev.map((s) =>
          s.account.externalAccountId === externalAccountId
            ? { ...s, personId }
            : s,
        ),
      );
    },
    [],
  );

  const setMapping = useCallback(
    (externalAccountId: string, assetAccountId: string | null) => {
      setSelections((prev) =>
        prev.map((s) =>
          s.account.externalAccountId === externalAccountId
            ? { ...s, assetAccountId }
            : s,
        ),
      );
      setNewAccountFor(null);
    },
    [],
  );

  const createNewAssetAccount = useCallback(
    async (externalAccountId: string) => {
      const name = newAccountName.trim();
      if (!name) return;
      const now = new Date().toISOString();
      const selection = selections.find(
        (s) => s.account.externalAccountId === externalAccountId,
      );
      const account: AssetAccount = {
        id: generateUUID(),
        name: name.slice(0, 80),
        category: newAccountCategory,
        balance: Math.max(0, selection?.account.balance ?? 0),
        createdAt: now,
        updatedAt: now,
      };
      await addAssetAccount(account);
      setLocalAccounts((prev) => [...prev, account]);
      setMapping(externalAccountId, account.id);
      setNewAccountName("");
      setNewAccountCategory("checking");
    },
    [newAccountCategory, newAccountName, selections, setMapping],
  );

  const submitMapping = useCallback(async () => {
    if (!connectionId) return;
    setBusy(true);
    setError(null);
    try {
      const finalSelections: AccountSelection[] = selections.map((s) => ({
        account: s.account,
        assetAccountId: s.assetAccountId,
        importTransactions: s.importTransactions,
        personId: s.personId,
      }));
      await finalizeAccountLinks(connectionId, finalSelections);
      setStep("done");
    } catch {
      setError("Saving the account mapping failed. Try again.");
    } finally {
      setBusy(false);
    }
  }, [connectionId, selections]);

  // Same no-reset rule as handleClose - and connectionId must survive the
  // press, so a repeat tap (e.g. while the close animation is still pending)
  // stays a valid onComplete instead of silently doing nothing.
  const finish = useCallback(() => {
    if (connectionId) onComplete(connectionId);
    else onClose();
  }, [connectionId, onComplete, onClose]);

  /* ── Rendering ── */

  const renderError = () =>
    error ? <Text style={styles.errorText}>{error}</Text> : null;

  const startProviderSetup = useCallback((provider: BankProvider) => {
    setGuideProvider(null);
    setError(null);
    setStep(provider === "simplefin" ? "simplefinToken" : "tellerSetup");
  }, []);

  const renderProviderStep = () => (
    <>
      <Text style={styles.title}>Connect a Bank</Text>
      <Text style={styles.subtitle}>
        Pick a provider. Your credentials stay encrypted on this device. New to
        this? Tap "Setup guide & privacy" for step-by-step help.
      </Text>
      <TouchableOpacity
        style={styles.providerCard}
        onPress={() => startProviderSetup("simplefin")}
      >
        <Text style={styles.providerTitle}>🏦 SimpleFIN Bridge (recommended)</Text>
        <Text style={styles.providerDescription}>
          One setup token covers Chase and thousands of US banks and credit
          cards. Paid service (~$1.50/month) with open signup - anyone can
          join today.
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.guideLink}
        onPress={() => setGuideProvider("simplefin")}
      >
        <Text style={styles.guideLinkText}>📖 SimpleFIN setup guide & privacy</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.providerCard}
        onPress={() => startProviderSetup("teller")}
      >
        <Text style={styles.providerTitle}>🔗 Teller</Text>
        <Text style={styles.providerDescription}>
          Bring your own Teller developer account (100 free bank connections).
          Best if you already have one: Teller has no public signup right now -
          new accounts are by request via support@teller.io.
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.guideLink}
        onPress={() => setGuideProvider("teller")}
      >
        <Text style={styles.guideLinkText}>📖 Teller setup guide & privacy</Text>
      </TouchableOpacity>
    </>
  );

  const renderTellerSetupStep = () => (
    <>
      <Text style={styles.title}>Teller Setup</Text>
      <Text style={styles.subtitle}>
        Uses your own free developer account from teller.io.
      </Text>
      <View style={styles.instructionsCard}>
        <Text style={styles.instructionLine}>1. Sign in at teller.io - no account? Signups are currently by request only (email support@teller.io), or use SimpleFIN instead</Text>
        <Text style={styles.instructionLine}>2. Download and unzip the teller.zip from your dashboard (it holds certificate.pem and private_key.pem)</Text>
        <Text style={styles.instructionLine}>3. Copy your Application ID from the dashboard and import both .pem files below</Text>
      </View>
      <TouchableOpacity
        style={styles.guideLink}
        onPress={() => setGuideProvider("teller")}
      >
        <Text style={styles.guideLinkText}>
          📖 Full setup guide, links & privacy
        </Text>
      </TouchableOpacity>
      <View style={styles.field}>
        <Text style={styles.label}>APPLICATION ID</Text>
        <TextInput
          style={styles.input}
          placeholder="app_..."
          placeholderTextColor={colors.textMuted}
          value={tellerAppId}
          onChangeText={setTellerAppId}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>ENVIRONMENT</Text>
        <View style={styles.pillWrap}>
          {TELLER_ENVIRONMENTS.map((env) => (
            <TouchableOpacity
              key={env}
              style={[styles.pill, tellerEnvironment === env && styles.pillActive]}
              onPress={() => setTellerEnvironment(env)}
            >
              <Text
                style={[
                  styles.pillText,
                  tellerEnvironment === env && styles.pillTextActive,
                ]}
              >
                {env}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>CLIENT CERTIFICATE</Text>
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => void pickTellerPem("cert")}
        >
          <Text style={styles.pickerButtonText}>
            {tellerCertPem ? "✓ certificate.pem loaded" : "Import certificate.pem"}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>PRIVATE KEY</Text>
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => void pickTellerPem("key")}
        >
          <Text style={styles.pickerButtonText}>
            {tellerKeyPem ? "✓ private_key.pem loaded" : "Import private_key.pem"}
          </Text>
        </TouchableOpacity>
      </View>
      {renderError()}
      <Text style={styles.hint}>
        The certificate and key stay encrypted on this device - they're how
        Teller verifies the requests come from your app.
      </Text>
    </>
  );

  const renderTellerEnrollStep = () => (
    <>
      <Text style={styles.title}>
        {addBank ? "Add Another Bank" : "Connect Your Bank"}
      </Text>
      <Text style={styles.subtitle}>
        {addBank
          ? "Log in to another bank through Teller Connect. It's added to this same connection - your existing banks stay as they are."
          : "Next, log in to your bank through Teller Connect. Your bank credentials go to Teller, never to BudgetArk."}
      </Text>
      {renderError()}
      <TouchableOpacity
        style={styles.providerCard}
        onPress={() => {
          setError(null);
          setShowTellerConnect(true);
        }}
      >
        <Text style={styles.providerTitle}>🏦 Open Teller Connect</Text>
        <Text style={styles.providerDescription}>
          Opens Teller's secure bank-login flow. When it finishes, your
          accounts appear here for mapping.
        </Text>
      </TouchableOpacity>
    </>
  );

  const renderSimplefinStep = () => {
    // Rediscover variant: a working connection; re-list accounts and offer
    // only the unmapped ones. No token input - uses the stored access URL.
    if (rediscoverSimplefin && connectionId) {
      return (
        <>
          <Text style={styles.title}>Check for New Accounts</Text>
          <Text style={styles.subtitle}>
            Added a bank or account on your SimpleFIN Bridge after setup?
            This re-lists your bridge's accounts and offers any that aren't
            mapped yet. Accounts you've already mapped stay as they are.
          </Text>
          {renderError()}
        </>
      );
    }
    // Resume variant: the token was already claimed and the connection saved;
    // only the account listing remains. No token input - retrying uses the
    // stored access URL.
    if (connectionId) {
      return (
        <>
          <Text style={styles.title}>Finish SimpleFIN Setup</Text>
          <Text style={styles.subtitle}>
            Your setup token was already claimed and this connection is saved
            on this device - you don't need a new token.
          </Text>
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionLine}>
              Listing your accounts failed, most often because SimpleFIN
              Bridge needs an active subscription. Check your billing at
              beta-bridge.simplefin.org, then load your accounts to finish
              setup.
            </Text>
          </View>
          {renderError()}
        </>
      );
    }
    return (
      <>
        <Text style={styles.title}>SimpleFIN Setup</Text>
        <Text style={styles.subtitle}>Three steps on SimpleFIN's site, then paste one token here.</Text>
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionLine}>1. Create an account at beta-bridge.simplefin.org</Text>
          <Text style={styles.instructionLine}>2. Connect your bank(s) there</Text>
          <Text style={styles.instructionLine}>3. Choose "New App", copy the setup token, and paste it below</Text>
        </View>
        <TouchableOpacity
          style={styles.guideLink}
          onPress={() => setGuideProvider("simplefin")}
        >
          <Text style={styles.guideLinkText}>
            📖 Full setup guide, links & privacy
          </Text>
        </TouchableOpacity>
        <View style={styles.field}>
          <Text style={styles.label}>SETUP TOKEN</Text>
          <TextInput
            style={[styles.input, styles.tokenInput]}
            placeholder="Paste your SimpleFIN setup token"
            placeholderTextColor={colors.textMuted}
            value={setupToken}
            onChangeText={setSetupToken}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
          />
          {renderError()}
          <Text style={styles.hint}>
            Tokens are single-use: once BudgetArk claims it, it can't be pasted
            anywhere else.
          </Text>
        </View>
      </>
    );
  };

  const renderMapAccountsStep = () => (
    <>
      <Text style={styles.title}>Your Accounts</Text>
      <Text style={styles.subtitle}>
        Choose what to import, and where balances should land. Unmapped
        accounts still import transactions to the Review Inbox.
      </Text>
      {selections.map((selection) => {
        const ext = selection.account;
        return (
          <View key={ext.externalAccountId} style={styles.accountCard}>
            <View style={styles.accountHeader}>
              <Text style={styles.accountName}>{ext.name}</Text>
              <Text style={styles.accountBalance}>
                {ext.balance < 0 ? "-" : ""}${Math.abs(ext.balance).toFixed(2)}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => toggleImport(ext.externalAccountId)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.checkbox,
                  selection.importTransactions && styles.checkboxActive,
                ]}
              >
                {selection.importTransactions ? (
                  <Text style={styles.checkboxCheck}>✓</Text>
                ) : null}
              </View>
              <Text style={styles.checkboxLabel}>Import transactions</Text>
            </TouchableOpacity>

            {people.length > 0 && selection.importTransactions ? (
              <>
                <Text style={styles.label}>WHOSE CARD IS THIS?</Text>
                <View style={styles.pillWrap}>
                  <TouchableOpacity
                    style={[
                      styles.pill,
                      selection.personId === null && styles.pillActive,
                    ]}
                    onPress={() => setPerson(ext.externalAccountId, null)}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        selection.personId === null && styles.pillTextActive,
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
                        selection.personId === person.id && styles.pillActive,
                      ]}
                      onPress={() => setPerson(ext.externalAccountId, person.id)}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          selection.personId === person.id &&
                            styles.pillTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {person.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.hint}>
                  Expenses imported from this account will suggest this person.
                </Text>
              </>
            ) : null}

            <Text style={styles.label}>BALANCE UPDATES</Text>
            <View style={styles.pillWrap}>
              <TouchableOpacity
                style={[
                  styles.pill,
                  selection.assetAccountId === null && styles.pillActive,
                ]}
                onPress={() => setMapping(ext.externalAccountId, null)}
              >
                <Text
                  style={[
                    styles.pillText,
                    selection.assetAccountId === null && styles.pillTextActive,
                  ]}
                >
                  None
                </Text>
              </TouchableOpacity>
              {mappableAccounts.map((asset) => (
                <TouchableOpacity
                  key={asset.id}
                  style={[
                    styles.pill,
                    selection.assetAccountId === asset.id && styles.pillActive,
                  ]}
                  onPress={() => setMapping(ext.externalAccountId, asset.id)}
                >
                  <Text
                    style={[
                      styles.pillText,
                      selection.assetAccountId === asset.id && styles.pillTextActive,
                    ]}
                  >
                    {asset.name}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.pill}
                onPress={() => {
                  setNewAccountFor(
                    newAccountFor === ext.externalAccountId
                      ? null
                      : ext.externalAccountId,
                  );
                  setNewAccountName(ext.name.slice(0, 80));
                }}
              >
                <Text style={styles.pillText}>+ New account</Text>
              </TouchableOpacity>
            </View>

            {newAccountFor === ext.externalAccountId ? (
              <View style={styles.newAccountForm}>
                <TextInput
                  style={styles.input}
                  placeholder="Account name"
                  placeholderTextColor={colors.textMuted}
                  value={newAccountName}
                  onChangeText={setNewAccountName}
                  maxLength={80}
                />
                <View style={styles.pillWrap}>
                  {MAPPABLE_CATEGORIES.map((category) => (
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
                        {ASSET_ACCOUNT_CATEGORY_LABELS[category]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={[
                    styles.smallButton,
                    !newAccountName.trim() && styles.buttonDisabled,
                  ]}
                  disabled={!newAccountName.trim()}
                  onPress={() => void createNewAssetAccount(ext.externalAccountId)}
                >
                  <Text style={styles.smallButtonText}>Create & map</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        );
      })}
      {renderError()}
    </>
  );

  const renderDoneStep = () => {
    const importing = selections.filter((s) => s.importTransactions).length;
    // Rediscover/add-bank runs that found nothing new end here with zero
    // selections - say so instead of claiming a connection happened.
    if ((addBank || rediscoverSimplefin) && selections.length === 0) {
      return (
        <>
          <Text style={styles.title}>✅ All Set</Text>
          <Text style={styles.subtitle}>
            {rediscoverSimplefin
              ? "No new accounts found - everything on your bridge is already mapped. If you just added a bank on your SimpleFIN Bridge, give it a few minutes to finish linking and check again."
              : "That bank's accounts were already connected, so nothing changed."}
          </Text>
        </>
      );
    }
    return (
      <>
        <Text style={styles.title}>✅ Connected</Text>
        <Text style={styles.subtitle}>
          {`${importing} account${
            importing === 1 ? "" : "s"
          } will import transactions to your Review Inbox. New items appear after each sync.`}
        </Text>
      </>
    );
  };

  const primaryAction: {
    label: string;
    onPress: () => void;
    disabled?: boolean;
    hidden?: boolean;
  } = (() => {
    switch (step) {
      case "provider":
        return { label: "Next", onPress: () => {}, hidden: true };
      case "simplefinToken":
        return connectionId
          ? {
              label: rediscoverSimplefin
                ? busy
                  ? "Checking..."
                  : "Check for New Accounts"
                : busy
                  ? "Loading accounts..."
                  : "Load Accounts",
              onPress: () => void loadSavedSimplefinAccounts(),
              disabled: busy,
            }
          : {
              label: busy ? "Connecting..." : "Connect",
              onPress: () => void submitSimplefinToken(),
              disabled: busy || !setupToken.trim(),
            };
      case "tellerSetup":
        return {
          label: busy ? "Saving..." : "Continue",
          onPress: () => void submitTellerSetup(),
          disabled:
            busy || !tellerAppId.trim() || !tellerCertPem || !tellerKeyPem,
        };
      case "tellerEnroll":
        return {
          label: busy ? "Loading accounts..." : "Open Teller Connect",
          onPress: () => setShowTellerConnect(true),
          disabled: busy,
        };
      case "mapAccounts":
        return {
          label: busy ? "Saving..." : "Save",
          onPress: () => void submitMapping(),
          disabled: busy,
        };
      case "done":
        return { label: "Done", onPress: finish };
    }
  })();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
      onDismiss={onDismissed}
    >
      <SheetKeyboardAvoider style={styles.overlay}>
        <View style={styles.modalSheet}>
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
          >
            {step === "provider" && renderProviderStep()}
            {step === "simplefinToken" && renderSimplefinStep()}
            {step === "tellerSetup" && renderTellerSetupStep()}
            {step === "tellerEnroll" && renderTellerEnrollStep()}
            {step === "mapAccounts" && renderMapAccountsStep()}
            {step === "done" && renderDoneStep()}
          </ScrollView>

          <View
            style={[
              styles.buttonRow,
              Platform.OS === "android" && insets.bottom > 0
                ? { paddingBottom: insets.bottom + 12 }
                : null,
            ]}
          >
            {step !== "done" ? (
              <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            ) : null}
            {!primaryAction.hidden ? (
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  primaryAction.disabled && styles.buttonDisabled,
                ]}
                onPress={primaryAction.onPress}
                disabled={primaryAction.disabled}
              >
                <Text style={styles.primaryButtonText}>{primaryAction.label}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </SheetKeyboardAvoider>

      <TellerConnectModal
        visible={showTellerConnect}
        applicationId={tellerAppId.trim()}
        environment={tellerEnvironment}
        onClose={() => setShowTellerConnect(false)}
        onSuccess={(enrollment) => void handleTellerEnrollment(enrollment)}
        onFailure={(message) => {
          setShowTellerConnect(false);
          setError(message);
        }}
      />

      <ProviderSetupGuideModal
        visible={guideProvider !== null}
        provider={guideProvider ?? "simplefin"}
        onClose={() => setGuideProvider(null)}
        onStartSetup={startProviderSetup}
      />
    </Modal>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.85)",
      justifyContent: "flex-end",
    },
    modalSheet: {
      flex: 1,
      marginTop: Platform.OS === "ios" ? 44 : 32,
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderBottomWidth: 0,
      overflow: "hidden",
    },
    scrollArea: { flex: 1 },
    scrollContent: {
      padding: 24,
      gap: 14,
      paddingBottom: 56,
    },
    title: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textDim,
      marginBottom: 8,
      lineHeight: 20,
    },
    field: { gap: 8 },
    label: {
      fontSize: 11,
      color: colors.textDim,
      fontWeight: "600",
      letterSpacing: 0.5,
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
      minHeight: 76,
      textAlignVertical: "top",
    },
    hint: {
      color: colors.textMuted,
      fontSize: 12,
      lineHeight: 17,
    },
    errorText: {
      color: colors.danger,
      fontSize: 13,
      lineHeight: 18,
    },
    providerCard: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 14,
      padding: 16,
      gap: 6,
    },
    guideLink: {
      alignSelf: "flex-start",
      paddingVertical: 4,
      marginTop: -4,
    },
    guideLinkText: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: "600",
    },
    providerTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "700",
    },
    providerDescription: {
      color: colors.textDim,
      fontSize: 13,
      lineHeight: 18,
    },
    instructionsCard: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      padding: 14,
      gap: 6,
    },
    instructionLine: {
      color: colors.textDim,
      fontSize: 13,
      lineHeight: 19,
    },
    accountCard: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 14,
      padding: 14,
      gap: 10,
    },
    accountHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    accountName: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "600",
      flex: 1,
      marginRight: 8,
    },
    accountBalance: {
      color: colors.textDim,
      fontSize: 14,
      fontWeight: "600",
    },
    checkboxRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    checkboxCheck: {
      color: colors.white,
      fontSize: 13,
      fontWeight: "700",
      lineHeight: 16,
    },
    checkboxLabel: {
      color: colors.text,
      fontSize: 14,
    },
    pillWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    pill: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    pillActive: {
      borderColor: colors.accent,
      backgroundColor: `${colors.accent}20`,
    },
    pillText: {
      color: colors.textDim,
      fontSize: 12,
      fontWeight: "500",
    },
    pillTextActive: {
      color: colors.accent,
      fontWeight: "700",
    },
    newAccountForm: {
      gap: 10,
      paddingTop: 4,
    },
    pickerButton: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      alignItems: "center",
    },
    pickerButtonText: {
      color: colors.textDim,
      fontSize: 14,
      fontWeight: "600",
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
    buttonRow: {
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 24,
      paddingTop: 12,
      paddingBottom: Platform.OS === "ios" ? 32 : 20,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: "center",
    },
    cancelText: {
      color: colors.textDim,
      fontSize: 15,
      fontWeight: "600",
    },
    primaryButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.accent,
      alignItems: "center",
    },
    buttonDisabled: {
      opacity: 0.4,
    },
    primaryButtonText: {
      color: colors.accentButtonText,
      fontSize: 15,
      fontWeight: "700",
    },
  });

export default React.memo(AddConnectionModal);
