import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native'; // ActivityIndicator eklendi
import { socket } from '../services/socket';

const GameScreen = ({ route, navigation }) => {
  const { letter, roomCode, duration, categories, currentRound, totalRounds } = route.params;

  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(duration || 300); // Tur süresi veya 300 saniye
  const [isFinalCountdown, setIsFinalCountdown] = useState(false); // 15 saniyelik geri sayım aktif mi?
  const [submitted, setSubmitted] = useState(false); // Oyuncu cevaplarını gönderdi mi?
  const [isGameLoading, setIsGameLoading] = useState(false); // Oyun durumu yükleniyor/bekleniyor mu?
  
  const timerIntervalRef = useRef(null); // Zamanlayıcı ID'sini tutmak için useRef

  // --- Zamanlayıcı Mantığı ---
  useEffect(() => {
    // Mevcut bir zamanlayıcı varsa temizle (her zaman effect çalıştığında temiz başla)
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (timeLeft > 0) {
      // Eğer zaman kaldıysa ve henüz cevaplar gönderilmediyse sayacı başlat
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

  // --- Socket Olay Dinleyicileri ---
  useEffect(() => {
    setIsGameLoading(true); // Oyun ekranı yüklenirken veya tur başlangıcında yükleme göster
    
    const onGameStarted = (data) => {
        // Düzeltildi: objeyi stringify yapıldı
        console.log('GameScreen: Yeni tur başladı, veri:', JSON.stringify(data, null, 2));
        // Resetleme:
        setTimeLeft(data.duration);
        setAnswers({});
        setIsFinalCountdown(false);
        setSubmitted(false);
        setIsGameLoading(false); // Yüklemeyi bitir
        // route.params güncellemeleri için navigation.replace kullanılmıyor,
        // GameScreen zaten route.params'ı alıyor. Eğer bir sonraki tur aynı GameScreen üzerinde devam edecekse,
        // bu parametreler zaten route.params içinde güncel olarak gelmelidir.
        // Ancak navigasyonun kendisi GameScreen'e döndüğünde tetiklenir ve route.params güncellenir.
        // Buradaki data tur verileri için kullanılır.
    };

    const onRoundOver = (results) => {
      // Düzeltildi: objeyi stringify yapıldı
      console.log('GameScreen: Tur Bitti! Sonuçlar:', JSON.stringify(results, null, 2));
      if (timerIntervalRef.current) { // Zamanlayıcıyı temizle
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setIsGameLoading(false); // Yüklemeyi bitir
      // ScoreScreen'e yönlendir
      navigation.replace('Score', { results, roomCode });
    };

    const onFinalCountdown = ({ duration: finalDuration }) => {
      // Düzeltildi: objeyi stringify yapıldı
      console.log('GameScreen: Son Geri Sayım Başladı! Süre:', JSON.stringify({ finalDuration }, null, 2));
      setIsFinalCountdown(true); // "Son 15 saniye!" metnini göstermek için
      
      // Mevcut ana zamanlayıcıyı durdur (zaten yukarıdaki useEffect içinde de var ama burada da emin olalım)
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      
      // Yeni, 15 saniyelik geri sayımı başlat
      setTimeLeft(finalDuration); // Geri sayım süresini 15 olarak ayarla
      // timeLeft'ın güncellenmesi, yukarıdaki ilk useEffect'i tetikleyerek yeni bir interval başlatacaktır.
    };

    const onVotingStarted = (data) => {
      // Düzeltildi: objeyi stringify yapıldı
      console.log('GameScreen: Oylama başladı! Voting ekranına yönlendiriliyor. Veri:', JSON.stringify(data, null, 2));
      if (timerIntervalRef.current) { // Zamanlayıcıyı durdur
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setTimeLeft(0); // Geri sayımı sıfırla/gizle
      setIsGameLoading(false); // Yüklemeyi bitir

      navigation.replace('Voting', {
        submissions: data.submissions,
        players: data.players,
        roomCode: roomCode,
        refereeId: data.refereeId // Hakem ID'sini VotingScreen'e iletiyoruz
      });
    };

    const onPlayerJoined = (playersList) => {
        // Düzeltildi: objeyi stringify yapıldı
        console.log("GameScreen: Yeni oyuncu katıldı. Güncel oyuncular:", JSON.stringify(playersList, null, 2));
        // Eğer oyuncu listesinin güncellenmesi gerekiyorsa burada state'i güncelleyebiliriz,
        // ama GameScreen genelde oyunun başlamış haliyle ilgilenir.
    };

    const onError = (error) => {
        // Düzeltildi: error objesi yerine error.message kullanıldı
        console.error("GameScreen'de Sunucu Hatası:", error.message || error);
        Alert.alert("Hata", error.message || "Bir hata oluştu.");
        setIsGameLoading(false); // Hata durumunda yüklemeyi bitir
    };

    // Socket olaylarını dinlemeye başla
    socket.on('gameStarted', onGameStarted);
    socket.on('roundOver', onRoundOver);
    socket.on('finalCountdown', onFinalCountdown);
    socket.on('votingStarted', onVotingStarted);
    socket.on('playerJoined', onPlayerJoined); // Oyuncu katılımını izlemek için
    socket.on('error', onError);

    // Temizlik fonksiyonu
    return () => {
      socket.off('gameStarted', onGameStarted);
      socket.off('roundOver', onRoundOver);
      socket.off('finalCountdown', onFinalCountdown);
      socket.off('votingStarted', onVotingStarted);
      socket.off('playerJoined', onPlayerJoined);
      socket.off('error', onError);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [navigation, roomCode]); // 'submitted' artık bu useEffect'in bağımlılığı değil

  // Tur başında route.params'tan gelen süreyi ayarla
  // Bu useEffect sadece bir kez çalışmalı (component mount olduğunda) veya her tur başında resetlenmeli
  // Ancak route.params'tan gelen 'duration' ile timeLeft'ı doğrudan ayarladığımız için
  // ve 'onGameStarted' event'i ile de resetlediğimiz için ayrı bir useEffect'e gerek kalmayabilir.
  // const initialDurationSet = useRef(false);
  // useEffect(() => {
  //   if (!initialDurationSet.current && duration) {
  //     setTimeLeft(duration);
  //     initialDurationSet.current = true;
  //   }
  // }, [duration]);


  const handleInputChange = (category, value) => {
    setAnswers(prev => ({ ...prev, [category.toLowerCase()]: value }));
  };

  const handleSubmitAnswers = () => {
    if (!submitted) {
      console.log('Cevaplar gönderiliyor...');
      // Düzeltildi: answers objesi stringify yapıldı
      console.log('Gönderilen cevaplar:', JSON.stringify(answers, null, 2));
      socket.emit('submitAnswers', { roomCode, answers });
      setSubmitted(true); // Cevap gönderildi olarak işaretle
      setIsGameLoading(true); // Cevap gönderildi, diğer oyuncular beklenirken yükleme göster
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  // Oyun yüklenirken veya tur başlangıcı beklenirken yükleme göster
  if (isGameLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Oyun başlatılıyor / Tur bekleniyor...</Text>
      </View>
    );
  }

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