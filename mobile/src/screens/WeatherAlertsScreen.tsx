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
  CalendarDays,
  Check,
  CloudRain,
  RefreshCw,
  ShieldAlert,
} from "lucide-react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";

import { AuthLayout } from "../components/AuthLayout";
import { useAuth } from "../context/AuthContext";
import { translate } from "../i18n";
import type { RootStackParamList } from "../navigation/RootNavigator";
import type { WeatherAlert, WeatherAlertSeverity } from "../types/auth";

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("te-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function severityLabel(severity: WeatherAlertSeverity): string {
  switch (severity) {
    case "critical":
      return translate("severityCritical");
    case "high":
      return translate("severityHigh");
    case "medium":
      return translate("severityMedium");
    case "low":
    default:
      return translate("severityLow");
  }
}

function alertTypeLabel(type: string): string {
  switch (type) {
    case "heavy_rain":
      return translate("alertTypeHeavyRain");
    case "thunderstorm":
      return translate("alertTypeThunderstorm");
    case "heatwave":
      return translate("alertTypeHeatwave");
    case "flood":
      return translate("alertTypeFlood");
    case "cyclone":
      return translate("alertTypeCyclone");
    case "dry_spell":
      return translate("alertTypeDrySpell");
    default:
      return translate("alertTypeGeneral");
  }
}

export function WeatherAlertsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    weatherAlerts,
    unreadAlertsCount,
    weatherAlertsLoading,
    weatherAlertsError,
    refreshWeatherAlerts,
    markAlertRead,
  } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refreshWeatherAlerts();
    } catch {
      // Handled in AuthContext
    } finally {
      setRefreshing(false);
    }
  }

  async function handleMarkRead(alertId: string) {
    setMarkingId(alertId);
    try {
      await markAlertRead(alertId);
    } catch {
      // Handled in AuthContext
    } finally {
      setMarkingId(null);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AuthLayout
        subtitle={translate("weatherAlertsSubtitle")}
        title={translate("weatherAlertsTitle")}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ArrowLeft color="#15543d" size={20} />
          <Text style={styles.backText}>{translate("back")}</Text>
        </Pressable>

        {weatherAlertsLoading && weatherAlerts.length === 0 ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#176544" size="small" />
            <Text style={styles.mutedText}>
              {translate("weatherAlertsLoadingText")}
            </Text>
          </View>
        ) : null}

        {weatherAlertsError ? (
          <View accessibilityRole="alert" style={styles.errorBox}>
            <Text style={styles.errorText}>{weatherAlertsError}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void handleRefresh()}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>{translate("retry")}</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.headerRow}>
          <Text style={styles.alertsCounter}>
            {translate("activeAlertsCount").replace(
              "{count}",
              String(weatherAlerts.length),
            )}
          </Text>
          {unreadAlertsCount > 0 ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {translate("unreadAlertsBadge").replace(
                  "{count}",
                  String(unreadAlertsCount),
                )}
              </Text>
            </View>
          ) : null}
          <Pressable
            accessibilityLabel={translate("refreshAlerts")}
            accessibilityRole="button"
            disabled={refreshing || weatherAlertsLoading}
            onPress={() => void handleRefresh()}
            style={styles.refreshButton}
          >
            <RefreshCw
              color="#176544"
              size={18}
            />
          </Pressable>
        </View>

        {weatherAlerts.length === 0 && !weatherAlertsLoading ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <CloudRain color="#1b5e76" size={36} />
            </View>
            <Text style={styles.emptyTitle}>
              {translate("noWeatherAlerts")}
            </Text>
            <Text style={styles.emptySubtext}>
              {translate("noWeatherAlertsSub")}
            </Text>
          </View>
        ) : (
          weatherAlerts.map((alert: WeatherAlert) => (
            <View
              key={alert.id}
              style={[
                styles.alertCard,
                alert.severity === "critical"
                  ? styles.cardCritical
                  : alert.severity === "high"
                    ? styles.cardHigh
                    : alert.severity === "medium"
                      ? styles.cardMedium
                      : styles.cardLow,
              ]}
              testID={`weather-alert-${alert.id}`}
            >
              <View style={styles.cardHeader}>
                <View style={styles.badgesRow}>
                  <View
                    style={[
                      styles.severityBadge,
                      alert.severity === "critical"
                        ? styles.badgeCritical
                        : alert.severity === "high"
                          ? styles.badgeHigh
                          : alert.severity === "medium"
                            ? styles.badgeMedium
                            : styles.badgeLow,
                    ]}
                  >
                    <ShieldAlert
                      color={
                        alert.severity === "critical"
                          ? "#922e2a"
                          : alert.severity === "high"
                            ? "#755a15"
                            : alert.severity === "medium"
                              ? "#6e5616"
                              : "#1b5e76"
                      }
                      size={14}
                    />
                    <Text
                      style={[
                        styles.severityText,
                        alert.severity === "critical"
                          ? styles.textCritical
                          : alert.severity === "high"
                            ? styles.textHigh
                            : alert.severity === "medium"
                              ? styles.textMedium
                              : styles.textLow,
                      ]}
                    >
                      {severityLabel(alert.severity)}
                    </Text>
                  </View>

                  <View style={styles.typeBadge}>
                    <Text style={styles.typeText}>
                      {alertTypeLabel(alert.alert_type)}
                    </Text>
                  </View>
                </View>

                {!alert.is_read ? (
                  <View style={styles.newDot} testID="unread-indicator" />
                ) : null}
              </View>

              <Text style={styles.alertTitle}>{alert.title}</Text>
              <Text style={styles.alertDetails}>{alert.details}</Text>

              <View style={styles.timeSection}>
                <View style={styles.timeRow}>
                  <CalendarDays color="#64776f" size={15} />
                  <Text style={styles.timeLabel}>
                    {translate("startsAt")}: {formatDateTime(alert.starts_at)}
                  </Text>
                </View>
                {alert.ends_at ? (
                  <View style={styles.timeRow}>
                    <CalendarDays color="#64776f" size={15} />
                    <Text style={styles.timeLabel}>
                      {translate("endsAt")}: {formatDateTime(alert.ends_at)}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.cardFooter}>
                {!alert.is_read ? (
                  <Pressable
                    accessibilityLabel={translate("markAsRead")}
                    accessibilityRole="button"
                    disabled={markingId === alert.id}
                    onPress={() => void handleMarkRead(alert.id)}
                    style={styles.markReadButton}
                  >
                    {markingId === alert.id ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <>
                        <Check color="#ffffff" size={16} />
                        <Text style={styles.markReadButtonText}>
                          {translate("markAsRead")}
                        </Text>
                      </>
                    )}
                  </Pressable>
                ) : (
                  <View style={styles.readStatusRow}>
                    <Check color="#205b3e" size={16} />
                    <Text style={styles.readStatusText}>
                      {translate("markedAsRead")}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
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
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  alertsCounter: {
    color: "#24493d",
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
  },
  unreadBadge: {
    backgroundColor: "#922e2a",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  unreadBadgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  refreshButton: {
    alignItems: "center",
    backgroundColor: "#e2efe6",
    borderRadius: 8,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  emptyContainer: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#d5e1d8",
    borderRadius: 8,
    borderWidth: 1,
    padding: 24,
    marginTop: 8,
  },
  emptyIconCircle: {
    alignItems: "center",
    backgroundColor: "#e3eef4",
    borderRadius: 32,
    height: 64,
    justifyContent: "center",
    marginBottom: 14,
    width: 64,
  },
  emptyTitle: {
    color: "#153d33",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
  },
  emptySubtext: {
    color: "#526b61",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  alertCard: {
    backgroundColor: "#ffffff",
    borderColor: "#d5e1d8",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
  },
  cardCritical: {
    borderLeftColor: "#922e2a",
    borderLeftWidth: 4,
  },
  cardHigh: {
    borderLeftColor: "#d97706",
    borderLeftWidth: 4,
  },
  cardMedium: {
    borderLeftColor: "#ca8a04",
    borderLeftWidth: 4,
  },
  cardLow: {
    borderLeftColor: "#1b5e76",
    borderLeftWidth: 4,
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  badgesRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  severityBadge: {
    alignItems: "center",
    borderRadius: 6,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeCritical: { backgroundColor: "#fbe9e7" },
  badgeHigh: { backgroundColor: "#fff2d7" },
  badgeMedium: { backgroundColor: "#fef9e7" },
  badgeLow: { backgroundColor: "#e3eef4" },
  severityText: { fontSize: 13, fontWeight: "700" },
  textCritical: { color: "#922e2a" },
  textHigh: { color: "#755a15" },
  textMedium: { color: "#6e5616" },
  textLow: { color: "#1b5e76" },
  typeBadge: {
    backgroundColor: "#edf5ee",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  typeText: {
    color: "#24493d",
    fontSize: 13,
    fontWeight: "600",
  },
  newDot: {
    backgroundColor: "#d97706",
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  alertTitle: {
    color: "#153d33",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  alertDetails: {
    color: "#38564d",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  timeSection: {
    borderTopColor: "#edf5ee",
    borderTopWidth: 1,
    gap: 4,
    paddingTop: 10,
  },
  timeRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
  },
  timeLabel: {
    color: "#64776f",
    fontSize: 13,
  },
  cardFooter: {
    alignItems: "flex-end",
    marginTop: 12,
  },
  markReadButton: {
    alignItems: "center",
    backgroundColor: "#176544",
    borderRadius: 6,
    flexDirection: "row",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  markReadButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  readStatusRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    paddingVertical: 4,
  },
  readStatusText: {
    color: "#205b3e",
    fontSize: 13,
    fontWeight: "600",
  },
});
