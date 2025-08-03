import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import LobbyScreen from '../screens/LobbyScreen';
import GameScreen from '../screens/GameScreen';
import ScoreScreen from '../screens/ScoreScreen'; // Hatalı yol düzeltildi: '../screens.ScoreScreen' yerine
import GameOverScreen from '../screens/GameOverScreen';

const Stack = createNativeStackNavigator();

const AppNavigator = () => (
  // screenOptions={{ headerShown: false }} seçeneği ekranların üstündeki başlığı kaldırır, isteğe bağlıdır.
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen name="Lobby" component={LobbyScreen} />
    <Stack.Screen name="Game" component={GameScreen} />
    <Stack.Screen name="Score" component={ScoreScreen} />
    <Stack.Screen name="GameOver" component={GameOverScreen} /> 
    {/* Hatalı yorum buradan kaldırıldı */}
  </Stack.Navigator>
);

export default AppNavigator;