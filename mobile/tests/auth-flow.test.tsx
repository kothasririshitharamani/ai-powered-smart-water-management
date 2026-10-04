import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import * as SecureStore from "expo-secure-store";

import App from "../App";
import { apiRequest } from "../src/api/client";
import {
  editedAvailableWater,
  editedFarmerName,
  farmerFixture,
  farmerProfileFixture,
  waterBudgetUpdateAmount,
} from "./fixtures/farmer";

jest.mock("lucide-react-native", () => {
  const MockIcon = () => null;
  return {
    ArrowLeft: MockIcon,
    ArrowRight: MockIcon,
    AlertTriangle: MockIcon,
    Bot: MockIcon,
    CalendarDays: MockIcon,
    Calculator: MockIcon,
    Camera: MockIcon,
    Check: MockIcon,
    CheckCircle2: MockIcon,
    CloudRain: MockIcon,
    Droplets: MockIcon,
    Image: MockIcon,
    Info: MockIcon,
    Eye: MockIcon,
    EyeOff: MockIcon,
    Gauge: MockIcon,
    History: MockIcon,
    LockKeyhole: MockIcon,
    LogOut: MockIcon,
    MapPin: MockIcon,
    Menu: MockIcon,
    Mic: MockIcon,
    MicOff: MockIcon,
    Phone: MockIcon,
    Plus: MockIcon,
    RefreshCw: MockIcon,
    Scale: MockIcon,
    Send: MockIcon,
    ShieldAlert: MockIcon,
    Sparkles: MockIcon,
    Sprout: MockIcon,
    Sun: MockIcon,
    Trash2: MockIcon,
    User: MockIcon,
    UserRound: MockIcon,
    Volume2: MockIcon,
    Waves: MockIcon,
    Wind: MockIcon,
    X: MockIcon,
  };
});

jest.mock("expo-speech", () => ({
  speak: jest.fn(),
  stop: jest.fn(async () => {}),
  isSpeakingAsync: jest.fn(async () => false),
}));

jest.mock("expo-av", () => ({
  Audio: {
    requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
    getPermissionsAsync: jest.fn(async () => ({ granted: true })),
    setAudioModeAsync: jest.fn(async () => {}),
    Recording: {
      createAsync: jest.fn(async () => ({
        recording: {
          stopAndUnloadAsync: jest.fn(async () => {}),
        },
      })),
    },
    RecordingOptionsPresets: {
      LOW_QUALITY: {},
    },
  },
}));

const DUMMY_JPEG_BASE64 =
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCABkAGQDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDiqKKK+aPjwooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD//Z";

jest.mock("expo-image-picker", () => ({
  MediaTypeOptions: {
    Images: "Images",
    Videos: "Videos",
    All: "All",
  },
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchCameraAsync: jest.fn(async () => ({
    canceled: false,
    assets: [
      {
        uri: "file:///mock/path/camera_soil.jpg",
        base64: DUMMY_JPEG_BASE64,
        mimeType: "image/jpeg",
      },
    ],
  })),
  launchImageLibraryAsync: jest.fn(async () => ({
    canceled: false,
    assets: [
      {
        uri: "file:///mock/path/soil.jpg",
        base64: DUMMY_JPEG_BASE64,
        mimeType: "image/jpeg",
      },
    ],
  })),
}));

jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const { View } = require("react-native");
  const SafeAreaInsetsContext = React.createContext({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });
  return {
    initialWindowMetrics: {
      insets: { top: 0, right: 0, bottom: 0, left: 0 },
      frame: { x: 0, y: 0, width: 390, height: 844 },
    },
    SafeAreaInsetsContext,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        SafeAreaInsetsContext.Provider,
        { value: { top: 0, right: 0, bottom: 0, left: 0 } },
        children,
      ),
    SafeAreaView: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement(View, props, children),
  };
});

jest.mock("expo-secure-store", () => {
  const storage = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (key: string) => storage.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      storage.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      storage.delete(key);
    }),
  };
});

async function completeFarmerProfile() {
  await waitFor(() => expect(screen.getByLabelText("పంట")).toBeTruthy());
  await fireEvent.changeText(
    screen.getByLabelText("పంట"),
    farmerProfileFixture.crop,
  );
  await fireEvent.changeText(
    screen.getByLabelText("భూమి విస్తీర్ణం"),
    String(farmerProfileFixture.land_area),
  );
  await fireEvent.changeText(
    screen.getByLabelText("పంట దశ"),
    farmerProfileFixture.crop_stage,
  );
  await fireEvent.press(screen.getByText(farmerProfileFixture.water_source));
  await fireEvent.changeText(
    screen.getByLabelText("అందుబాటులో ఉన్న నీరు"),
    String(farmerProfileFixture.available_water),
  );
  expect(screen.getByText(farmerFixture.mobile)).toBeTruthy();
  await fireEvent.press(
    screen.getByRole("button", { name: "వివరాలు సేవ్ చేయండి" }),
  );
  await waitFor(() =>
    expect(screen.getByText(farmerFixture.name)).toBeTruthy(),
  );
}

async function openRegistration() {
  await fireEvent.press(screen.getByText("కొత్త ఖాతా తెరవండి"));
  await waitFor(() => expect(screen.getByLabelText("పేరు")).toBeTruthy());
}

async function fillRegistration() {
  await fireEvent.changeText(screen.getByLabelText("పేరు"), farmerFixture.name);
  await fireEvent.changeText(
    screen.getByLabelText("మొబైల్ నంబర్"),
    farmerFixture.mobile,
  );
  await fireEvent.changeText(
    screen.getByLabelText("పాస్‌వర్డ్"),
    farmerFixture.password,
  );
  await fireEvent.changeText(
    screen.getByLabelText("గ్రామం"),
    farmerFixture.village,
  );
  await fireEvent.changeText(
    screen.getByLabelText("జిల్లా"),
    farmerFixture.district,
  );
}

async function loginWith(password: string) {
  const fields = screen.getAllByLabelText(/.+/);
  await fireEvent.changeText(fields[0], farmerFixture.mobile);
  await fireEvent.changeText(fields[1], password);
  await fireEvent.press(screen.getByRole("button", { name: "లాగిన్ చేయండి" }));
}

describe("Telugu farmer authentication and profile flow", () => {
  beforeEach(async () => {
    await SecureStore.deleteItemAsync("smart-water-access-token");
    await SecureStore.deleteItemAsync("smart-water-auth-user");
  });

  it("keeps login and registration blank and creates an account only on submit", async () => {
    const app = await render(<App />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "లాగిన్ చేయండి" }),
      ).toBeTruthy(),
    );
    expect(screen.getByLabelText("మొబైల్ నంబర్").props.value).toBe("");
    expect(screen.getByLabelText("పాస్‌వర్డ్").props.value).toBe("");
    expect(
      await SecureStore.getItemAsync("smart-water-access-token"),
    ).toBeNull();

    await openRegistration();
    for (const label of [
      "పేరు",
      "మొబైల్ నంబర్",
      "పాస్‌వర్డ్",
      "గ్రామం",
      "జిల్లా",
    ]) {
      expect(screen.getByLabelText(label).props.value).toBe("");
    }
    expect(
      await SecureStore.getItemAsync("smart-water-access-token"),
    ).toBeNull();

    await fillRegistration();
    await fireEvent.press(
      screen.getByRole("button", { name: "ఖాతా సృష్టించండి" }),
    );
    await waitFor(() =>
      expect(
        screen.getByText(/మీ ఖాతా విజయవంతంగా సృష్టించబడింది/),
      ).toBeTruthy(),
    );
    expect(
      await SecureStore.getItemAsync("smart-water-access-token"),
    ).toBeNull();
    await app.unmount();
  });

  it("restores, edits and persists profile data while preserving auth/logout errors", async () => {
    let app = await render(<App />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "లాగిన్ చేయండి" }),
      ).toBeTruthy(),
    );

    await openRegistration();
    await fillRegistration();
    await fireEvent.press(
      screen.getByRole("button", { name: "ఖాతా సృష్టించండి" }),
    );
    await waitFor(() =>
      expect(
        screen.getByText("ఈ మొబైల్ నంబర్‌తో ఇప్పటికే ఖాతా ఉంది."),
      ).toBeTruthy(),
    );

    await fireEvent.press(screen.getByText("లాగిన్‌కు వెళ్లండి"));
    await waitFor(() =>
      expect(screen.getByLabelText("పాస్‌వర్డ్")).toBeTruthy(),
    );
    await loginWith("wrong-password");
    await waitFor(() =>
      expect(
        screen.getByText("మొబైల్ నంబర్ లేదా పాస్‌వర్డ్ తప్పుగా ఉంది."),
      ).toBeTruthy(),
    );

    await loginWith(farmerFixture.password);
    await completeFarmerProfile();
    await waitFor(() =>
      expect(screen.getByText(farmerFixture.name)).toBeTruthy(),
    );
    expect(
      await SecureStore.getItemAsync("smart-water-access-token"),
    ).toBeTruthy();
    expect(await SecureStore.getItemAsync("smart-water-auth-user")).toContain(
      farmerFixture.mobile,
    );

    await app.unmount();
    app = await render(<App />);
    await waitFor(() =>
      expect(screen.getByText(farmerFixture.name)).toBeTruthy(),
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "రైతు వివరాలు మార్చండి" }),
    );
    await waitFor(() =>
      expect(screen.getByLabelText("అందుబాటులో ఉన్న నీరు")).toBeTruthy(),
    );
    await fireEvent.changeText(screen.getByLabelText("పేరు"), editedFarmerName);
    await fireEvent.changeText(
      screen.getByLabelText("అందుబాటులో ఉన్న నీరు"),
      String(editedAvailableWater),
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "వివరాలు సేవ్ చేయండి" }),
    );
    await waitFor(() =>
      expect(
        screen.getByText("మీ రైతు వివరాలు విజయవంతంగా సేవ్ అయ్యాయి."),
      ).toBeTruthy(),
    );
    await fireEvent.press(screen.getByText("వెనక్కి"));
    await waitFor(() =>
      expect(screen.getByText(editedFarmerName)).toBeTruthy(),
    );

    await app.unmount();
    app = await render(<App />);
    await waitFor(() =>
      expect(screen.getByText(editedFarmerName)).toBeTruthy(),
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "రైతు వివరాలు మార్చండి" }),
    );
    await waitFor(() =>
      expect(
        screen.getByDisplayValue(String(editedAvailableWater)),
      ).toBeTruthy(),
    );
    await fireEvent.press(screen.getByText("వెనక్కి"));
    await waitFor(() =>
      expect(screen.getByText(editedFarmerName)).toBeTruthy(),
    );

    await fireEvent.press(screen.getByText("నీటి నిర్వహణ"));
    await waitFor(() =>
      expect(screen.getByLabelText("వాడిన నీటి పరిమాణం")).toBeTruthy(),
    );
    expect(
      screen.getByText("ఇంకా నీటి వినియోగ వివరాలు నమోదు కాలేదు."),
    ).toBeTruthy();
    expect(screen.getByTestId("water-budget-input").props.value).toBe(
      String(editedAvailableWater),
    );
    await fireEvent.changeText(
      screen.getByTestId("water-budget-input"),
      String(waterBudgetUpdateAmount),
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "నీటి బడ్జెట్ సేవ్ చేయండి" }),
    );
    await waitFor(() =>
      expect(
        screen.getByText("నీటి బడ్జెట్ విజయవంతంగా సేవ్ అయింది."),
      ).toBeTruthy(),
    );
    expect(screen.getByTestId("water-budget-input").props.value).toBe(
      String(waterBudgetUpdateAmount),
    );
    await fireEvent.changeText(
      screen.getByLabelText("వాడిన నీటి పరిమాణం"),
      "100",
    );
    await fireEvent.changeText(
      screen.getByLabelText("గమనిక"),
      "నీటి పరీక్ష గమనిక",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "వినియోగం నమోదు చేయండి" }),
    );
    await waitFor(() =>
      expect(
        screen.getByText("నీటి వినియోగం విజయవంతంగా నమోదు అయింది."),
      ).toBeTruthy(),
    );
    expect(screen.getByText("నీటి పరీక్ష గమనిక")).toBeTruthy();
    expect(
      screen.getByTestId("water-remaining-summary").props.accessibilityValue
        .text,
    ).toBe(
      (waterBudgetUpdateAmount - 100).toLocaleString("te-IN", {
        maximumFractionDigits: 2,
      }),
    );

    await app.unmount();
    app = await render(<App />);
    await waitFor(() =>
      expect(screen.getByText(editedFarmerName)).toBeTruthy(),
    );
    await fireEvent.press(screen.getByText("నీటి నిర్వహణ"));
    await waitFor(() =>
      expect(screen.getByLabelText("వాడిన నీటి పరిమాణం")).toBeTruthy(),
    );
    expect(screen.getByText("నీటి పరీక్ష గమనిక")).toBeTruthy();
    await fireEvent.press(screen.getByText("వెనక్కి"));
    await waitFor(() =>
      expect(screen.getByText(editedFarmerName)).toBeTruthy(),
    );

    expect(screen.getByText("వాతావరణ హెచ్చరికలు")).toBeTruthy();
    expect(
      screen.getByText("ప్రస్తుతానికి ఎటువంటి వాతావరణ హెచ్చరికలు లేవు."),
    ).toBeTruthy();

    await fireEvent.press(screen.getByTestId("weather-alerts-button"));
    await waitFor(() =>
      expect(
        screen.getByText(
          "మీ ప్రాంతపు అధికారిక వాతావరణ సమాచారం మరియు హెచ్చరికలు.",
        ),
      ).toBeTruthy(),
    );
    expect(
      screen.getByText("ప్రస్తుతానికి ఎటువంటి వాతావరణ హెచ్చరికలు లేవు."),
    ).toBeTruthy();

    await apiRequest("/weather-alerts", {
      method: "POST",
      body: JSON.stringify({
        title: "భారీ వర్ష సూచన",
        details: "రాగల 24 గంటల్లో భారీ వర్షాలు కురిసే అవకాశం ఉంది.",
        alert_type: "heavy_rain",
        severity: "high",
        starts_at: "2026-09-28T06:00:00Z",
      }),
    });

    await fireEvent.press(screen.getByLabelText("తాజాకరించండి"));
    await waitFor(() =>
      expect(screen.getByText("భారీ వర్ష సూచన")).toBeTruthy(),
    );
    expect(screen.getByText("తీవ్రమైనది")).toBeTruthy();
    expect(screen.getByText("భారీ వర్షం")).toBeTruthy();
    expect(
      screen.getByText("రాగల 24 గంటల్లో భారీ వర్షాలు కురిసే అవకాశం ఉంది."),
    ).toBeTruthy();
    expect(screen.getByText("చదివినట్లు గుర్తించండి")).toBeTruthy();
    expect(screen.getByTestId("unread-indicator")).toBeTruthy();

    await fireEvent.press(screen.getByText("చదివినట్లు గుర్తించండి"));
    await waitFor(() => expect(screen.getByText("చదివారు")).toBeTruthy());
    expect(screen.queryByTestId("unread-indicator")).toBeNull();

    await fireEvent.press(screen.getByText("వెనక్కి"));
    await waitFor(() =>
      expect(screen.getByText(editedFarmerName)).toBeTruthy(),
    );
    expect(screen.getByText("1 క్రియాశీల హెచ్చరికలు")).toBeTruthy();

    expect(screen.getByTestId("water-requirement-button")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("water-requirement-button"));
    await waitFor(() =>
      expect(
        screen.getByText(
          "మీ పంట, భూమి విస్తీర్ణం మరియు పంట దశ ఆధారంగా నీటి అవసరాల అంచనా.",
        ),
      ).toBeTruthy(),
    );
    expect(screen.getByTestId("water-estimate-card")).toBeTruthy();
    expect(screen.getByText("అంచనా వేసిన నీటి అవసరం")).toBeTruthy();
    expect(screen.getByText("లెక్కింపు వివరాలు మరియు ఆధారం")).toBeTruthy();
    expect(
      screen.getByText(
        "భూమి విస్తీర్ణం × ప్రామాణిక నీటి అవసరం × పంట దశ గుణకం",
      ),
    ).toBeTruthy();

    await fireEvent.press(screen.getByText("తాజా అంచనా వేయండి"));
    await waitFor(() =>
      expect(screen.getByTestId("water-estimate-card")).toBeTruthy(),
    );

    await fireEvent.press(screen.getByText("వెనక్కి"));
    await waitFor(() =>
      expect(screen.getByText(editedFarmerName)).toBeTruthy(),
    );

    expect(screen.getByTestId("scarcity-allocation-button")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("scarcity-allocation-button"));
    await waitFor(() =>
      expect(
        screen.getByText(
          "పరిమితంగా ఉన్న నీటిని మీ పంటలు మరియు భూభాగాలకు పద్ధతి ప్రకారం కేటాయించుకోండి.",
        ),
      ).toBeTruthy(),
    );
    expect(screen.getByTestId("scarcity-overview-grid")).toBeTruthy();
    expect(screen.getByText("అందుబాటులో ఉన్న నీరు")).toBeTruthy();
    expect(screen.getByText("ఇప్పటికే ఉపయోగించిన నీరు")).toBeTruthy();
    expect(screen.getByText("మిగిలిన నీరు")).toBeTruthy();
    expect(screen.getByText("కేటాయించిన నీరు")).toBeTruthy();
    expect(screen.getByText("మిగిలే కేటాయించని నీరు")).toBeTruthy();
    expect(screen.getByTestId("crop-card-0")).toBeTruthy();

    // Test over-allocation prevention
    await fireEvent.changeText(
      screen.getByTestId("crop-allocation-input-0"),
      "50000",
    );
    expect(screen.getByTestId("over-allocation-warning")).toBeTruthy();

    // Set valid allocation within remaining water (1,500 <= 2,900)
    await fireEvent.changeText(
      screen.getByTestId("crop-allocation-input-0"),
      "1500",
    );
    expect(screen.queryByTestId("over-allocation-warning")).toBeNull();

    await act(async () => {
      await fireEvent.press(screen.getByTestId("save-allocation-button"));
    });
    await waitFor(() =>
      expect(
        screen.getByText("నీటి కేటాయింపు విజయవంతంగా భద్రపరచబడింది."),
      ).toBeTruthy(),
    );

    await fireEvent.press(screen.getByTestId("add-crop-trigger-button"));
    await waitFor(() =>
      expect(screen.getByTestId("add-crop-modal")).toBeTruthy(),
    );
    await fireEvent.changeText(
      screen.getByTestId("new-crop-name-input"),
      "మొక్కజొన్న",
    );
    await fireEvent.changeText(
      screen.getByTestId("new-crop-area-input"),
      "1.5",
    );
    await act(async () => {
      await fireEvent.press(screen.getByTestId("confirm-add-crop-button"));
    });
    await waitFor(() =>
      expect(screen.getByTestId("crop-card-1")).toBeTruthy(),
    );

    await fireEvent.press(screen.getByText("వెనక్కి"));
    await waitFor(() =>
      expect(screen.getByText(editedFarmerName)).toBeTruthy(),
    );

    expect(screen.getByTestId("crop-efficiency-button")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("crop-efficiency-button"));
    await waitFor(() =>
      expect(
        screen.getByText(
          "అధిక నీటి సామర్థ్యం గల పంటలను ఎంచుకోవడానికి ఆధార సహిత పరిశోధనా సమాచారం.",
        ),
      ).toBeTruthy(),
    );
    expect(screen.getByTestId("decision-support-banner")).toBeTruthy();
    expect(screen.getByText("నిర్ణయ మద్దతు మాత్రమే (హామీ కాదు)")).toBeTruthy();
    expect(
      screen.getByText("మూలం: ANGRAU & ICAR వ్యవసాయ పరిశోధనా ప్రామాణిక వివరాలు"),
    ).toBeTruthy();

    await waitFor(() =>
      expect(screen.getByTestId("crop-select-chip-rice")).toBeTruthy(),
    );
    expect(screen.getByTestId("crop-select-chip-groundnut")).toBeTruthy();

    await act(async () => {
      await fireEvent.press(screen.getByTestId("compare-crops-button"));
    });
    await waitFor(() =>
      expect(screen.getByTestId("comparison-results-card")).toBeTruthy(),
    );
    expect(screen.getByText("నీటి సామర్థ్య పోలిక ఫలితాలు")).toBeTruthy();
    expect(screen.getByText("గరిష్ఠ నీటి ఆదా:")).toBeTruthy();

    await fireEvent.press(screen.getByText("వెనక్కి"));
    await waitFor(() =>
      expect(screen.getByText(editedFarmerName)).toBeTruthy(),
    );

    // AI Soil Analysis flow
    await waitFor(() =>
      expect(screen.getByTestId("soil-analysis-button")).toBeTruthy(),
    );
    await fireEvent.press(screen.getByTestId("soil-analysis-button"));

    await waitFor(() =>
      expect(
        screen.getByText(
          "మీ పొలం లేదా నేల ఫోటో ద్వారా ప్రాథమిక దృశ్య లక్షణాలను తెలుసుకోండి.",
        ),
      ).toBeTruthy(),
    );
    expect(screen.getByTestId("lab-notice-card")).toBeTruthy();
    expect(
      screen.getByText("ప్రయోగశాల నేల పరీక్ష ప్రత్యామ్నాయం కాదు"),
    ).toBeTruthy();

    // Select image from gallery
    await act(async () => {
      await fireEvent.press(screen.getByTestId("pick-image-button"));
    });
    await waitFor(() =>
      expect(screen.getByTestId("selected-image-preview")).toBeTruthy(),
    );

    // Real backend error when GEMINI_API_KEY is not configured
    await act(async () => {
      await fireEvent.press(screen.getByTestId("analyze-image-button"));
    });
    await waitFor(() =>
      expect(screen.getByTestId("soil-analysis-error")).toBeTruthy(),
    );
    expect(
      screen.getByText(
        "AI నేల విశ్లేషణ సేవ ప్రస్తుతం కాన్ఫిగర్ చేయబడలేదు. దయచేసి కాసేపటి తర్వాత ప్రయత్నించండి.",
      ),
    ).toBeTruthy();

    // Mock successful AI analysis response
    const mockReport = {
      report: {
        id: "soil-report-e2e-1",
        apparent_soil_characteristics: "ఎర్ర నేల, ఉపరితలం పొడిగా ఉన్నది",
        possible_moisture_condition: "ఉపరితలంపై తక్కువ తేమ ఉన్నది",
        visible_issues: ["ఉపరితలంలో పగుళ్లు కనిపించాయి"],
        recommended_next_steps: ["సమీప ప్రయోగశాలలో భౌతిక నేల పరీక్ష చేయించండి"],
        uncertainty_and_limitations: "ఇది కేవలం దృశ్య పరిశీలన మాత్రమే.",
        requires_laboratory_testing: true,
        disclaimer_te: "ఇది కేవలం దృశ్య ప్రాథమిక పరిశీలన.",
        created_at: new Date().toISOString(),
      },
      message: "ఫోటో విశ్లేషణ విజయవంతంగా పూర్తయింది.",
    };

    const originalFetch = global.fetch;
    jest.spyOn(global, "fetch").mockImplementationOnce(async (url, init) => {
      if (typeof url === "string" && url.includes("/soil-analysis")) {
        return {
          ok: true,
          status: 200,
          json: async () => mockReport,
        } as Response;
      }
      return originalFetch(url, init);
    });

    await act(async () => {
      await fireEvent.press(screen.getByTestId("analyze-image-button"));
    });

    await waitFor(() =>
      expect(screen.getByTestId("soil-analysis-result")).toBeTruthy(),
    );
    expect(screen.getByText("దృశ్య పరిశీలన నివేదిక")).toBeTruthy();
    expect(
      screen.getByTestId("apparent-characteristics-text"),
    ).toHaveTextContent("ఎర్ర నేల, ఉపరితలం పొడిగా ఉన్నది");
    expect(
      screen.getByTestId("moisture-condition-text"),
    ).toHaveTextContent("ఉపరితలంపై తక్కువ తేమ ఉన్నది");
    expect(screen.getByText("ఉపరితలంలో పగుళ్లు కనిపించాయి")).toBeTruthy();
    expect(
      screen.getByText("సమీప ప్రయోగశాలలో భౌతిక నేల పరీక్ష చేయించండి"),
    ).toBeTruthy();
    expect(screen.getByText("భౌతిక ప్రయోగశాల పరీక్ష తప్పనిసరి")).toBeTruthy();

    // Return back to authenticated home screen
    await fireEvent.press(screen.getByTestId("soil-analysis-back-button"));
    await waitFor(() =>
      expect(screen.getByText(editedFarmerName)).toBeTruthy(),
    );

    // Telugu Voice Assistant flow
    await waitFor(() =>
      expect(screen.getByTestId("voice-assistant-button")).toBeTruthy(),
    );
    await fireEvent.press(screen.getByTestId("voice-assistant-button"));

    await waitFor(() =>
      expect(screen.getByText("ఉదాహరణ ప్రశ్నలు:")).toBeTruthy(),
    );
    expect(screen.getByTestId("quick-question-0")).toBeTruthy();
    expect(screen.getByTestId("quick-question-1")).toBeTruthy();
    expect(screen.getByTestId("quick-question-2")).toBeTruthy();
    expect(screen.getByTestId("quick-question-3")).toBeTruthy();

    // Query 1: Quick question "నా దగ్గర ఎంత నీరు ఉంది?"
    await act(async () => {
      await fireEvent.press(screen.getByTestId("quick-question-0"));
    });
    await waitFor(() =>
      expect(screen.getByText(/2,900/)).toBeTruthy(),
    );
    expect(screen.getByText(/3,000/)).toBeTruthy();

    // Query 2: Text input "నా మిగిలిన నీరు ఎంత?"
    await fireEvent.changeText(
      screen.getByTestId("voice-assistant-input"),
      "నా మిగిలిన నీరు ఎంత?",
    );
    await act(async () => {
      await fireEvent.press(screen.getByTestId("voice-assistant-send-button"));
    });
    await waitFor(() =>
      expect(screen.getAllByText(/2,900/).length).toBeGreaterThan(1),
    );

    // Test microphone button toggle
    await act(async () => {
      await fireEvent.press(screen.getByTestId("voice-assistant-mic-button"));
    });
    await act(async () => {
      await fireEvent.press(screen.getByTestId("voice-assistant-mic-button"));
    });

    // Return back to home screen
    await fireEvent.press(screen.getByTestId("voice-assistant-back-button"));
    await waitFor(() =>
      expect(screen.getByText(editedFarmerName)).toBeTruthy(),
    );

    // Disaster Preparedness flow
    await waitFor(() =>
      expect(screen.getByTestId("disaster-preparedness-button")).toBeTruthy(),
    );
    await fireEvent.press(screen.getByTestId("disaster-preparedness-button"));

    // Verify active weather alert triggers flood preparedness guidance
    await waitFor(() =>
      expect(screen.getByTestId("active-alerts-section")).toBeTruthy(),
    );
    expect(screen.getByText("భారీ వర్ష సూచన")).toBeTruthy();
    expect(screen.getByText(/తక్షణ అత్యవసర చర్యలు/)).toBeTruthy();

    // Verify general preparedness section is present and clearly separated
    expect(screen.getByTestId("general-preparedness-section")).toBeTruthy();
    expect(screen.getByTestId("category-card-flood")).toBeTruthy();
    expect(screen.getByTestId("category-card-drought")).toBeTruthy();
    expect(screen.getByTestId("category-card-cyclone")).toBeTruthy();

    // Verify disclaimer states it's not a government relief scheme
    expect(screen.getByTestId("disaster-disclaimer-banner")).toBeTruthy();
    expect(screen.getByText(/ప్రభుత్వ సహాయ లేదా పరిహార పథకం కాదు/)).toBeTruthy();

    // Test filter tabs
    await fireEvent.press(screen.getByTestId("category-filter-drought"));
    expect(screen.getByTestId("category-card-drought")).toBeTruthy();
    expect(screen.queryByTestId("category-card-flood")).toBeNull();

    await fireEvent.press(screen.getByTestId("category-filter-all"));
    expect(screen.getByTestId("category-card-flood")).toBeTruthy();
    expect(screen.getByTestId("category-card-drought")).toBeTruthy();

    // Return back to authenticated home screen
    await fireEvent.press(screen.getByTestId("disaster-back-button"));
    await waitFor(() =>
      expect(screen.getByText(editedFarmerName)).toBeTruthy(),
    );

    // 1. Verify Home is vertically scrollable and contains all cards
    expect(screen.getByTestId("authenticated-home-scroll")).toBeTruthy();
    expect(screen.getByTestId("water-requirement-button")).toBeTruthy();
    expect(screen.getByTestId("weather-alerts-button")).toBeTruthy();
    expect(screen.getByTestId("scarcity-allocation-button")).toBeTruthy();
    expect(screen.getByTestId("crop-efficiency-button")).toBeTruthy();
    expect(screen.getByTestId("soil-analysis-button")).toBeTruthy();
    expect(screen.getByTestId("voice-assistant-button")).toBeTruthy();
    expect(screen.getByTestId("disaster-preparedness-button")).toBeTruthy();

    // 2. Test Side Navigation Drawer Opening and Real Farmer Context
    expect(screen.getByTestId("drawer-menu-button")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("drawer-menu-button"));

    await waitFor(() =>
      expect(screen.getByTestId("side-drawer-modal")).toBeTruthy(),
    );
    expect(screen.getByTestId("drawer-farmer-info")).toBeTruthy();
    expect(screen.getAllByText(editedFarmerName).length).toBeGreaterThan(0);
    expect(screen.getByTestId("drawer-profile-button")).toBeTruthy();
    expect(screen.getByTestId("drawer-water-management-button")).toBeTruthy();
    expect(screen.getByTestId("drawer-logout-button")).toBeTruthy();

    // 3. Test Drawer Navigation to Profile
    await fireEvent.press(screen.getByTestId("drawer-profile-button"));
    await waitFor(() =>
      expect(screen.getByLabelText("భూమి విస్తీర్ణం")).toBeTruthy(),
    );
    await fireEvent.press(screen.getByText("వెనక్కి"));
    await waitFor(() =>
      expect(screen.getByText(editedFarmerName)).toBeTruthy(),
    );

    // 4. Test Drawer Sign Out with Confirmation Dialog (Cancel then Confirm)
    await fireEvent.press(screen.getByTestId("drawer-menu-button"));
    await waitFor(() =>
      expect(screen.getByTestId("drawer-logout-button")).toBeTruthy(),
    );
    await fireEvent.press(screen.getByTestId("drawer-logout-button"));

    // Confirmation dialog should be visible with Telugu message
    await waitFor(() =>
      expect(screen.getByTestId("sign-out-confirm-modal")).toBeTruthy(),
    );
    expect(screen.getByText("సైన్ అవుట్ నిర్ధారణ")).toBeTruthy();
    expect(
      screen.getByText("మీరు ఖచ్చితంగా మీ ఖాతా నుండి సైన్ అవుట్ చేయాలనుకుంటున్నారా?"),
    ).toBeTruthy();

    // Test Cancel button keeps farmer logged in
    await fireEvent.press(screen.getByTestId("cancel-sign-out-button"));
    expect(screen.getByText(editedFarmerName)).toBeTruthy();

    // Test Confirm button logs farmer out
    await fireEvent.press(screen.getByTestId("drawer-menu-button"));
    await waitFor(() =>
      expect(screen.getByTestId("drawer-logout-button")).toBeTruthy(),
    );
    await fireEvent.press(screen.getByTestId("drawer-logout-button"));
    await waitFor(() =>
      expect(screen.getByTestId("confirm-sign-out-button")).toBeTruthy(),
    );
    await fireEvent.press(screen.getByTestId("confirm-sign-out-button"));

    // Verify token cleared and returned to Login
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "లాగిన్ చేయండి" }),
      ).toBeTruthy(),
    );
    expect(
      await SecureStore.getItemAsync("smart-water-access-token"),
    ).toBeNull();
    expect(await SecureStore.getItemAsync("smart-water-auth-user")).toBeNull();

    // Re-login to continue remaining token expiration tests
    await loginWith(farmerFixture.password);
    await waitFor(() =>
      expect(screen.getByText(editedFarmerName)).toBeTruthy(),
    );

    jest.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ error: "forbidden" }),
    } as Response);
    await act(async () => {
      await expect(apiRequest("/auth/me")).rejects.toMatchObject({
        status: 403,
      });
    });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "లాగిన్ చేయండి" }),
      ).toBeTruthy(),
    );
    expect(
      await SecureStore.getItemAsync("smart-water-access-token"),
    ).toBeNull();
    jest.restoreAllMocks();

    await loginWith(farmerFixture.password);
    await waitFor(() =>
      expect(screen.getByText(editedFarmerName)).toBeTruthy(),
    );
    await fireEvent.press(screen.getByRole("button", { name: "లాగ్ అవుట్" }));
    await waitFor(() =>
      expect(screen.getByTestId("confirm-sign-out-button")).toBeTruthy(),
    );
    await fireEvent.press(screen.getByTestId("confirm-sign-out-button"));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "లాగిన్ చేయండి" }),
      ).toBeTruthy(),
    );
    expect(
      await SecureStore.getItemAsync("smart-water-access-token"),
    ).toBeNull();
    expect(await SecureStore.getItemAsync("smart-water-auth-user")).toBeNull();

    await app.unmount();
    app = await render(<App />);
    await waitFor(() =>
      expect(screen.getAllByLabelText(/.+/).length).toBeGreaterThan(1),
    );
    jest.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "server failure" }),
    } as Response);
    await loginWith(farmerFixture.password);
    await waitFor(() =>
      expect(
        screen.getByText(
          "సర్వర్‌లో సమస్య ఉంది. కొద్దిసేపటి తర్వాత మళ్లీ ప్రయత్నించండి.",
        ),
      ).toBeTruthy(),
    );
    jest.spyOn(global, "fetch").mockRejectedValueOnce(new TypeError("offline"));
    await loginWith(farmerFixture.password);
    await waitFor(() =>
      expect(
        screen.getByText(
          "సర్వర్‌ను చేరుకోలేకపోయాము. ఇంటర్నెట్ కనెక్షన్‌ను తనిఖీ చేయండి.",
        ),
      ).toBeTruthy(),
    );
    await app.unmount();
  }, 60000);
});
