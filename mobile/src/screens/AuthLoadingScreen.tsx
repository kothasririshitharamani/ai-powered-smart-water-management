import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Sprout } from "lucide-react-native";

import { translate } from "../i18n";

export function AuthLoadingScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Sprout color="#176544" size={38} strokeWidth={2} />
        </View>
        <Text style={styles.appName}>{translate("appName")}</Text>
        <ActivityIndicator
          color="#176544"
          size="large"
          style={styles.spinner}
        />
        <Text style={styles.loadingText}>{translate("loading")}</Text>
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
    padding: 28,
  },
  iconCircle: {
    alignItems: "center",
    backgroundColor: "#d9ecdf",
    borderRadius: 30,
    height: 78,
    justifyContent: "center",
    width: 78,
  },
  appName: {
    color: "#153d33",
    fontSize: 24,
    fontWeight: "700",
    marginTop: 18,
    textAlign: "center",
  },
  spinner: {
    marginTop: 30,
  },
  loadingText: {
    color: "#526b61",
    fontSize: 16,
    marginTop: 12,
  },
});
