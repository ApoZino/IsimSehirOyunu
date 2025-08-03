import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { socket } from '../services/socket';

const GameScreen = ({ route, navigation }) => {
  // `initialGameData`'yı route.params'tan alıyoruz (LobbyScreen'den gönderildiği gibi)
  const { roomCode, initialGameData } = route.params;

  // Oyunun detaylarını `initialGameData`'dan başlatıyoruz
  const [letter, setLetter] = useState(initialGameData?.letter || '');
  const [categories, setCategories] = useState(initialGameData?.categories || []);
  const [currentRound, setCurrentRound] = useState(initialGameData?.currentRound || 0);
  const [totalRounds, setTotalRounds] = useState(initialGameData?.totalRounds || 0);
  const [refereeId, setRefereeId] = useState(initialGameData?.refereeId || '');
  
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(initialGameData?.duration || 300); // Süreyi initialGameData'dan al
  const [isFinalCountdown, setIsFinalCountdown] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // isGameLoading başlangıçta hala true ama hemen aşağıda initialGameData kontrolü ile false yapılacak
  const [isGameLoading, setIsGameLoading] = useState(true); 

  const timerIntervalRef = useRef(null); // Zamanlayıcı ID'sini tutmak için useRef

  // --- Zamanlayıcı Mantığı ---
  useEffect(() => {
    // Mevcut bir zamanlayıcı varsa temizle
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
    console.log(`GameScreen: initialGameData (Lobby'den gelen): ${JSON.stringify(initialGameData, null, 2)}`);

    // Bağlantı durumunu kontrol et ve bağlı değilse bağlanmayı dene
    if (!socket.connected) {
        console.warn('GameScreen: useEffect çalıştı ama socket bağlı değil. Yeniden bağlanmayı deneyeceğim.');
        socket.connect(); // Bağlantıyı zorla
    }

    // --- KRİTİK DEĞİŞİKLİK BURADA BAŞLIYOR ---
    // Eğer initialGameData mevcutsa, ekranı doğrudan bununla başlat
    if (initialGameData && initialGameData.currentRound > 0) { // currentRound 0'dan büyükse geçerli data demektir
        console.log('GameScreen: initialGameData ile doğrudan başlatılıyor. isGameLoading FALSE yapılıyor.');
        // State'ler zaten yukarıda initialGameData ile başlatıldı.
        setIsGameLoading(false); // Yükleme durumunu kapat
    } else {
        console.log('GameScreen: initialGameData eksik veya geçersiz. isGameLoading TRUE kalıyor (Event bekleniyor).');
        setIsGameLoading(true); // Veri yoksa yükleme ekranında kal
    }
    // --- KRİTİK DEĞİŞİKLİK BURADA BİTİYOR ---


    const onConnectDebug = () => { console.log('GameScreen: Socket yeniden BAĞLANDI (onConnectDebug)!'); };
    const onDisconnectDebug = () => {
        console.log('GameScreen: Socket bağlantısı KESİLDİ (onDisconnectDebug)!');
        Alert.alert('Bağlantı Hatası', 'Sunucu bağlantısı GameScreen\'de kesildi. Lobiye dönüyor.');
        navigation.replace('Home');
    };

    // onGameStarted olayını yakalamaya devam et (özellikle sonraki turlar için)
    const handleGameStartedEvent = (data) => {
      console.log('GameScreen: >>>>> ONGAMESTARTED OLAYI ALINDI! <<<<< Veri:', JSON.stringify(data, null, 2));
      // State'leri olaydan gelen data ile güncelle
      setLetter(data.letter);
      setCategories(data.categories);
      setCurrentRound(data.currentRound);
      setTotalRounds(data.totalRounds);
      setRefereeId(data.refereeId); 
      setTimeLeft(data.duration);
      
      setAnswers({});
      setIsFinalCountdown(false);
      setSubmitted(false);
      setIsGameLoading(false); // Yükleme durumunu kapat
      console.log('GameScreen: isGameLoading FALSE olarak ayarlandı, oyun başlamalı (olay sonrası).');
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
    socket.on('connect', onConnectDebug);
    socket.on('disconnect', onDisconnectDebug);
    socket.on('gameStarted', handleGameStartedEvent); // Bu listener çok önemli!
    socket.on('roundOver', onRoundOver);
    socket.on('finalCountdown', onFinalCountdown);
    socket.on('votingStarted', onVotingStarted);
    socket.on('playerJoined', onPlayerJoined);
    socket.on('error', onError);

    // Temizlik fonksiyonu
    return () => {
      console.log('GameScreen: Socket dinleyicileri temizleniyor (cleanup).');
      socket.off('connect', onConnectDebug);
      socket.off('disconnect', onDisconnectDebug);
      socket.off('gameStarted', handleGameStartedEvent);
      socket.off('roundOver', onRoundOver);
      socket.off('finalCountdown', onFinalCountdown);
      socket.off('votingStarted', onVotingStarted);
      socket.off('playerJoined', onPlayerJoined);
      socket.off('error', onError);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [navigation, roomCode, initialGameData]); // `initialGameData` bağımlılıklara eklendi

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