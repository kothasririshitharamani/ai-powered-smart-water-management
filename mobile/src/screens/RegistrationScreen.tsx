import { useState } from "react";
import {
  LockKeyhole,
  MapPin,
  Phone,
  Sprout,
  UserRound,
} from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";

import { ApiError } from "../api/client";
import { AuthField } from "../components/AuthField";
import { AuthLayout } from "../components/AuthLayout";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAuth } from "../context/AuthContext";
import { translate } from "../i18n";
import type { FarmerRegistration } from "../types/auth";
import type { RootStackParamList } from "../navigation/RootNavigator";

type RegistrationValues = Omit<FarmerRegistration, "preferred_language">;
type FieldErrors = Partial<Record<keyof RegistrationValues, string>>;

export function RegistrationScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { register, clearStartupMessage } = useAuth();
  const [values, setValues] = useState<RegistrationValues>({
    name: "",
    mobile: "",
    password: "",
    village: "",
    district: "",
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function updateField(field: keyof RegistrationValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function submit() {
    setError(null);
    clearStartupMessage();
    const errors: FieldErrors = {};
    if (!values.name.trim()) errors.name = translate("requiredField");
    if (!/^[6-9]\d{9}$/.test(values.mobile.trim())) {
      errors.mobile = translate("mobileInvalid");
    }
    if (values.password.length < 8) {
      errors.password = translate("passwordTooShort");
    } else if (values.password.length > 1024) {
      errors.password = translate("passwordTooLong");
    }
    if (!values.village.trim()) errors.village = translate("requiredField");
    if (!values.district.trim()) errors.district = translate("requiredField");
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setBusy(true);
    try {
      const details: FarmerRegistration = {
        ...values,
        name: values.name.trim(),
        mobile: values.mobile.trim(),
        village: values.village.trim(),
        district: values.district.trim(),
        preferred_language: "తెలుగు",
      };
      await register(details);
      navigation.replace("Login", { registered: true });
    } catch (registrationError) {
      setError(
        registrationError instanceof ApiError
          ? registrationError.message
          : translate("requestFailed"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AuthLayout
        title={translate("registerTitle")}
        subtitle={translate("registerSubtitle")}
      >
        {error ? (
          <View accessibilityRole="alert" style={styles.errorNotice}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        <AuthField
          error={fieldErrors.name}
          icon={UserRound}
          label={translate("name")}
          onChangeText={(value) => updateField("name", value)}
          placeholder={translate("namePlaceholder")}
          value={values.name}
        />
        <AuthField
          error={fieldErrors.mobile}
          icon={Phone}
          keyboardType="phone-pad"
          label={translate("mobile")}
          onChangeText={(value) => updateField("mobile", value)}
          placeholder={translate("mobilePlaceholder")}
          value={values.mobile}
        />
        <AuthField
          error={fieldErrors.password}
          icon={LockKeyhole}
          label={translate("password")}
          onChangeText={(value) => updateField("password", value)}
          placeholder={translate("passwordPlaceholder")}
          secureTextEntry
          value={values.password}
        />
        <AuthField
          error={fieldErrors.village}
          icon={Sprout}
          label={translate("village")}
          onChangeText={(value) => updateField("village", value)}
          placeholder={translate("villagePlaceholder")}
          value={values.village}
        />
        <AuthField
          error={fieldErrors.district}
          icon={MapPin}
          label={translate("district")}
          onChangeText={(value) => updateField("district", value)}
          placeholder={translate("districtPlaceholder")}
          value={values.district}
        />
        <PrimaryButton
          loading={busy}
          onPress={() => void submit()}
          title={translate("registerAction")}
        />
        <View style={styles.footer}>
          <Text style={styles.footerLabel}>{translate("hasAccount")}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate("Login")}
            style={styles.linkTarget}
          >
            <Text style={styles.link}>{translate("goToLogin")}</Text>
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
  errorNotice: {
    backgroundColor: "#fbe9e7",
    borderColor: "#e8bbb7",
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 17,
    padding: 13,
  },
  errorText: {
    color: "#922e2a",
    fontSize: 15,
    lineHeight: 22,
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 14,
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
