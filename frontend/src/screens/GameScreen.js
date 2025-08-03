import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { socket } from '../services/socket';

const GameScreen = ({ route, navigation }) => {
  // `refereeId`'yi de route.params'tan alıyoruz, GameScreen'den VotingScreen'e iletilecek
  const { letter, roomCode, duration, categories, currentRound, totalRounds, refereeId } = route.params;

  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(duration || 300); // Tur süresi veya 300 saniye
  const [isFinalCountdown, setIsFinalCountdown] = useState(false); // 15 saniyelik geri sayım aktif mi?
  const [submitted, setSubmitted] = useState(false); // Oyuncu cevaplarını gönderdi mi?
  const [isGameLoading, setIsGameLoading] = useState(true); // Başlangıçta true, oyun verisi gelince false olur
  
  const timerIntervalRef = useRef(null); // Zamanlayıcı ID'sini tutmak için useRef

  // --- Zamanlayıcı Mantığı ---
  useEffect(() => {
    // Mevcut bir zamanlayıcı varsa temizle (her zaman effect çalıştığında temiz başla)
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (timeLeft > 0) {
      // Eğer zaman kaldıysa sayacı başlat
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) { // Zaman bittiğinde
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
            if (!submitted) { // Eğer oyuncu henüz cevap göndermediyse otomatik gönder
              handleSubmitAnswers();
            }
            return 0; // Sayacı sıfırla
          }
          return prev - 1; // Zamanı bir saniye azalt
        });
      }, 1000);
    } else if (timeLeft === 0 && !submitted) { // Zaman 0'a ulaştığında ve cevaplar henüz gönderilmediyse
        handleSubmitAnswers(); // Otomatik olarak cevapları gönder
    }

    // Component unmount olduğunda veya useEffect tekrar çalıştığında zamanlayıcıyı temizle
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [timeLeft, submitted]); // 'timeLeft' ve 'submitted' state'leri değiştiğinde effecti tekrar çalıştır

  // --- Socket Olay Dinleyicileri (KRİTİK BÖLÜM) ---
  useEffect(() => {
    console.log('GameScreen: Ana Socket Dinleyicileri useEffect çalıştı.');
    console.log(`GameScreen: Şu anki Socket ID: ${socket.id}, Bağlı mı: ${socket.connected}`);
    console.log(`GameScreen: route.params: ${JSON.stringify(route.params, null, 2)}`);

    // **KRİTİK EKLEMELER BAŞLANGICI**
    // Bağlantı durumunu kontrol et ve bağlı değilse bağlanmayı dene
    if (!socket.connected) {
        console.warn('GameScreen: useEffect çalıştı ama socket bağlı değil. Yeniden bağlanmayı deneyeceğim.');
        socket.connect(); // Bağlantıyı zorla
    }

    // Bağlantı durumundaki değişiklikleri izlemek için dinleyici (debug amaçlı)
    const onConnectDebug = () => {
        console.log('GameScreen: Socket yeniden BAĞLANDI (onConnectDebug)!');
        // Bağlantı kurulduktan sonra oyun başlatma olayını tekrar tetiklemeyi düşünebiliriz
        // Ancak bu, sunucudan bir gameStarted olayı gelmesini beklememiz gereken ana senaryo.
    };
    const onDisconnectDebug = () => {
        console.log('GameScreen: Socket bağlantısı KESİLDİ (onDisconnectDebug)!');
        Alert.alert('Bağlantı Hatası', 'Sunucu bağlantısı GameScreen\'de kesildi. Lobiye dönüyor.');
        navigation.replace('Home'); // Bağlantı kesilirse ana ekrana dön
    };

    socket.on('connect', onConnectDebug);
    socket.on('disconnect', onDisconnectDebug);
    // **KRİTİK EKLEMELER SONU**

    // onGameStarted olayı için ayrı bir fonksiyon tanımlıyoruz
    const handleGameStartedOnMount = (data) => {
      console.log('GameScreen: >>>>> ONGAMESTARTED OLAYI ALINDI! <<<<< Veri:', JSON.stringify(data, null, 2));
      // Resetleme işlemleri
      setTimeLeft(data.duration);
      setAnswers({});
      setIsFinalCountdown(false);
      setSubmitted(false);
      setIsGameLoading(false); // Yüklemeyi bitir, oyunu göster
      console.log('GameScreen: isGameLoading FALSE olarak ayarlandı, oyun başlamalı.');
    };

    const onRoundOver = (results) => {
      console.log('GameScreen: onRoundOver olayı alındı. Sonuçlar:', JSON.stringify(results, null, 2));
      if (timerIntervalRef.current) { clearInterval(timerIntervalRef.current); timerIntervalRef.current = null; }
      setIsGameLoading(false);
      navigation.replace('Score', { results, roomCode });
    };

    const onFinalCountdown = ({ duration: finalDuration }) => {
      console.log('GameScreen: onFinalCountdown olayı alındı. Süre:', JSON.stringify({ finalDuration }, null, 2));
      setIsFinalCountdown(true);
      if (timerIntervalRef.current) { clearInterval(timerIntervalRef.current); timerIntervalRef.current = null; }
      setTimeLeft(finalDuration);
    };

    const onVotingStarted = (data) => {
      console.log('GameScreen: onVotingStarted olayı alındı. Veri:', JSON.stringify(data, null, 2));
      if (timerIntervalRef.current) { clearInterval(timerIntervalRef.current); timerIntervalRef.current = null; }
      setTimeLeft(0);
      setIsGameLoading(false);
      navigation.replace('Voting', {
        submissions: data.submissions, players: data.players, roomCode: roomCode, refereeId: data.refereeId
      });
    };

    const onPlayerJoined = (playersList) => {
        console.log("GameScreen: onPlayerJoined olayı alındı. Güncel oyuncular:", JSON.stringify(playersList, null, 2));
    };

    const onError = (error) => {
        console.error("GameScreen: onError olayı alındı. Sunucu Hatası:", error.message || error);
        Alert.alert("Hata", error.message || "Bir hata oluştu.");
        setIsGameLoading(false);
    };

    // Socket olaylarını dinlemeye başla
    socket.on('gameStarted', handleGameStartedOnMount);
    socket.on('roundOver', onRoundOver);
    socket.on('finalCountdown', onFinalCountdown);
    socket.on('votingStarted', onVotingStarted);
    socket.on('playerJoined', onPlayerJoined);
    socket.on('error', onError);

    // Temizlik fonksiyonu: Component unmount olduğunda veya useEffect tekrar çalıştığında dinleyicileri kaldır.
    return () => {
      console.log('GameScreen: Socket dinleyicileri temizleniyor (cleanup).');
      socket.off('gameStarted', handleGameStartedOnMount);
      socket.off('roundOver', onRoundOver);
      socket.off('finalCountdown', onFinalCountdown);
      socket.off('votingStarted', onVotingStarted);
      socket.off('playerJoined', onPlayerJoined);
      socket.off('error', onError);
      // Debug dinleyicileri de temizle
      socket.off('connect', onConnectDebug);
      socket.off('disconnect', onDisconnectDebug);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [navigation, roomCode, refereeId]); // Bağımlılıklar: `route.params`'tan gelenler

  const handleInputChange = (category, value) => {
    setAnswers(prev => ({ ...prev, [category.toLowerCase()]: value }));
  };

  const handleSubmitAnswers = () => {
    if (!submitted) {
      console.log('GameScreen: Cevaplar gönderiliyor...');
      console.log('GameScreen: Gönderilen cevaplar:', JSON.stringify(answers, null, 2));
      socket.emit('submitAnswers', { roomCode, answers });
      setSubmitted(true); // Cevap gönderildi olarak işaretle
      setIsGameLoading(true); // Cevap gönderildi, diğer oyuncular beklenirken yükleme göster
      console.log('GameScreen: handleSubmitAnswers çağrıldı, isGameLoading TRUE olarak ayarlandı.');
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  // Oyun yüklenirken veya tur başlangıcı beklenirken yükleme göster
  if (isGameLoading) {
    console.log('GameScreen: Yükleme Ekranı Render Ediliyor. isGameLoading:', isGameLoading);
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Oyun başlatılıyor / Tur bekleniyor...</Text>
      </View>
    );
  }

  // Normal oyun ekranı (isGameLoading false olduğunda)
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
            value={answers[category.toLowerCase()] || ''}
          />
        ))}

        <View style={styles.buttonContainer}>
          <Button
            title={submitted ? "Cevaplar Gönderildi, Bekleniyor..." : "Cevapları Gönder"}
            onPress={handleSubmitAnswers}
            disabled={submitted} // Cevap gönderildiyse butonu devre dışı bırak
            color={submitted ? "#cccccc" : "#007bff"}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#f5f5f5', justifyContent: 'center' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 18,
    color: '#333',
  },
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