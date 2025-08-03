import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { socket } from '../services/socket';

const GameScreen = ({ route, navigation }) => {
  const { letter, roomCode, duration, categories, currentRound, totalRounds } = route.params;

  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(duration || 300);
  const [isFinalCountdown, setIsFinalCountdown] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const timerIntervalRef = useRef(null); // Zamanlayıcı ID'sini tutmak için useRef

  // --- Zamanlayıcı Mantığı ---
  useEffect(() => {
    // Mevcut bir zamanlayıcı varsa temizle
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (timeLeft > 0 && !submitted) { // Sadece zaman varsa ve cevaplar gönderilmediyse sayacı başlat
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
            if (!submitted) { // Zaman bittiğinde ve henüz cevap gönderilmediyse otomatik gönder
              handleSubmitAnswers();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timeLeft === 0 && !submitted) { // Zaman 0'a ulaştığında ve cevaplar henüz gönderilmediyse
        handleSubmitAnswers();
    }

    // Component unmount olduğunda veya useEffect tekrar çalıştığında zamanlayıcıyı temizle
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [timeLeft, submitted]); // 'timeLeft' ve 'submitted' state'leri değiştiğinde effecti tekrar çalıştır

  // --- Socket Olay Dinleyicileri ---
  useEffect(() => {
    const onRoundOver = (results) => {
      // Düzeltildi: objeyi stringify yapıldı
      console.log('Tur Bitti! Sonuçlar:', JSON.stringify(results, null, 2));
      if (timerIntervalRef.current) { // Zamanlayıcıyı temizle
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      console.log("ScoreScreen'e gönderilen sonuçlar:", JSON.stringify(results, null, 2));
      navigation.replace('Score', { results, roomCode });
    };

    const onFinalCountdown = ({ duration: finalDuration }) => {
      // Düzeltildi: objeyi stringify yapıldı (data objesi)
      console.log('Son Geri Sayım Başladı! Süre:', JSON.stringify({ finalDuration }, null, 2));
      setIsFinalCountdown(true);
      if (timerIntervalRef.current) { // Ana zamanlayıcıyı durdur
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setTimeLeft(finalDuration); // Yeni son geri sayım süresi
    };

    const onVotingStarted = (data) => {
      // Düzeltildi: objeyi stringify yapıldı
      console.log('Oylama başladı! Voting ekranına yönlendiriliyor. Veri:', JSON.stringify(data, null, 2));
      if (timerIntervalRef.current) { // Zamanlayıcıyı durdur
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setTimeLeft(0); // Geri sayımı sıfırla/gizle
      
      navigation.replace('Voting', {
        submissions: data.submissions,
        players: data.players,
        roomCode: roomCode
      });
    };

    const onError = (error) => {
        // Düzeltildi: error objesi yerine error.message kullanıldı
        console.error("GameScreen'de Sunucu Hatası:", error.message || error);
        Alert.alert("Hata", error.message || "Bir hata oluştu.");
    };

    socket.on('roundOver', onRoundOver);
    socket.on('finalCountdown', onFinalCountdown);
    socket.on('votingStarted', onVotingStarted);
    socket.on('error', onError);

    // Temizlik fonksiyonu
    return () => {
      socket.off('roundOver', onRoundOver);
      socket.off('finalCountdown', onFinalCountdown);
      socket.off('votingStarted', onVotingStarted);
      socket.off('error', onError);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [navigation, roomCode]); // Bağmlılıklar

  const handleInputChange = (category, value) => {
    setAnswers(prev => ({ ...prev, [category.toLowerCase()]: value }));
  };

  const handleSubmitAnswers = () => {
    if (!submitted) {
      console.log('Cevaplar gönderiliyor...');
      // Düzeltildi: answers objesi stringify yapıldı
      console.log('Gönderilen cevaplar:', JSON.stringify(answers, null, 2));
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
            editable={!submitted}
            value={answers[category.toLowerCase()] || ''}
          />
        ))}

        <View style={styles.buttonContainer}>
          <Button
            title={submitted ? "Cevaplar Gönderildi, Bekleniyor..." : "Cevapları Gönder"}
            onPress={handleSubmitAnswers}
            disabled={submitted}
            color={submitted ? "#cccccc" : "#007bff"}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#f5f5f5', justifyContent: 'center' },
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