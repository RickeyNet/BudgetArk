/**
 * BudgetArk - Partner Sync Section
 * File: src/screens/profile/PartnerSyncSection.tsx
 *
 * The PARTNER SYNC card. Unpaired: one "Pair with Partner" row. Paired: one
 * primary "Sync Now" row (partner name + status underneath, an Auto on/off
 * pill once a home Wi-Fi is set, and a ⋯ button for the rarer actions),
 * plus the read-only recent-activity list. Home Wi-Fi and Unpair used to
 * be standing rows; they now live in the options sheet behind ⋯, since
 * one is set once and the other is destructive. Pairing state, sync
 * status, and the sync handlers stay in ProfileScreen - the currency and
 * reset flows depend on them too - so this section is mostly presentational.
 *
 * Every option in the sheet closes the sheet first and runs after the
 * dismiss animation: the home-Wi-Fi handler and the unpair confirm both
 * present a Modal, and presenting one over a still-visible Modal is the
 * iOS silent-present failure this codebase avoids. The auto-sync pill
 * sits on the card itself (no sheet open), so it toggles inline.
 */

import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import { useTranslation } from "react-i18next";
import PairingModal from "../../components/PairingModal";
import SheetModal, { useSheetStyles } from "../../components/SheetModal";
import type { PairingState, SyncStatus } from "../../sync/types";
import { triggerHaptic } from "../../utils/haptics";
import { useTheme } from "../../theme/ThemeProvider";
import { useDensity } from "../../theme/DensityProvider";
import { useProfileStyles } from "./profileStyles";
import { formatDateTime } from "./formatDateTime";
import { getSyncActivityLog } from "../../storage/syncActivityStorage";
import { describeSyncActivity, type SyncActivityRecord } from "../../sync/syncActivity";

/** Recent syncs shown under Sync Now - enough to answer "what changed lately". */
const ACTIVITY_ROWS = 5;

/** Sheet dismiss animation allowance before presenting the next Modal. */
const SHEET_DISMISS_MS = 350;

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
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { tokens } = useDensity();
  const styles = useProfileStyles(tokens, colors);
  const sheet = useSheetStyles();

  const [showPairingModal, setShowPairingModal] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
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

  const busy =
    syncStatus === "discovering" ||
    syncStatus === "connecting" ||
    syncStatus === "syncing";

  const statusLine =
    syncStatus === "discovering"
      ? t("profile.connections.partnerSync.discovering")
      : syncStatus === "connecting"
        ? t("profile.connections.partnerSync.connecting")
        : syncStatus === "syncing"
          ? t("profile.connections.partnerSync.syncing")
          : lastSyncTime
            ? t("profile.connections.partnerSync.lastSynced", {
                when: formatDateTime(lastSyncTime),
              })
            : t("profile.connections.partnerSync.neverSynced");

  /** Options-sheet rows: dismiss the sheet, then run once it is gone. */
  const runFromSheet = useCallback((action: () => void) => {
    setShowOptions(false);
    setTimeout(action, SHEET_DISMISS_MS);
  }, []);

  const handleHomeWifi = useCallback(
    () => runFromSheet(onSetHomeNetwork),
    [runFromSheet, onSetHomeNetwork],
  );

  const handleUnpairRow = useCallback(
    () => runFromSheet(() => setShowUnpairConfirm(true)),
    [runFromSheet],
  );

  return (
    <>
      {/* ── Partner Sync (compressed) ── */}
      <View style={styles.settingsSection}>
        <Text
          style={[styles.settingsSectionTitle, { color: colors.textMuted }]}
        >
          {t("profile.connections.partnerSync.sectionTitle")}
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
                  {t("profile.connections.partnerSync.pair")}
                </Text>
                <Text
                  style={[
                    styles.settingsRowSubtext,
                    { color: colors.textDim },
                  ]}
                >
                  {t("profile.connections.partnerSync.pairSubtext")}
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
            {/* Primary row: tap to sync. The pill and ⋯ are nested
                touchables so the whole text area still triggers a sync. */}
            <TouchableOpacity
              style={[styles.groupedRow, busy && { opacity: 0.7 }]}
              onPress={onSyncNow}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={t("profile.connections.partnerSync.syncNow")}
            >
              <View style={styles.rowTextWrap}>
                <Text
                  style={[styles.settingsRowText, { color: colors.accent }]}
                >
                  {t("profile.connections.partnerSync.syncNow")}
                </Text>
                <Text
                  style={[
                    styles.settingsRowSubtext,
                    { color: colors.textDim },
                  ]}
                >
                  {t("profile.connections.partnerSync.statusWithPartner", {
                    partner: pairing.partnerName,
                    status: statusLine,
                  })}
                </Text>
              </View>

              {pairing.homeSSID ? (
                <TouchableOpacity
                  style={styles.rowPill}
                  onPress={() => {
                    triggerHaptic("selection");
                    onToggleAutoSync();
                  }}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: pairing.autoSyncEnabled }}
                  accessibilityLabel={t("profile.connections.partnerSync.autoA11y")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text
                    style={[
                      styles.rowPillText,
                      {
                        color: pairing.autoSyncEnabled
                          ? colors.accent
                          : colors.textDim,
                      },
                    ]}
                  >
                    {pairing.autoSyncEnabled
                      ? t("profile.connections.partnerSync.autoOn")
                      : t("profile.connections.partnerSync.autoOff")}
                  </Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={styles.rowPill}
                onPress={() => {
                  triggerHaptic("selection");
                  setShowOptions(true);
                }}
                accessibilityRole="button"
                accessibilityLabel={t("profile.connections.partnerSync.options")}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.rowPillText, { color: colors.textDim }]}>
                  {busy ? "..." : "⋯"}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>

            {visibleActivity.length > 0 ? (
              <View
                style={[
                  styles.groupedDivider,
                  { backgroundColor: colors.cardBorder },
                ]}
              />
            ) : null}

            {visibleActivity.length > 0 ? (
              <View style={styles.groupedRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingsRowText, { color: colors.text }]}>
                    {t("profile.connections.partnerSync.recentActivity")}
                  </Text>
                  {visibleActivity.map((record) => (
                    <Text
                      key={record.at}
                      style={[styles.settingsRowSubtext, { color: colors.textDim }]}
                    >
                      {t("profile.connections.partnerSync.activityRow", {
                        when: formatDateTime(record.at),
                        received: describeSyncActivity(record.received),
                        partner: record.partnerName,
                      })}
                      {record.sent > 0
                        ? t("profile.connections.partnerSync.activitySent", {
                            count: record.sent,
                          })
                        : ""}
                    </Text>
                  ))}
                </View>
              </View>
            ) : null}
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

      {/* ── Options sheet (home Wi-Fi, unpair) ── */}
      <SheetModal
        visible={showOptions}
        onRequestClose={() => setShowOptions(false)}
        fitContent
        footer={
          <TouchableOpacity
            style={sheet.closeButton}
            onPress={() => setShowOptions(false)}
            accessibilityRole="button"
            accessibilityLabel={t("common.cancel")}
          >
            <Text style={sheet.closeText}>{t("common.cancel")}</Text>
          </TouchableOpacity>
        }
      >
        <Text style={sheet.title}>
          {t("profile.connections.partnerSync.options")}
        </Text>
        {pairing ? (
          <Text style={sheet.subtitle}>{pairing.partnerName}</Text>
        ) : null}
        <View
          style={[
            styles.groupedCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <TouchableOpacity
            style={styles.groupedRow}
            onPress={handleHomeWifi}
            accessibilityRole="button"
            accessibilityLabel={t("profile.connections.partnerSync.homeWifi")}
          >
            <View style={styles.rowTextWrap}>
              <Text style={[styles.settingsRowText, { color: colors.text }]}>
                {t("profile.connections.partnerSync.homeWifi")}
              </Text>
              <Text
                style={[styles.settingsRowSubtext, { color: colors.textDim }]}
              >
                {pairing?.homeSSID
                  ? t("profile.connections.partnerSync.autoSyncStatus", {
                      state: pairing.autoSyncEnabled
                        ? t("common.on").toLowerCase()
                        : t("common.off").toLowerCase(),
                      ssid: pairing.homeSSID,
                    })
                  : t("profile.connections.partnerSync.homeWifiUnset")}
              </Text>
            </View>
            <Text style={[styles.settingsRowArrow, { color: colors.textDim }]}>
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
            style={styles.groupedRow}
            onPress={handleUnpairRow}
            accessibilityRole="button"
            accessibilityLabel={t("profile.connections.partnerSync.unpair")}
          >
            <Text style={[styles.settingsRowText, { color: colors.danger }]}>
              {t("profile.connections.partnerSync.unpair")}
            </Text>
            <Text style={[styles.settingsRowArrow, { color: colors.danger }]}>
              →
            </Text>
          </TouchableOpacity>
        </View>
      </SheetModal>

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
              {t("profile.connections.partnerSync.unpairConfirm.title")}
            </Text>
            <Text style={[styles.dialogMessage, { color: colors.textDim }]}>
              {t("profile.connections.partnerSync.unpairConfirm.message")}
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.bg }]}
                onPress={() => setShowUnpairConfirm(false)}
              >
                <Text style={[styles.dialogBtnText, { color: colors.text }]}>
                  {t("common.cancel")}
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
                  {t("profile.connections.partnerSync.unpair")}
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
