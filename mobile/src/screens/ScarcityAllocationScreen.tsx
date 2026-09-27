import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
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
  CheckCircle2,
  Droplets,
  Plus,
  RefreshCw,
  Sprout,
  Trash2,
  Waves,
} from "lucide-react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";

import { AuthLayout } from "../components/AuthLayout";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAuth } from "../context/AuthContext";
import { translate } from "../i18n";
import type { RootStackParamList } from "../navigation/RootNavigator";
import type { ScarcityLevel } from "../types/auth";

function formatLiters(amount: number): string {
  return amount.toLocaleString("te-IN", { maximumFractionDigits: 2 });
}

function getScarcityBadge(level?: ScarcityLevel) {
  switch (level) {
    case "critical":
      return { label: translate("scarcityCritical"), color: "#922e2a", bg: "#fce8e6" };
    case "high":
      return { label: translate("scarcityHigh"), color: "#b06000", bg: "#fef3d6" };
    case "moderate":
      return { label: translate("scarcityModerate"), color: "#785600", bg: "#fff8e1" };
    case "normal":
      return { label: translate("scarcityNormal"), color: "#15543d", bg: "#e6f4ea" };
    case "exhausted":
      return { label: translate("scarcityExhausted"), color: "#a51d24", bg: "#fde8e8" };
    default:
      return { label: translate("scarcityNoBudget"), color: "#5f6368", bg: "#f1f3f4" };
  }
}

export function ScarcityAllocationScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    scarcitySummary,
    scarcityLoading,
    scarcityError,
    refreshScarcityAllocation,
    saveAllocation,
    addNewCrop,
    removeCrop,
  } = useAuth();

  // Allocation inputs keyed by crop_name
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [planNotes, setPlanNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  // Add crop modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCropName, setNewCropName] = useState("");
  const [newCropArea, setNewCropArea] = useState("");
  const [newCropStage, setNewCropStage] = useState("");
  const [newCropPriority, setNewCropPriority] = useState("");
  const [addingCrop, setAddingCrop] = useState(false);
  const [addCropError, setAddCropError] = useState<string | null>(null);

  // Populate allocation fields from active plan or 0
  useEffect(() => {
    if (!scarcitySummary) return;

    const initialAlloc: Record<string, string> = {};
    if (scarcitySummary.current_plan?.items) {
      for (const item of scarcitySummary.current_plan.items) {
        initialAlloc[item.crop_name] = String(item.allocated_liters);
      }
      if (scarcitySummary.current_plan.notes) {
        setPlanNotes(scarcitySummary.current_plan.notes);
      }
    }

    // Ensure all existing crops have at least an entry
    for (const crop of scarcitySummary.crops) {
      if (initialAlloc[crop.crop_name] === undefined) {
        initialAlloc[crop.crop_name] = "0";
      }
    }

    setAllocations(initialAlloc);
  }, [scarcitySummary]);

  const availableWater = scarcitySummary?.available_water ?? 0;
  const usedWater = scarcitySummary?.total_used ?? 0;
  const remainingWater = scarcitySummary?.remaining_water ?? 0;
  const crops = scarcitySummary?.crops ?? [];
  const badge = getScarcityBadge(scarcitySummary?.scarcity_level);

  // Live calculation of total allocated
  const totalAllocated = crops.reduce((sum, crop) => {
    const val = parseFloat(allocations[crop.crop_name] || "0");
    return sum + (isNaN(val) || val < 0 ? 0 : val);
  }, 0);

  const unallocatedRemaining = Math.max(0, remainingWater - totalAllocated);
  const isOverAllocated = remainingWater > 0 && totalAllocated > remainingWater;
  const overAllocatedExcess = isOverAllocated ? totalAllocated - remainingWater : 0;
  const percentOfRemaining =
    remainingWater > 0
      ? Math.min(100, Math.round((totalAllocated / remainingWater) * 100))
      : 0;

  function handleLitersChange(cropName: string, text: string) {
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);
    setAllocations((prev) => ({
      ...prev,
      [cropName]: text,
    }));
  }

  async function handleSavePlan() {
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);

    if (isOverAllocated) {
      setSaveErrorMsg(translate("allocationExceedsRemainingError"));
      return;
    }

    if (crops.length === 0) {
      setSaveErrorMsg(translate("incompleteProfileMessage"));
      return;
    }

    const items = crops.map((crop, idx) => {
      const parsedLiters = parseFloat(allocations[crop.crop_name] || "0");
      return {
        crop_name: crop.crop_name,
        area_acres: crop.area_acres,
        allocated_liters: isNaN(parsedLiters) || parsedLiters < 0 ? 0 : parsedLiters,
        priority: crop.priority || idx + 1,
      };
    });

    setSaving(true);
    try {
      await saveAllocation({
        items,
        notes: planNotes.trim() ? planNotes.trim() : undefined,
      });
      setSaveSuccessMsg(translate("allocationSavedSuccess"));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : translate("requestFailed");
      setSaveErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddCropSubmit() {
    setAddCropError(null);
    if (!newCropName.trim()) {
      setAddCropError(translate("requiredField"));
      return;
    }

    const area = parseFloat(newCropArea.trim());
    if (isNaN(area) || area <= 0) {
      setAddCropError(translate("enterValidLiters"));
      return;
    }

    setAddingCrop(true);
    try {
      await addNewCrop({
        crop_name: newCropName.trim(),
        area_acres: area,
        crop_stage: newCropStage.trim() ? newCropStage.trim() : undefined,
        priority: newCropPriority ? parseInt(newCropPriority, 10) : undefined,
      });
      setShowAddModal(false);
      setNewCropName("");
      setNewCropArea("");
      setNewCropStage("");
      setNewCropPriority("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : translate("requestFailed");
      setAddCropError(msg);
    } finally {
      setAddingCrop(false);
    }
  }

  async function handleDeleteCrop(cropId: string) {
    try {
      await removeCrop(cropId);
    } catch {
      // Handled in context
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AuthLayout
        subtitle={translate("scarcityAllocationSubtitle")}
        title={translate("scarcityAllocationTitle")}
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

        {/* Loading Spinner */}
        {scarcityLoading && !scarcitySummary ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#176544" size="small" />
            <Text style={styles.mutedText}>
              {translate("scarcityLoadingText")}
            </Text>
          </View>
        ) : null}

        {/* Context Error */}
        {scarcityError ? (
          <View accessibilityRole="alert" style={styles.errorBox}>
            <Text style={styles.errorText}>{scarcityError}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void refreshScarcityAllocation()}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>{translate("retry")}</Text>
            </Pressable>
          </View>
        ) : null}

        {/* If no budget set */}
        {scarcitySummary && scarcitySummary.available_water === null ? (
          <View style={styles.noticeCard} testID="no-budget-card">
            <View style={styles.noticeIconCircle}>
              <AlertTriangle color="#b06000" size={28} />
            </View>
            <Text style={styles.noticeTitle}>
              {translate("scarcityNoBudget")}
            </Text>
            <Text style={styles.noticeMessage}>
              {translate("scarcityNoBudgetMessage")}
            </Text>
            <PrimaryButton
              onPress={() => navigation.navigate("WaterManagement")}
              title={translate("waterManagementTitle")}
            />
          </View>
        ) : null}

        {/* If water exhausted */}
        {scarcitySummary &&
        scarcitySummary.available_water !== null &&
        remainingWater <= 0 ? (
          <View style={styles.noticeCard} testID="exhausted-water-card">
            <View style={styles.noticeIconCircle}>
              <AlertTriangle color="#922e2a" size={28} />
            </View>
            <Text style={styles.noticeTitle}>
              {translate("scarcityExhausted")}
            </Text>
            <Text style={styles.noticeMessage}>
              {translate("scarcityExhaustedMessage")}
            </Text>
          </View>
        ) : null}

        {/* Main Water Allocation View */}
        {scarcitySummary && scarcitySummary.available_water !== null ? (
          <>
            {/* Scarcity Level Banner */}
            <View style={[styles.badgeContainer, { backgroundColor: badge.bg }]}>
              <Waves color={badge.color} size={18} />
              <Text style={[styles.badgeText, { color: badge.color }]}>
                {badge.label}
              </Text>
            </View>

            {/* 5 Distinct Water Quantities Grid */}
            <View style={styles.overviewGrid} testID="scarcity-overview-grid">
              {/* 1. Available Water */}
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>
                  {translate("availableWaterLabel")}
                </Text>
                <Text style={styles.metricValue}>
                  {formatLiters(availableWater)} {translate("litersUnit")}
                </Text>
              </View>

              {/* 2. Already Used Water */}
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>
                  {translate("usedWaterLabel")}
                </Text>
                <Text style={styles.metricValue}>
                  {formatLiters(usedWater)} {translate("litersUnit")}
                </Text>
              </View>

              {/* 3. Remaining Water */}
              <View style={[styles.metricCard, styles.remainingMetricCard]}>
                <Text style={styles.metricLabel}>
                  {translate("remainingWaterLabel")}
                </Text>
                <Text
                  style={[styles.metricValue, { color: remainingWater > 0 ? "#15543d" : "#922e2a" }]}
                >
                  {formatLiters(remainingWater)} {translate("litersUnit")}
                </Text>
              </View>

              {/* 4. Water Being Allocated */}
              <View style={[styles.metricCard, isOverAllocated && styles.overAllocatedCard]}>
                <Text style={styles.metricLabel}>
                  {translate("allocatedWaterLabel")}
                </Text>
                <Text
                  style={[styles.metricValue, { color: isOverAllocated ? "#922e2a" : "#176b83" }]}
                >
                  {formatLiters(totalAllocated)} {translate("litersUnit")}
                </Text>
              </View>

              {/* 5. Unallocated Water Balance */}
              <View style={[styles.metricCard, styles.balanceMetricCard]}>
                <Text style={styles.metricLabel}>
                  {translate("unallocatedWaterLabel")}
                </Text>
                <Text
                  style={[styles.metricValue, { color: isOverAllocated ? "#922e2a" : "#436a29" }]}
                >
                  {formatLiters(unallocatedRemaining)} {translate("litersUnit")}
                </Text>
              </View>
            </View>

            {/* Allocation Progress Bar */}
            <View style={styles.progressBarCard}>
              <View style={styles.progressHeaderRow}>
                <Text style={styles.progressHeaderLabel}>
                  {translate("allocationPercentOfRemaining")}
                </Text>
                <Text style={styles.progressHeaderPercent}>
                  {percentOfRemaining}%
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(100, percentOfRemaining)}%`,
                      backgroundColor: isOverAllocated ? "#b3261e" : "#176b83",
                    },
                  ]}
                />
              </View>
              {isOverAllocated ? (
                <View style={styles.overAllocAlert} testID="over-allocation-warning">
                  <AlertTriangle color="#922e2a" size={16} />
                  <Text style={styles.overAllocAlertText}>
                    {translate("allocationExceedsRemainingError")}{" "}
                    (+{formatLiters(overAllocatedExcess)} {translate("litersUnit")})
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Per-Crop Allocation Section */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                {translate("cropsAllocationTitle")}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowAddModal(true)}
                style={styles.addCropTrigger}
                testID="add-crop-trigger-button"
              >
                <Plus color="#15543d" size={16} />
                <Text style={styles.addCropTriggerText}>
                  {translate("addCropButton")}
                </Text>
              </Pressable>
            </View>

            {crops.map((crop, idx) => {
              const currentInput = allocations[crop.crop_name] || "";
              const litersNum = parseFloat(currentInput || "0");
              const validLiters = !isNaN(litersNum) && litersNum >= 0 ? litersNum : 0;
              const perAcre = crop.area_acres > 0 ? Math.round(validLiters / crop.area_acres) : 0;
              const cropPct =
                remainingWater > 0
                  ? ((validLiters / remainingWater) * 100).toFixed(1)
                  : "0.0";

              return (
                <View
                  key={crop.id || crop.crop_name}
                  style={styles.cropCard}
                  testID={`crop-card-${idx}`}
                >
                  <View style={styles.cropCardHeader}>
                    <View style={styles.cropTitleWrap}>
                      <View style={styles.cropIconCircle}>
                        <Sprout color="#15543d" size={18} />
                      </View>
                      <View>
                        <Text style={styles.cropNameText}>{crop.crop_name}</Text>
                        <Text style={styles.cropMetaText}>
                          {crop.area_acres} {translate("acresUnit")}
                          {crop.crop_stage ? ` • ${crop.crop_stage}` : ""}
                        </Text>
                      </View>
                    </View>

                    {crops.length > 1 ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => handleDeleteCrop(crop.id)}
                        style={styles.deleteCropButton}
                        testID={`delete-crop-${idx}`}
                      >
                        <Trash2 color="#922e2a" size={16} />
                      </Pressable>
                    ) : null}
                  </View>

                  {/* Allocation Input */}
                  <View style={styles.inputWrap}>
                    <Text style={styles.inputLabel}>
                      {translate("allocatedWaterLabel")} ({translate("litersUnit")})
                    </Text>
                    <TextInput
                      keyboardType="numeric"
                      onChangeText={(text) => handleLitersChange(crop.crop_name, text)}
                      placeholder="0"
                      placeholderTextColor="#7a8b82"
                      style={styles.textInput}
                      testID={`crop-allocation-input-${idx}`}
                      value={currentInput}
                    />
                  </View>

                  {/* Calculations per crop */}
                  <View style={styles.cropCalculationsRow}>
                    <View style={styles.cropCalcItem}>
                      <Text style={styles.cropCalcLabel}>
                        {translate("litersPerAcre")}
                      </Text>
                      <Text style={styles.cropCalcValue}>
                        {formatLiters(perAcre)} {translate("litersUnit")}
                      </Text>
                    </View>
                    <View style={styles.cropCalcItem}>
                      <Text style={styles.cropCalcLabel}>
                        {translate("allocationPercentOfRemaining")}
                      </Text>
                      <Text style={styles.cropCalcValue}>{cropPct}%</Text>
                    </View>
                  </View>
                </View>
              );
            })}

            {/* Plan Notes */}
            <View style={styles.notesCard}>
              <Text style={styles.inputLabel}>{translate("planNotesLabel")}</Text>
              <TextInput
                onChangeText={setPlanNotes}
                placeholder={translate("planNotesPlaceholder")}
                placeholderTextColor="#7a8b82"
                style={[styles.textInput, styles.notesInput]}
                testID="plan-notes-input"
                value={planNotes}
              />
            </View>

            {/* Error or Success Banner */}
            {saveErrorMsg ? (
              <View accessibilityRole="alert" style={styles.errorBox}>
                <Text style={styles.errorText}>{saveErrorMsg}</Text>
              </View>
            ) : null}

            {saveSuccessMsg ? (
              <View style={styles.successBox} testID="save-success-banner">
                <CheckCircle2 color="#15543d" size={18} />
                <Text style={styles.successText}>{saveSuccessMsg}</Text>
              </View>
            ) : null}

            {/* Save Button */}
            {remainingWater > 0 ? (
              <View style={styles.saveButtonWrap}>
                <PrimaryButton
                  disabled={saving || isOverAllocated}
                  onPress={handleSavePlan}
                  testID="save-allocation-button"
                  title={
                    saving
                      ? translate("savingAllocation")
                      : translate("allocateWaterButton")
                  }
                />
              </View>
            ) : null}
          </>
        ) : null}

        {/* Modal: Add Farmer Crop */}
        <Modal
          animationType="slide"
          onRequestClose={() => setShowAddModal(false)}
          transparent
          visible={showAddModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent} testID="add-crop-modal">
              <Text style={styles.modalTitle}>{translate("addCropTitle")}</Text>

              {addCropError ? (
                <View accessibilityRole="alert" style={styles.modalErrorBox}>
                  <Text style={styles.modalErrorText}>{addCropError}</Text>
                </View>
              ) : null}

              <Text style={styles.inputLabel}>{translate("cropNameInputLabel")} *</Text>
              <TextInput
                onChangeText={setNewCropName}
                placeholder="ఉదా: మొక్కజొన్న, పత్తి"
                placeholderTextColor="#7a8b82"
                style={styles.textInput}
                testID="new-crop-name-input"
                value={newCropName}
              />

              <Text style={styles.inputLabel}>{translate("cropAreaInputLabel")} *</Text>
              <TextInput
                keyboardType="numeric"
                onChangeText={setNewCropArea}
                placeholder="ఉదా: 2.5"
                placeholderTextColor="#7a8b82"
                style={styles.textInput}
                testID="new-crop-area-input"
                value={newCropArea}
              />

              <Text style={styles.inputLabel}>{translate("cropStageInputLabel")}</Text>
              <TextInput
                onChangeText={setNewCropStage}
                placeholder="ఉదా: ప్రారంభ దశ, పూత దశ"
                placeholderTextColor="#7a8b82"
                style={styles.textInput}
                testID="new-crop-stage-input"
                value={newCropStage}
              />

              <Text style={styles.inputLabel}>{translate("cropPriorityInputLabel")}</Text>
              <TextInput
                keyboardType="numeric"
                onChangeText={setNewCropPriority}
                placeholder="1, 2, 3..."
                placeholderTextColor="#7a8b82"
                style={styles.textInput}
                testID="new-crop-priority-input"
                value={newCropPriority}
              />

              <View style={styles.modalButtonRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setShowAddModal(false)}
                  style={styles.modalCancelButton}
                >
                  <Text style={styles.modalCancelText}>{translate("back")}</Text>
                </Pressable>
                <View style={styles.modalSubmitWrap}>
                  <PrimaryButton
                    disabled={addingCrop}
                    onPress={handleAddCropSubmit}
                    testID="confirm-add-crop-button"
                    title={
                      addingCrop
                        ? translate("addingCrop")
                        : translate("addCropButton")
                    }
                  />
                </View>
              </View>
            </View>
          </View>
        </Modal>
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
  noticeCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d5dfd9",
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
  },
  noticeIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fff8e1",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  noticeTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#13231b",
    marginBottom: 8,
    textAlign: "center",
  },
  noticeMessage: {
    fontSize: 14,
    color: "#466255",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: "700",
  },
  overviewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e1ebe5",
    padding: 12,
  },
  remainingMetricCard: {
    borderColor: "#b6ddc7",
    backgroundColor: "#f4fbf7",
  },
  overAllocatedCard: {
    borderColor: "#f5c2be",
    backgroundColor: "#fdf2f1",
  },
  balanceMetricCard: {
    minWidth: "100%",
    backgroundColor: "#f9fcf9",
    borderColor: "#d0e4d7",
  },
  metricLabel: {
    fontSize: 12,
    color: "#537162",
    marginBottom: 4,
    fontWeight: "500",
  },
  metricValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#13231b",
  },
  progressBarCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e1ebe5",
    padding: 14,
    marginBottom: 20,
  },
  progressHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressHeaderLabel: {
    fontSize: 13,
    color: "#537162",
    fontWeight: "600",
  },
  progressHeaderPercent: {
    fontSize: 14,
    fontWeight: "700",
    color: "#176b83",
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: "#e8edea",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 5,
  },
  overAllocAlert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  overAllocAlertText: {
    fontSize: 12,
    color: "#922e2a",
    fontWeight: "600",
    flex: 1,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#13231b",
  },
  addCropTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#e8f5ec",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addCropTriggerText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#15543d",
  },
  cropCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e1ebe5",
    padding: 14,
    marginBottom: 14,
  },
  cropCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cropTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cropIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#e8f5ec",
    alignItems: "center",
    justifyContent: "center",
  },
  cropNameText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#13231b",
  },
  cropMetaText: {
    fontSize: 12,
    color: "#537162",
  },
  deleteCropButton: {
    padding: 6,
  },
  inputWrap: {
    marginBottom: 10,
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
  cropCalculationsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f4f8f5",
    borderRadius: 8,
    padding: 10,
  },
  cropCalcItem: {
    flex: 1,
  },
  cropCalcLabel: {
    fontSize: 11,
    color: "#6b8376",
    marginBottom: 2,
  },
  cropCalcValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#15543d",
  },
  notesCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e1ebe5",
    padding: 14,
    marginBottom: 16,
  },
  notesInput: {
    minHeight: 50,
  },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#e8f5ec",
    borderColor: "#b6ddc7",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  successText: {
    fontSize: 14,
    color: "#15543d",
    fontWeight: "600",
    flex: 1,
  },
  saveButtonWrap: {
    marginBottom: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#13231b",
    marginBottom: 16,
  },
  modalErrorBox: {
    backgroundColor: "#fce8e6",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  modalErrorText: {
    color: "#922e2a",
    fontSize: 13,
  },
  modalButtonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
    alignItems: "center",
  },
  modalCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#c8d9ce",
  },
  modalCancelText: {
    fontSize: 14,
    color: "#466255",
    fontWeight: "600",
  },
  modalSubmitWrap: {
    flex: 1,
  },
});
