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
  CalendarDays,
  Droplets,
  Gauge,
  History,
  Waves,
} from "lucide-react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";

import { ApiError } from "../api/client";
import { AuthLayout } from "../components/AuthLayout";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAuth } from "../context/AuthContext";
import { translate } from "../i18n";
import type { RootStackParamList } from "../navigation/RootNavigator";
import type { WaterWarningLevel } from "../types/auth";

function formatLiters(amount: number): string {
  return amount.toLocaleString("te-IN", { maximumFractionDigits: 2 });
}

function formatRecordedAt(value: string): string {
  return new Date(value).toLocaleString("te-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function warningCopy(level: WaterWarningLevel): string | null {
  if (level === "very_low") return translate("waterVeryLow");
  if (level === "low") return translate("waterLow");
  if (level === "normal") return translate("waterNormal");
  return null;
}

export function WaterManagementScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    waterBudget,
    waterUsage,
    waterLoading,
    waterError,
    refreshWater,
    saveWaterBudget,
    recordWaterUsage,
  } = useAuth();
  const [budgetInput, setBudgetInput] = useState(
    waterBudget?.available_water?.toString() ?? "",
  );
  const [budgetInputEdited, setBudgetInputEdited] = useState(false);
  const [usageInput, setUsageInput] = useState("");
  const [usageNote, setUsageNote] = useState("");
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [budgetSuccess, setBudgetSuccess] = useState(false);
  const [usageSuccess, setUsageSuccess] = useState(false);
  const [savingBudget, setSavingBudget] = useState(false);
  const [savingUsage, setSavingUsage] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!budgetInputEdited && waterBudget?.available_water !== null) {
      setBudgetInput(waterBudget?.available_water?.toString() ?? "");
    }
  }, [budgetInputEdited, waterBudget?.available_water]);

  async function saveBudget() {
    setBudgetError(null);
    setBudgetSuccess(false);
    const amount = Number(budgetInput.trim());
    if (
      !/^\d+(?:\.\d{1,2})?$/.test(budgetInput.trim()) ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setBudgetError(translate("invalidWaterAmount"));
      return;
    }
    setSavingBudget(true);
    try {
      await saveWaterBudget(amount);
      setBudgetInput(String(amount));
      setBudgetSuccess(true);
    } catch (error) {
      setBudgetError(
        error instanceof ApiError ? error.message : translate("waterDataError"),
      );
    } finally {
      setSavingBudget(false);
    }
  }

  async function saveUsage() {
    setUsageError(null);
    setUsageSuccess(false);
    const amount = Number(usageInput.trim());
    if (
      !/^\d+(?:\.\d{1,2})?$/.test(usageInput.trim()) ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setUsageError(translate("invalidWaterAmount"));
      return;
    }
    if (
      waterBudget?.remaining_water !== null &&
      waterBudget?.remaining_water !== undefined &&
      amount > waterBudget.remaining_water
    ) {
      setUsageError(translate("waterOverspend"));
      return;
    }
    setSavingUsage(true);
    try {
      await recordWaterUsage(amount, usageNote.trim());
      setUsageInput("");
      setUsageNote("");
      setUsageSuccess(true);
    } catch (error) {
      setUsageError(
        error instanceof ApiError ? error.message : translate("waterDataError"),
      );
    } finally {
      setSavingUsage(false);
    }
  }

  async function retry() {
    setRetrying(true);
    try {
      await refreshWater();
    } catch {
      // The shared context retains the localized loading error for display.
    } finally {
      setRetrying(false);
    }
  }

  const warning = waterBudget ? warningCopy(waterBudget.warning_level) : null;
  const progress = Math.max(0, Math.min(100, waterBudget?.usage_percent ?? 0));

  const thresholdHelp = waterBudget
    ? translate("waterWarningThresholds")
        .replace("{low}", String(waterBudget.low_warning_percent))
        .replace("{veryLow}", String(waterBudget.very_low_warning_percent))
    : translate("waterWarningThresholds");

  return (
    <SafeAreaView style={styles.safeArea}>
      <AuthLayout
        title={translate("waterManagementTitle")}
        subtitle={translate("waterManagementSubtitle")}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ArrowLeft color="#15543d" size={20} />
          <Text style={styles.backText}>{translate("back")}</Text>
        </Pressable>

        {waterLoading && !waterBudget ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#176544" size="small" />
            <Text style={styles.mutedText}>
              {translate("waterDataLoading")}
            </Text>
          </View>
        ) : null}

        {waterError ? (
          <View accessibilityRole="alert" style={styles.errorBox}>
            <Text style={styles.errorText}>{waterError}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void retry()}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>
                {retrying ? translate("waterDataLoading") : translate("retry")}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {waterBudget?.available_water === null || !waterBudget ? (
          waterLoading ? null : (
            <View style={styles.emptyBudget}>
              <View style={styles.emptyIcon}>
                <Droplets color="#176b83" size={25} />
              </View>
              <Text style={styles.emptyTitle}>
                {translate("noWaterBudget")}
              </Text>
            </View>
          )
        ) : (
          <>
            <View style={styles.periodRow}>
              <CalendarDays color="#54756e" size={17} />
              <Text style={styles.periodText}>
                {translate("annualWaterBudget")}
              </Text>
            </View>
            <View style={styles.summaryGrid}>
              <SummaryCard
                icon={Waves}
                label={translate("availableWater")}
                value={waterBudget.available_water}
                tone="blue"
              />
              <SummaryCard
                icon={Droplets}
                label={translate("usedWater")}
                value={waterBudget.total_used}
                tone="green"
              />
              <SummaryCard
                icon={Gauge}
                label={translate("remainingWater")}
                value={waterBudget.remaining_water}
                tone={waterBudget.warning_level === "very_low" ? "red" : "teal"}
                testID="water-remaining-summary"
              />
            </View>
            <View style={styles.usageCard}>
              <View style={styles.usageHeading}>
                <Text style={styles.usageLabel}>
                  {translate("waterUsagePercent")}
                </Text>
                <Text style={styles.usageNumber}>
                  {Math.round(waterBudget.usage_percent)}%
                </Text>
              </View>
              <View
                accessibilityRole="progressbar"
                accessibilityValue={{
                  min: 0,
                  max: 100,
                  now: Math.round(progress),
                }}
                style={styles.progressTrack}
              >
                <View
                  style={[styles.progressFill, { width: `${progress}%` }]}
                />
              </View>
              <Text style={styles.thresholdHelp}>{thresholdHelp}</Text>
            </View>
            {warning ? (
              <View
                accessibilityRole="alert"
                style={[
                  styles.warningBox,
                  waterBudget.warning_level === "normal"
                    ? styles.normalWarning
                    : waterBudget.warning_level === "low"
                      ? styles.lowWarning
                      : styles.veryLowWarning,
                ]}
              >
                <AlertTriangle color="#755a15" size={20} />
                <Text style={styles.warningText}>{warning}</Text>
              </View>
            ) : null}
          </>
        )}

        <View style={styles.formSection}>
          <View style={styles.sectionTitleRow}>
            <Waves color="#176b83" size={22} />
            <Text style={styles.sectionTitle}>
              {translate("waterBudgetAmount")}
            </Text>
          </View>
          <WaterNumberInput
            label={translate("waterBudgetAmount")}
            value={budgetInput}
            placeholder={translate("waterBudgetPlaceholder")}
            testID="water-budget-input"
            onChangeText={(value) => {
              setBudgetInput(value);
              setBudgetInputEdited(true);
              setBudgetError(null);
              setBudgetSuccess(false);
            }}
          />
          {budgetError ? (
            <Text accessibilityRole="alert" style={styles.inlineError}>
              {budgetError}
            </Text>
          ) : null}
          {budgetSuccess ? (
            <Text accessibilityRole="alert" style={styles.successText}>
              {translate("waterBudgetSaved")}
            </Text>
          ) : null}
          <PrimaryButton
            loading={savingBudget}
            onPress={() => void saveBudget()}
            title={translate("saveWaterBudget")}
          />
        </View>

        <View style={styles.formSection}>
          <View style={styles.sectionTitleRow}>
            <Droplets color="#176b83" size={22} />
            <Text style={styles.sectionTitle}>
              {translate("recordUsageTitle")}
            </Text>
          </View>
          <WaterNumberInput
            label={translate("usageAmount")}
            value={usageInput}
            placeholder={translate("usageAmountPlaceholder")}
            testID="water-usage-input"
            onChangeText={(value) => {
              setUsageInput(value);
              setUsageError(null);
              setUsageSuccess(false);
            }}
          />
          <View style={styles.noteGroup}>
            <Text style={styles.inputLabel}>{translate("usageNote")}</Text>
            <TextInput
              accessibilityLabel={translate("usageNote")}
              maxLength={500}
              multiline
              onChangeText={setUsageNote}
              placeholder={translate("usageNotePlaceholder")}
              placeholderTextColor="#82958d"
              style={styles.noteInput}
              value={usageNote}
            />
          </View>
          {usageError ? (
            <Text accessibilityRole="alert" style={styles.inlineError}>
              {usageError}
            </Text>
          ) : null}
          {usageSuccess ? (
            <Text accessibilityRole="alert" style={styles.successText}>
              {translate("waterUsageSaved")}
            </Text>
          ) : null}
          <PrimaryButton
            disabled={!waterBudget || waterBudget.available_water === null}
            loading={savingUsage}
            onPress={() => void saveUsage()}
            title={translate("saveUsage")}
          />
        </View>

        <View style={styles.historySection}>
          <View style={styles.sectionTitleRow}>
            <History color="#176b83" size={22} />
            <Text style={styles.sectionTitle}>{translate("usageHistory")}</Text>
          </View>
          {waterLoading && waterUsage.length === 0 ? (
            <ActivityIndicator color="#176544" style={styles.historyLoading} />
          ) : waterUsage.length === 0 ? (
            <Text style={styles.emptyHistory}>{translate("noWaterUsage")}</Text>
          ) : (
            waterUsage.map((entry) => (
              <View key={entry.id} style={styles.historyItem}>
                <View style={styles.historyIcon}>
                  <Droplets color="#176b83" size={19} />
                </View>
                <View style={styles.historyCopy}>
                  <Text style={styles.historyAmount}>
                    {formatLiters(entry.amount)} {translate("litersUnit")}
                  </Text>
                  <Text style={styles.historyDate}>
                    {formatRecordedAt(entry.recorded_at)}
                  </Text>
                  {entry.notes ? (
                    <Text style={styles.historyNote}>{entry.notes}</Text>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </View>
      </AuthLayout>
    </SafeAreaView>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
  testID,
}: {
  icon: typeof Droplets;
  label: string;
  value: number | null;
  tone: "blue" | "green" | "teal" | "red";
  testID?: string;
}) {
  return (
    <View
      accessible
      accessibilityLabel={label}
      accessibilityValue={{
        text:
          value === null
            ? translate("waterValueUnavailable")
            : formatLiters(value),
      }}
      testID={testID}
      style={[styles.summaryCard, styles[`summary_${tone}`]]}
    >
      <Icon color="#17574e" size={21} />
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.summaryValue}>
        {value === null
          ? translate("waterValueUnavailable")
          : formatLiters(value)}
      </Text>
      <Text style={styles.summaryUnit}>{translate("litersUnit")}</Text>
    </View>
  );
}

function WaterNumberInput({
  label,
  value,
  placeholder,
  onChangeText,
  testID,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText(value: string): void;
  testID: string;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.numberInputFrame}>
        <TextInput
          accessibilityLabel={label}
          keyboardType="decimal-pad"
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#82958d"
          style={styles.numberInput}
          testID={testID}
          value={value}
        />
        <Text style={styles.inputUnit}>{translate("litersUnit")}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: "#edf5ee", flex: 1 },
  backButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    minHeight: 48,
    marginBottom: 14,
  },
  backText: { color: "#15543d", fontSize: 16, fontWeight: "600" },
  loadingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingVertical: 20,
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
  emptyBudget: {
    alignItems: "center",
    backgroundColor: "#e6f0f1",
    borderRadius: 8,
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
    padding: 15,
  },
  emptyIcon: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  emptyTitle: { color: "#315c61", flex: 1, fontSize: 16, lineHeight: 23 },
  periodRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  periodText: { color: "#526b61", fontSize: 14 },
  summaryGrid: { flexDirection: "row", gap: 8, marginBottom: 12 },
  summaryCard: { borderRadius: 8, flex: 1, minHeight: 132, padding: 11 },
  summary_blue: { backgroundColor: "#e3eef4" },
  summary_green: { backgroundColor: "#e2efe6" },
  summary_teal: { backgroundColor: "#dff0ef" },
  summary_red: { backgroundColor: "#f8e9e4" },
  summaryLabel: {
    color: "#38564d",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 7,
    minHeight: 36,
  },
  summaryValue: {
    color: "#153d33",
    fontSize: 22,
    fontWeight: "700",
    marginTop: 3,
  },
  summaryUnit: { color: "#526b61", fontSize: 12 },
  usageCard: {
    backgroundColor: "#ffffff",
    borderColor: "#d5e1d8",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 15,
  },
  usageHeading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  usageLabel: { color: "#24493d", fontSize: 16, fontWeight: "600" },
  usageNumber: { color: "#15543d", fontSize: 25, fontWeight: "700" },
  progressTrack: {
    backgroundColor: "#e4ece7",
    borderRadius: 8,
    height: 14,
    marginTop: 11,
    overflow: "hidden",
  },
  progressFill: { backgroundColor: "#24846b", borderRadius: 8, height: "100%" },
  thresholdHelp: {
    color: "#61766d",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 9,
  },
  warningBox: {
    alignItems: "flex-start",
    borderRadius: 8,
    flexDirection: "row",
    gap: 9,
    marginBottom: 17,
    padding: 13,
  },
  normalWarning: { backgroundColor: "#e2efe6" },
  lowWarning: { backgroundColor: "#fff2d7" },
  veryLowWarning: { backgroundColor: "#fbe9e7" },
  warningText: { color: "#4d4d32", flex: 1, fontSize: 15, lineHeight: 22 },
  formSection: {
    backgroundColor: "#ffffff",
    borderColor: "#d5e1d8",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    padding: 15,
  },
  sectionTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
    marginBottom: 14,
  },
  sectionTitle: { color: "#153d33", flex: 1, fontSize: 19, fontWeight: "700" },
  inputGroup: { marginBottom: 13 },
  inputLabel: {
    color: "#24493d",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 7,
  },
  numberInputFrame: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#ccdad1",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 58,
    paddingHorizontal: 14,
  },
  numberInput: {
    color: "#163c32",
    flex: 1,
    fontSize: 18,
    minHeight: 56,
    paddingHorizontal: 4,
  },
  inputUnit: { color: "#526b61", fontSize: 15, paddingLeft: 8 },
  noteGroup: { marginBottom: 14 },
  noteInput: {
    backgroundColor: "#ffffff",
    borderColor: "#ccdad1",
    borderRadius: 8,
    borderWidth: 1,
    color: "#163c32",
    fontSize: 16,
    minHeight: 82,
    padding: 12,
    textAlignVertical: "top",
  },
  inlineError: {
    color: "#922e2a",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  successText: {
    color: "#205b3e",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  historySection: { marginTop: 4 },
  historyLoading: { marginVertical: 18 },
  emptyHistory: {
    backgroundColor: "#e6f0f1",
    borderRadius: 8,
    color: "#315c61",
    fontSize: 15,
    lineHeight: 23,
    padding: 15,
  },
  historyItem: {
    alignItems: "flex-start",
    backgroundColor: "#ffffff",
    borderColor: "#d5e1d8",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginBottom: 9,
    padding: 13,
  },
  historyIcon: {
    alignItems: "center",
    backgroundColor: "#e3eef4",
    borderRadius: 8,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  historyCopy: { flex: 1 },
  historyAmount: { color: "#153d33", fontSize: 17, fontWeight: "700" },
  historyDate: { color: "#64776f", fontSize: 13, marginTop: 4 },
  historyNote: { color: "#38564d", fontSize: 15, lineHeight: 21, marginTop: 6 },
});
