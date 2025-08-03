import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import LobbyScreen from '../screens/LobbyScreen';
import GameScreen from '../screens/GameScreen';
import ScoreScreen from '../screens/ScoreScreen';
import GameOverScreen from '../screens/GameOverScreen';
import VotingScreen from '../screens/VotingScreen';

const Stack = createNativeStackNavigator();

const AppNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen name="Lobby" component={LobbyScreen} />
    <Stack.Screen name="Game" component={GameScreen} />
    <Stack.Screen name="Voting" component={VotingScreen} />
    <Stack.Screen name="Score" component={ScoreScreen} />
    <Stack.Screen name="GameOver" component={GameOverScreen} />
  </Stack.Navigator>
);

export default AppNavigator;