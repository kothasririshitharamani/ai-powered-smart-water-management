import { useState } from "react";
import type { LucideIcon } from "lucide-react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { translate } from "../i18n";

interface AuthFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText(value: string): void;
  icon: LucideIcon;
  error?: string;
  keyboardType?: "default" | "phone-pad" | "decimal-pad";
  secureTextEntry?: boolean;
}

export function AuthField({
  label,
  placeholder,
  value,
  onChangeText,
  icon: Icon,
  error,
  keyboardType = "default",
  secureTextEntry = false,
}: AuthFieldProps) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPassword = secureTextEntry;

  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputFrame, error ? styles.inputError : null]}>
        <Icon color="#55746a" size={20} strokeWidth={2} />
        <TextInput
          accessibilityLabel={label}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType={keyboardType}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#82958d"
          secureTextEntry={isPassword && !passwordVisible}
          style={styles.input}
          value={value}
        />
        {isPassword ? (
          <Pressable
            accessibilityLabel={translate(
              passwordVisible ? "hidePassword" : "showPassword",
            )}
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => setPasswordVisible((visible) => !visible)}
            style={styles.visibilityButton}
          >
            {passwordVisible ? (
              <EyeOff color="#55746a" size={20} />
            ) : (
              <Eye color="#55746a" size={20} />
            )}
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    marginBottom: 17,
  },
  label: {
    color: "#24493d",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 7,
  },
  inputFrame: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#ccdad1",
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 58,
    paddingHorizontal: 15,
  },
  inputError: {
    borderColor: "#b5413d",
  },
  input: {
    color: "#163c32",
    flex: 1,
    fontSize: 17,
    minHeight: 56,
    paddingHorizontal: 12,
  },
  visibilityButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 40,
  },
  errorText: {
    color: "#a53230",
    fontSize: 14,
    marginTop: 5,
  },
});
