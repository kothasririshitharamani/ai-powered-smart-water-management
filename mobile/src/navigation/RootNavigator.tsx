import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useAuth } from "../context/AuthContext";
import { AuthLoadingScreen } from "../screens/AuthLoadingScreen";
import { AuthenticatedScreen } from "../screens/AuthenticatedScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { FarmerProfileScreen } from "../screens/FarmerProfileScreen";
import { WaterManagementScreen } from "../screens/WaterManagementScreen";
import { WaterRequirementScreen } from "../screens/WaterRequirementScreen";
import { WeatherAlertsScreen } from "../screens/WeatherAlertsScreen";
import { ScarcityAllocationScreen } from "../screens/ScarcityAllocationScreen";
import { CropEfficiencyScreen } from "../screens/CropEfficiencyScreen";
import { SoilAnalysisScreen } from "../screens/SoilAnalysisScreen";
import { VoiceAssistantScreen } from "../screens/VoiceAssistantScreen";
import { DisasterPreparednessScreen } from "../screens/DisasterPreparednessScreen";
import { RegistrationScreen } from "../screens/RegistrationScreen";
import { isFarmerProfileComplete } from "../services/profile";

export type RootStackParamList = {
  Loading: undefined;
  Login: { registered?: boolean } | undefined;
  Register: undefined;
  Authenticated: undefined;
  Profile: undefined;
  WaterManagement: undefined;
  WaterRequirement: undefined;
  WeatherAlerts: undefined;
  ScarcityAllocation: undefined;
  CropEfficiency: undefined;
  SoilAnalysis: undefined;
  VoiceAssistant: undefined;
  DisasterPreparedness: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { status, profile } = useAuth();

  if (status === "loading") {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen component={AuthLoadingScreen} name="Loading" />
      </Stack.Navigator>
    );
  }

  if (status === "authenticated") {
    const profileComplete = isFarmerProfileComplete(profile);
    return (
      <Stack.Navigator
        initialRouteName={profileComplete ? "Authenticated" : "Profile"}
        key="authenticated"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen
          component={AuthenticatedScreen}
          name="Authenticated"
          options={{ headerShown: false, title: "స్మార్ట్ నీటి నిర్వహణ" }}
        />
        <Stack.Screen
          component={WaterManagementScreen}
          name="WaterManagement"
          options={{ headerShown: false, title: "నీటి నిర్వహణ" }}
        />
        <Stack.Screen
          component={WaterRequirementScreen}
          name="WaterRequirement"
          options={{ headerShown: false, title: "పంట నీటి అవసరాల అంచనా" }}
        />
        <Stack.Screen
          component={WeatherAlertsScreen}
          name="WeatherAlerts"
          options={{ headerShown: false, title: "వాతావరణ హెచ్చరికలు" }}
        />
        <Stack.Screen
          component={ScarcityAllocationScreen}
          name="ScarcityAllocation"
          options={{ headerShown: false, title: "నీటి కొరత సమయ కేటాయింపు" }}
        />
        <Stack.Screen
          component={CropEfficiencyScreen}
          name="CropEfficiency"
          options={{ headerShown: false, title: "పంటల నీటి సామర్థ్య పోలిక" }}
        />
        <Stack.Screen
          component={SoilAnalysisScreen}
          name="SoilAnalysis"
          options={{ headerShown: false, title: "AI నేల విశ్లేషణ" }}
        />
        <Stack.Screen
          component={VoiceAssistantScreen}
          name="VoiceAssistant"
          options={{ headerShown: false, title: "తెలుగు వాయిస్ అసిస్టెంట్" }}
        />
        <Stack.Screen
          component={DisasterPreparednessScreen}
          name="DisasterPreparedness"
          options={{ headerShown: false, title: "వ్యవసాయ విపత్తు సంసిద్ధత" }}
        />
        <Stack.Screen
          component={FarmerProfileScreen}
          name="Profile"
          options={{ headerShown: false, title: "రైతు వివరాలు" }}
        />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        component={LoginScreen}
        name="Login"
        options={{ headerShown: false, title: "లాగిన్ చేయండి" }}
      />
      <Stack.Screen
        component={RegistrationScreen}
        name="Register"
        options={{ headerShown: false, title: "ఖాతా సృష్టించండి" }}
      />
    </Stack.Navigator>
  );
}
