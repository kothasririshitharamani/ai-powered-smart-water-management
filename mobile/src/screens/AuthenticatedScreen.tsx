import { useState } from "react";
import { Droplets, Sprout } from "lucide-react-native";
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
  buttonWrap: {
    marginTop: 34,
    maxWidth: 360,
    width: "100%",
  },
});
