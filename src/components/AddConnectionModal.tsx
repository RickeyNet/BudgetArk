/**
 * BudgetArk - Add Connection Wizard
 * File: src/components/AddConnectionModal.tsx
 *
 * Multi-step modal for connecting a bank with the user's OWN credentials:
 *   provider -> simplefinToken -> mapAccounts -> done
 *   provider -> schwabKeys -> schwabRedirect -> mapAccounts -> done
 * Re-auth mode (`reauthConnectionId`) jumps straight into the Schwab OAuth
 * steps using stored credentials and skips account mapping.
 *
 * Layout follows AddBudgetEntryModal's sheet (scrollable body, pinned button
 * row); errors render inline under the active field, never as Alerts.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
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
  categoryIsPureHoldings,
} from "../types";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";
import {
  addTellerEnrollment,
  beginSchwabAuth,
  completeSchwabAuth,
  createSimplefinConnection,
  createTellerConnection,
  finalizeAccountLinks,
  type AccountSelection,
} from "../services/connections/connectionsService";
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
  | "schwabKeys"
  | "schwabRedirect"
  | "tellerSetup"
  | "tellerEnroll"
  | "mapAccounts"
  | "done";

const TELLER_ENVIRONMENTS: TellerEnvironment[] = [
  "development",
  "production",
  "sandbox",
];

/** Balance targets must hold a cash balance - pure-holdings accounts store 0. */
const MAPPABLE_CATEGORIES: AssetAccountCategory[] = [
  "checking",
  "savings",
  "hsa",
  "other",
];

interface DraftSelection {
  account: NormalizedAccount;
  importTransactions: boolean;
  assetAccountId: string | null;
}

interface AddConnectionModalProps {
  visible: boolean;
  onClose: () => void;
  /** Called after a connection is fully set up (links saved / re-auth done). */
  onComplete: (connectionId: string) => void;
  assetAccounts: AssetAccount[];
  /** Re-auth mode: skip provider choice, reuse this Schwab connection's keys. */
  reauthConnectionId?: string;
}

const AddConnectionModal: React.FC<AddConnectionModalProps> = ({
  visible,
  onClose,
  onComplete,
  assetAccounts,
  reauthConnectionId,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const isReauth = !!reauthConnectionId;
  const [step, setStep] = useState<WizardStep>(isReauth ? "schwabKeys" : "provider");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [setupToken, setSetupToken] = useState("");
  const [appKey, setAppKey] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [pastedRedirect, setPastedRedirect] = useState("");
  const [browserOpened, setBrowserOpened] = useState(false);

  const [tellerAppId, setTellerAppId] = useState("");
  const [tellerEnvironment, setTellerEnvironment] =
    useState<TellerEnvironment>("development");
  const [tellerCertPem, setTellerCertPem] = useState("");
  const [tellerKeyPem, setTellerKeyPem] = useState("");
  const [showTellerConnect, setShowTellerConnect] = useState(false);

  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [selections, setSelections] = useState<DraftSelection[]>([]);
  const [localAccounts, setLocalAccounts] = useState<AssetAccount[]>(assetAccounts);

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
    setStep(isReauth ? "schwabKeys" : "provider");
    setBusy(false);
    setError(null);
    setSetupToken("");
    setAppKey("");
    setAppSecret("");
    setPastedRedirect("");
    setBrowserOpened(false);
    setTellerAppId("");
    setTellerEnvironment("development");
    setTellerCertPem("");
    setTellerKeyPem("");
    setShowTellerConnect(false);
    setConnectionId(null);
    setSelections([]);
    setNewAccountFor(null);
    setLocalAccounts(assetAccounts);
  }, [assetAccounts, isReauth]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  // The modal stays mounted between uses; re-initialize the flow each time it
  // opens so a re-auth launch starts at the Schwab step with fresh state.
  const wasVisible = useRef(false);
  useEffect(() => {
    if (visible && !wasVisible.current) reset();
    wasVisible.current = visible;
  }, [visible, reset]);

  const enterMapStep = useCallback((id: string, accounts: NormalizedAccount[]) => {
    setConnectionId(id);
    setSelections(
      accounts.map((account) => ({
        account,
        importTransactions: true,
        assetAccountId: null,
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
      setError(result.message);
      return;
    }
    enterMapStep(result.connectionId, result.accounts);
  }, [enterMapStep, setupToken]);

  /* ── Schwab ── */

  const openSchwabLogin = useCallback(async () => {
    setBusy(true);
    setError(null);
    const result = await beginSchwabAuth({
      appKey,
      appSecret,
      reauthConnectionId,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setBrowserOpened(true);
    setStep("schwabRedirect");
    try {
      await Linking.openURL(result.authUrl);
    } catch {
      setError("Couldn't open the browser. Copy the login link manually from Schwab's developer portal.");
    }
  }, [appKey, appSecret, reauthConnectionId]);

  const submitSchwabRedirect = useCallback(async () => {
    setBusy(true);
    setError(null);
    const result = await completeSchwabAuth(pastedRedirect);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    if (isReauth) {
      setConnectionId(result.connectionId);
      setStep("done");
    } else {
      enterMapStep(result.connectionId, result.accounts);
    }
  }, [enterMapStep, isReauth, pastedRedirect]);

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
  }, [tellerAppId, tellerCertPem, tellerKeyPem]);

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
      setBusy(false);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      enterMapStep(result.connectionId, result.accounts);
    },
    [connectionId, enterMapStep],
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
      }));
      await finalizeAccountLinks(connectionId, finalSelections);
      setStep("done");
    } catch {
      setError("Saving the account mapping failed. Try again.");
    } finally {
      setBusy(false);
    }
  }, [connectionId, selections]);

  const finish = useCallback(() => {
    const id = connectionId;
    reset();
    if (id) onComplete(id);
  }, [connectionId, onComplete, reset]);

  /* ── Rendering ── */

  const renderError = () =>
    error ? <Text style={styles.errorText}>{error}</Text> : null;

  const renderProviderStep = () => (
    <>
      <Text style={styles.title}>Connect a Bank</Text>
      <Text style={styles.subtitle}>
        Pick a provider. Your credentials stay encrypted on this device.
      </Text>
      <TouchableOpacity
        style={styles.providerCard}
        onPress={() => {
          setError(null);
          setStep("simplefinToken");
        }}
      >
        <Text style={styles.providerTitle}>🏦 SimpleFIN Bridge</Text>
        <Text style={styles.providerDescription}>
          One setup token covers Chase and thousands of US banks and credit
          cards. Paid service (~$1.50/month) you sign up for yourself.
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.providerCard}
        onPress={() => {
          setError(null);
          setStep("schwabKeys");
        }}
      >
        <Text style={styles.providerTitle}>📈 Charles Schwab</Text>
        <Text style={styles.providerDescription}>
          Bring your own Schwab developer app (free) for brokerage balances
          and transactions. Requires re-approval every 7 days.
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.providerCard}
        onPress={() => {
          setError(null);
          setStep("tellerSetup");
        }}
      >
        <Text style={styles.providerTitle}>🔗 Teller</Text>
        <Text style={styles.providerDescription}>
          Bring your own Teller developer account (100 free bank connections).
          Uses the certificate from your teller.zip; banks connect through
          Teller's own login flow.
        </Text>
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
        <Text style={styles.instructionLine}>1. Create an account at teller.io - it comes with 100 free live bank connections</Text>
        <Text style={styles.instructionLine}>2. Download and unzip the teller.zip from your dashboard (it holds certificate.pem and private_key.pem)</Text>
        <Text style={styles.instructionLine}>3. Copy your Application ID from the dashboard and import both .pem files below</Text>
      </View>
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
      <Text style={styles.title}>Connect Your Bank</Text>
      <Text style={styles.subtitle}>
        Next, log in to your bank through Teller Connect. Your bank credentials
        go to Teller, never to BudgetArk.
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

  const renderSimplefinStep = () => (
    <>
      <Text style={styles.title}>SimpleFIN Setup</Text>
      <Text style={styles.subtitle}>Three steps on SimpleFIN's site, then paste one token here.</Text>
      <View style={styles.instructionsCard}>
        <Text style={styles.instructionLine}>1. Create an account at beta-bridge.simplefin.org</Text>
        <Text style={styles.instructionLine}>2. Connect your bank(s) there</Text>
        <Text style={styles.instructionLine}>3. Choose "New App", copy the setup token, and paste it below</Text>
      </View>
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

  const renderSchwabKeysStep = () => (
    <>
      <Text style={styles.title}>{isReauth ? "Reconnect Schwab" : "Schwab Setup"}</Text>
      <Text style={styles.subtitle}>
        {isReauth
          ? "Schwab requires re-approval every 7 days. Log in again to keep syncing."
          : "Uses your own developer app from developer.schwab.com."}
      </Text>
      {!isReauth ? (
        <>
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionLine}>1. Register a personal app at developer.schwab.com with the Trader API product</Text>
            <Text style={styles.instructionLine}>2. Set the callback URL to https://127.0.0.1</Text>
            <Text style={styles.instructionLine}>3. Once Schwab approves it (takes a few days), copy the App Key and Secret below</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>APP KEY</Text>
            <TextInput
              style={styles.input}
              placeholder="Your Schwab app key"
              placeholderTextColor={colors.textMuted}
              value={appKey}
              onChangeText={setAppKey}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>SECRET</Text>
            <TextInput
              style={styles.input}
              placeholder="Your Schwab app secret"
              placeholderTextColor={colors.textMuted}
              value={appSecret}
              onChangeText={setAppSecret}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
          </View>
        </>
      ) : null}
      {renderError()}
      <Text style={styles.hint}>
        Next opens Schwab's login in your browser. After you approve access,
        you'll copy the resulting address back into BudgetArk.
      </Text>
    </>
  );

  const renderSchwabRedirectStep = () => (
    <>
      <Text style={styles.title}>Paste the Address</Text>
      <Text style={styles.subtitle}>
        After you approve access, Schwab sends your browser to a page that
        won't load (https://127.0.0.1/...). That's expected - copy the FULL
        address from the browser's address bar and paste it here.
      </Text>
      <View style={styles.field}>
        <Text style={styles.label}>REDIRECTED ADDRESS</Text>
        <TextInput
          style={[styles.input, styles.tokenInput]}
          placeholder="https://127.0.0.1/?code=..."
          placeholderTextColor={colors.textMuted}
          value={pastedRedirect}
          onChangeText={setPastedRedirect}
          autoCapitalize="none"
          autoCorrect={false}
          multiline
        />
        {renderError()}
      </View>
      <TouchableOpacity onPress={openSchwabLogin} disabled={busy}>
        <Text style={styles.linkText}>
          {browserOpened ? "Open Schwab login again" : "Open Schwab login"}
        </Text>
      </TouchableOpacity>
      <Text style={styles.hint}>
        Login codes expire after a few minutes - if it stops working, open the
        login again and paste the fresh address.
      </Text>
    </>
  );

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

  const renderDoneStep = () => (
    <>
      <Text style={styles.title}>✅ Connected</Text>
      <Text style={styles.subtitle}>
        {isReauth
          ? "Schwab access is renewed. Syncing resumes automatically."
          : `${selections.filter((s) => s.importTransactions).length} account${
              selections.filter((s) => s.importTransactions).length === 1 ? "" : "s"
            } will import transactions to your Review Inbox. New items appear after each sync.`}
      </Text>
    </>
  );

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
        return {
          label: busy ? "Connecting..." : "Connect",
          onPress: () => void submitSimplefinToken(),
          disabled: busy || !setupToken.trim(),
        };
      case "schwabKeys":
        return {
          label: busy ? "Opening..." : "Open Schwab Login",
          onPress: () => void openSchwabLogin(),
          disabled: busy || (!isReauth && (!appKey.trim() || !appSecret.trim())),
        };
      case "schwabRedirect":
        return {
          label: busy ? "Verifying..." : "Verify",
          onPress: () => void submitSchwabRedirect(),
          disabled: busy || !pastedRedirect.trim(),
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
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "android" ? "padding" : undefined}
        style={styles.overlay}
      >
        <View style={styles.modalSheet}>
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
          >
            {step === "provider" && renderProviderStep()}
            {step === "simplefinToken" && renderSimplefinStep()}
            {step === "schwabKeys" && renderSchwabKeysStep()}
            {step === "schwabRedirect" && renderSchwabRedirectStep()}
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
      </KeyboardAvoidingView>

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
    linkText: {
      color: colors.accent,
      fontSize: 14,
      fontWeight: "600",
    },
    providerCard: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 14,
      padding: 16,
      gap: 6,
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
