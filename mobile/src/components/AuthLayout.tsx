import type { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Sprout } from "lucide-react-native";

import { translate } from "../i18n";

interface AuthLayoutProps extends PropsWithChildren {
  title: string;
  subtitle: string;
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.brandBand}>
        <View style={styles.brandRow}>
          <View style={styles.brandIcon}>
            <Sprout color="#15543d" size={27} strokeWidth={2.4} />
          </View>
          <Text style={styles.brandName}>{translate("appName")}</Text>
        </View>
        <View style={styles.bandRule} />
        <Text style={styles.brandLine}>నీటి సంరక్షణ • రైతు సంక్షేమం</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {children}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  brandBand: {
    backgroundColor: "#15543d",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    minHeight: 166,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 22,
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 13,
  },
  brandIcon: {
    alignItems: "center",
    backgroundColor: "#d8efe0",
    borderRadius: 16,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  brandName: {
    color: "#ffffff",
    flex: 1,
    fontSize: 22,
    fontWeight: "700",
  },
  bandRule: {
    backgroundColor: "#5f9a75",
    height: 1,
    marginTop: 21,
    width: 58,
  },
  brandLine: {
    color: "#d7ebdc",
    fontSize: 15,
    marginTop: 12,
  },
  content: {
    alignSelf: "center",
    maxWidth: 480,
    paddingHorizontal: 22,
    paddingTop: 28,
    width: "100%",
  },
  title: {
    color: "#153d33",
    fontSize: 29,
    fontWeight: "700",
  },
  subtitle: {
    color: "#526b61",
    fontSize: 16,
    lineHeight: 24,
    marginTop: 5,
    marginBottom: 22,
  },
});
