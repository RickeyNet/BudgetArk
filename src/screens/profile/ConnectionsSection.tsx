/**
 * BudgetArk - Bank Connections Section
 * File: src/screens/profile/ConnectionsSection.tsx
 *
 * The CONNECTIONS card (Bank Connections + Review Inbox rows), the first-use
 * off-device disclosure, the connections manager modal, and the add/resume
 * wizard. Owns all of that state; exposes openConnections() through a ref so
 * ProfileScreen's openSection deep link can route through the same
 * disclosure-gated path a row tap uses.
 */

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  InteractionManager,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { AssetAccount, RootTabParamList } from "../../types";
import {
  CONNECTIONS_DISCLOSURE_TITLE,
  CONNECTIONS_DISCLOSURE_INTRO,
  CONNECTIONS_DISCLOSURE_POINTS,
} from "../../data/connectionsDisclosure";
import {
  getConnectionsSettings,
  acknowledgeConnectionsDisclosure,
} from "../../storage/connectionsSettingsStorage";
import { useConnections } from "../../connections/ConnectionsProvider";
import ConnectionsModal from "../../components/ConnectionsModal";
import AddConnectionModal from "../../components/AddConnectionModal";
import NewFeatureBadge from "../../components/NewFeatureBadge";
import {
  startConnectionsMonitoring,
  syncConnections,
} from "../../services/connections/connectionsSyncService";
import { getTellerAddBankInfo } from "../../services/connections/connectionsService";
import { getAssetAccounts } from "../../storage/assetAccountStorage";
import { triggerHaptic } from "../../utils/haptics";
import { useTheme } from "../../theme/ThemeProvider";
import { useDensity } from "../../theme/DensityProvider";
import { useProfileStyles } from "./profileStyles";

export type ConnectionsSectionHandle = {
  /** Opens the manager (or the disclosure, when not yet acknowledged). */
  openConnections: () => void;
};

type ConnectionsSectionProps = {
  newFeatureIds: ReadonlySet<string>;
  onDismissNewBadge: (featureId: string) => void;
};

const ConnectionsSection = forwardRef<
  ConnectionsSectionHandle,
  ConnectionsSectionProps
>(({ newFeatureIds, onDismissNewBadge }, ref) => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useProfileStyles(tokens, colors);
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();

  /** Bank Connections (BYO API): modals + first-use disclosure. */
  const {
    connections,
    pendingCount,
    needsAttention,
    refresh: refreshConnections,
  } = useConnections();
  const [connectionsDisclosureAcked, setConnectionsDisclosureAcked] =
    useState(false);
  const [showConnectionsDisclosure, setShowConnectionsDisclosure] =
    useState(false);
  const [showConnectionsModal, setShowConnectionsModal] = useState(false);
  const [showAddConnection, setShowAddConnection] = useState(false);
  const [wizardAssetAccounts, setWizardAssetAccounts] = useState<
    AssetAccount[]
  >([]);
  /** Set when the wizard is opened in "add another bank" mode for a Teller connection. */
  const [addBankInfo, setAddBankInfo] = useState<{
    connectionId: string;
    applicationId: string;
    environment: "sandbox" | "development" | "production";
  } | null>(null);
  /** Set when the wizard is opened to finish an interrupted SimpleFIN setup. */
  const [resumeSimplefinId, setResumeSimplefinId] = useState<string | null>(
    null,
  );
  /** Set when the wizard is opened to check a SimpleFIN connection for new accounts. */
  const [rediscoverSimplefinId, setRediscoverSimplefinId] = useState<
    string | null
  >(null);

  useEffect(() => {
    void getConnectionsSettings().then((settings) =>
      setConnectionsDisclosureAcked(settings.disclosureAcknowledged),
    );
    // Foreground auto-sync trigger for bank connections (idempotent; the
    // service enforces per-connection cooldowns, so this is cheap).
    startConnectionsMonitoring();
  }, []);

  const openConnections = useCallback(() => {
    if (connectionsDisclosureAcked) {
      setShowConnectionsModal(true);
    } else {
      setShowConnectionsDisclosure(true);
    }
  }, [connectionsDisclosureAcked]);

  useImperativeHandle(ref, () => ({ openConnections }), [openConnections]);

  const confirmConnectionsDisclosure = useCallback(async () => {
    await acknowledgeConnectionsDisclosure();
    setConnectionsDisclosureAcked(true);
    setShowConnectionsDisclosure(false);
    setShowConnectionsModal(true);
    triggerHaptic("success");
  }, []);

  const openAddConnection = useCallback(async () => {
    setAddBankInfo(null);
    setResumeSimplefinId(null);
    setRediscoverSimplefinId(null);
    setWizardAssetAccounts(await getAssetAccounts());
    setShowAddConnection(true);
  }, []);

  const openAddBank = useCallback(async (connectionId: string) => {
    const info = await getTellerAddBankInfo(connectionId);
    if (!info) return;
    setWizardAssetAccounts(await getAssetAccounts());
    setAddBankInfo({ connectionId, ...info });
    setResumeSimplefinId(null);
    setRediscoverSimplefinId(null);
    setShowAddConnection(true);
  }, []);

  const openFinishSetup = useCallback(async (connectionId: string) => {
    setAddBankInfo(null);
    setResumeSimplefinId(connectionId);
    setRediscoverSimplefinId(null);
    setWizardAssetAccounts(await getAssetAccounts());
    setShowAddConnection(true);
  }, []);

  const openRediscover = useCallback(async (connectionId: string) => {
    setAddBankInfo(null);
    setResumeSimplefinId(null);
    setRediscoverSimplefinId(connectionId);
    setWizardAssetAccounts(await getAssetAccounts());
    setShowAddConnection(true);
  }, []);

  /** Connection awaiting its first sync once the wizard sheet is fully gone. */
  const pendingSyncConnectionId = useRef<string | null>(null);

  /**
   * Post-wizard sync kick. Deliberately calls the sync SERVICE directly
   * instead of the provider's syncNow: syncNow flips isSyncing
   * synchronously, and that context-wide re-render landing in the same
   * frame as the wizard Modal's teardown froze the whole app on Android
   * (UI-thread wedge in the dialog dismissal - same failure family as the
   * iOS silent-present bug). This path touches no React state until the
   * pass finishes; the provider refreshes once at the end, long after the
   * modal stack has settled. The service dedupes concurrent passes, so a
   * user-tapped Sync Now during the pass just joins it.
   */
  const kickPostSetupSync = useCallback(
    (connectionId: string) => {
      void syncConnections({ manual: true, connectionId }).then(() =>
        refreshConnections(),
      );
    },
    [refreshConnections],
  );

  const handleConnectionComplete = useCallback(
    (connectionId: string) => {
      setShowAddConnection(false);
      setAddBankInfo(null);
      setResumeSimplefinId(null);
      setRediscoverSimplefinId(null);
      // Populate the Review Inbox right away; failures surface as the
      // connection's status in the manage list. iOS gets an extra guard:
      // the kick fires from the Modal's onDismiss (after the dismissal
      // animation completes; the callback is iOS-only). Android tears the
      // dialog down synchronously with this commit, so deferring past the
      // commit is enough once the kick itself is state-silent.
      if (Platform.OS === "ios") {
        pendingSyncConnectionId.current = connectionId;
      } else {
        InteractionManager.runAfterInteractions(() => {
          kickPostSetupSync(connectionId);
        });
      }
    },
    [kickPostSetupSync],
  );

  /** iOS: the wizard sheet finished dismissing - safe to start the sync. */
  const handleWizardDismissed = useCallback(() => {
    const connectionId = pendingSyncConnectionId.current;
    pendingSyncConnectionId.current = null;
    if (connectionId) kickPostSetupSync(connectionId);
  }, [kickPostSetupSync]);

  return (
    <>
      {/* ── Bank Connections (BYO API) ── */}
      <View style={styles.settingsSection}>
        <Text
          style={[styles.settingsSectionTitle, { color: colors.textMuted }]}
        >
          CONNECTIONS
        </Text>

        <View
          style={[
            styles.groupedCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <TouchableOpacity
            style={styles.groupedRow}
            onPress={() => {
              onDismissNewBadge("bank-connections");
              openConnections();
            }}
          >
            <View style={{ flex: 1 }}>
              <View style={styles.rowTitleWithBadge}>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>
                  Bank Connections
                </Text>
                {newFeatureIds.has("bank-connections") && <NewFeatureBadge />}
              </View>
              <Text
                style={[
                  styles.settingsRowSubtext,
                  {
                    color: needsAttention ? colors.warning : colors.textDim,
                  },
                ]}
              >
                {needsAttention
                  ? "Needs attention"
                  : connections.length === 0
                    ? "Import transactions from your bank"
                    : `${connections.length} connected`}
              </Text>
            </View>
            <Text
              style={[
                styles.settingsRowArrow,
                { color: needsAttention ? colors.warning : colors.textDim },
              ]}
            >
              {needsAttention ? "!" : "→"}
            </Text>
          </TouchableOpacity>

          <View
            style={[
              styles.groupedDivider,
              { backgroundColor: colors.cardBorder },
            ]}
          />

          <TouchableOpacity
            style={styles.groupedRow}
            onPress={() => navigation.navigate("Budget", { openInbox: true })}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingsRowText, { color: colors.text }]}>
                Review Inbox
              </Text>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                {pendingCount > 0
                  ? `${pendingCount} transaction${pendingCount === 1 ? "" : "s"} waiting`
                  : "Nothing to review"}
              </Text>
            </View>
            <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>
              →
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Bank Connections first-use disclosure ── */}
      <Modal
        visible={showConnectionsDisclosure}
        animationType="fade"
        transparent
        onRequestClose={() => setShowConnectionsDisclosure(false)}
      >
        <View style={styles.dialogOverlay}>
          <View
            style={[
              styles.dialogBox,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.dialogTitle, { color: colors.text }]}>
              {CONNECTIONS_DISCLOSURE_TITLE}
            </Text>
            <Text style={[styles.dialogMessage, { color: colors.textDim }]}>
              {CONNECTIONS_DISCLOSURE_INTRO}
            </Text>
            {CONNECTIONS_DISCLOSURE_POINTS.map((point) => (
              <Text
                key={point}
                style={[
                  styles.dialogMessage,
                  { color: colors.textDim, textAlign: "left", marginBottom: 10 },
                ]}
              >
                • {point}
              </Text>
            ))}
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.bg }]}
                onPress={() => setShowConnectionsDisclosure(false)}
              >
                <Text style={[styles.dialogBtnText, { color: colors.text }]}>
                  Not now
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.accent }]}
                onPress={confirmConnectionsDisclosure}
              >
                <Text style={[styles.dialogBtnText, { color: colors.accentButtonText }]}>
                  Continue
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Bank Connections manager + wizard ── */}
      <ConnectionsModal
        visible={showConnectionsModal}
        onClose={() => setShowConnectionsModal(false)}
        onAddConnection={() => void openAddConnection()}
        onAddBank={(connectionId) => void openAddBank(connectionId)}
        onFinishSetup={(connectionId) => void openFinishSetup(connectionId)}
        onRediscover={(connectionId) => void openRediscover(connectionId)}
      />
      <AddConnectionModal
        visible={showAddConnection}
        onClose={() => {
          setShowAddConnection(false);
          setAddBankInfo(null);
          setResumeSimplefinId(null);
          setRediscoverSimplefinId(null);
          void refreshConnections();
        }}
        onComplete={handleConnectionComplete}
        onDismissed={handleWizardDismissed}
        assetAccounts={wizardAssetAccounts}
        addBank={addBankInfo ?? undefined}
        resumeSimplefin={
          resumeSimplefinId ? { connectionId: resumeSimplefinId } : undefined
        }
        rediscoverSimplefin={
          rediscoverSimplefinId
            ? { connectionId: rediscoverSimplefinId }
            : undefined
        }
      />
    </>
  );
});

ConnectionsSection.displayName = "ConnectionsSection";

export default ConnectionsSection;
