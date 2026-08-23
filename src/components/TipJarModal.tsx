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
 * the transaction on its own - the thank-you state below is in-memory
 * only. The one exception is user-initiated: the thank-you view offers to
 * log the tip as an ordinary budget entry (expense, Giving category), and
 * only an explicit tap creates that record.
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
import { generateUUID } from "../utils/uuid";
import { roundToCents } from "../utils/money";
import { addBudgetEntry } from "../storage/budgetStorage";
import type { BudgetEntry } from "../types";

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
  /** SKU of the tip just completed - drives the "add to budget?" offer. */
  const [lastTipSku, setLastTipSku] = useState<string | null>(null);
  /** Lifecycle of the optional log-to-budget action in the thank-you view. */
  const [logState, setLogState] = useState<
    "offer" | "saving" | "logged" | "failed"
  >("offer");

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
        setLastTipSku(purchase.productId);
        setLogState("offer");
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

  /**
   * If the store connection never comes up (no Play services, region
   * without the store), stop spinning after a bit and show the
   * unavailable state instead. Self-healing: a late connection flips
   * `connected` and the normal load path takes over.
   */
  const [connectTimedOut, setConnectTimedOut] = useState(false);
  useEffect(() => {
    if (connected) return;
    const timer = setTimeout(() => setConnectTimedOut(true), 10_000);
    return () => clearTimeout(timer);
  }, [connected]);

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

  /**
   * The just-purchased tip joined back to its store product, for the
   * "add to budget?" offer. `price` is optional in the store schema, so the
   * offer only renders when a real positive number came back - otherwise
   * the thank-you view simply omits it.
   */
  const lastTip = useMemo(() => {
    if (!lastTipSku) return null;
    const product = products.find((p: Product) => p.id === lastTipSku);
    if (!product) return null;
    const { price } = product;
    if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
      return null;
    }
    return { amount: roundToCents(price), displayPrice: product.displayPrice };
  }, [lastTipSku, products]);

  /**
   * Log the tip as an ordinary budget entry: today's expense under the
   * built-in "Giving" category, editable/deletable in Budget like any other
   * entry. The store charges in the storefront's currency; the entry is
   * recorded at that face value in the user's budget currency (the two match
   * for virtually everyone, and the entry stays editable if not).
   */
  const handleLogTip = useCallback(async () => {
    if (!lastTip || logState === "saving" || logState === "logged") return;
    setLogState("saving");
    try {
      const now = new Date();
      const entry: BudgetEntry = {
        id: generateUUID(),
        type: "expense",
        category: "Giving",
        amount: lastTip.amount,
        description: "BudgetArk tip 💛",
        date: now.toISOString().slice(0, 10),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      await addBudgetEntry(entry);
      setLogState("logged");
      triggerHaptic("success");
    } catch {
      setLogState("failed");
    }
  }, [lastTip, logState]);

  const loading = connected ? fetchState === "loading" : !connectTimedOut;
  const unavailable =
    !loading &&
    (!connected || fetchState === "failed" || tierRows.length === 0);

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

                {lastTip ? (
                  logState === "logged" ? (
                    <Text style={styles.logDoneText}>
                      🎁 Added to your budget under Giving. You can edit or
                      remove it there like any other entry.
                    </Text>
                  ) : (
                    <View style={styles.logSection}>
                      <Text style={styles.logPrompt}>
                        Want to count this tip in your budget? It'll be added
                        as a {lastTip.displayPrice} expense today under the
                        Giving category.
                      </Text>
                      <TouchableOpacity
                        style={styles.logButton}
                        onPress={handleLogTip}
                        disabled={logState === "saving"}
                      >
                        {logState === "saving" ? (
                          <ActivityIndicator color={colors.white} />
                        ) : (
                          <Text style={styles.logButtonText}>
                            Add to Budget · Giving 🎁
                          </Text>
                        )}
                      </TouchableOpacity>
                      {logState === "failed" ? (
                        <Text style={styles.errorText}>
                          Couldn't save the entry. You can try again, or add
                          it later from the Budget tab.
                        </Text>
                      ) : null}
                    </View>
                  )
                ) : null}

                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <Text style={styles.closeText}>
                    {lastTip && logState !== "logged" ? "No Thanks" : "Close"}
                  </Text>
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
    logSection: {
      gap: 10,
    },
    logPrompt: {
      fontSize: 14,
      color: colors.textDim,
      lineHeight: 20,
    },
    logButton: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
    },
    logButtonText: {
      color: colors.white,
      fontSize: 15,
      fontWeight: "700",
    },
    logDoneText: {
      fontSize: 14,
      color: colors.success,
      textAlign: "center",
      lineHeight: 20,
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
