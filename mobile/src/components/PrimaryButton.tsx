import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { ArrowRight, LogOut } from "lucide-react-native";

interface PrimaryButtonProps {
  title: string;
  onPress(): void;
  loading?: boolean;
  disabled?: boolean;
  logout?: boolean;
  testID?: string;
}

export function PrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  logout = false,
  testID,
}: PrimaryButtonProps) {
  const unavailable = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: unavailable, busy: loading }}
      disabled={unavailable}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        unavailable ? styles.disabled : null,
        pressed && !unavailable ? styles.pressed : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#ffffff" />
      ) : logout ? (
        <LogOut color="#ffffff" size={21} />
      ) : null}
      <Text style={styles.text}>{title}</Text>
      {!loading && !logout ? <ArrowRight color="#ffffff" size={20} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: "#176544",
    borderRadius: 14,
    flexDirection: "row",
    gap: 12,
    height: 58,
    justifyContent: "center",
    marginTop: 8,
    paddingHorizontal: 20,
  },
  disabled: {
    opacity: 0.62,
  },
  pressed: {
    backgroundColor: "#104b34",
  },
  text: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
});
