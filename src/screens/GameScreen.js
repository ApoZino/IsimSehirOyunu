import React, { useState, useEffect, useRef } from 'react'; // useRef eklendi
import { View, Text, TextInput, Button, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native'; // Alert eklendi
import { socket } from '../services/socket';

const GameScreen = ({ route, navigation }) => {
  const { letter, roomCode, duration, categories, currentRound, totalRounds } = route.params;

  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(duration || 300);
  const [isFinalCountdown, setIsFinalCountdown] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // useRef kullanarak zamanlayıcı ID'sini tutmak, re-renderlarda değişmez
  const timerIntervalRef = useRef(null);

  // --- Zamanlayıcı Mantığı (Oyun Turu) ---
  useEffect(() => {
    // Mevcut bir zamanlayıcı varsa temizle
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (timeLeft > 0) {
      // Yeni zamanlayıcıyı başlat
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
            // Zaman bittiğinde ve henüz cevap gönderilmediyse otomatik gönder
            if (!submitted) {
              handleSubmitAnswers();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timeLeft === 0 && !submitted) {
        // Zaman 0'a ulaştığında ve cevaplar henüz gönderilmediyse
        handleSubmitAnswers();
    }

    // Component unmount olduğunda veya useEffect tekrar çalıştığında zamanlayıcıyı temizle
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [duration, submitted]); // 'duration' parametresi değiştiğinde zamanlayıcıyı resetle

  // --- Socket Olay Dinleyicileri ---
  useEffect(() => {
    const onRoundOver = (results) => {
      console.log('Tur Bitti! Sonuçlar:', results);
      // Zamanlayıcıyı temizle (eğer hala çalışıyorsa)
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      navigation.replace('Score', { results, roomCode });
    };

    const onFinalCountdown = ({ duration: finalDuration }) => {
      console.log('Son Geri Sayım Başladı! Süre:', finalDuration);
      setIsFinalCountdown(true);
      // Ana zamanlayıcıyı durdur ve son geri sayımı ayarla
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setTimeLeft(finalDuration); // Yeni son geri sayım süresi
      // timeLeft useEffect'i bu yeni süreyi algılayıp yeni bir interval başlatacaktır
    };

    // Oylama başladı olayını dinle (ÖNEMLİ KISIM)
    const onVotingStarted = (data) => {
      console.log('Oylama başladı! Voting ekranına yönlendiriliyor. Veri:', data);
      // Zamanlayıcıyı durdur
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setTimeLeft(0); // Geri sayımı sıfırla/gizle
      
      // VotingScreen'e yönlendir ve gerekli verileri gönder
      navigation.replace('Voting', { // <-- 'VotingScreen' yerine 'Voting' kullanıyoruz
        submissions: data.submissions,
        players: data.players,
        roomCode: roomCode
      });
    };

    const onError = (error) => {
        console.error("GameScreen'de Sunucu Hatası:", error);
        Alert.alert("Hata", error.message || "Bir hata oluştu.");
    };

    socket.on('roundOver', onRoundOver);
    socket.on('finalCountdown', onFinalCountdown);
    socket.on('votingStarted', onVotingStarted); // Yeni listener
    socket.on('error', onError); // Genel hata dinleyicisi

    // Component unmount olduğunda veya useEffect tekrar çalıştığında tüm dinleyicileri temizle
    return () => {
      socket.off('roundOver', onRoundOver);
      socket.off('finalCountdown', onFinalCountdown);
      socket.off('votingStarted', onVotingStarted);
      socket.off('error', onError);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [navigation, roomCode, submitted]); // submitted'ı bağımlılıklara ekleyelim ki handleSubmitAnswers güncel state ile çalışsın

  const handleInputChange = (category, value) => {
    setAnswers(prev => ({ ...prev, [category.toLowerCase()]: value }));
  };

  const handleSubmitAnswers = () => {
    if (!submitted) {
      console.log('Cevaplar gönderiliyor...');
      socket.emit('submitAnswers', { roomCode, answers });
      setSubmitted(true); // Cevap gönderildi olarak işaretle
      // Cevaplar gönderildikten sonra, input alanlarını devre dışı bırak
      // ve kullanıcının tekrar göndermesini engelle
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
            editable={!submitted} // Cevap gönderildiyse inputları devre dışı bırak
            value={answers[category.toLowerCase()] || ''} // Değeri state'ten kontrol et
          />
        ))}

        <View style={styles.buttonContainer}>
          <Button
            title={submitted ? "Cevaplar Gönderildi, Bekleniyor..." : "Cevapları Gönder"}
            onPress={handleSubmitAnswers}
            disabled={submitted} // Cevap gönderildiyse butonu devre dışı bırak
            color={submitted ? "#cccccc" : "#007bff"} // Renk değişimi
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