import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Droplets,
  Info,
  RefreshCw,
  Scale,
  ShieldAlert,
  Sprout,
  Waves,
} from "lucide-react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";

import { AuthLayout } from "../components/AuthLayout";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAuth } from "../context/AuthContext";
import { translate } from "../i18n";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { compareCrops, getCropEfficiencyList } from "../services/cropEfficiency";
import type {
  CropComparisonResponse,
  CropEfficiencyItem,
} from "../types/auth";

function formatLiters(amount: number): string {
  return amount.toLocaleString("te-IN", { maximumFractionDigits: 2 });
}

function getEfficiencyBadge(categoryKey?: string) {
  switch (categoryKey) {
    case "very_high":
      return { bg: "#e6f4ea", color: "#15543d" };
    case "high":
      return { bg: "#e8f5ec", color: "#286e4e" };
    case "moderate":
      return { bg: "#fff8e1", color: "#855700" };
    case "low":
    default:
      return { bg: "#fce8e6", color: "#922e2a" };
  }
}

export function CropEfficiencyScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile } = useAuth();

  const [cropsList, setCropsList] = useState<CropEfficiencyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User inputs
  const [selectedCropKeys, setSelectedCropKeys] = useState<string[]>(["rice", "groundnut"]);
  const [landArea, setLandArea] = useState<string>(
    profile?.land_area && profile.land_area > 0 ? String(profile.land_area) : "1",
  );

  // Comparison result
  const [comparison, setComparison] = useState<CropComparisonResponse | null>(null);
  const [comparing, setComparing] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);

  async function fetchRegistry() {
    setLoading(true);
    setError(null);
    try {
      const data = await getCropEfficiencyList();
      setCropsList(data.crops);

      // Default selection: if farmer has a profile crop, try to match it
      if (profile?.crop && data.crops.length >= 2) {
        const profileCropName = profile.crop.toLowerCase().trim();
        const matched = data.crops.find(
          (c) =>
            c.crop_name_te.includes(profileCropName) ||
            profileCropName.includes(c.crop_key) ||
            c.crop_key === profileCropName,
        );
        if (matched) {
          const alternate = data.crops.find((c) => c.crop_key !== matched.crop_key);
          if (alternate) {
            setSelectedCropKeys([matched.crop_key, alternate.crop_key]);
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : translate("requestFailed");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchRegistry();
  }, []);

  function toggleCropSelection(key: string) {
    setComparisonError(null);
    setSelectedCropKeys((prev) => {
      if (prev.includes(key)) {
        return prev.filter((k) => k !== key);
      } else {
        if (prev.length >= 4) {
          setComparisonError(translate("maxCropsAllowedError"));
          return prev;
        }
        return [...prev, key];
      }
    });
  }

  async function handleCompare() {
    setComparisonError(null);
    if (selectedCropKeys.length < 2) {
      setComparisonError(translate("minCropsRequiredError"));
      return;
    }

    const areaNum = parseFloat(landArea.trim());
    if (isNaN(areaNum) || areaNum <= 0) {
      setComparisonError(translate("enterValidLiters"));
      return;
    }

    setComparing(true);
    try {
      const result = await compareCrops({
        crop_keys: selectedCropKeys,
        land_area_acres: areaNum,
      });
      setComparison(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : translate("requestFailed");
      setComparisonError(msg);
    } finally {
      setComparing(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AuthLayout
        subtitle={translate("cropEfficiencySubtitle")}
        title={translate("cropEfficiencyTitle")}
      >
        {/* Back Button */}
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ArrowLeft color="#15543d" size={20} />
          <Text style={styles.backText}>{translate("back")}</Text>
        </Pressable>

        {/* Decision Support Disclaimer Alert Banner */}
        <View style={styles.disclaimerBox} testID="decision-support-banner">
          <View style={styles.disclaimerHeaderRow}>
            <Info color="#855700" size={18} />
            <Text style={styles.disclaimerTitle}>
              {translate("cropEfficiencyDecisionSupport")}
            </Text>
          </View>
          <Text style={styles.disclaimerText}>
            {translate("cropEfficiencyDisclaimer")}
          </Text>
        </View>

        {/* Loading Spinner */}
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#176544" size="small" />
            <Text style={styles.mutedText}>
              {translate("cropEfficiencyLoadingText")}
            </Text>
          </View>
        ) : null}

        {/* Error Box */}
        {error ? (
          <View accessibilityRole="alert" style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void fetchRegistry()}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>{translate("retry")}</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Farm Area Input */}
        <View style={styles.card}>
          <Text style={styles.inputLabel}>{translate("farmAreaInputLabel")}</Text>
          <TextInput
            keyboardType="numeric"
            onChangeText={setLandArea}
            placeholder="1.0"
            placeholderTextColor="#7a8b82"
            style={styles.textInput}
            testID="farm-area-input"
            value={landArea}
          />
        </View>

        {/* Crop Selection Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            {translate("selectCropsInstruction")}
          </Text>
          <Text style={styles.sectionCounter}>
            {selectedCropKeys.length} / 4
          </Text>
        </View>

        <View style={styles.cropsGrid}>
          {cropsList.map((crop) => {
            const isSelected = selectedCropKeys.includes(crop.crop_key);
            const badge = getEfficiencyBadge(crop.efficiency_category_key);

            return (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                key={crop.crop_key}
                onPress={() => toggleCropSelection(crop.crop_key)}
                style={[
                  styles.cropChip,
                  isSelected && styles.cropChipSelected,
                ]}
                testID={`crop-select-chip-${crop.crop_key}`}
              >
                <View style={styles.chipHeaderRow}>
                  <View style={styles.chipTitleWrap}>
                    <Text style={[styles.chipTitle, isSelected && styles.chipTitleSelected]}>
                      {crop.crop_name_te}
                    </Text>
                    <Text style={styles.chipSubtitle}>
                      {formatLiters(crop.water_requirement_liters_per_acre)} {translate("litersUnit")}/{translate("acresUnit")}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.checkboxCircle,
                      isSelected && styles.checkboxCircleSelected,
                    ]}
                  >
                    {isSelected ? <Check color="#ffffff" size={14} /> : null}
                  </View>
                </View>

                <View style={styles.chipFooterRow}>
                  <View style={[styles.categoryBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.categoryBadgeText, { color: badge.color }]}>
                      {crop.efficiency_category_te}
                    </Text>
                  </View>
                  <Text style={styles.droughtTag}>
                    కరువు: {crop.drought_resilience_te}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Comparison Error */}
        {comparisonError ? (
          <View accessibilityRole="alert" style={styles.errorBox}>
            <Text style={styles.errorText}>{comparisonError}</Text>
          </View>
        ) : null}

        {/* Compare Button */}
        <View style={styles.compareButtonWrap}>
          <PrimaryButton
            disabled={comparing || selectedCropKeys.length < 2}
            onPress={handleCompare}
            testID="compare-crops-button"
            title={
              comparing
                ? translate("comparingCrops")
                : translate("compareCropsButton")
            }
          />
        </View>

        {/* Comparison Results Card */}
        {comparison ? (
          <View style={styles.comparisonContainer} testID="comparison-results-card">
            <View style={styles.resultsHeaderRow}>
              <View style={styles.resultsIconCircle}>
                <Scale color="#15543d" size={22} />
              </View>
              <View style={styles.resultsTitleWrap}>
                <Text style={styles.resultsTitle}>
                  {translate("comparisonResultsTitle")}
                </Text>
                <Text style={styles.resultsAreaSubtitle}>
                  {comparison.land_area_acres} {translate("acresUnit")} పొలానికి అంచనా
                </Text>
              </View>
            </View>

            {/* High level savings banner */}
            <View style={styles.savingsBanner}>
              <Text style={styles.savingsBannerTitle}>
                {translate("waterDifferenceLabel")}:
              </Text>
              <Text style={styles.savingsBannerValue}>
                {formatLiters(comparison.max_water_savings_liters)} {translate("litersUnit")}{" "}
                ({comparison.max_water_savings_percent}% ఆదా)
              </Text>
              <Text style={styles.savingsBannerSub}>
                {comparison.most_water_efficient.crop_name_te} ఎంపిక చేసుకోవడం ద్వారా
              </Text>
            </View>

            {/* Detailed Crop Cards */}
            {comparison.selected_crops.map((crop) => {
              const badge = getEfficiencyBadge(crop.efficiency_category_key);
              const isMostEfficient =
                crop.crop_key === comparison.most_water_efficient.crop_key;

              return (
                <View
                  key={crop.crop_key}
                  style={[
                    styles.resultCard,
                    isMostEfficient && styles.mostEfficientResultCard,
                  ]}
                  testID={`crop-comparison-detail-${crop.crop_key}`}
                >
                  <View style={styles.resultCardHeader}>
                    <View style={styles.cropTitleWrap}>
                      <Sprout color="#15543d" size={20} />
                      <Text style={styles.resultCropName}>
                        {crop.crop_name_te}
                      </Text>
                    </View>
                    <View style={[styles.categoryBadge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.categoryBadgeText, { color: badge.color }]}>
                        {crop.efficiency_category_te}
                      </Text>
                    </View>
                  </View>

                  {/* Water Requirements */}
                  <View style={styles.metricsRow}>
                    <View style={styles.metricBlock}>
                      <Text style={styles.metricBlockLabel}>
                        {translate("waterRequiredForFarm")}
                      </Text>
                      <Text style={styles.metricBlockValue}>
                        {formatLiters(crop.total_water_liters || 0)} {translate("litersUnit")}
                      </Text>
                    </View>
                    <View style={styles.metricBlock}>
                      <Text style={styles.metricBlockLabel}>
                        {translate("waterSavingsVsPaddyLabel")}
                      </Text>
                      <Text
                        style={[
                          styles.metricBlockValue,
                          {
                            color:
                              crop.water_savings_vs_paddy_percent > 0
                                ? "#15543d"
                                : "#922e2a",
                          },
                        ]}
                      >
                        {crop.water_savings_vs_paddy_percent > 0 ? "+" : ""}
                        {crop.water_savings_vs_paddy_percent}%
                      </Text>
                    </View>
                  </View>

                  {/* Cultivable with remaining water (if budget exists) */}
                  {crop.cultivable_acres_with_remaining_water !== null &&
                  crop.cultivable_acres_with_remaining_water !== undefined ? (
                    <View style={styles.cultivableRow}>
                      <Droplets color="#176b83" size={16} />
                      <Text style={styles.cultivableText}>
                        {translate("cultivableWithRemainingWater")}:{" "}
                        <Text style={styles.cultivableValue}>
                          {crop.cultivable_acres_with_remaining_water} {translate("acresUnit")}
                        </Text>
                      </Text>
                    </View>
                  ) : null}

                  {/* Agronomic Details */}
                  <View style={styles.agronomicDetails}>
                    <Text style={styles.agronomicLine}>
                      • {translate("durationLabel")}: {crop.duration_days}
                    </Text>
                    <Text style={styles.agronomicLine}>
                      • {translate("droughtResilienceLabel")}: {crop.drought_resilience_te}
                    </Text>
                    <Text style={styles.agronomicLine}>
                      • {translate("seasonLabel")}: {crop.season_te}
                    </Text>
                    <Text style={styles.agronomicLine}>
                      • {translate("soilSuitabilityLabel")}: {crop.soil_suitability_te}
                    </Text>
                    <Text style={styles.keyBenefitLine}>
                      {crop.key_benefit_te}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {/* Source Reference Footer */}
        <View style={styles.sourceFooter}>
          <Text style={styles.sourceFooterText}>
            {translate("cropEfficiencySource")}
          </Text>
        </View>
      </AuthLayout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f8f5",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 6,
    alignSelf: "flex-start",
  },
  backText: {
    fontSize: 14,
    color: "#15543d",
    fontWeight: "600",
  },
  disclaimerBox: {
    backgroundColor: "#fff8e1",
    borderColor: "#ffe082",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  disclaimerHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  disclaimerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#855700",
  },
  disclaimerText: {
    fontSize: 12,
    color: "#6d4c00",
    lineHeight: 18,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginVertical: 12,
  },
  mutedText: {
    color: "#466255",
    fontSize: 14,
  },
  errorBox: {
    backgroundColor: "#fce8e6",
    borderColor: "#f5c2be",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#922e2a",
    fontSize: 14,
    marginBottom: 8,
  },
  retryButton: {
    alignSelf: "flex-start",
    backgroundColor: "#922e2a",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e1ebe5",
    padding: 14,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    color: "#466255",
    marginBottom: 6,
    fontWeight: "600",
  },
  textInput: {
    backgroundColor: "#f9fcf9",
    borderWidth: 1,
    borderColor: "#c8d9ce",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#13231b",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#13231b",
    flex: 1,
  },
  sectionCounter: {
    fontSize: 13,
    fontWeight: "600",
    color: "#15543d",
  },
  cropsGrid: {
    gap: 10,
    marginBottom: 16,
  },
  cropChip: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d5dfd9",
    padding: 12,
  },
  cropChipSelected: {
    borderColor: "#15543d",
    backgroundColor: "#f4fbf7",
  },
  chipHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  chipTitleWrap: {
    flex: 1,
  },
  chipTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#13231b",
    marginBottom: 2,
  },
  chipTitleSelected: {
    color: "#15543d",
  },
  chipSubtitle: {
    fontSize: 12,
    color: "#537162",
  },
  checkboxCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#a6b9af",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  checkboxCircleSelected: {
    backgroundColor: "#15543d",
    borderColor: "#15543d",
  },
  chipFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  droughtTag: {
    fontSize: 11,
    color: "#537162",
  },
  compareButtonWrap: {
    marginBottom: 20,
  },
  comparisonContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d5dfd9",
    padding: 16,
    marginBottom: 20,
  },
  resultsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  resultsIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e8f5ec",
    alignItems: "center",
    justifyContent: "center",
  },
  resultsTitleWrap: {
    flex: 1,
  },
  resultsTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#13231b",
  },
  resultsAreaSubtitle: {
    fontSize: 13,
    color: "#537162",
  },
  savingsBanner: {
    backgroundColor: "#e8f5ec",
    borderColor: "#b6ddc7",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  savingsBannerTitle: {
    fontSize: 12,
    color: "#15543d",
    fontWeight: "600",
    marginBottom: 4,
  },
  savingsBannerValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#15543d",
    marginBottom: 4,
  },
  savingsBannerSub: {
    fontSize: 12,
    color: "#286e4e",
  },
  resultCard: {
    backgroundColor: "#f9fcf9",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e1ebe5",
    padding: 14,
    marginBottom: 12,
  },
  mostEfficientResultCard: {
    borderColor: "#b6ddc7",
    backgroundColor: "#f2f9f5",
  },
  resultCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cropTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  resultCropName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#13231b",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 10,
  },
  metricBlock: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e8edea",
  },
  metricBlockLabel: {
    fontSize: 11,
    color: "#6b8376",
    marginBottom: 4,
  },
  metricBlockValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#13231b",
  },
  cultivableRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#e8f1f5",
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  cultivableText: {
    fontSize: 12,
    color: "#176b83",
  },
  cultivableValue: {
    fontWeight: "700",
  },
  agronomicDetails: {
    gap: 4,
  },
  agronomicLine: {
    fontSize: 12,
    color: "#466255",
    lineHeight: 18,
  },
  keyBenefitLine: {
    fontSize: 12,
    color: "#15543d",
    fontStyle: "italic",
    marginTop: 4,
  },
  sourceFooter: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  sourceFooterText: {
    fontSize: 12,
    color: "#7a8b82",
    textAlign: "center",
  },
});
