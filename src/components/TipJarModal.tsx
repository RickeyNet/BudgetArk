/**
 * BudgetArk - Tip Jar Modal
 * File: src/components/TipJarModal.tsx
 *
 * Optional one-time tips via the platform's own billing (StoreKit on iOS,
 * Google Play Billing on Android) using expo-iap. Tips are consumable
 * products that unlock nothing - the app stays fully featured for everyone.
 *
 * Privacy: the entire payment flow runs inside Apple/Google's purchase
 * sheet. BudgetArk never sees payment details and persists nothing about
 * the transaction - the thank-you state below is in-memory only.
 *
 * Mount this component only while the sheet is open (the useIAP hook opens
 * a store connection on mount and closes it on unmount), e.g.:
 *   {showTipJar ? <TipJarModal onClose={...} /> : null}
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ErrorCode, useIAP, type Product } from "expo-iap";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";
import { triggerHaptic } from "../utils/haptics";

interface TipJarModalProps {
  onClose: () => void;
}

interface TipTier {
  sku: string;
  emoji: string;
  label: string;
}

/**
 * Consumable product IDs. These must exist (with matching IDs) in both
 * App Store Connect and the Play Console before tips can load - see the
 * store-setup checklist in TODO.md.
 */
const TIP_TIERS: TipTier[] = [
  { sku: "com.budgetark.app.tip.small", emoji: "☕", label: "Small tip" },
  { sku: "com.budgetark.app.tip.medium", emoji: "🍕", label: "Medium tip" },
  { sku: "com.budgetark.app.tip.large", emoji: "🚢", label: "Large tip" },
];

const TIP_SKUS: string[] = TIP_TIERS.map((tier) => tier.sku);

const STORE_NAME = Platform.OS === "ios" ? "the App Store" : "Google Play";

const TipJarModal: React.FC<TipJarModalProps> = ({ onClose }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => makeStyles(colors, insets.bottom),
    [colors, insets.bottom],
  );

  /** SKU currently mid-purchase; disables the tier rows while set. */
  const [busySku, setBusySku] = useState<string | null>(null);
  const [thanked, setThanked] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [fetchState, setFetchState] = useState<"loading" | "ready" | "failed">(
    "loading",
  );

  const {
    connected,
    products,
    availablePurchases,
    fetchProducts,
    getAvailablePurchases,
    requestPurchase,
    finishTransaction,
  } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      // Consume immediately so the same tier can be tipped again. If this
      // fails the tip still went through - the leftover-purchase sweep
      // below finishes it the next time the jar opens.
      try {
        await finishTransaction({ purchase, isConsumable: true });
      } catch {}
      setBusySku(null);
      if (purchase.purchaseState === "purchased") {
        setErrorText(null);
        setThanked(true);
        triggerHaptic("success");
      } else {
        // e.g. Ask to Buy / slow payment methods - the store will finish
        // the charge on its own; nothing for the app to track.
        setErrorText(
          `Your tip is pending approval from ${STORE_NAME}. Thank you!`,
        );
      }
    },
    onPurchaseError: (error) => {
      setBusySku(null);
      if (error.code === ErrorCode.UserCancelled) return;
      setErrorText(error.message || "The purchase could not be completed.");
    },
  });

  /** Load products once the store connection is up. */
  const startedRef = useRef(false);
  useEffect(() => {
    if (!connected || startedRef.current) return;
    startedRef.current = true;
    fetchProducts({ skus: TIP_SKUS, type: "in-app" })
      .then(() => setFetchState("ready"))
      .catch(() => setFetchState("failed"));
    // Also surface any tip left unconsumed by an interrupted session.
    getAvailablePurchases().catch(() => {});
  }, [connected, fetchProducts, getAvailablePurchases]);

  /**
   * Consume leftover tip purchases (e.g. the app was killed between the
   * store charge and finishTransaction). Without this, Android reports
   * "already owned" on the next attempt at the same tier.
   */
  const consumedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const purchase of availablePurchases) {
      if (!TIP_SKUS.includes(purchase.productId)) continue;
      if (consumedRef.current.has(purchase.id)) continue;
      consumedRef.current.add(purchase.id);
      finishTransaction({ purchase, isConsumable: true }).catch(() => {});
    }
  }, [availablePurchases, finishTransaction]);

  /** Store products joined to their display tier, in tier order. */
  const tierRows = useMemo(
    () =>
      TIP_TIERS.flatMap((tier) => {
        const product = products.find((p: Product) => p.id === tier.sku);
        return product ? [{ ...tier, product }] : [];
      }),
    [products],
  );

  const handleTip = useCallback(
    (sku: string) => {
      if (busySku) return;
      setErrorText(null);
      setBusySku(sku);
      triggerHaptic("selection");
      requestPurchase({
        request: { apple: { sku }, google: { skus: [sku] } },
        type: "in-app",
      }).catch(() => {
        // Failures are reported through onPurchaseError; just unstick the UI.
        setBusySku(null);
      });
    },
    [busySku, requestPurchase],
  );

  const handleBackdrop = useCallback(() => {
    if (!busySku) onClose();
  }, [busySku, onClose]);

  const loading = !connected || fetchState === "loading";
  const unavailable = !loading && (fetchState === "failed" || tierRows.length === 0);

  return (
    <Modal visible animationType="slide" transparent onRequestClose={handleBackdrop}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={handleBackdrop}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={styles.card}>
            {thanked ? (
              <>
                <Text style={styles.thanksEmoji}>💛</Text>
                <Text style={styles.title}>Thank you!</Text>
                <Text style={styles.subtitle}>
                  Your tip helps keep BudgetArk sailing. Nothing changed in
                  the app - it was already all yours.
                </Text>
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <Text style={styles.closeText}>Close</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.title}>Tip Jar</Text>
                <Text style={styles.subtitle}>
                  If BudgetArk has helped you, you can leave a small one-time
                  tip. It's completely optional and unlocks nothing - every
                  feature stays free for everyone.
                </Text>

                {loading ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator color={colors.accent} />
                    <Text style={styles.loadingText}>
                      Contacting {STORE_NAME}...
                    </Text>
                  </View>
                ) : unavailable ? (
                  <View style={styles.loadingBox}>
                    <Text style={styles.loadingText}>
                      Tips aren't available right now. Please try again later.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.tierList}>
                    {tierRows.map((row) => (
                      <TouchableOpacity
                        key={row.sku}
                        style={[
                          styles.tierRow,
                          busySku !== null &&
                            busySku !== row.sku &&
                            styles.tierRowDimmed,
                        ]}
                        onPress={() => handleTip(row.sku)}
                        disabled={busySku !== null}
                      >
                        <Text style={styles.tierEmoji}>{row.emoji}</Text>
                        <Text style={styles.tierLabel}>{row.label}</Text>
                        {busySku === row.sku ? (
                          <ActivityIndicator color={colors.accent} />
                        ) : (
                          <Text style={styles.tierPrice}>
                            {row.product.displayPrice}
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {errorText ? (
                  <Text style={styles.errorText}>{errorText}</Text>
                ) : null}

                <Text style={styles.privacyText}>
                  Tips are processed entirely by {STORE_NAME}. BudgetArk never
                  sees, collects, or stores any payment details.
                </Text>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleBackdrop}
                >
                  <Text style={styles.closeText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const makeStyles = (colors: ThemeColors, bottomInset: number) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.85)",
      justifyContent: "flex-end",
    },
    card: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderBottomWidth: 0,
      padding: 24,
      paddingBottom: Math.max(24, bottomInset),
      gap: 16,
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
    thanksEmoji: {
      fontSize: 44,
      textAlign: "center",
    },
    loadingBox: {
      paddingVertical: 24,
      alignItems: "center",
      gap: 10,
    },
    loadingText: {
      fontSize: 14,
      color: colors.textDim,
      textAlign: "center",
    },
    tierList: {
      gap: 10,
    },
    tierRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    tierRowDimmed: {
      opacity: 0.4,
    },
    tierEmoji: {
      fontSize: 22,
    },
    tierLabel: {
      flex: 1,
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
    },
    tierPrice: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.accent,
    },
    errorText: {
      fontSize: 13,
      color: colors.warning,
      textAlign: "center",
    },
    privacyText: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: "center",
      lineHeight: 17,
    },
    closeButton: {
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: "center",
    },
    closeText: {
      color: colors.textDim,
      fontSize: 15,
      fontWeight: "600",
    },
  });

export default React.memo(TipJarModal);
