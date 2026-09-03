/**
 * BudgetArk - Partner Sync Section
 * File: src/screens/profile/PartnerSyncSection.tsx
 *
 * The PARTNER SYNC card (pair / sync now / unpair rows), the pairing modal,
 * and the unpair confirmation. Pairing state, sync status, and the sync
 * handlers stay in ProfileScreen - the currency and reset flows depend on
 * them too - so this section is mostly presentational and only owns the two
 * modal visibilities.
 */

import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import PairingModal from "../../components/PairingModal";
import type { PairingState, SyncStatus } from "../../sync/types";
import { useTheme } from "../../theme/ThemeProvider";
import { useDensity } from "../../theme/DensityProvider";
import { useProfileStyles } from "./profileStyles";
import { formatDateTime } from "./formatDateTime";
import { getSyncActivityLog } from "../../storage/syncActivityStorage";
import { describeSyncActivity, type SyncActivityRecord } from "../../sync/syncActivity";

/** Recent syncs shown under Sync Now - enough to answer "what changed lately". */
const ACTIVITY_ROWS = 5;

type PartnerSyncSectionProps = {
  pairing: PairingState | null;
  syncStatus: SyncStatus;
  lastSyncTime: string | null;
  onPaired: (state: PairingState) => void;
  onSyncNow: () => void;
  onSetHomeNetwork: () => void;
  onToggleAutoSync: () => void;
  /** Runs the unpair; resolves once pairing state is cleared. */
  onUnpair: () => Promise<void>;
};

const PartnerSyncSection: React.FC<PartnerSyncSectionProps> = ({
  pairing,
  syncStatus,
  lastSyncTime,
  onPaired,
  onSyncNow,
  onSetHomeNetwork,
  onToggleAutoSync,
  onUnpair,
}) => {
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useProfileStyles(tokens, colors);

  const [showPairingModal, setShowPairingModal] = useState(false);
  const [showUnpairConfirm, setShowUnpairConfirm] = useState(false);
  const [activity, setActivity] = useState<SyncActivityRecord[]>([]);

  // Device-local log of what recent syncs delivered (counts only). Re-read
  // whenever a sync completes - the screen bumps lastSyncTime after logging.
  useEffect(() => {
    // Unpaired: the list isn't rendered (see `visibleActivity`), so there is
    // nothing to clear here - re-pairing reloads it.
    if (!pairing) return;
    let cancelled = false;
    void getSyncActivityLog()
      .then((log) => {
        if (!cancelled) setActivity(log.slice(0, ACTIVITY_ROWS));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [pairing, lastSyncTime]);
  const visibleActivity = pairing ? activity : [];

  return (
    <>
      {/* ── Partner Sync (compressed) ── */}
      <View style={styles.settingsSection}>
        <Text
          style={[styles.settingsSectionTitle, { color: colors.textMuted }]}
        >
          PARTNER SYNC
        </Text>

        {!pairing ? (
          <View
            style={[
              styles.groupedCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.groupedRow}
              onPress={() => setShowPairingModal(true)}
            >
              <View>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>
                  Pair with Partner
                </Text>
                <Text
                  style={[
                    styles.settingsRowSubtext,
                    { color: colors.textDim },
                  ]}
                >
                  Sync budgets over WiFi - no account needed
                </Text>
              </View>
              <Text
                style={[styles.settingsRowArrow, { color: colors.textDim }]}
              >
                →
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View
            style={[
              styles.groupedCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.groupedRow}
              onPress={onSetHomeNetwork}
            >
              <View>
                <Text style={[styles.settingsRowText, { color: colors.text }]}>
                  {pairing.partnerName}
                </Text>
                <Text
                  style={[
                    styles.settingsRowSubtext,
                    { color: colors.textDim },
                  ]}
                >
                  {pairing.homeSSID
                    ? `Auto-sync ${pairing.autoSyncEnabled ? "on" : "off"} · "${pairing.homeSSID}"`
                    : "Tap to set home WiFi for auto-sync"}
                  {pairing.homeSSID ? (
                    <Text
                      style={{ color: colors.textMuted }}
                      onPress={onToggleAutoSync}
                    >
                      {" "}
                      · {pairing.autoSyncEnabled ? "Disable" : "Enable"}
                    </Text>
                  ) : null}
                </Text>
              </View>
              <Text
                style={[styles.settingsRowArrow, { color: colors.textDim }]}
              >
                →
              </Text>
            </TouchableOpacity>

            <View
              style={[
                styles.groupedDivider,
                { backgroundColor: colors.cardBorder },
              ]}
            />

            <TouchableOpacity
              style={[
                styles.groupedRow,
                syncStatus !== "idle" &&
                  syncStatus !== "error" && { opacity: 0.7 },
              ]}
              onPress={onSyncNow}
              disabled={syncStatus !== "idle" && syncStatus !== "error"}
            >
              <View>
                <Text
                  style={[styles.settingsRowText, { color: colors.accent }]}
                >
                  Sync Now
                </Text>
                <Text
                  style={[
                    styles.settingsRowSubtext,
                    { color: colors.textDim },
                  ]}
                >
                  {syncStatus === "discovering"
                    ? "Looking for partner..."
                    : syncStatus === "connecting"
                      ? "Connecting..."
                      : syncStatus === "syncing"
                        ? "Syncing data..."
                        : lastSyncTime
                          ? `Last synced ${formatDateTime(lastSyncTime)}`
                          : "Never synced"}
                </Text>
              </View>
              <Text style={[styles.settingsRowArrow, { color: colors.accent }]}>
                {syncStatus !== "idle" && syncStatus !== "error" ? "..." : "→"}
              </Text>
            </TouchableOpacity>

            <View
              style={[
                styles.groupedDivider,
                { backgroundColor: colors.cardBorder },
              ]}
            />

            {visibleActivity.length > 0 ? (
              <View style={styles.groupedRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingsRowText, { color: colors.text }]}>
                    Recent activity
                  </Text>
                  {visibleActivity.map((record) => (
                    <Text
                      key={record.at}
                      style={[styles.settingsRowSubtext, { color: colors.textDim }]}
                    >
                      {formatDateTime(record.at)} · {describeSyncActivity(record.received)}{" "}
                      from {record.partnerName}
                      {record.sent > 0 ? ` · sent ${record.sent}` : ""}
                    </Text>
                  ))}
                </View>
              </View>
            ) : null}

            {visibleActivity.length > 0 ? (
              <View
                style={[
                  styles.groupedDivider,
                  { backgroundColor: colors.cardBorder },
                ]}
              />
            ) : null}

            <TouchableOpacity
              style={styles.groupedRow}
              onPress={() => setShowUnpairConfirm(true)}
            >
              <Text style={[styles.settingsRowText, { color: colors.danger }]}>
                Unpair
              </Text>
              <Text style={[styles.settingsRowArrow, { color: colors.danger }]}>
                →
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Pairing Modal ── */}
      <PairingModal
        visible={showPairingModal}
        onClose={() => setShowPairingModal(false)}
        onPaired={(state) => {
          // Close + parent's pairing update + "Paired!" info dialog land in
          // the same React batch, exactly as the monolithic handler did.
          setShowPairingModal(false);
          onPaired(state);
        }}
      />

      {/* ── Unpair Confirmation ── */}
      <Modal
        visible={showUnpairConfirm}
        animationType="fade"
        transparent
        onRequestClose={() => setShowUnpairConfirm(false)}
      >
        <View style={styles.dialogOverlay}>
          <View
            style={[
              styles.dialogBox,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.dialogTitle, { color: colors.text }]}>
              Unpair Device
            </Text>
            <Text style={[styles.dialogMessage, { color: colors.textDim }]}>
              This will disconnect partner sync. Your data stays on this device,
              but you'll need to pair again to sync.
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.bg }]}
                onPress={() => setShowUnpairConfirm(false)}
              >
                <Text style={[styles.dialogBtnText, { color: colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.danger }]}
                onPress={() => {
                  void (async () => {
                    // Await the unpair so this confirm closes in the same
                    // batch as the parent's "Unpaired" info dialog appears -
                    // preserving the original single-commit close+present
                    // (the iOS stacked-modal safe path).
                    await onUnpair();
                    setShowUnpairConfirm(false);
                  })();
                }}
              >
                <Text style={[styles.dialogBtnText, { color: colors.white }]}>
                  Unpair
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default PartnerSyncSection;
