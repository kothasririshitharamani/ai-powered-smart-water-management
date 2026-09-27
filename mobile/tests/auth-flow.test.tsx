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
    CalendarDays: MockIcon,
    Droplets: MockIcon,
    Eye: MockIcon,
    EyeOff: MockIcon,
    Gauge: MockIcon,
    History: MockIcon,
    LockKeyhole: MockIcon,
    LogOut: MockIcon,
    MapPin: MockIcon,
    Phone: MockIcon,
    Sprout: MockIcon,
    UserRound: MockIcon,
    Waves: MockIcon,
  };
});

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
  }, 30000);
});
