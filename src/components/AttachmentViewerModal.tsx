/**
 * BudgetArk - Full-screen receipt photo viewer
 * File: src/components/AttachmentViewerModal.tsx
 *
 * Inline <Modal> (no navigator, consistent with the rest of the app):
 * horizontal paging through an entry's receipt photos, decrypted to data
 * URIs on demand. Metadata items whose file isn't on this device (synced
 * from the partner) get a placeholder page. FLAG_SECURE on the app
 * activity keeps decrypted receipts out of screenshots/recents on Android.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";
import type { EntryAttachment } from "../types";
import {
  getAttachmentDataUri,
  hasAttachmentFile,
} from "../services/attachments/attachmentStore";

interface AttachmentViewerModalProps {
  attachments: EntryAttachment[];
  initialIndex: number;
  visible: boolean;
  onClose: () => void;
  /** Omit to render read-only (no delete button). */
  onDelete?: (id: string) => void;
}

/** One full-image page - decrypts lazily when first rendered. */
const ViewerPage: React.FC<{
  attachment: EntryAttachment;
  width: number;
  styles: ReturnType<typeof makeStyles>;
  colors: ThemeColors;
}> = ({ attachment, width, styles, colors }) => {
  const [dataUri, setDataUri] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!hasAttachmentFile(attachment.id)) {
        if (!cancelled) setMissing(true);
        return;
      }
      const uri = await getAttachmentDataUri(attachment.id);
      if (!cancelled) {
        if (uri) setDataUri(uri);
        else setMissing(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attachment.id]);

  return (
    <View style={[styles.page, { width }]}>
      {dataUri ? (
        <Image
          source={{ uri: dataUri }}
          style={styles.image}
          resizeMode="contain"
        />
      ) : missing ? (
        <View style={styles.missingWrap}>
          <Text style={styles.missingIcon}>📷</Text>
          <Text style={styles.missingText}>
            This photo lives on the device that took it. Receipt photos don't
            transfer during sync.
          </Text>
        </View>
      ) : (
        <ActivityIndicator size="large" color={colors.accent} />
      )}
    </View>
  );
};

const AttachmentViewerModal: React.FC<AttachmentViewerModalProps> = ({
  attachments,
  initialIndex,
  visible,
  onClose,
  onDelete,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const windowWidth = Dimensions.get("window").width;
  const scrollRef = useRef<ScrollView>(null);
  const [pageIndex, setPageIndex] = useState(initialIndex);

  // Snap to the tapped thumbnail every time the viewer opens.
  useEffect(() => {
    if (visible) {
      setPageIndex(Math.min(initialIndex, Math.max(0, attachments.length - 1)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on open
  }, [visible]);

  const handleMomentumEnd = useCallback(
    (event: { nativeEvent: { contentOffset: { x: number } } }) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / windowWidth);
      setPageIndex(Math.max(0, Math.min(index, attachments.length - 1)));
    },
    [attachments.length, windowWidth]
  );

  const current = attachments[pageIndex];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.counter}>
            {attachments.length > 0
              ? `${Math.min(pageIndex + 1, attachments.length)} of ${attachments.length}`
              : ""}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Close photo viewer"
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumEnd}
          contentOffset={{ x: pageIndex * windowWidth, y: 0 }}
        >
          {attachments.map((attachment) => (
            <ViewerPage
              key={attachment.id}
              attachment={attachment}
              width={windowWidth}
              styles={styles}
              colors={colors}
            />
          ))}
        </ScrollView>

        {onDelete && current && (
          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => onDelete(current.id)}
              accessibilityRole="button"
              accessibilityLabel="Remove this receipt photo"
            >
              <Text style={styles.deleteText}>Remove Photo</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.96)",
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingBottom: 8,
    },
    counter: {
      color: colors.white,
      fontSize: 14,
      fontWeight: "600",
    },
    closeText: {
      color: colors.white,
      fontSize: 20,
      fontWeight: "700",
    },
    page: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 12,
    },
    image: {
      width: "100%",
      height: "100%",
    },
    missingWrap: {
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 40,
    },
    missingIcon: { fontSize: 40 },
    missingText: {
      color: colors.textMuted,
      fontSize: 14,
      textAlign: "center",
      lineHeight: 20,
    },
    bottomBar: {
      paddingHorizontal: 24,
      paddingTop: 12,
    },
    deleteButton: {
      paddingVertical: 13,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.danger,
      alignItems: "center",
    },
    deleteText: {
      color: colors.danger,
      fontSize: 15,
      fontWeight: "600",
    },
  });

export default React.memo(AttachmentViewerModal);
