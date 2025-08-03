// frontend/App.js

import React from 'react';
import { NavigationContainer } from '@react-navigation/native'; // The one and only NavigationContainer
import AppNavigator from './src/navigation/AppNavigator'; // Your custom navigator

// Ensure you don't import or use NavigationContainer anywhere else in your components
// unless it's very specifically for a custom deep-linking or testing scenario.

const App = () => {
  return (
    <NavigationContainer>
      <AppNavigator /> {/* Your Stack Navigator is rendered here */}
    </NavigationContainer>
  );
};

export default App;