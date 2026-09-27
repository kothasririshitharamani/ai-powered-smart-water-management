import { useState } from "react";
import { Calculator, Camera, CloudRain, Droplets, Gauge, Mic, ShieldAlert, Sprout, Waves } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";

import { PrimaryButton } from "../components/PrimaryButton";
import { useAuth } from "../context/AuthContext";
import { translate } from "../i18n";
import type { RootStackParamList } from "../navigation/RootNavigator";

export function AuthenticatedScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    user,
    logout,
    profileSavedMessage,
    clearProfileSavedMessage,
    waterBudget,
    waterLoading,
    waterError,
    weatherAlerts,
    unreadAlertsCount,
    weatherAlertsLoading,
    weatherAlertsError,
    waterEstimate,
    waterEstimateLoading,
    scarcitySummary,
    scarcityLoading,
  } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    setBusy(true);
    setError(null);
    try {
      await logout();
    } catch {
      setError(translate("requestFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Sprout color="#176544" size={38} strokeWidth={2} />
        </View>
        <Text style={styles.welcome}>{translate("signedIn")}</Text>
        <Text style={styles.name}>{user?.farmer_profile.name}</Text>
        <Text style={styles.mobile}>{user?.mobile}</Text>
        {profileSavedMessage ? (
          <Text accessibilityRole="alert" style={styles.savedMessage}>
            {profileSavedMessage}
          </Text>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate("WaterManagement")}
          style={styles.waterSummary}
        >
          <View style={styles.waterIcon}>
            <Droplets color="#176b83" size={22} />
          </View>
          <View style={styles.waterSummaryCopy}>
            <Text style={styles.waterTitle}>
              {translate("waterManagement")}
            </Text>
            {waterLoading ? (
              <Text style={styles.waterDetail}>
                {translate("waterDataLoading")}
              </Text>
            ) : waterError ? (
              <Text style={styles.waterError}>{waterError}</Text>
            ) : waterBudget?.available_water === null || !waterBudget ? (
              <Text style={styles.waterDetail}>
                {translate("noWaterBudget")}
              </Text>
            ) : (
              <Text style={styles.waterDetail}>
                {translate("remainingWater")}:{" "}
                {waterBudget.remaining_water?.toLocaleString("te-IN")}{" "}
                {translate("litersUnit")}
              </Text>
            )}
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate("WaterRequirement")}
          style={styles.requirementSummary}
          testID="water-requirement-button"
        >
          <View style={styles.requirementIcon}>
            <Calculator color="#176544" size={22} />
          </View>
          <View style={styles.waterSummaryCopy}>
            <Text style={styles.waterTitle}>
              {translate("waterRequirement")}
            </Text>
            {waterEstimateLoading && !waterEstimate ? (
              <Text style={styles.waterDetail}>
                {translate("waterRequirementLoading")}
              </Text>
            ) : waterEstimate ? (
              <Text style={styles.waterDetail}>
                {waterEstimate.crop} • {waterEstimate.estimated_liters.toLocaleString("te-IN")}{" "}
                {translate("litersUnit")}
              </Text>
            ) : (
              <Text style={styles.waterDetail}>
                {translate("viewWaterRequirement")}
              </Text>
            )}
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate("WeatherAlerts")}
          style={styles.weatherSummary}
          testID="weather-alerts-button"
        >
          <View style={styles.weatherIcon}>
            <CloudRain color="#1b5e76" size={22} />
          </View>
          <View style={styles.weatherSummaryCopy}>
            <View style={styles.weatherHeaderRow}>
              <Text style={styles.weatherTitle}>
                {translate("weatherAlerts")}
              </Text>
              {unreadAlertsCount > 0 ? (
                <View style={styles.homeUnreadBadge}>
                  <Text style={styles.homeUnreadBadgeText}>
                    {unreadAlertsCount}
                  </Text>
                </View>
              ) : null}
            </View>
            {weatherAlertsLoading && weatherAlerts.length === 0 ? (
              <Text style={styles.weatherDetail}>
                {translate("weatherAlertsLoadingText")}
              </Text>
            ) : weatherAlertsError ? (
              <Text style={styles.weatherError}>{weatherAlertsError}</Text>
            ) : weatherAlerts.length === 0 ? (
              <Text style={styles.weatherDetail}>
                {translate("noWeatherAlerts")}
              </Text>
            ) : (
              <Text style={styles.weatherDetail}>
                {translate("activeAlertsCount").replace(
                  "{count}",
                  String(weatherAlerts.length),
                )}
              </Text>
            )}
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate("ScarcityAllocation")}
          style={styles.scarcitySummary}
          testID="scarcity-allocation-button"
        >
          <View style={styles.scarcityIcon}>
            <Waves color="#785600" size={22} />
          </View>
          <View style={styles.waterSummaryCopy}>
            <Text style={styles.waterTitle}>
              {translate("scarcityAllocation")}
            </Text>
            {scarcityLoading && !scarcitySummary ? (
              <Text style={styles.waterDetail}>
                {translate("scarcityLoadingText")}
              </Text>
            ) : scarcitySummary?.current_plan ? (
              <Text style={styles.waterDetail}>
                {translate("allocatedWaterLabel")}:{" "}
                {scarcitySummary.total_allocated.toLocaleString("te-IN")}{" "}
                {translate("litersUnit")}
              </Text>
            ) : scarcitySummary?.remaining_water ? (
              <Text style={styles.waterDetail}>
                {translate("remainingWaterLabel")}:{" "}
                {scarcitySummary.remaining_water.toLocaleString("te-IN")}{" "}
                {translate("litersUnit")}
              </Text>
            ) : (
              <Text style={styles.waterDetail}>
                {translate("viewScarcityAllocation")}
              </Text>
            )}
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate("CropEfficiency")}
          style={styles.efficiencySummary}
          testID="crop-efficiency-button"
        >
          <View style={styles.efficiencyIcon}>
            <Gauge color="#286e4e" size={22} />
          </View>
          <View style={styles.waterSummaryCopy}>
            <Text style={styles.waterTitle}>
              {translate("cropEfficiency")}
            </Text>
            <Text style={styles.waterDetail}>
              {translate("cropEfficiencyTileSubtitle")}
            </Text>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate("SoilAnalysis")}
          style={styles.soilAnalysisSummary}
          testID="soil-analysis-button"
        >
          <View style={styles.soilAnalysisIcon}>
            <Camera color="#15543d" size={22} />
          </View>
          <View style={styles.waterSummaryCopy}>
            <Text style={styles.waterTitle}>
              {translate("soilAnalysis")}
            </Text>
            <Text style={styles.waterDetail}>
              {translate("soilAnalysisTileSubtitle")}
            </Text>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate("VoiceAssistant")}
          style={styles.voiceAssistantSummary}
          testID="voice-assistant-button"
        >
          <View style={styles.voiceAssistantIcon}>
            <Mic color="#15543d" size={22} />
          </View>
          <View style={styles.waterSummaryCopy}>
            <Text style={styles.waterTitle}>
              {translate("voiceAssistant")}
            </Text>
            <Text style={styles.waterDetail}>
              {translate("voiceAssistantTileSubtitle")}
            </Text>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate("DisasterPreparedness")}
          style={styles.disasterSummary}
          testID="disaster-preparedness-button"
        >
          <View style={styles.disasterIcon}>
            <ShieldAlert color="#15543d" size={22} />
          </View>
          <View style={styles.waterSummaryCopy}>
            <Text style={styles.waterTitle}>
              {translate("disasterPreparedness")}
            </Text>
            <Text style={styles.waterDetail}>
              {translate("disasterPreparednessTileSubtitle")}
            </Text>
          </View>
        </Pressable>
        <View style={styles.buttonWrap}>
          <PrimaryButton
            onPress={() => {
              clearProfileSavedMessage();
              navigation.navigate("Profile");
            }}
            title={translate("editProfile")}
          />
          <PrimaryButton
            loading={busy}
            logout
            onPress={() => void signOut()}
            title={translate("logout")}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#edf5ee",
    flex: 1,
  },
  content: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 26,
  },
  iconCircle: {
    alignItems: "center",
    backgroundColor: "#d9ecdf",
    borderRadius: 32,
    height: 82,
    justifyContent: "center",
    width: 82,
  },
  welcome: {
    color: "#526b61",
    fontSize: 17,
    marginTop: 23,
  },
  name: {
    color: "#153d33",
    fontSize: 30,
    fontWeight: "700",
    marginTop: 8,
    textAlign: "center",
  },
  mobile: {
    color: "#526b61",
    fontSize: 18,
    marginTop: 8,
  },
  error: {
    color: "#922e2a",
    fontSize: 15,
    marginTop: 16,
  },
  savedMessage: {
    color: "#205b3e",
    fontSize: 16,
    lineHeight: 24,
    marginTop: 18,
    textAlign: "center",
  },
  waterSummary: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: "#e3eef4",
    borderColor: "#cbdfe4",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginTop: 25,
    minHeight: 78,
    padding: 13,
  },
  waterIcon: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  waterSummaryCopy: {
    flex: 1,
  },
  waterTitle: {
    color: "#153d33",
    fontSize: 17,
    fontWeight: "700",
  },
  waterDetail: {
    color: "#526b61",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 3,
  },
  waterError: {
    color: "#922e2a",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 3,
  },
  requirementSummary: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: "#e2efe6",
    borderColor: "#c6e1cf",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
    minHeight: 78,
    padding: 13,
  },
  requirementIcon: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  weatherSummary: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: "#e8f1f5",
    borderColor: "#cce0ea",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
    minHeight: 78,
    padding: 13,
  },
  weatherIcon: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  weatherSummaryCopy: {
    flex: 1,
  },
  weatherHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  weatherTitle: {
    color: "#153d33",
    fontSize: 17,
    fontWeight: "700",
  },
  weatherDetail: {
    color: "#526b61",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 3,
  },
  weatherError: {
    color: "#922e2a",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 3,
  },
  homeUnreadBadge: {
    alignItems: "center",
    backgroundColor: "#922e2a",
    borderRadius: 10,
    justifyContent: "center",
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  homeUnreadBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  scarcitySummary: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: "#fdf8ee",
    borderColor: "#f5e6c4",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
    minHeight: 78,
    padding: 13,
  },
  scarcityIcon: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  efficiencySummary: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: "#eaf5ee",
    borderColor: "#cce8d4",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
    minHeight: 78,
    padding: 13,
  },
  efficiencyIcon: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  soilAnalysisSummary: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: "#f4f8f5",
    borderColor: "#cde3d5",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
    minHeight: 78,
    padding: 13,
  },
  soilAnalysisIcon: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  voiceAssistantSummary: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: "#f4f8f5",
    borderColor: "#cde3d5",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
    minHeight: 78,
    padding: 13,
  },
  voiceAssistantIcon: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  disasterSummary: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: "#f5f3ff",
    borderColor: "#ddd6fe",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
    minHeight: 78,
    padding: 13,
  },
  disasterIcon: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  buttonWrap: {
    marginTop: 34,
    maxWidth: 360,
    width: "100%",
  },
});
