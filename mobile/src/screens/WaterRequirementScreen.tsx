import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  AlertTriangle,
  ArrowLeft,
  Calculator,
  CheckCircle2,
  Droplets,
  Info,
  RefreshCw,
  Sprout,
} from "lucide-react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";

import { AuthLayout } from "../components/AuthLayout";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAuth } from "../context/AuthContext";
import { translate } from "../i18n";
import type { RootStackParamList } from "../navigation/RootNavigator";

function formatLiters(amount: number): string {
  return amount.toLocaleString("te-IN", { maximumFractionDigits: 2 });
}

export function WaterRequirementScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    profile,
    waterEstimate,
    waterEstimateMissingFields,
    waterEstimateLoading,
    waterEstimateError,
    refreshWaterEstimate,
    calculateNewWaterEstimate,
  } = useAuth();

  const [calculating, setCalculating] = useState(false);

  async function handleRecalculate() {
    setCalculating(true);
    try {
      await calculateNewWaterEstimate();
    } catch {
      // Handled in AuthContext
    } finally {
      setCalculating(false);
    }
  }

  const isProfileIncomplete =
    (!profile?.crop ||
      !profile?.land_area ||
      profile.land_area <= 0 ||
      !profile?.crop_stage) &&
    !waterEstimate;

  return (
    <SafeAreaView style={styles.safeArea}>
      <AuthLayout
        subtitle={translate("waterRequirementSubtitle")}
        title={translate("waterRequirementTitle")}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ArrowLeft color="#15543d" size={20} />
          <Text style={styles.backText}>{translate("back")}</Text>
        </Pressable>

        {waterEstimateLoading && !waterEstimate ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#176544" size="small" />
            <Text style={styles.mutedText}>
              {translate("waterRequirementLoading")}
            </Text>
          </View>
        ) : null}

        {waterEstimateError ? (
          <View accessibilityRole="alert" style={styles.errorBox}>
            <Text style={styles.errorText}>{waterEstimateError}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void refreshWaterEstimate()}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>{translate("retry")}</Text>
            </Pressable>
          </View>
        ) : null}

        {isProfileIncomplete || (waterEstimateMissingFields.length > 0 && !waterEstimate) ? (
          <View style={styles.incompleteBox} testID="incomplete-profile-box">
            <View style={styles.incompleteIconCircle}>
              <AlertTriangle color="#922e2a" size={28} />
            </View>
            <Text style={styles.incompleteTitle}>
              {translate("incompleteProfileNotice")}
            </Text>
            <Text style={styles.incompleteMessage}>
              {translate("incompleteProfileMessage")}
            </Text>
            <PrimaryButton
              onPress={() => navigation.navigate("Profile")}
              title={translate("completeProfileButton")}
            />
          </View>
        ) : waterEstimate ? (
          <>
            {/* Primary Estimate Card */}
            <View style={styles.estimateCard} testID="water-estimate-card">
              <View style={styles.estimateHeader}>
                <View style={styles.iconCircle}>
                  <Calculator color="#176b83" size={26} />
                </View>
                <View style={styles.estimateTitleWrap}>
                  <Text style={styles.estimateLabel}>
                    {translate("estimatedWaterRequirement")}
                  </Text>
                  <Text style={styles.cropSubtitle}>
                    {waterEstimate.crop} • {waterEstimate.crop_stage}
                  </Text>
                </View>
              </View>

              <View style={styles.amountWrap}>
                <Text style={styles.amountValue}>
                  {formatLiters(waterEstimate.estimated_liters)}
                </Text>
                <Text style={styles.amountUnit}>
                  {translate("litersUnit")}
                </Text>
              </View>
            </View>

            {/* Water Balance Comparison */}
            {waterEstimate.water_balance_liters !== null ? (
              <View
                style={[
                  styles.balanceCard,
                  waterEstimate.is_sufficient
                    ? styles.balanceSufficient
                    : styles.balanceDeficit,
                ]}
                testID="water-balance-card"
              >
                <View style={styles.balanceHeader}>
                  {waterEstimate.is_sufficient ? (
                    <CheckCircle2 color="#205b3e" size={22} />
                  ) : (
                    <AlertTriangle color="#922e2a" size={22} />
                  )}
                  <Text
                    style={[
                      styles.balanceStatus,
                      waterEstimate.is_sufficient
                        ? styles.balanceStatusSufficient
                        : styles.balanceStatusDeficit,
                    ]}
                  >
                    {waterEstimate.is_sufficient
                      ? translate("sufficientWater")
                      : translate("waterDeficit")}
                  </Text>
                </View>

                <Text style={styles.balanceDetail}>
                  {waterEstimate.is_sufficient
                    ? `${translate("surplusWater")}: +${formatLiters(waterEstimate.water_balance_liters)} ${translate("litersUnit")}`
                    : `${translate("deficitWater")}: -${formatLiters(Math.abs(waterEstimate.water_balance_liters))} ${translate("litersUnit")}`}
                </Text>
                {waterEstimate.remaining_water_liters !== null ? (
                  <Text style={styles.balanceSubtext}>
                    {translate("remainingWater")}:{" "}
                    {formatLiters(waterEstimate.remaining_water_liters)}{" "}
                    {translate("litersUnit")}
                  </Text>
                ) : null}
              </View>
            ) : (
              <View style={styles.infoBox}>
                <Info color="#54756e" size={18} />
                <Text style={styles.infoText}>
                  {translate("budgetNotSetForEstimate")}
                </Text>
              </View>
            )}

            {/* Calculation Basis & Parameters */}
            <View style={styles.basisCard}>
              <View style={styles.basisHeader}>
                <Sprout color="#176544" size={20} />
                <Text style={styles.basisTitle}>
                  {translate("calculationBasis")}
                </Text>
              </View>

              <View style={styles.paramGrid}>
                <View style={styles.paramItem}>
                  <Text style={styles.paramLabel}>{translate("cropName")}</Text>
                  <Text style={styles.paramValue}>{waterEstimate.crop}</Text>
                </View>

                <View style={styles.paramItem}>
                  <Text style={styles.paramLabel}>
                    {translate("landAreaLabel")}
                  </Text>
                  <Text style={styles.paramValue}>
                    {waterEstimate.land_area_acres} {translate("acresUnit")}
                  </Text>
                </View>

                <View style={styles.paramItem}>
                  <Text style={styles.paramLabel}>
                    {translate("cropStageLabel")}
                  </Text>
                  <Text style={styles.paramValue}>
                    {waterEstimate.crop_stage}
                  </Text>
                </View>

                <View style={styles.paramItem}>
                  <Text style={styles.paramLabel}>
                    {translate("stageFactor")}
                  </Text>
                  <Text style={styles.paramValue}>
                    {waterEstimate.stage_factor}
                  </Text>
                </View>

                <View style={styles.paramItemFull}>
                  <Text style={styles.paramLabel}>
                    {translate("standardNorm")}
                  </Text>
                  <Text style={styles.paramValue}>
                    {formatLiters(waterEstimate.base_liters_per_acre)}{" "}
                    {translate("litersUnit")}/{translate("acresUnit")}
                  </Text>
                </View>

                <View style={styles.paramItemFull}>
                  <Text style={styles.paramLabel}>
                    {translate("calculationFormula")}
                  </Text>
                  <Text style={styles.formulaValue}>
                    {translate("calculationFormulaText")}
                  </Text>
                </View>
              </View>

              {/* Text explanation */}
              <View style={styles.explanationBox}>
                <Text style={styles.explanationText}>
                  {waterEstimate.explanation}
                </Text>
              </View>
            </View>

            {/* Recalculate Button */}
            <View style={styles.buttonWrap}>
              <PrimaryButton
                loading={calculating}
                onPress={() => void handleRecalculate()}
                title={translate("calculateEstimate")}
              />
            </View>
          </>
        ) : null}
      </AuthLayout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: "#edf5ee", flex: 1 },
  backButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    marginBottom: 14,
    minHeight: 48,
  },
  backText: { color: "#15543d", fontSize: 16, fontWeight: "600" },
  loadingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingVertical: 16,
  },
  mutedText: { color: "#526b61", fontSize: 15 },
  errorBox: {
    backgroundColor: "#fbe9e7",
    borderColor: "#e8bbb7",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    padding: 13,
  },
  errorText: { color: "#922e2a", fontSize: 15, lineHeight: 22 },
  retryButton: {
    alignSelf: "flex-start",
    justifyContent: "center",
    minHeight: 44,
    paddingRight: 12,
  },
  retryText: { color: "#15543d", fontSize: 16, fontWeight: "700" },
  incompleteBox: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e8bbb7",
    borderRadius: 8,
    borderWidth: 1,
    padding: 24,
    marginTop: 8,
  },
  incompleteIconCircle: {
    alignItems: "center",
    backgroundColor: "#fbe9e7",
    borderRadius: 30,
    height: 60,
    justifyContent: "center",
    marginBottom: 14,
    width: 60,
  },
  incompleteTitle: {
    color: "#922e2a",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  incompleteMessage: {
    color: "#526b61",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
    textAlign: "center",
  },
  estimateCard: {
    backgroundColor: "#ffffff",
    borderColor: "#d5e1d8",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    padding: 18,
  },
  estimateHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  iconCircle: {
    alignItems: "center",
    backgroundColor: "#e3eef4",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  estimateTitleWrap: { flex: 1 },
  estimateLabel: {
    color: "#153d33",
    fontSize: 17,
    fontWeight: "700",
  },
  cropSubtitle: {
    color: "#526b61",
    fontSize: 14,
    marginTop: 2,
  },
  amountWrap: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  amountValue: {
    color: "#176b83",
    fontSize: 32,
    fontWeight: "800",
  },
  amountUnit: {
    color: "#526b61",
    fontSize: 16,
    fontWeight: "600",
  },
  balanceCard: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
  },
  balanceSufficient: {
    backgroundColor: "#e2efe6",
    borderColor: "#b6ddc5",
  },
  balanceDeficit: {
    backgroundColor: "#fbe9e7",
    borderColor: "#e8bbb7",
  },
  balanceHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 6,
  },
  balanceStatus: {
    fontSize: 16,
    fontWeight: "700",
  },
  balanceStatusSufficient: { color: "#205b3e" },
  balanceStatusDeficit: { color: "#922e2a" },
  balanceDetail: {
    color: "#153d33",
    fontSize: 15,
    fontWeight: "600",
    marginTop: 4,
  },
  balanceSubtext: {
    color: "#526b61",
    fontSize: 13,
    marginTop: 4,
  },
  infoBox: {
    alignItems: "center",
    backgroundColor: "#e6f0f1",
    borderRadius: 8,
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
    padding: 14,
  },
  infoText: {
    color: "#315c61",
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  basisCard: {
    backgroundColor: "#ffffff",
    borderColor: "#d5e1d8",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    padding: 16,
  },
  basisHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  basisTitle: {
    color: "#153d33",
    fontSize: 17,
    fontWeight: "700",
  },
  paramGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  paramItem: {
    backgroundColor: "#f7faf7",
    borderRadius: 6,
    padding: 10,
    width: "47%",
  },
  paramItemFull: {
    backgroundColor: "#f7faf7",
    borderRadius: 6,
    padding: 10,
    width: "100%",
  },
  paramLabel: {
    color: "#64776f",
    fontSize: 13,
    marginBottom: 4,
  },
  paramValue: {
    color: "#153d33",
    fontSize: 15,
    fontWeight: "700",
  },
  formulaValue: {
    color: "#176544",
    fontSize: 14,
    fontWeight: "600",
  },
  explanationBox: {
    backgroundColor: "#edf5ee",
    borderRadius: 6,
    marginTop: 14,
    padding: 12,
  },
  explanationText: {
    color: "#24493d",
    fontSize: 14,
    lineHeight: 22,
  },
  buttonWrap: {
    marginBottom: 24,
  },
});
