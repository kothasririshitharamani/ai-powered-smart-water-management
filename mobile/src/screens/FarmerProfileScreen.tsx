import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Droplets,
  MapPin,
  Phone,
  Sprout,
  UserRound,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";

import { ApiError } from "../api/client";
import { AuthField } from "../components/AuthField";
import { AuthLayout } from "../components/AuthLayout";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAuth } from "../context/AuthContext";
import { translate } from "../i18n";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { isFarmerProfileComplete } from "../services/profile";
import {
  WATER_SOURCE_OPTIONS,
  type FarmerProfile,
  type FarmerProfileUpdate,
  type WaterSource,
} from "../types/auth";

type ProfileForm = {
  name: string;
  village: string;
  district: string;
  crop: string;
  land_area: string;
  crop_stage: string;
  water_source: WaterSource | null;
  available_water: string;
};

type FieldName = keyof ProfileForm;
type FieldErrors = Partial<Record<FieldName, string>>;

function formFromProfile(profile: FarmerProfile | null): ProfileForm {
  return {
    name: profile?.name ?? "",
    village: profile?.village ?? "",
    district: profile?.district ?? "",
    crop: profile?.crop ?? "",
    land_area: profile?.land_area?.toString() ?? "",
    crop_stage: profile?.crop_stage ?? "",
    water_source: profile?.water_source ?? null,
    available_water: profile?.available_water?.toString() ?? "",
  };
}

export function FarmerProfileScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, profile, refreshProfile, saveProfile } = useAuth();
  const [setupFlow] = useState(() => !isFarmerProfileComplete(profile));
  const [form, setForm] = useState<ProfileForm>(() => formFromProfile(profile));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    void refreshProfile()
      .then((loadedProfile) => {
        if (active) setForm(formFromProfile(loadedProfile));
      })
      .catch((loadFailure: unknown) => {
        if (active) {
          setLoadError(
            loadFailure instanceof ApiError
              ? loadFailure.message
              : translate("profileLoadError"),
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshProfile, retryCount]);

  function updateField(field: FieldName, value: string | WaterSource | null) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setError(null);
    setSuccess(null);
  }

  function validate(): FarmerProfileUpdate | null {
    const errors: FieldErrors = {};
    const requiredText: Array<
      [
        keyof Pick<
          ProfileForm,
          "name" | "village" | "district" | "crop" | "crop_stage"
        >,
        string,
      ]
    > = [
      ["name", form.name],
      ["village", form.village],
      ["district", form.district],
      ["crop", form.crop],
      ["crop_stage", form.crop_stage],
    ];
    for (const [field, value] of requiredText) {
      if (!value.trim()) errors[field] = translate("requiredField");
    }

    const landArea = Number(form.land_area);
    if (!form.land_area.trim()) {
      errors.land_area = translate("requiredField");
    } else if (!Number.isFinite(landArea)) {
      errors.land_area = translate("invalidNumber");
    } else if (landArea < 0) {
      errors.land_area = translate("nonnegativeNumber");
    }

    const availableWater = Number(form.available_water);
    if (!form.available_water.trim()) {
      errors.available_water = translate("requiredField");
    } else if (!Number.isFinite(availableWater)) {
      errors.available_water = translate("invalidNumber");
    } else if (availableWater < 0) {
      errors.available_water = translate("nonnegativeNumber");
    }

    if (!form.water_source) errors.water_source = translate("requiredField");
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || !form.water_source) return null;

    return {
      name: form.name.trim(),
      village: form.village.trim(),
      district: form.district.trim(),
      crop: form.crop.trim(),
      land_area: landArea,
      crop_stage: form.crop_stage.trim(),
      water_source: form.water_source,
      available_water: availableWater,
      preferred_language: "తెలుగు",
    };
  }

  async function submit() {
    setError(null);
    setSuccess(null);
    const details = validate();
    if (!details) return;

    setSaving(true);
    try {
      await saveProfile(details);
      setSuccess(translate("profileSaveSuccess"));
      if (setupFlow) navigation.replace("Authenticated");
    } catch (saveFailure) {
      setError(
        saveFailure instanceof ApiError
          ? saveFailure.message
          : translate("requestFailed"),
      );
    } finally {
      setSaving(false);
    }
  }

  const isSetup = !isFarmerProfileComplete(profile);

  return (
    <SafeAreaView style={styles.safeArea}>
      <AuthLayout
        title={translate(isSetup ? "profileSetupTitle" : "profileEditTitle")}
        subtitle={translate("profileSubtitle")}
      >
        {!isSetup ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <ArrowLeft color="#15543d" size={20} />
            <Text style={styles.backText}>{translate("back")}</Text>
          </Pressable>
        ) : null}

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color="#176544" size="large" />
            <Text style={styles.loadingText}>
              {translate("profileLoading")}
            </Text>
          </View>
        ) : loadError ? (
          <View accessibilityRole="alert" style={styles.errorNotice}>
            <Text style={styles.noticeText}>{loadError}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setRetryCount((count) => count + 1)}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>{translate("retry")}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.mobileCard}>
              <View style={styles.mobileIcon}>
                <Phone color="#23624b" size={20} />
              </View>
              <View style={styles.mobileCopy}>
                <Text style={styles.mobileLabel}>{translate("mobile")}</Text>
                <Text style={styles.mobileValue}>{user?.mobile}</Text>
              </View>
            </View>

            <AuthField
              error={fieldErrors.name}
              icon={UserRound}
              label={translate("name")}
              onChangeText={(value) => updateField("name", value)}
              placeholder={translate("namePlaceholder")}
              value={form.name}
            />
            <AuthField
              error={fieldErrors.village}
              icon={Sprout}
              label={translate("village")}
              onChangeText={(value) => updateField("village", value)}
              placeholder={translate("villagePlaceholder")}
              value={form.village}
            />
            <AuthField
              error={fieldErrors.district}
              icon={MapPin}
              label={translate("district")}
              onChangeText={(value) => updateField("district", value)}
              placeholder={translate("districtPlaceholder")}
              value={form.district}
            />
            <AuthField
              error={fieldErrors.crop}
              icon={Sprout}
              label={translate("crop")}
              onChangeText={(value) => updateField("crop", value)}
              placeholder={translate("cropPlaceholder")}
              value={form.crop}
            />
            <AuthField
              error={fieldErrors.land_area}
              icon={MapPin}
              keyboardType="decimal-pad"
              label={translate("landArea")}
              onChangeText={(value) => updateField("land_area", value)}
              placeholder={translate("landAreaPlaceholder")}
              value={form.land_area}
            />
            <AuthField
              error={fieldErrors.crop_stage}
              icon={Sprout}
              label={translate("cropStage")}
              onChangeText={(value) => updateField("crop_stage", value)}
              placeholder={translate("cropStagePlaceholder")}
              value={form.crop_stage}
            />

            <View style={styles.sourceGroup}>
              <View style={styles.sectionHeading}>
                <Droplets color="#23624b" size={20} />
                <Text style={styles.sectionLabel}>
                  {translate("waterSource")}
                </Text>
              </View>
              <Text style={styles.sourceHint}>
                {translate("chooseWaterSource")}
              </Text>
              <View style={styles.sourceOptions}>
                {WATER_SOURCE_OPTIONS.map((source) => {
                  const selected = form.water_source === source;
                  return (
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      key={source}
                      onPress={() => updateField("water_source", source)}
                      style={[
                        styles.sourceOption,
                        selected && styles.sourceSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.sourceText,
                          selected && styles.sourceTextSelected,
                        ]}
                      >
                        {source}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {fieldErrors.water_source ? (
                <Text style={styles.fieldError}>
                  {fieldErrors.water_source}
                </Text>
              ) : null}
            </View>

            <AuthField
              error={fieldErrors.available_water}
              icon={Droplets}
              keyboardType="decimal-pad"
              label={translate("availableWater")}
              onChangeText={(value) => updateField("available_water", value)}
              placeholder={translate("availableWaterPlaceholder")}
              value={form.available_water}
            />

            {error ? (
              <View accessibilityRole="alert" style={styles.errorNotice}>
                <Text style={styles.noticeText}>{error}</Text>
              </View>
            ) : null}
            {success ? (
              <View accessibilityRole="alert" style={styles.successNotice}>
                <Text style={styles.successText}>{success}</Text>
              </View>
            ) : null}
            <View style={styles.languageRow}>
              <Text style={styles.languageLabel}>
                {translate("preferredLanguage")}
              </Text>
              <Text style={styles.languageValue}>తెలుగు</Text>
            </View>
            <PrimaryButton
              disabled={loading}
              loading={saving}
              onPress={() => void submit()}
              title={translate("profileSave")}
            />
          </>
        )}
      </AuthLayout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#edf5ee",
    flex: 1,
  },
  backButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 7,
    marginBottom: 18,
    minHeight: 48,
    paddingRight: 12,
  },
  backText: {
    color: "#15543d",
    fontSize: 16,
    fontWeight: "600",
  },
  mobileCard: {
    alignItems: "center",
    backgroundColor: "#e4f0e8",
    borderColor: "#c8ddce",
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    gap: 13,
    marginBottom: 20,
    minHeight: 72,
    paddingHorizontal: 15,
  },
  mobileIcon: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  mobileCopy: {
    flex: 1,
  },
  mobileLabel: {
    color: "#526b61",
    fontSize: 14,
  },
  mobileValue: {
    color: "#153d33",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 3,
  },
  loadingState: {
    alignItems: "center",
    minHeight: 220,
    justifyContent: "center",
  },
  loadingText: {
    color: "#526b61",
    fontSize: 16,
    marginTop: 14,
  },
  errorNotice: {
    backgroundColor: "#fbe9e7",
    borderColor: "#e8bbb7",
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 17,
    padding: 13,
  },
  noticeText: {
    color: "#922e2a",
    fontSize: 15,
    lineHeight: 22,
  },
  retryButton: {
    alignSelf: "flex-start",
    justifyContent: "center",
    minHeight: 44,
    paddingRight: 12,
    marginTop: 4,
  },
  retryText: {
    color: "#15543d",
    fontSize: 16,
    fontWeight: "700",
  },
  sourceGroup: {
    marginBottom: 18,
  },
  sectionHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  sectionLabel: {
    color: "#24493d",
    fontSize: 16,
    fontWeight: "600",
  },
  sourceHint: {
    color: "#526b61",
    fontSize: 14,
    marginTop: 6,
    marginBottom: 9,
  },
  sourceOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sourceOption: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#ccdad1",
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    minWidth: "30%",
    paddingHorizontal: 12,
  },
  sourceSelected: {
    backgroundColor: "#d8efe0",
    borderColor: "#176544",
    borderWidth: 2,
  },
  sourceText: {
    color: "#24493d",
    fontSize: 15,
  },
  sourceTextSelected: {
    color: "#15543d",
    fontWeight: "700",
  },
  fieldError: {
    color: "#a53230",
    fontSize: 14,
    marginTop: 5,
  },
  successNotice: {
    backgroundColor: "#e0f1e5",
    borderColor: "#b5d9bf",
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    padding: 13,
  },
  successText: {
    color: "#205b3e",
    fontSize: 15,
    lineHeight: 22,
  },
  languageRow: {
    alignItems: "center",
    borderTopColor: "#d5e1d8",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingTop: 15,
  },
  languageLabel: {
    color: "#24493d",
    fontSize: 16,
    fontWeight: "600",
  },
  languageValue: {
    color: "#15543d",
    fontSize: 17,
    fontWeight: "700",
  },
});
