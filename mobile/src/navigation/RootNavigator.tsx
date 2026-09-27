import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useAuth } from "../context/AuthContext";
import { AuthLoadingScreen } from "../screens/AuthLoadingScreen";
import { AuthenticatedScreen } from "../screens/AuthenticatedScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { FarmerProfileScreen } from "../screens/FarmerProfileScreen";
import { WaterManagementScreen } from "../screens/WaterManagementScreen";
import { RegistrationScreen } from "../screens/RegistrationScreen";
import { isFarmerProfileComplete } from "../services/profile";

export type RootStackParamList = {
  Loading: undefined;
  Login: { registered?: boolean } | undefined;
  Register: undefined;
  Authenticated: undefined;
  Profile: undefined;
  WaterManagement: undefined;
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
