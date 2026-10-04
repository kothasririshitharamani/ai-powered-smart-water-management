import { useState } from "react";
import {
  Calculator,
  Camera,
  CloudRain,
  Droplets,
  Gauge,
  Menu,
  Mic,
  ShieldAlert,
  Sprout,
  Waves,
} from "lucide-react-native";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";

import { PrimaryButton } from "../components/PrimaryButton";
import { SideDrawer } from "../components/SideDrawer";
import { SignOutConfirmModal } from "../components/SignOutConfirmModal";
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [signOutModalOpen, setSignOutModalOpen] = useState(false);

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

  const handleConfirmSignOut = async () => {
    setSignOutModalOpen(false);
    await signOut();
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      {/* Top Header Bar with Menu Button ☰ */}
      <View style={styles.topHeader}>
        <Pressable
          accessibilityLabel={translate("drawerMenu")}
          accessibilityRole="button"
          onPress={() => setDrawerOpen(true)}
          style={styles.menuButton}
          testID="drawer-menu-button"
        >
          <Menu color="#15803d" size={26} />
        </Pressable>

        <View style={styles.headerTitleGroup}>
          <Text style={styles.topHeaderTitle}>{translate("appName")}</Text>
        </View>

        <Pressable
          accessibilityLabel={translate("voiceAssistant")}
          accessibilityRole="button"
          onPress={() => navigation.navigate("VoiceAssistant")}
          style={styles.headerVoiceButton}
        >
          <Mic color="#15803d" size={22} />
        </Pressable>
      </View>

      {/* Vertically Scrollable Content Container */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        testID="authenticated-home-scroll"
      >
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

        {/* Feature 1: Water Management */}
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

        {/* Feature 2: Water Requirement Estimation */}
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

        {/* Feature 3: Weather Alerts */}
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate("WeatherAlerts")}
          style={styles.weatherSummary}
          testID="weather-alerts-button"
        >
          <View style={styles.weatherIcon}>
            <CloudRain color="#1b5e76" size={22} />
          </View>
          <View style={styles.waterSummaryCopy}>
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

        {/* Feature 4: Scarcity Allocation */}
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

        {/* Feature 5: Crop Water Efficiency Comparison */}
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

        {/* Feature 6: AI Soil Analysis */}
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

        {/* Feature 7: Telugu Voice Assistant */}
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

        {/* Feature 8: Disaster Preparedness */}
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

        {/* Action Buttons */}
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
            onPress={() => setSignOutModalOpen(true)}
            title={translate("logout")}
          />
        </View>
      </ScrollView>

      {/* Side Navigation Drawer */}
      <SideDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        farmerName={user?.farmer_profile.name}
        farmerMobile={user?.mobile}
        farmerVillage={user?.farmer_profile.village}
        farmerDistrict={user?.farmer_profile.district}
        onNavigate={(route) => {
          clearProfileSavedMessage();
          navigation.navigate(route);
        }}
        onSignOutPress={() => setSignOutModalOpen(true)}
      />

      {/* Sign Out Confirmation Modal */}
      <SignOutConfirmModal
        isOpen={signOutModalOpen}
        onCancel={() => setSignOutModalOpen(false)}
        onConfirm={handleConfirmSignOut}
        loading={busy}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#edf5ee",
    flex: 1,
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  menuButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
  },
  headerTitleGroup: {
    flex: 1,
    alignItems: "center",
  },
  topHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#15543d",
  },
  headerVoiceButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f0fdf4",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 48,
  },
  iconCircle: {
    alignItems: "center",
    backgroundColor: "#d9ecdf",
    borderRadius: 32,
    height: 64,
    justifyContent: "center",
    width: 64,
    marginTop: 8,
  },
  welcome: {
    color: "#526b61",
    fontSize: 15,
    marginTop: 14,
  },
  name: {
    color: "#153d33",
    fontSize: 26,
    fontWeight: "700",
    marginTop: 6,
    textAlign: "center",
  },
  mobile: {
    color: "#526b61",
    fontSize: 16,
    marginTop: 4,
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
    marginTop: 20,
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
    fontSize: 18,
    fontWeight: "700",
  },
  waterDetail: {
    color: "#526b61",
    fontSize: 15,
    marginTop: 4,
  },
  waterError: {
    color: "#922e2a",
    fontSize: 14,
    marginTop: 4,
  },
  weatherSummary: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: "#e4f0f6",
    borderColor: "#cfe0e8",
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
  weatherHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  weatherTitle: {
    color: "#144558",
    fontSize: 18,
    fontWeight: "700",
  },
  weatherDetail: {
    color: "#466a79",
    fontSize: 15,
    marginTop: 4,
  },
  weatherError: {
    color: "#922e2a",
    fontSize: 14,
    marginTop: 4,
  },
  homeUnreadBadge: {
    alignItems: "center",
    backgroundColor: "#b91c1c",
    borderRadius: 10,
    height: 20,
    justifyContent: "center",
    minWidth: 20,
    paddingHorizontal: 6,
  },
  homeUnreadBadgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  requirementSummary: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: "#e3f0e9",
    borderColor: "#cde3d6",
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
  scarcitySummary: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: "#fef8e7",
    borderColor: "#fae7b7",
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
    backgroundColor: "#eef6f1",
    borderColor: "#cde3d6",
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
    marginTop: 24,
    maxWidth: 360,
    width: "100%",
  },
});
