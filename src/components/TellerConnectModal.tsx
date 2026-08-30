/**
 * BudgetArk - Teller Connect Enrollment
 * File: src/components/TellerConnectModal.tsx
 *
 * Hosts Teller Connect (Teller's bank-login widget) in a WebView using the
 * USER'S OWN application id. On a successful enrollment Teller hands back an
 * access token + enrollment id, which the widget posts to React Native via
 * window.ReactNativeWebView.postMessage. The token never leaves the device.
 *
 * The widget is loaded from Teller's CDN inside a minimal inline HTML page;
 * baseUrl is set to an https origin because connect.js refuses to boot on
 * non-secure origins.
 */

import React, { useCallback, useMemo } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/themes";

export type TellerEnvironment = "sandbox" | "development" | "production";

interface TellerConnectModalProps {
  visible: boolean;
  applicationId: string;
  environment?: TellerEnvironment;
  onClose: () => void;
  onSuccess: (enrollment: { enrollmentId: string; accessToken: string }) => void;
  onFailure: (message: string) => void;
}

const buildConnectHtml = (
  applicationId: string,
  environment: TellerEnvironment,
): string => `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
  <script src="https://cdn.teller.io/connect/connect.js"></script>
  <style>html, body { margin: 0; height: 100%; background: transparent; }</style>
</head>
<body>
  <script>
    function post(payload) {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }
    try {
      var connect = TellerConnect.setup({
        applicationId: ${JSON.stringify(applicationId)},
        environment: ${JSON.stringify(environment)},
        selectAccount: "multiple",
        onSuccess: function (enrollment) {
          post({
            type: "success",
            accessToken: enrollment.accessToken,
            enrollmentId: enrollment.enrollment && enrollment.enrollment.id,
          });
        },
        onExit: function () { post({ type: "exit" }); },
        onFailure: function (failure) {
          post({ type: "failure", message: failure && failure.message });
        },
      });
      connect.open();
    } catch (error) {
      post({ type: "failure", message: String(error && error.message || error) });
    }
  </script>
</body>
</html>`;

const TellerConnectModal: React.FC<TellerConnectModalProps> = ({
  visible,
  applicationId,
  environment = "development",
  onClose,
  onSuccess,
  onFailure,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let payload: {
        type?: string;
        accessToken?: string;
        enrollmentId?: string;
        message?: string;
      };
      try {
        payload = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }
      // Fail-closed shape check (rule 15): both credentials must be
      // non-empty strings before anything is persisted into the secrets
      // map - a truthy non-string (object/number) would otherwise land there.
      if (
        payload.type === "success" &&
        typeof payload.accessToken === "string" &&
        payload.accessToken.length > 0 &&
        typeof payload.enrollmentId === "string" &&
        payload.enrollmentId.length > 0
      ) {
        onSuccess({
          enrollmentId: payload.enrollmentId,
          accessToken: payload.accessToken,
        });
      } else if (payload.type === "failure") {
        onFailure(payload.message ?? "Teller Connect reported a failure.");
      } else if (payload.type === "exit") {
        onClose();
      }
    },
    [onClose, onFailure, onSuccess],
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Connect via Teller</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
        {visible ? (
          <WebView
            source={{
              html: buildConnectHtml(applicationId, environment),
              baseUrl: "https://budgetark.app",
            }}
            originWhitelist={["https://*"]}
            onMessage={handleMessage}
            javaScriptEnabled
            domStorageEnabled
            style={styles.webview}
          />
        ) : null}
      </View>
    </Modal>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: 56,
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    title: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "700",
    },
    closeText: {
      color: colors.accent,
      fontSize: 15,
      fontWeight: "600",
    },
    webview: {
      flex: 1,
      backgroundColor: "transparent",
    },
  });

export default React.memo(TellerConnectModal);
