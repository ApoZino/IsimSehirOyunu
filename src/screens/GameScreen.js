import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { socket } from '../services/socket';

const GameScreen = ({ route, navigation }) => {
  const { letter, roomCode, duration, categories, currentRound, totalRounds } = route.params; 
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(duration || 300);
  const [isFinalCountdown, setIsFinalCountdown] = useState(false);
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
    const onRoundOver = (results) => {
      navigation.replace('Score', { results, roomCode });
    };
    const onFinalCountdown = ({ duration }) => {
        setIsFinalCountdown(true);
        setTimeLeft(duration);
    };
    socket.on('roundOver', onRoundOver);
    socket.on('finalCountdown', onFinalCountdown);
    return () => {
      socket.off('roundOver', onRoundOver);
      socket.off('finalCountdown', onFinalCountdown);
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
        {isFinalCountdown && ( <Text style={styles.warningText}>Bir oyuncu bitirdi! Son 15 saniye!</Text> )}
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
          <Button title={submitted ? "Diğer Oyuncular Bekleniyor..." : "Cevapları Gönder"} onPress={handleSubmitAnswers} disabled={timeLeft === 0 || submitted} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f5f5f5' },
  roundInfo: { fontSize: 18, fontWeight: '500', textAlign: 'center', marginBottom: 5 },
  timer: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', color: 'black', marginBottom: 10 },
  warningText: { fontSize: 16, textAlign: 'center', color: '#d9534f', marginBottom: 10, fontWeight: 'bold' },
  header: { fontSize: 24, color: '#333', textAlign: 'center' },
  letterText: { fontSize: 96, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#007bff' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 5,
    fontSize: 16,
    marginBottom: 10,
    color: 'black',
  },
  buttonContainer: { 
    marginTop: 10,
  },
});

export default GameScreen;