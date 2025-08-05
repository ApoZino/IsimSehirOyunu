import React, { useContext } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthContext } from '../context/AuthContext';
import Icon from 'react-native-vector-icons/Ionicons'; // İkonları import et

// Tüm ekranları import et
import HomeScreen from '../screens/HomeScreen';
import LobbyScreen from '../screens/LobbyScreen';
import GameScreen from '../screens/GameScreen';
import VotingScreen from '../screens/VotingScreen';
import DisputeScreen from '../screens/DisputeScreen';
import ScoreScreen from '../screens/ScoreScreen';
import GameOverScreen from '../screens/GameOverScreen';
import SettingsScreen from '../screens/SettingsScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Oyunun kendi içindeki akışını yönetecek olan Stack Navigator
const GameStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Lobby" component={LobbyScreen} />
        <Stack.Screen name="Game" component={GameScreen} />
        <Stack.Screen name="Dispute" component={DisputeScreen} />
        <Stack.Screen name="Voting" component={VotingScreen} />
        <Stack.Screen name="Score" component={ScoreScreen} />
        <Stack.Screen name="GameOver" component={GameOverScreen} />
    </Stack.Navigator>
);

// Giriş yapmamış kullanıcılar için Stack Navigator
const AuthStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
);

// Giriş yapmış kullanıcılar için ana Tab Navigator
const MainTabs = () => (
    <Tab.Navigator
        screenOptions={({ route }) => ({
            headerShown: false,
            tabBarIcon: ({ focused, color, size }) => {
                let iconName;
                if (route.name === 'Play') {
                    iconName = focused ? 'game-controller' : 'game-controller-outline';
                } else if (route.name === 'Settings') {
                    iconName = focused ? 'settings' : 'settings-outline';
                }
                return <Icon name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: 'tomato',
            tabBarInactiveTintColor: 'gray',
        })}
    >
        <Tab.Screen name="Play" component={GameStack} options={{title: "Oyna"}} />
        <Tab.Screen name="Settings" component={SettingsScreen} options={{title: "Ayarlar"}} />
    </Tab.Navigator>
);

const AppNavigator = () => {
  const { userToken } = useContext(AuthContext);

  return (
    userToken !== null ? <MainTabs /> : <AuthStack />
  );
};

export default AppNavigator;