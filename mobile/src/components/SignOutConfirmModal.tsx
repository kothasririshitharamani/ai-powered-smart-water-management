import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { LogOut } from "lucide-react-native";

import { translate } from "../i18n";

interface SignOutConfirmModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export function SignOutConfirmModal({
  isOpen,
  onCancel,
  onConfirm,
  loading = false,
}: SignOutConfirmModalProps) {
  return (
    <Modal
      animationType="fade"
      transparent
      visible={isOpen}
      onRequestClose={onCancel}
      testID="sign-out-confirm-modal"
    >
      <View style={styles.backdrop}>
        <TouchableWithoutFeedback onPress={onCancel}>
          <View style={styles.dismissOverlay} />
        </TouchableWithoutFeedback>

        <View style={styles.dialogCard} testID="sign-out-dialog">
          <View style={styles.iconCircle}>
            <LogOut color="#b91c1c" size={28} />
          </View>

          <Text style={styles.title}>{translate("signOutConfirmTitle")}</Text>
          <Text style={styles.message}>
            {translate("signOutConfirmMessage")}
          </Text>

          <View style={styles.buttonRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={translate("cancel")}
              disabled={loading}
              onPress={onCancel}
              style={[styles.button, styles.cancelButton]}
              testID="cancel-sign-out-button"
            >
              <Text style={styles.cancelButtonText}>{translate("cancel")}</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={translate("confirmSignOut")}
              disabled={loading}
              onPress={onConfirm}
              style={[styles.button, styles.confirmButton]}
              testID="confirm-sign-out-button"
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.confirmButtonText}>
                  {translate("confirmSignOut")}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  dismissOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  dialogCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: "#4b5563",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  confirmButton: {
    backgroundColor: "#b91c1c",
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
});
