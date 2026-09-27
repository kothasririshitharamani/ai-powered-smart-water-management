import { useState } from "react";
import { Phone, LockKeyhole } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";

import { ApiError } from "../api/client";
import { AuthField } from "../components/AuthField";
import { AuthLayout } from "../components/AuthLayout";
import { PrimaryButton } from "../components/PrimaryButton";
import { translate } from "../i18n";
import { useAuth } from "../context/AuthContext";
import type { RootStackParamList } from "../navigation/RootNavigator";

export function LoginScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "Login">>();
  const { login, startupMessage, retryRestore, clearStartupMessage } =
    useAuth();
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [mobileError, setMobileError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setMobileError(undefined);
    setPasswordError(undefined);
    clearStartupMessage();

    const normalizedMobile = mobile.trim();
    let valid = true;
    if (!/^[6-9]\d{9}$/.test(normalizedMobile)) {
      setMobileError(translate("mobileInvalid"));
      valid = false;
    }
    if (!password) {
      setPasswordError(translate("requiredField"));
      valid = false;
    }
    if (!valid) return;

    setBusy(true);
    try {
      await login({ mobile: normalizedMobile, password });
    } catch (loginError) {
      setError(
        loginError instanceof ApiError
          ? loginError.message
          : translate("requestFailed"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AuthLayout
        title={translate("loginTitle")}
        subtitle={translate("loginSubtitle")}
      >
        {route.params?.registered ? (
          <View accessibilityRole="alert" style={styles.successNotice}>
            <Text style={styles.successText}>
              {translate("registrationSuccess")}
            </Text>
          </View>
        ) : null}
        {startupMessage ? (
          <View accessibilityRole="alert" style={styles.infoNotice}>
            <Text style={styles.infoText}>{startupMessage}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void retryRestore()}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>{translate("retry")}</Text>
            </Pressable>
          </View>
        ) : null}
        {error ? (
          <View accessibilityRole="alert" style={styles.errorNotice}>
            <Text style={styles.errorNoticeText}>{error}</Text>
          </View>
        ) : null}
        <AuthField
          error={mobileError}
          icon={Phone}
          keyboardType="phone-pad"
          label={translate("mobile")}
          onChangeText={setMobile}
          placeholder={translate("mobilePlaceholder")}
          value={mobile}
        />
        <AuthField
          error={passwordError}
          icon={LockKeyhole}
          label={translate("password")}
          onChangeText={setPassword}
          placeholder={translate("passwordPlaceholder")}
          secureTextEntry
          value={password}
        />
        <PrimaryButton
          loading={busy}
          onPress={() => void submit()}
          title={translate("loginAction")}
        />
        <View style={styles.footer}>
          <Text style={styles.footerLabel}>{translate("noAccount")}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate("Register")}
            style={styles.linkTarget}
          >
            <Text style={styles.link}>{translate("createAccount")}</Text>
          </Pressable>
        </View>
      </AuthLayout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#edf5ee",
    flex: 1,
  },
  successNotice: {
    backgroundColor: "#e0f1e5",
    borderColor: "#b5d9bf",
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 17,
    padding: 13,
  },
  successText: {
    color: "#205b3e",
    fontSize: 15,
    lineHeight: 22,
  },
  infoNotice: {
    backgroundColor: "#e8f1f1",
    borderColor: "#c7dada",
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 17,
    padding: 13,
  },
  infoText: {
    color: "#315c61",
    fontSize: 15,
    lineHeight: 22,
  },
  retryButton: {
    alignSelf: "flex-start",
    minHeight: 42,
    justifyContent: "center",
    paddingRight: 12,
    marginTop: 3,
  },
  retryText: {
    color: "#15543d",
    fontSize: 16,
    fontWeight: "700",
  },
  errorNotice: {
    backgroundColor: "#fbe9e7",
    borderColor: "#e8bbb7",
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 17,
    padding: 13,
  },
  errorNoticeText: {
    color: "#922e2a",
    fontSize: 15,
    lineHeight: 22,
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 18,
    minHeight: 48,
  },
  footerLabel: {
    color: "#526b61",
    fontSize: 15,
  },
  linkTarget: {
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 9,
  },
  link: {
    color: "#15543d",
    fontSize: 16,
    fontWeight: "700",
  },
});
