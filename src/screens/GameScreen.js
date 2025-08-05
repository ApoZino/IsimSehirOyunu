import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import LottieView from 'lottie-react-native';
import { socket } from '../services/socket';

const GameScreen = ({ route, navigation }) => {
  const { initialGameData, roomCode } = route.params;
  const { letter, duration, categories, currentRound, totalRounds } = initialGameData;

  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(duration || 300);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (!submitted) {
        handleSubmitAnswers();
    }
  }, [timeLeft, submitted]);

  useEffect(() => {
    // Tur bittiğinde artık 'disputePhaseStarted' olayını dinliyoruz
    const onDisputePhaseStarted = (data) => {
      navigation.replace('Dispute', { ...data, roomCode });
    };

    socket.on('disputePhaseStarted', onDisputePhaseStarted);

    return () => {
      socket.off('disputePhaseStarted', onDisputePhaseStarted);
    };
  }, [navigation, roomCode]);

  const handleInputChange = (category, value) => {
    setAnswers(prev => ({ ...prev, [category.toLowerCase()]: value }));
  };

  const handleSubmitAnswers = () => {
    if(!submitted) {
      socket.emit('submitAnswers', { roomCode, answers });
      setSubmitted(true);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.roundInfo}>Tur: {currentRound} / {totalRounds}</Text>
        <Text style={styles.timer}>Kalan Süre: {formatTime(timeLeft)}</Text>
        <Text style={styles.header}>Seçilen Harf:</Text>
        <Text style={styles.letterText}>{letter}</Text>
        
        {categories.map((category) => (
          <TextInput
            key={category}
            style={styles.input}
            placeholder={category}
            placeholderTextColor="black"
            onChangeText={text => handleInputChange(category, text)}
            autoCapitalize="words"
          />
        ))}

        <View style={styles.buttonContainer}>
          {submitted ? (
            <View style={styles.waitingContainer}>
              <LottieView
                source={require('../assets/waiting.json')}
                autoPlay
                loop
                style={{ width: 150, height: 150 }}
              />
              <Text style={styles.waitingText}>Diğer oyuncular ve süre bekleniyor...</Text>
            </View>
          ) : (
            <Button 
              title="Cevapları Gönder" 
              onPress={handleSubmitAnswers} 
              disabled={timeLeft === 0} 
            />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
// Stiller aynı
const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f5f5f5' },
  roundInfo: { fontSize: 18, fontWeight: '500', textAlign: 'center', marginBottom: 5 },
  timer: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', color: 'black', marginBottom: 10 },
  header: { fontSize: 24, color: '#333', textAlign: 'center' },
  letterText: { fontSize: 96, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#007bff' },
  input: {
    borderWidth: 1, borderColor: '#ccc', backgroundColor: 'white', padding: 10,
    borderRadius: 5, fontSize: 16, marginBottom: 10, color: 'black',
  },
  buttonContainer: { marginTop: 10, alignItems: 'center' },
  waitingContainer: { alignItems: 'center', padding: 20 },
  waitingText: { marginTop: 10, fontSize: 16, fontWeight: 'bold', color: 'black' }
});

export default GameScreen;