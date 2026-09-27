import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Mic,
  MicOff,
  Send,
  Sparkles,
  Trash2,
  User,
  Volume2,
} from "lucide-react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import * as Speech from "expo-speech";
import { Audio } from "expo-av";

import { AuthLayout } from "../components/AuthLayout";
import { translate } from "../i18n";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { askVoiceAssistant } from "../services/voiceAssistant";
import type { VoiceChatMessage } from "../types/auth";

const QUICK_QUESTIONS = [
  "నా దగ్గర ఎంత నీరు ఉంది?",
  "నేను ఎంత నీరు ఉపయోగించాను?",
  "నా మిగిలిన నీరు ఎంత?",
  "నీటి వినియోగ వివరాలు చూపించు",
];

// Speech recognition interface for web/hybrid environments
interface IWindowSpeech {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export function VoiceAssistantScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [inputQuery, setInputQuery] = useState("");
  const [messages, setMessages] = useState<VoiceChatMessage[]>([
    {
      id: "welcome-1",
      sender: "assistant",
      text: translate("assistantWelcomeMessage"),
      timestamp: new Date().toLocaleTimeString("te-IN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const scrollViewRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    return () => {
      // Clean up speech synthesis & listeners on unmount
      Speech.stop().catch(() => undefined);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore
        }
      }
      if (recordingRef.current) {
        try {
          recordingRef.current.stopAndUnloadAsync().catch(() => undefined);
        } catch {
          // Ignore
        }
      }
    };
  }, []);

  async function speakResponse(text: string) {
    try {
      await Speech.stop();
      setIsSpeaking(true);
      Speech.speak(text, {
        language: "te-IN",
        pitch: 1.0,
        rate: 0.9,
        onDone: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
      });
    } catch {
      setIsSpeaking(false);
    }
  }

  async function handleSend(queryToSend?: string) {
    const text = (queryToSend ?? inputQuery).trim();
    if (!text) {
      setError(translate("emptyQueryError"));
      return;
    }

    setError(null);
    setInputQuery("");

    const userMessage: VoiceChatMessage = {
      id: `user-${Date.now()}`,
      sender: "farmer",
      text,
      timestamp: new Date().toLocaleTimeString("te-IN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await askVoiceAssistant({ query: text });

      const assistantMessage: VoiceChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: "assistant",
        text: response.response_text,
        intent: response.intent,
        data: response.data,
        timestamp: new Date().toLocaleTimeString("te-IN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Speak the assistant's Telugu answer out loud
      await speakResponse(response.response_text);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : translate("requestFailed");
      setError(msg);
    } finally {
      setLoading(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }

  async function startListening() {
    setError(null);

    // 1. Check microphone permission via expo-av
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setError(translate("micPermissionDenied"));
        return;
      }
    } catch {
      // Permission API error
    }

    // 2. Check for Web Speech Recognition API if available
    const win = (typeof window !== "undefined" ? window : {}) as IWindowSpeech;
    const SpeechRecognition =
      win.SpeechRecognition || win.webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = "te-IN";
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          setIsListening(false);
          if (event.results && event.results[0] && event.results[0][0]) {
            const transcript = event.results[0][0].transcript;
            if (transcript && transcript.trim()) {
              handleSend(transcript.trim());
            }
          }
        };

        recognition.onerror = () => {
          setIsListening(false);
          setError(translate("speechRecognitionFailed"));
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
        return;
      } catch {
        // Fallback to audio recording or not supported message
      }
    }

    // 3. Fallback for environments without speech recognizer
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.LOW_QUALITY,
      );
      recordingRef.current = recording;
      setIsListening(true);
    } catch {
      setIsListening(false);
      setError(translate("speechNotSupported"));
    }
  }

  async function stopListening() {
    setIsListening(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
    }

    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
        // In native environment without cloud STT, inform the farmer
        setError(translate("speechNotSupported"));
      } catch {
        setError(translate("speechRecognitionFailed"));
      }
    }
  }

  function handleMicPress() {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }

  function handleClearChat() {
    Speech.stop().catch(() => undefined);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: "assistant",
        text: translate("assistantWelcomeMessage"),
        timestamp: new Date().toLocaleTimeString("te-IN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
    setError(null);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AuthLayout
        subtitle={translate("voiceAssistantSubtitle")}
        title={translate("voiceAssistantTitle")}
      >
        {/* Navigation Bar */}
        <View style={styles.navRow}>
          <Pressable
            accessibilityLabel={translate("back")}
            accessibilityRole="button"
            onPress={() => {
              Speech.stop().catch(() => undefined);
              navigation.goBack();
            }}
            style={styles.backButton}
            testID="voice-assistant-back-button"
          >
            <ArrowLeft color="#15543d" size={20} />
            <Text style={styles.backText}>{translate("back")}</Text>
          </Pressable>

          <Pressable
            accessibilityLabel={translate("clearChat")}
            accessibilityRole="button"
            onPress={handleClearChat}
            style={styles.clearButton}
            testID="clear-chat-button"
          >
            <Trash2 color="#78877b" size={16} />
            <Text style={styles.clearText}>{translate("clearChat")}</Text>
          </Pressable>
        </View>

        {/* Quick Questions Chips */}
        <View style={styles.quickQuestionsCard}>
          <View style={styles.quickHeaderRow}>
            <Sparkles color="#15543d" size={16} />
            <Text style={styles.quickTitle}>
              {translate("quickQuestionsTitle")}
            </Text>
          </View>
          <View style={styles.chipsContainer}>
            {QUICK_QUESTIONS.map((question, idx) => (
              <Pressable
                key={`quick-${idx}`}
                accessibilityRole="button"
                disabled={loading}
                onPress={() => handleSend(question)}
                style={styles.chip}
                testID={`quick-question-${idx}`}
              >
                <Text style={styles.chipText}>{question}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Chat Messages Stream */}
        <View style={styles.chatCard}>
          <ScrollView
            nestedScrollEnabled
            ref={scrollViewRef}
            style={styles.messagesScroll}
          >
            {messages.map((msg) => (
              <View
                key={msg.id}
                style={[
                  styles.messageBubble,
                  msg.sender === "farmer"
                    ? styles.farmerBubble
                    : styles.assistantBubble,
                ]}
                testID={`message-${msg.id}`}
              >
                <View style={styles.messageHeaderRow}>
                  <View style={styles.avatarIcon}>
                    {msg.sender === "farmer" ? (
                      <User color="#ffffff" size={14} />
                    ) : (
                      <Bot color="#15543d" size={14} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.senderName,
                      msg.sender === "farmer"
                        ? styles.farmerSenderName
                        : styles.assistantSenderName,
                    ]}
                  >
                    {msg.sender === "farmer" ? "మీరు" : "రైతు మిత్ర అసిస్టెంట్"}
                  </Text>
                  <Text style={styles.timestampText}>{msg.timestamp}</Text>
                </View>

                <Text
                  style={[
                    styles.messageText,
                    msg.sender === "farmer"
                      ? styles.farmerText
                      : styles.assistantText,
                  ]}
                >
                  {msg.text}
                </Text>

                {/* Voice Replay Button for Assistant Messages */}
                {msg.sender === "assistant" ? (
                  <Pressable
                    accessibilityLabel={translate("replaySpeech")}
                    accessibilityRole="button"
                    onPress={() => speakResponse(msg.text)}
                    style={styles.replayButton}
                    testID={`speak-button-${msg.id}`}
                  >
                    <Volume2 color="#15543d" size={16} />
                    <Text style={styles.replayText}>
                      {translate("replaySpeech")}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ))}

            {loading ? (
              <View style={styles.loadingBubble}>
                <ActivityIndicator color="#15543d" size="small" />
                <Text style={styles.loadingText}>సమాధానాన్ని తెస్తున్నాము...</Text>
              </View>
            ) : null}
          </ScrollView>
        </View>

        {/* Listening Status Banner */}
        {isListening ? (
          <View style={styles.listeningBanner} testID="listening-banner">
            <Mic color="#b3261e" size={20} />
            <Text style={styles.listeningText}>{translate("listening")}</Text>
          </View>
        ) : null}

        {/* Error Alert Box */}
        {error ? (
          <View style={styles.errorBox} testID="voice-assistant-error">
            <AlertTriangle color="#b3261e" size={18} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Input Bar: Text Input + Send Button + Microphone Button */}
        <View style={styles.inputContainer}>
          <TextInput
            accessibilityLabel={translate("askQuestionPlaceholder")}
            editable={!loading}
            onChangeText={(val) => {
              setInputQuery(val);
              if (error) setError(null);
            }}
            placeholder={translate("askQuestionPlaceholder")}
            placeholderTextColor="#8a9a8d"
            style={styles.textInput}
            testID="voice-assistant-input"
            value={inputQuery}
          />

          {/* Send Button */}
          <Pressable
            accessibilityLabel="పంపండి"
            accessibilityRole="button"
            disabled={loading || !inputQuery.trim()}
            onPress={() => handleSend()}
            style={[
              styles.sendButton,
              (!inputQuery.trim() || loading) && styles.disabledSendButton,
            ]}
            testID="voice-assistant-send-button"
          >
            <Send
              color={inputQuery.trim() && !loading ? "#ffffff" : "#a3b8aa"}
              size={18}
            />
          </Pressable>

          {/* Voice Input Microphone Button */}
          <Pressable
            accessibilityLabel={
              isListening ? translate("stopSpeaking") : translate("tapToSpeak")
            }
            accessibilityRole="button"
            onPress={handleMicPress}
            style={[
              styles.micButton,
              isListening ? styles.activeMicButton : styles.idleMicButton,
            ]}
            testID="voice-assistant-mic-button"
          >
            {isListening ? (
              <MicOff color="#ffffff" size={22} />
            ) : (
              <Mic color="#ffffff" size={22} />
            )}
          </Pressable>
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
    justifyContent: "space-between",
    marginBottom: 12,
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
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  clearText: {
    color: "#78877b",
    fontSize: 13,
    fontWeight: "600",
  },
  quickQuestionsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e4ece5",
  },
  quickHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  quickTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#15543d",
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: "#edf6f0",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#cbe5d4",
  },
  chipText: {
    color: "#15543d",
    fontSize: 13,
    fontWeight: "600",
  },
  chatCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 12,
    minHeight: 280,
    maxHeight: 400,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e4ece5",
  },
  messagesScroll: {
    flexGrow: 1,
  },
  messageBubble: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    maxWidth: "90%",
  },
  farmerBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#15543d",
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#f4f8f5",
    borderWidth: 1,
    borderColor: "#d5e7db",
  },
  messageHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  avatarIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  senderName: {
    fontSize: 11,
    fontWeight: "700",
  },
  farmerSenderName: {
    color: "#d7ebdc",
  },
  assistantSenderName: {
    color: "#15543d",
  },
  timestampText: {
    fontSize: 10,
    color: "#8a9a8d",
    marginLeft: "auto",
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  farmerText: {
    color: "#ffffff",
  },
  assistantText: {
    color: "#1b2e1b",
  },
  replayButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: "#e8f3ec",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  replayText: {
    color: "#15543d",
    fontSize: 12,
    fontWeight: "700",
  },
  loadingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    alignSelf: "flex-start",
  },
  loadingText: {
    fontSize: 13,
    color: "#4a5d4e",
    fontStyle: "italic",
  },
  listeningBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fde8e8",
    borderWidth: 1,
    borderColor: "#f8b4b4",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  listeningText: {
    color: "#b3261e",
    fontSize: 14,
    fontWeight: "700",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fce8e6",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  errorText: {
    flex: 1,
    color: "#b3261e",
    fontSize: 13,
    lineHeight: 18,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#cde3d5",
    marginBottom: 20,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: "#1b2e1b",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sendButton: {
    backgroundColor: "#15543d",
    borderRadius: 20,
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledSendButton: {
    backgroundColor: "#e2ede5",
  },
  micButton: {
    borderRadius: 20,
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  idleMicButton: {
    backgroundColor: "#15543d",
  },
  activeMicButton: {
    backgroundColor: "#b3261e",
  },
});
