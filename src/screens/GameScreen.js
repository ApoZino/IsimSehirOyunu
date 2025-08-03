import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { socket } from '../services/socket';

const GameScreen = ({ route, navigation }) => {
  // Destructure params from route.params
  const { letter, roomCode, duration, categories, currentRound, totalRounds } = route.params;

  // State variables
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(duration || 300); // Use duration from route.params
  const [isFinalCountdown, setIsFinalCountdown] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [timerIntervalId, setTimerIntervalId] = useState(null); // To store the ID of the countdown timer

  // --- Timer Logic for game round ---
  useEffect(() => {
    // Start a new timer if timeLeft is positive and no timer is running
    if (timeLeft > 0 && timerIntervalId === null) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer); // Stop timer when it reaches 0
            setTimerIntervalId(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setTimerIntervalId(timer); // Save the timer ID
    } else if (timeLeft === 0 && !submitted) {
      // If time runs out and answers not submitted, auto-submit
      handleSubmitAnswers();
    }

    // Cleanup function: Clear timer if component unmounts or dependencies change
    return () => {
      if (timerIntervalId) {
        clearInterval(timerIntervalId);
        setTimerIntervalId(null);
      }
    };
  }, [timeLeft, submitted]); // Re-run effect if timeLeft or submitted changes


  // --- Socket Event Listeners ---
  useEffect(() => {
    const onRoundOver = (results) => {
      // Navigate to score screen when round is over
      navigation.replace('Score', { results, roomCode });
    };

    const onFinalCountdown = ({ duration }) => {
      setIsFinalCountdown(true);
      // Ensure the main timer is stopped and replaced with final countdown
      if (timerIntervalId) {
        clearInterval(timerIntervalId);
        setTimerIntervalId(null); // Clear previous interval
      }
      setTimeLeft(duration); // Set new time for final countdown
      // Re-initialize a new countdown for the final phase if needed
      // (The first useEffect for timeLeft handles this as timeLeft changes)
    };

    // THIS IS THE NEW PART: Listen for votingStarted
    const onVotingStarted = (data) => {
      console.log('Voting started! Navigating to VotingScreen with data:', data);
      // Stop any active countdown timer
      if (timerIntervalId) {
        clearInterval(timerIntervalId);
        setTimerIntervalId(null);
      }
      // Navigate to the VotingScreen, passing the necessary data
      navigation.replace('VotingScreen', {
        submissions: data.submissions,
        players: data.players,
        roomCode: roomCode // Pass the current roomCode
      });
    };

    socket.on('roundOver', onRoundOver);
    socket.on('finalCountdown', onFinalCountdown);
    socket.on('votingStarted', onVotingStarted); // Register the new listener

    // Cleanup function: Unsubscribe from all listeners when component unmounts
    return () => {
      socket.off('roundOver', onRoundOver);
      socket.off('finalCountdown', onFinalCountdown);
      socket.off('votingStarted', onVotingStarted); // Unsubscribe from the new listener
      if (timerIntervalId) { // Ensure timer is cleared on unmount
        clearInterval(timerIntervalId);
      }
    };
  }, [navigation, roomCode, timerIntervalId]); // Add timerIntervalId to dependencies


  const handleInputChange = (category, value) => {
    setAnswers(prev => ({ ...prev, [category.toLowerCase()]: value }));
  };

  const handleSubmitAnswers = () => {
    if (!submitted) {
      socket.emit('submitAnswers', { roomCode, answers });
      setSubmitted(true);
      // Optional: You might want to disable the input fields here
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
        {isFinalCountdown && (
          <Text style={styles.warningText}>Bir oyuncu bitirdi! Son 15 saniye!</Text>
        )}
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
            editable={!submitted} // Disable input after submission
          />
        ))}

        <View style={styles.buttonContainer}>
          <Button
            title={submitted ? "Cevaplar Gönderildi, Bekleniyor..." : "Cevapları Gönder"}
            onPress={handleSubmitAnswers}
            disabled={submitted} // Disable button if already submitted
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f5f5f5', flexGrow: 1, justifyContent: 'center' },
  roundInfo: { fontSize: 18, fontWeight: '500', textAlign: 'center', marginBottom: 5, color: 'black' },
  timer: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', color: 'red', marginBottom: 10 },
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