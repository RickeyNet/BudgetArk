/**
 * BudgetArk - Receipt photo section (shared by Add/Edit entry modals)
 * File: src/components/AttachmentSection.tsx
 *
 * "RECEIPT PHOTOS" block: thumbnail strip + Take Photo / Choose Photo
 * buttons (hidden at the per-entry cap) + a full-screen viewer. Picking a
 * photo imports it IMMEDIATELY (downscale -> encrypt -> write, see
 * attachmentStore) and hands the metadata up via onAdd - the parent modal
 * owns staging semantics (what happens on cancel/save).
 *
 * A metadata item whose file is missing on this device (synced from the
 * partner - files are device-local in v1) renders as a placeholder tile.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { File as ExpoFile } from "expo-file-system";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";
import type { EntryAttachment } from "../types";
import { MAX_ATTACHMENTS_PER_ENTRY } from "../types";
import {
  AttachmentEncryptionUnavailableError,
  deleteAttachmentFiles,
  getThumbnailDataUri,
  hasAttachmentFile,
  importAttachment,
} from "../services/attachments/attachmentStore";
import AttachmentViewerModal from "./AttachmentViewerModal";

interface AttachmentSectionProps {
  attachments: EntryAttachment[];
  /** Called with imported metadata - files are already on disk (encrypted). */
  onAdd: (attachment: EntryAttachment) => void;
  /** Called when the user removes a photo; parent owns file-delete timing. */
  onRemove: (id: string) => void;
  /**
   * Staging-session marker owned by the parent modal - bumped whenever the
   * staging context ends (close/cancel/submit/entry switch). An import that
   * is still in flight when it changes is stale: RN keeps the closed modal
   * mounted, so without this guard the resolved photo would silently stage
   * itself onto whatever entry the user creates next. Stale imports delete
   * their files instead of calling onAdd.
   */
  stagingSession: number;
}

const THUMB_SIZE = 64;

/** One thumbnail tile - decrypts its thumb lazily; placeholder when missing. */
const AttachmentThumb: React.FC<{
  attachment: EntryAttachment;
  onPress: () => void;
  onRemove: () => void;
  styles: ReturnType<typeof makeStyles>;
  colors: ThemeColors;
}> = ({ attachment, onPress, onRemove, styles, colors }) => {
  const [thumbUri, setThumbUri] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!hasAttachmentFile(attachment.id)) {
        if (!cancelled) setMissing(true);
        return;
      }
      const uri = await getThumbnailDataUri(attachment.id);
      if (!cancelled) {
        if (uri) setThumbUri(uri);
        else setMissing(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attachment.id]);

  return (
    <View style={styles.thumbWrap}>
      <TouchableOpacity
        style={styles.thumbBox}
        onPress={onPress}
        accessibilityRole="imagebutton"
        accessibilityLabel="View receipt photo"
      >
        {thumbUri ? (
          <Image source={{ uri: thumbUri }} style={styles.thumbImage} />
        ) : missing ? (
          <View style={styles.thumbPlaceholder}>
            <Text style={styles.thumbPlaceholderIcon}>📷</Text>
            <Text style={styles.thumbPlaceholderText}>On partner's device</Text>
          </View>
        ) : (
          <ActivityIndicator size="small" color={colors.textMuted} />
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.thumbRemove}
        onPress={onRemove}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        accessibilityRole="button"
        accessibilityLabel="Remove receipt photo"
      >
        <Text style={styles.thumbRemoveText}>×</Text>
      </TouchableOpacity>
    </View>
  );
};

const AttachmentSection: React.FC<AttachmentSectionProps> = ({
  attachments,
  onAdd,
  onRemove,
  stagingSession,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [importing, setImporting] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  // Latest session value, readable from inside an in-flight handlePick.
  // Mirrored via an effect (commits well before any multi-second import
  // resolves) so the ref isn't written during render.
  const latestSessionRef = useRef(stagingSession);
  useEffect(() => {
    latestSessionRef.current = stagingSession;
  }, [stagingSession]);

  const atCap = attachments.length >= MAX_ATTACHMENTS_PER_ENTRY;

  const handlePick = useCallback(
    async (source: "camera" | "library") => {
      if (importing) return;
      const pickSession = stagingSession;
      try {
        let result: ImagePicker.ImagePickerResult;
        if (source === "camera") {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) {
            Alert.alert(
              "Camera access needed",
              "Allow camera access in your device Settings to photograph receipts."
            );
            return;
          }
          result = await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            quality: 1,
          });
        } else {
          // The system photo picker (iOS PHPicker / Android Photo Picker)
          // needs no permission prompt.
          result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 1,
          });
        }
        const uri = !result.canceled ? result.assets?.[0]?.uri : undefined;
        if (!uri) return;

        setImporting(true);
        try {
          const attachment = await importAttachment(uri);
          if (latestSessionRef.current !== pickSession) {
            // The staging context ended (modal closed/submitted) while we
            // were importing - this photo belongs to no entry. Remove its
            // encrypted files instead of ghost-staging it.
            void deleteAttachmentFiles([attachment.id]);
            return;
          }
          onAdd(attachment);
        } finally {
          // The picker/camera wrote a full-resolution PLAINTEXT copy into
          // the app cache and handed us its uri; the encrypted pair is on
          // disk now (or the import failed), so remove the plaintext copy
          // either way.
          try {
            const plain = new ExpoFile(uri);
            if (plain.exists) plain.delete();
          } catch {
            // Best-effort - the OS eventually clears the cache dir.
          }
        }
      } catch (error) {
        // Suppress alerts for a staging context that no longer exists.
        if (latestSessionRef.current !== pickSession) return;
        if (error instanceof AttachmentEncryptionUnavailableError) {
          Alert.alert(
            "Secure storage unavailable",
            "BudgetArk can't access this device's secure keystore, so receipt photos can't be stored encrypted. Photos are disabled rather than saved unprotected."
          );
        } else {
          Alert.alert(
            "Couldn't add photo",
            "Something went wrong while processing the image. Please try again."
          );
        }
      } finally {
        setImporting(false);
      }
    },
    [importing, onAdd, stagingSession]
  );

  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        RECEIPT PHOTOS ({attachments.length}/{MAX_ATTACHMENTS_PER_ENTRY})
      </Text>
      <Text style={styles.hint}>
        Photos are stored encrypted on this device only - they don't sync to
        your partner or leave with exports.
      </Text>

      {attachments.length > 0 && (
        <View style={styles.thumbRow}>
          {attachments.map((attachment, index) => (
            <AttachmentThumb
              key={attachment.id}
              attachment={attachment}
              onPress={() => setViewerIndex(index)}
              onRemove={() => onRemove(attachment.id)}
              styles={styles}
              colors={colors}
            />
          ))}
        </View>
      )}

      {!atCap && (
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.photoButton}
            onPress={() => void handlePick("camera")}
            disabled={importing}
          >
            <Text style={styles.photoButtonText}>
              {importing ? "Adding…" : "📷 Take Photo"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.photoButton}
            onPress={() => void handlePick("library")}
            disabled={importing}
          >
            <Text style={styles.photoButtonText}>
              {importing ? "Adding…" : "🖼️ Choose Photo"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <AttachmentViewerModal
        attachments={attachments}
        initialIndex={viewerIndex ?? 0}
        visible={viewerIndex !== null}
        onClose={() => setViewerIndex(null)}
        onDelete={(id) => {
          onRemove(id);
          if (attachments.length <= 1) setViewerIndex(null);
        }}
      />
    </View>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    field: { gap: 8 },
    label: {
      fontSize: 11,
      color: colors.textDim,
      fontWeight: "600",
      letterSpacing: 0.5,
    },
    hint: {
      color: colors.textMuted,
      fontSize: 12,
      lineHeight: 17,
    },
    thumbRow: {
      flexDirection: "row",
      gap: 12,
      flexWrap: "wrap",
    },
    thumbWrap: {
      width: THUMB_SIZE,
      height: THUMB_SIZE,
    },
    thumbBox: {
      width: THUMB_SIZE,
      height: THUMB_SIZE,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.bg,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    thumbImage: {
      width: "100%",
      height: "100%",
    },
    thumbPlaceholder: {
      alignItems: "center",
      justifyContent: "center",
      padding: 4,
      gap: 2,
    },
    thumbPlaceholderIcon: { fontSize: 16 },
    thumbPlaceholderText: {
      color: colors.textMuted,
      fontSize: 8,
      textAlign: "center",
    },
    thumbRemove: {
      position: "absolute",
      top: -6,
      right: -6,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.danger,
      alignItems: "center",
      justifyContent: "center",
    },
    thumbRemoveText: {
      color: colors.white,
      fontSize: 13,
      fontWeight: "700",
      lineHeight: 15,
    },
    buttonRow: {
      flexDirection: "row",
      gap: 10,
    },
    photoButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: "center",
      backgroundColor: colors.bg,
    },
    photoButtonText: {
      color: colors.textDim,
      fontSize: 13,
      fontWeight: "600",
    },
  });

export default React.memo(AttachmentSection);
