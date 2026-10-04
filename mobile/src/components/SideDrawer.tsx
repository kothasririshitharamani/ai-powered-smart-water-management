import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Calculator,
  Camera,
  CloudRain,
  Droplets,
  Gauge,
  LogOut,
  Mic,
  ShieldAlert,
  Sprout,
  User,
  Waves,
  X,
} from "lucide-react-native";

import { translate } from "../i18n";
import type { RootStackParamList } from "../navigation/RootNavigator";

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  farmerName?: string | null;
  farmerMobile?: string | null;
  farmerVillage?: string | null;
  farmerDistrict?: string | null;
  onNavigate: (route: keyof RootStackParamList) => void;
  onSignOutPress: () => void;
}

export function SideDrawer({
  isOpen,
  onClose,
  farmerName,
  farmerMobile,
  farmerVillage,
  farmerDistrict,
  onNavigate,
  onSignOutPress,
}: SideDrawerProps) {
  const handleItemPress = (route: keyof RootStackParamList) => {
    onClose();
    onNavigate(route);
  };

  const handleSignOutPress = () => {
    onClose();
    onSignOutPress();
  };

  return (
    <Modal
      animationType="fade"
      transparent
      visible={isOpen}
      onRequestClose={onClose}
      testID="side-drawer-modal"
    >
      <View style={styles.modalContainer}>
        {/* Backdrop touchable to close */}
        <TouchableWithoutFeedback testID="drawer-overlay" onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        {/* Drawer content sliding from the left */}
        <SafeAreaView edges={["top", "bottom", "left"]} style={styles.drawerSheet}>
          {/* Header with Farmer Profile Summary */}
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <View style={styles.brandGroup}>
                <View style={styles.brandIconCircle}>
                  <Sprout color="#15543d" size={24} strokeWidth={2.2} />
                </View>
                <Text style={styles.brandText}>{translate("appName")}</Text>
              </View>
              <Pressable
                accessibilityLabel={translate("close")}
                accessibilityRole="button"
                onPress={onClose}
                style={styles.closeButton}
                testID="drawer-close-button"
              >
                <X color="#374151" size={22} />
              </Pressable>
            </View>

            {/* Farmer Card */}
            <View style={styles.farmerCard} testID="drawer-farmer-info">
              <View style={styles.avatarCircle}>
                <User color="#15803d" size={26} />
              </View>
              <View style={styles.farmerDetails}>
                <Text style={styles.farmerNameText} numberOfLines={1}>
                  {farmerName || translate("farmerAccount")}
                </Text>
                {farmerMobile ? (
                  <Text style={styles.farmerMobileText}>{farmerMobile}</Text>
                ) : null}
                {farmerVillage || farmerDistrict ? (
                  <Text style={styles.farmerLocationText} numberOfLines={1}>
                    {[farmerVillage, farmerDistrict].filter(Boolean).join(", ")}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>

          {/* Navigation Menu List */}
          <ScrollView
            style={styles.menuScroll}
            contentContainerStyle={styles.menuScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Primary Profile Option */}
            <Pressable
              accessibilityRole="button"
              onPress={() => handleItemPress("Profile")}
              style={styles.menuItem}
              testID="drawer-profile-button"
            >
              <View style={[styles.menuItemIcon, { backgroundColor: "#dcfce7" }]}>
                <User color="#15803d" size={20} />
              </View>
              <Text style={styles.menuItemText}>{translate("drawerProfile")}</Text>
            </Pressable>

            <View style={styles.sectionDivider} />

            {/* Main Agricultural Features */}
            <Pressable
              accessibilityRole="button"
              onPress={() => handleItemPress("WaterManagement")}
              style={styles.menuItem}
              testID="drawer-water-management-button"
            >
              <View style={[styles.menuItemIcon, { backgroundColor: "#e0f2fe" }]}>
                <Droplets color="#0369a1" size={20} />
              </View>
              <Text style={styles.menuItemText}>{translate("waterManagement")}</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => handleItemPress("WaterRequirement")}
              style={styles.menuItem}
              testID="drawer-water-requirement-button"
            >
              <View style={[styles.menuItemIcon, { backgroundColor: "#fef3c7" }]}>
                <Calculator color="#b45309" size={20} />
              </View>
              <Text style={styles.menuItemText}>{translate("waterRequirement")}</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => handleItemPress("WeatherAlerts")}
              style={styles.menuItem}
              testID="drawer-weather-alerts-button"
            >
              <View style={[styles.menuItemIcon, { backgroundColor: "#e0e7ff" }]}>
                <CloudRain color="#4338ca" size={20} />
              </View>
              <Text style={styles.menuItemText}>{translate("weatherAlerts")}</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => handleItemPress("ScarcityAllocation")}
              style={styles.menuItem}
              testID="drawer-scarcity-allocation-button"
            >
              <View style={[styles.menuItemIcon, { backgroundColor: "#fef9c3" }]}>
                <Waves color="#854d0e" size={20} />
              </View>
              <Text style={styles.menuItemText}>{translate("scarcityAllocation")}</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => handleItemPress("CropEfficiency")}
              style={styles.menuItem}
              testID="drawer-crop-efficiency-button"
            >
              <View style={[styles.menuItemIcon, { backgroundColor: "#ecfdf5" }]}>
                <Gauge color="#047857" size={20} />
              </View>
              <Text style={styles.menuItemText}>{translate("cropEfficiency")}</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => handleItemPress("SoilAnalysis")}
              style={styles.menuItem}
              testID="drawer-soil-analysis-button"
            >
              <View style={[styles.menuItemIcon, { backgroundColor: "#f3e8ff" }]}>
                <Camera color="#7e22ce" size={20} />
              </View>
              <Text style={styles.menuItemText}>{translate("soilAnalysis")}</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => handleItemPress("VoiceAssistant")}
              style={styles.menuItem}
              testID="drawer-voice-assistant-button"
            >
              <View style={[styles.menuItemIcon, { backgroundColor: "#e0f2fe" }]}>
                <Mic color="#0284c7" size={20} />
              </View>
              <Text style={styles.menuItemText}>{translate("voiceAssistant")}</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => handleItemPress("DisasterPreparedness")}
              style={styles.menuItem}
              testID="drawer-disaster-preparedness-button"
            >
              <View style={[styles.menuItemIcon, { backgroundColor: "#fae8ff" }]}>
                <ShieldAlert color="#a21caf" size={20} />
              </View>
              <Text style={styles.menuItemText}>{translate("disasterPreparedness")}</Text>
            </Pressable>

            <View style={styles.sectionDivider} />

            {/* Sign Out Option */}
            <Pressable
              accessibilityRole="button"
              onPress={handleSignOutPress}
              style={[styles.menuItem, styles.signOutMenuItem]}
              testID="drawer-logout-button"
            >
              <View style={[styles.menuItemIcon, { backgroundColor: "#fee2e2" }]}>
                <LogOut color="#b91c1c" size={20} />
              </View>
              <Text style={[styles.menuItemText, styles.signOutText]}>
                {translate("drawerSignOut")}
              </Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    flexDirection: "row",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  drawerSheet: {
    width: "82%",
    maxWidth: 340,
    backgroundColor: "#ffffff",
    height: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 3, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 8,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  brandGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#15543d",
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
  },
  farmerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 12,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
  },
  farmerDetails: {
    flex: 1,
  },
  farmerNameText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  farmerMobileText: {
    fontSize: 13,
    color: "#4b5563",
    marginTop: 2,
  },
  farmerLocationText: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 1,
  },
  menuScroll: {
    flex: 1,
  },
  menuScrollContent: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  menuItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1f2937",
    flex: 1,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    marginVertical: 8,
    marginHorizontal: 4,
  },
  signOutMenuItem: {
    backgroundColor: "#fef2f2",
  },
  signOutText: {
    color: "#b91c1c",
  },
});
