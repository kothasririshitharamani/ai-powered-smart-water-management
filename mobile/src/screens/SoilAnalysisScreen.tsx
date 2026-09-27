import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Image as ImageIcon,
  Info,
  RefreshCw,
  ShieldAlert,
} from "lucide-react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";

import { AuthLayout } from "../components/AuthLayout";
import { PrimaryButton } from "../components/PrimaryButton";
import { translate } from "../i18n";
import type { RootStackParamList } from "../navigation/RootNavigator";
import {
  analyzeSoilImage,
  getSoilAnalysisHistory,
} from "../services/soilAnalysis";
import type { SoilAnalysisReport } from "../types/auth";

export function SoilAnalysisScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [selectedBase64, setSelectedBase64] = useState<string | null>(null);
  const [selectedMimeType, setSelectedMimeType] = useState<string>("image/jpeg");

  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentReport, setCurrentReport] = useState<SoilAnalysisReport | null>(null);

  const [history, setHistory] = useState<SoilAnalysisReport[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    setLoadingHistory(true);
    try {
      const reports = await getSoilAnalysisHistory();
      const safeReports = Array.isArray(reports) ? reports : [];
      setHistory(safeReports);
      if (safeReports.length > 0 && !currentReport) {
        setCurrentReport(safeReports[0]);
      }
    } catch {
      // Ignore initial history failure silently
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function handlePickImage() {
    setError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedImageUri(asset.uri);
        setSelectedBase64(asset.base64 ?? null);
        setSelectedMimeType(asset.mimeType || "image/jpeg");
      }
    } catch {
      setError(translate("requestFailed"));
    }
  }

  async function handleTakePhoto() {
    setError(null);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError("కెమెరా అనుమతి అవసరం. దయచేసి పరికర సెట్టింగ్లలో అనుమతించండి.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedImageUri(asset.uri);
        setSelectedBase64(asset.base64 ?? null);
        setSelectedMimeType(asset.mimeType || "image/jpeg");
      }
    } catch {
      setError(translate("requestFailed"));
    }
  }

  async function handleAnalyze() {
    if (!selectedBase64) {
      setError(translate("noImageSelectedNotice"));
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const res = await analyzeSoilImage({
        image_base64: selectedBase64,
        mime_type: selectedMimeType,
      });
      setCurrentReport(res.report);
      setHistory((prev) => [res.report, ...prev]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : translate("requestFailed");
      setError(msg);
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AuthLayout
        subtitle={translate("soilAnalysisSubtitle")}
        title={translate("soilAnalysisTitle")}
      >
        {/* Navigation Bar */}
        <View style={styles.navRow}>
          <Pressable
            accessibilityLabel={translate("back")}
            accessibilityRole="button"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            testID="soil-analysis-back-button"
          >
            <ArrowLeft color="#15543d" size={20} />
            <Text style={styles.backText}>{translate("back")}</Text>
          </Pressable>
        </View>

        {/* Prominent Physical Lab Requirement Warning */}
        <View style={styles.labNoticeCard} testID="lab-notice-card">
          <View style={styles.labNoticeHeader}>
            <ShieldAlert color="#b06000" size={22} />
            <Text style={styles.labNoticeTitle}>
              {translate("soilLabNoticeTitle")}
            </Text>
          </View>
          <Text style={styles.labNoticeText}>
            {translate("soilLabNoticeText")}
          </Text>
        </View>

        {/* Image Selection Actions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ఫోటో ఎంపిక</Text>
          <View style={styles.pickerButtonsRow}>
            <Pressable
              accessibilityRole="button"
              onPress={handleTakePhoto}
              style={[styles.pickerButton, styles.cameraButton]}
              testID="take-photo-button"
            >
              <Camera color="#ffffff" size={20} />
              <Text style={styles.pickerButtonText}>
                {translate("takePhotoWithCamera")}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={handlePickImage}
              style={[styles.pickerButton, styles.galleryButton]}
              testID="pick-image-button"
            >
              <ImageIcon color="#15543d" size={20} />
              <Text style={styles.galleryButtonText}>
                {translate("selectFromGallery")}
              </Text>
            </Pressable>
          </View>

          {/* Selected Image Preview */}
          {selectedImageUri ? (
            <View style={styles.previewContainer}>
              <Text style={styles.previewLabel}>
                {translate("selectedImagePreview")}:
              </Text>
              <Image
                accessibilityLabel="ఎంచుకున్న నేల ఫోటో"
                resizeMode="cover"
                source={{ uri: selectedImageUri }}
                style={styles.previewImage}
                testID="selected-image-preview"
              />
              <Pressable
                accessibilityRole="button"
                onPress={handlePickImage}
                style={styles.reselectButton}
              >
                <RefreshCw color="#15543d" size={16} />
                <Text style={styles.reselectText}>
                  {translate("reselectImage")}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {/* Error Message */}
          {error ? (
            <View style={styles.errorBox} testID="soil-analysis-error">
              <AlertTriangle color="#b3261e" size={18} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Submit Button */}
          <PrimaryButton
            disabled={!selectedBase64 || analyzing}
            loading={analyzing}
            onPress={handleAnalyze}
            testID="analyze-image-button"
            title={
              analyzing
                ? translate("analyzingImage")
                : translate("analyzeImageButton")
            }
          />
        </View>

        {/* Current Visual Observation Results */}
        {currentReport ? (
          <View style={styles.resultsCard} testID="soil-analysis-result">
            <View style={styles.resultHeaderRow}>
              <CheckCircle2 color="#15543d" size={22} />
              <Text style={styles.resultTitle}>
                దృశ్య పరిశీలన నివేదిక
              </Text>
            </View>

            {/* Apparent Characteristics */}
            <View style={styles.observationSection}>
              <Text style={styles.observationLabel}>
                {translate("apparentSoilCharacteristicsLabel")}
              </Text>
              <View style={styles.observationBox}>
                <Text
                  style={styles.observationText}
                  testID="apparent-characteristics-text"
                >
                  {currentReport.apparent_soil_characteristics}
                </Text>
              </View>
            </View>

            {/* Moisture Condition */}
            <View style={styles.observationSection}>
              <Text style={styles.observationLabel}>
                {translate("moistureConditionLabel")}
              </Text>
              <View style={styles.observationBox}>
                <Text
                  style={styles.observationText}
                  testID="moisture-condition-text"
                >
                  {currentReport.possible_moisture_condition}
                </Text>
              </View>
            </View>

            {/* Visible Issues */}
            <View style={styles.observationSection}>
              <Text style={styles.observationLabel}>
                {translate("visibleIssuesLabel")}
              </Text>
              {currentReport.visible_issues.map((issue, idx) => (
                <View key={`issue-${idx}`} style={styles.bulletItem}>
                  <AlertTriangle color="#c46200" size={16} />
                  <Text style={styles.bulletText}>{issue}</Text>
                </View>
              ))}
            </View>

            {/* Recommended Next Steps */}
            <View style={styles.observationSection}>
              <Text style={styles.observationLabel}>
                {translate("recommendedNextStepsLabel")}
              </Text>
              {currentReport.recommended_next_steps.map((step, idx) => (
                <View key={`step-${idx}`} style={styles.bulletItem}>
                  <CheckCircle2 color="#15543d" size={16} />
                  <Text style={styles.bulletText}>{step}</Text>
                </View>
              ))}
            </View>

            {/* Uncertainty and Limitations */}
            <View style={styles.limitationBox}>
              <View style={styles.limitationHeader}>
                <Info color="#5f6368" size={16} />
                <Text style={styles.limitationTitle}>
                  {translate("uncertaintyLabel")}
                </Text>
              </View>
              <Text
                style={styles.limitationText}
                testID="uncertainty-limitations-text"
              >
                {currentReport.uncertainty_and_limitations}
              </Text>
              <View style={styles.badgeContainer}>
                <Text style={styles.labBadgeText}>
                  {translate("requiresLabBadge")}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* History Section */}
        <View style={styles.historyCard}>
          <Text style={styles.cardTitle}>
            {translate("soilAnalysisHistoryTitle")}
          </Text>

          {loadingHistory ? (
            <ActivityIndicator color="#15543d" style={{ marginVertical: 12 }} />
          ) : history.length === 0 ? (
            <Text style={styles.emptyHistoryText}>
              {translate("noHistoryYet")}
            </Text>
          ) : (
            history.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => setCurrentReport(item)}
                style={[
                  styles.historyItem,
                  currentReport?.id === item.id && styles.activeHistoryItem,
                ]}
                testID={`history-item-${item.id}`}
              >
                <View style={styles.historyRow}>
                  <Text style={styles.historyDate}>
                    {new Date(item.created_at).toLocaleDateString("te-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>
                  {currentReport?.id === item.id ? (
                    <Text style={styles.activeTag}>ప్రస్తుతం చూస్తున్నారు</Text>
                  ) : null}
                </View>
                <Text numberOfLines={2} style={styles.historySummary}>
                  {item.apparent_soil_characteristics}
                </Text>
              </Pressable>
            ))
          )}
        </View>
      </AuthLayout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f4f7f4",
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  backText: {
    color: "#15543d",
    fontSize: 15,
    fontWeight: "700",
  },
  labNoticeCard: {
    backgroundColor: "#fff8e1",
    borderWidth: 1.5,
    borderColor: "#ffe082",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  labNoticeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  labNoticeTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#855700",
  },
  labNoticeText: {
    fontSize: 13,
    color: "#6d4c00",
    lineHeight: 19,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1b2e1b",
    marginBottom: 12,
  },
  pickerButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  pickerButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  cameraButton: {
    backgroundColor: "#15543d",
  },
  pickerButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  galleryButton: {
    backgroundColor: "#e8f5ec",
    borderWidth: 1,
    borderColor: "#c2e7cc",
  },
  galleryButtonText: {
    color: "#15543d",
    fontSize: 13,
    fontWeight: "700",
  },
  previewContainer: {
    alignItems: "center",
    marginVertical: 12,
  },
  previewLabel: {
    alignSelf: "flex-start",
    fontSize: 13,
    fontWeight: "600",
    color: "#4a5d4e",
    marginBottom: 8,
  },
  previewImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    backgroundColor: "#e0e0e0",
  },
  reselectButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingVertical: 6,
  },
  reselectText: {
    color: "#15543d",
    fontSize: 13,
    fontWeight: "600",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fce8e6",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    color: "#b3261e",
    fontSize: 13,
    lineHeight: 18,
  },
  resultsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  resultHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#edf2ee",
  },
  resultTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#15543d",
  },
  observationSection: {
    marginBottom: 14,
  },
  observationLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1b2e1b",
    marginBottom: 6,
  },
  observationBox: {
    backgroundColor: "#f7f9f7",
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#15543d",
  },
  observationText: {
    fontSize: 13,
    color: "#2f3f33",
    lineHeight: 19,
  },
  bulletItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 6,
    paddingLeft: 4,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: "#2f3f33",
    lineHeight: 19,
  },
  limitationBox: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e0e3e5",
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
  },
  limitationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  limitationTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#3c4043",
  },
  limitationText: {
    fontSize: 12,
    color: "#5f6368",
    lineHeight: 18,
    marginBottom: 8,
  },
  badgeContainer: {
    alignSelf: "flex-start",
    backgroundColor: "#e8f0fe",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  labBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1a73e8",
  },
  historyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  emptyHistoryText: {
    fontSize: 13,
    color: "#78877b",
    textAlign: "center",
    marginVertical: 10,
  },
  historyItem: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#f7f9f7",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e6ede7",
  },
  activeHistoryItem: {
    borderColor: "#15543d",
    backgroundColor: "#eaf5ee",
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 12,
    fontWeight: "700",
    color: "#15543d",
  },
  activeTag: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15543d",
  },
  historySummary: {
    fontSize: 12,
    color: "#4a5d4e",
    lineHeight: 16,
  },
});
