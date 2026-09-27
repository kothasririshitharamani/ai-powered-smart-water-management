import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CloudRain,
  Info,
  RefreshCw,
  ShieldAlert,
  Sun,
  Waves,
  Wind,
} from "lucide-react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";

import { AuthLayout } from "../components/AuthLayout";
import { translate } from "../i18n";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { fetchDisasterPreparedness } from "../services/disasterPreparedness";
import type {
  DisasterPreparednessResponse,
  DisasterCategoryItem,
  ActiveAlertGuidance,
} from "../types/auth";

type DisasterNavProp = NativeStackNavigationProp<
  RootStackParamList,
  "DisasterPreparedness"
>;

export function DisasterPreparednessScreen() {
  const navigation = useNavigation<DisasterNavProp>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [data, setData] = useState<DisasterPreparednessResponse | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  const loadPreparedness = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setErrorMessage(null);

    try {
      const response = await fetchDisasterPreparedness();
      setData(response);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : translate("disasterErrorText");
      setErrorMessage(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPreparedness();
  }, [loadPreparedness]);

  const renderCategoryIcon = (categoryKey: string) => {
    switch (categoryKey) {
      case "flood":
        return <Waves size={24} color="#0284c7" />;
      case "drought":
        return <Sun size={24} color="#d97706" />;
      case "cyclone":
        return <Wind size={24} color="#7c3aed" />;
      default:
        return <ShieldAlert size={24} color="#15803d" />;
    }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return { bg: "#fee2e2", text: "#b91c1c", border: "#f87171" };
      case "high":
        return { bg: "#ffedd5", text: "#c2410c", border: "#fb923c" };
      case "medium":
        return { bg: "#fef9c3", text: "#a16207", border: "#fde047" };
      default:
        return { bg: "#e0f2fe", text: "#0369a1", border: "#7dd3fc" };
    }
  };

  const filteredCategories: DisasterCategoryItem[] =
    data?.general_categories?.filter((cat) => {
      if (selectedFilter === "all") return true;
      return cat.category_key === selectedFilter;
    }) || [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <AuthLayout
        title={translate("disasterPreparednessTitle")}
        subtitle={translate("disasterPreparednessSubtitle")}
      >
        <View style={styles.header}>
          <Pressable
            testID="disaster-back-button"
            accessibilityRole="button"
            accessibilityLabel={translate("back")}
            style={styles.headerIconButton}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={22} color="#1f2937" />
          </Pressable>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>
              {translate("disasterPreparednessTitle")}
            </Text>
            <Text style={styles.headerSubtitle}>
              {translate("disasterPreparednessSubtitle")}
            </Text>
          </View>

          <Pressable
            testID="disaster-refresh-button"
            accessibilityRole="button"
            accessibilityLabel={translate("refresh")}
            style={styles.headerIconButton}
            onPress={() => loadPreparedness(true)}
            disabled={loading || refreshing}
          >
            <RefreshCw
              size={20}
              color={refreshing ? "#9ca3af" : "#15803d"}
            />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator
              testID="disaster-loading-indicator"
              size="large"
              color="#15803d"
            />
            <Text style={styles.loadingText}>
              {translate("disasterLoadingText")}
            </Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.centerContainer}>
            <AlertTriangle size={48} color="#ef4444" />
            <Text
              testID="disaster-error-message"
              style={styles.errorText}
            >
              {errorMessage}
            </Text>
            <Pressable
              style={styles.retryButton}
              onPress={() => loadPreparedness()}
            >
              <Text style={styles.retryButtonText}>
                {translate("refresh")}
              </Text>
            </Pressable>
          </View>
        ) : data ? (
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* SECTION 1: Active Alerts / Status (Clearly separating active alerts from general info) */}
            {data.has_active_alerts ? (
              <View
                testID="active-alerts-section"
                style={styles.activeAlertsSection}
              >
                <View style={styles.activeAlertsHeader}>
                  <AlertTriangle size={22} color="#b91c1c" />
                  <Text style={styles.activeAlertsHeaderText}>
                    {translate("activeDisasterAlertsTitle")} ({data.active_alert_count})
                  </Text>
                </View>
                <Text style={styles.activeAlertsSubtext}>
                  {data.status_message_te}
                </Text>

                {data.active_alerts_guidance.map(
                  (item: ActiveAlertGuidance, idx: number) => {
                    const badge = getSeverityBadgeColor(item.urgency_level);
                    return (
                      <View
                        key={`active-guidance-${idx}`}
                        testID={`active-alert-card-${idx}`}
                        style={styles.activeAlertCard}
                      >
                        <View style={styles.activeAlertCardHeader}>
                          <View
                            style={[
                              styles.severityBadge,
                              {
                                backgroundColor: badge.bg,
                                borderColor: badge.border,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.severityBadgeText,
                                { color: badge.text },
                              ]}
                            >
                              {item.urgency_level.toUpperCase()}
                            </Text>
                          </View>
                          <Text style={styles.activeCategoryTag}>
                            {item.category_name_te}
                          </Text>
                        </View>

                        <Text style={styles.activeAlertTitle}>
                          {item.alert.title}
                        </Text>
                        <Text style={styles.activeAlertDetails}>
                          {item.alert.details}
                        </Text>

                        {item.emergency_actions &&
                          item.emergency_actions.length > 0 && (
                            <View
                              testID={`active-alert-actions-${idx}`}
                              style={styles.emergencyActionsBox}
                            >
                              <Text style={styles.emergencyActionsTitle}>
                                ⚠️ {translate("immediateActionsTitle")}:
                              </Text>
                              {item.emergency_actions.map((act, actIdx) => (
                                <View
                                  key={act.id || `act-${actIdx}`}
                                  style={styles.emergencyActionItem}
                                >
                                  <View style={styles.emergencyActionDot} />
                                  <View style={styles.emergencyActionTextContainer}>
                                    <Text style={styles.emergencyActionTitle}>
                                      {act.title_te}
                                    </Text>
                                    <Text style={styles.emergencyActionBody}>
                                      {act.action_te}
                                    </Text>
                                    {act.urgency_te && (
                                      <Text style={styles.urgencyTag}>
                                        {act.urgency_te}
                                      </Text>
                                    )}
                                  </View>
                                </View>
                              ))}
                            </View>
                          )}
                      </View>
                    );
                  }
                )}
              </View>
            ) : (
              <View
                testID="no-active-alerts-banner"
                style={styles.noAlertsBanner}
              >
                <View style={styles.noAlertsHeader}>
                  <CheckCircle2 size={24} color="#15803d" />
                  <Text style={styles.noAlertsTitle}>
                    {translate("noActiveAlertsTitle")}
                  </Text>
                </View>
                <Text style={styles.noAlertsMessage}>
                  {translate("noActiveAlertsMessage")}
                </Text>
                <Text style={styles.noAlertsNotice}>
                  క్రింది సమాచారం కేవలం విపత్తుల ముందస్తు నివారణ మరియు సంసిద్ధత కొరకు మాత్రమే.
                </Text>
              </View>
            )}

            {/* SECTION 2: Category Filter Tabs */}
            <View style={styles.filterSection}>
              <Text style={styles.sectionHeaderTitle}>
                {translate("generalPreparednessTitle")}
              </Text>
              <Text style={styles.sectionHeaderSubtitle}>
                {translate("generalPreparednessSubtitle")}
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterTabsContainer}
              >
                <Pressable
                  testID="category-filter-all"
                  style={[
                    styles.filterTab,
                    selectedFilter === "all" && styles.filterTabActive,
                  ]}
                  onPress={() => setSelectedFilter("all")}
                >
                  <Text
                    style={[
                      styles.filterTabText,
                      selectedFilter === "all" && styles.filterTabTextActive,
                    ]}
                  >
                    {translate("allCategories")}
                  </Text>
                </Pressable>

                <Pressable
                  testID="category-filter-flood"
                  style={[
                    styles.filterTab,
                    selectedFilter === "flood" && styles.filterTabActive,
                  ]}
                  onPress={() => setSelectedFilter("flood")}
                >
                  <Waves size={16} color={selectedFilter === "flood" ? "#ffffff" : "#0284c7"} />
                  <Text
                    style={[
                      styles.filterTabText,
                      selectedFilter === "flood" && styles.filterTabTextActive,
                    ]}
                  >
                    {translate("floodPreparedness")}
                  </Text>
                </Pressable>

                <Pressable
                  testID="category-filter-drought"
                  style={[
                    styles.filterTab,
                    selectedFilter === "drought" && styles.filterTabActive,
                  ]}
                  onPress={() => setSelectedFilter("drought")}
                >
                  <Sun size={16} color={selectedFilter === "drought" ? "#ffffff" : "#d97706"} />
                  <Text
                    style={[
                      styles.filterTabText,
                      selectedFilter === "drought" && styles.filterTabTextActive,
                    ]}
                  >
                    {translate("droughtPreparedness")}
                  </Text>
                </Pressable>

                <Pressable
                  testID="category-filter-cyclone"
                  style={[
                    styles.filterTab,
                    selectedFilter === "cyclone" && styles.filterTabActive,
                  ]}
                  onPress={() => setSelectedFilter("cyclone")}
                >
                  <Wind size={16} color={selectedFilter === "cyclone" ? "#ffffff" : "#7c3aed"} />
                  <Text
                    style={[
                      styles.filterTabText,
                      selectedFilter === "cyclone" && styles.filterTabTextActive,
                    ]}
                  >
                    {translate("cyclonePreparedness")}
                  </Text>
                </Pressable>
              </ScrollView>
            </View>

            {/* SECTION 3: General Preparedness Information */}
            <View
              testID="general-preparedness-section"
              style={styles.categoriesContainer}
            >
              {filteredCategories.map((cat: DisasterCategoryItem) => (
                <View
                  key={cat.category_key}
                  testID={`category-card-${cat.category_key}`}
                  style={styles.categoryCard}
                >
                  <View style={styles.categoryCardHeader}>
                    <View style={styles.categoryTitleGroup}>
                      {renderCategoryIcon(cat.category_key)}
                      <Text style={styles.categoryCardTitle}>
                        {cat.category_name_te}
                      </Text>
                    </View>
                    {cat.has_active_alert && (
                      <View style={styles.categoryActiveBadge}>
                        <Text style={styles.categoryActiveBadgeText}>
                          హెచ్చరిక ఉంది
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.categorySummary}>
                    {cat.summary_te}
                  </Text>

                  <View style={styles.guidelinesHeader}>
                    <Text style={styles.guidelinesHeaderText}>
                      {translate("precautionaryMeasuresTitle")}:
                    </Text>
                  </View>

                  {cat.general_preparedness.map((item, gIdx) => (
                    <View
                      key={item.id || `gen-${gIdx}`}
                      style={styles.guidelineItem}
                    >
                      <View style={styles.guidelineIndexBadge}>
                        <Text style={styles.guidelineIndexText}>
                          {gIdx + 1}
                        </Text>
                      </View>
                      <View style={styles.guidelineBody}>
                        <Text style={styles.guidelineTitle}>
                          {item.title_te}
                        </Text>
                        <Text style={styles.guidelineAction}>
                          {item.action_te}
                        </Text>
                        {item.importance_te && (
                          <View style={styles.importanceBox}>
                            <Text style={styles.importanceText}>
                              💡 {translate("importanceLabel")}: {item.importance_te}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </View>

            {/* SECTION 4: Disclaimer & Non-Relief Banner */}
            <View
              testID="disaster-disclaimer-banner"
              style={styles.disclaimerBanner}
            >
              <View style={styles.disclaimerHeader}>
                <Info size={18} color="#4b5563" />
                <Text style={styles.disclaimerTitle}>
                  {translate("disasterDisclaimerTitle")}
                </Text>
              </View>
              <Text style={styles.disclaimerText}>
                {data.disclaimer_te || translate("disasterDisclaimerText")}
              </Text>
            </View>
          </ScrollView>
        ) : null}
      </AuthLayout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerIconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
  },
  headerTitleContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#4b5563",
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: "#b91c1c",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#15803d",
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  activeAlertsSection: {
    backgroundColor: "#fff1f2",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#fecdd3",
    padding: 16,
    marginBottom: 20,
  },
  activeAlertsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  activeAlertsHeaderText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#9f1239",
  },
  activeAlertsSubtext: {
    fontSize: 13,
    color: "#be123c",
    marginTop: 4,
    marginBottom: 12,
  },
  activeAlertCard: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#fda4af",
    marginBottom: 10,
  },
  activeAlertCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  severityBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  activeCategoryTag: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9f1239",
  },
  activeAlertTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  activeAlertDetails: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 18,
    marginBottom: 12,
  },
  emergencyActionsBox: {
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#fee2e2",
  },
  emergencyActionsTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#991b1b",
    marginBottom: 8,
  },
  emergencyActionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  emergencyActionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#dc2626",
    marginTop: 6,
    marginRight: 8,
  },
  emergencyActionTextContainer: {
    flex: 1,
  },
  emergencyActionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#7f1d1d",
  },
  emergencyActionBody: {
    fontSize: 12,
    color: "#991b1b",
    marginTop: 2,
    lineHeight: 16,
  },
  urgencyTag: {
    fontSize: 10,
    fontWeight: "600",
    color: "#b91c1c",
    marginTop: 2,
  },
  noAlertsBanner: {
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    padding: 16,
    marginBottom: 20,
  },
  noAlertsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  noAlertsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#166534",
  },
  noAlertsMessage: {
    fontSize: 13,
    color: "#15803d",
    lineHeight: 18,
  },
  noAlertsNotice: {
    fontSize: 12,
    color: "#166534",
    marginTop: 8,
    fontStyle: "italic",
  },
  filterSection: {
    marginBottom: 16,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  sectionHeaderSubtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
    marginBottom: 12,
  },
  filterTabsContainer: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 4,
  },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  filterTabActive: {
    backgroundColor: "#15803d",
    borderColor: "#15803d",
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  filterTabTextActive: {
    color: "#ffffff",
  },
  categoriesContainer: {
    gap: 16,
    marginBottom: 20,
  },
  categoryCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  categoryTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  categoryCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  categoryActiveBadge: {
    backgroundColor: "#fee2e2",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  categoryActiveBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#b91c1c",
  },
  categorySummary: {
    fontSize: 13,
    color: "#4b5563",
    lineHeight: 18,
    marginBottom: 14,
  },
  guidelinesHeader: {
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingTop: 10,
    marginBottom: 10,
  },
  guidelinesHeaderText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  guidelineItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  guidelineIndexBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#e0e7ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginTop: 2,
  },
  guidelineIndexText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4338ca",
  },
  guidelineBody: {
    flex: 1,
  },
  guidelineTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  guidelineAction: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 18,
    marginTop: 2,
  },
  importanceBox: {
    backgroundColor: "#f9fafb",
    borderRadius: 6,
    padding: 6,
    marginTop: 4,
    borderLeftWidth: 3,
    borderLeftColor: "#15803d",
  },
  importanceText: {
    fontSize: 12,
    color: "#4b5563",
    lineHeight: 16,
  },
  disclaimerBanner: {
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  disclaimerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  disclaimerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  disclaimerText: {
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 17,
  },
});
