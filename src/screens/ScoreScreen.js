import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Button, SafeAreaView } from 'react-native';
import { socket } from '../services/socket';

const ScoreScreen = ({ route, navigation }) => {
  const { results, roomCode } = route.params;
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const timer = setInterval(() => {
        setCountdown(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    const onGameStarted = (gameData) => {
      navigation.replace('Game', { ...gameData, roomCode });
    };
    const onGameOver = (finalResults) => {
      navigation.replace('GameOver', { results: finalResults });
    };

    socket.on('gameStarted', onGameStarted);
    socket.on('gameOver', onGameOver);

    return () => {
      clearInterval(timer);
      socket.off('gameStarted', onGameStarted);
      socket.off('gameOver', onGameOver);
    };
  }, [navigation, roomCode]);

  // Her bir oyuncunun sonucunu render eden fonksiyon
  const renderPlayerResult = ({ item }) => (
    <View style={styles.playerContainer}>
      {/* Oyuncu Adı ve Puan Başlığı */}
      <View style={styles.playerHeader}>
        <Text style={styles.username}>{item.username}</Text>
        <Text style={styles.totalScore}>Toplam: {item.totalScore}</Text>
      </View>
      <Text style={styles.roundScore}>Bu Tur: +{item.roundScore} Puan</Text>
      
      {/* --- YENİ: Cevap Detayları Bölümü --- */}
      <View style={styles.detailsContainer}>
        {/* Object.keys ile oyuncunun puanlarının olduğu kategorileri dönüyoruz */}
        {Object.keys(item.scores).map(category => (
          <View key={category} style={styles.answerRow}>
            <Text style={styles.categoryText}>{category.charAt(0).toUpperCase() + category.slice(1)}:</Text>
            <Text style={styles.answerText}>{item.answers[category] || "-"}</Text>
            <Text style={styles.scoreText}>{item.scores[category]} Puan</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.pageTitle}>Tur Sonuçları</Text>
      <FlatList
        data={results.sort((a,b) => b.totalScore - a.totalScore)}
        renderItem={renderPlayerResult}
        keyExtractor={(item) => item.username}
        style={{ marginVertical: 10 }}
      />
      <Text style={styles.waitingText}>
        {countdown > 0 ? `Sonraki tur ${countdown} saniye içinde başlayacak...` : 'Yeni tur başlıyor...'}
      </Text>
      <Button title="Ana Menüye Dön" onPress={() => navigation.navigate('Home')} />
    </SafeAreaView>
  );
};

// --- STİLLER GÜNCELLENDİ ---
const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: '#f0f0f0' },
  pageTitle: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginVertical: 10, color: 'black' },
  playerContainer: { 
    marginBottom: 15, 
    padding: 15, 
    backgroundColor: 'white', 
    borderWidth: 1, 
    borderColor: '#ddd', 
    borderRadius: 8 
  },
  playerHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  username: { fontSize: 20, fontWeight: 'bold', color: 'black' },
  totalScore: { fontSize: 18, color: 'black', fontWeight: 'bold' },
  roundScore: { 
    fontSize: 16, 
    color: 'black', 
    marginTop: 5, 
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  detailsContainer: { 
    marginTop: 5 
  },
  answerRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingVertical: 4 
  },
  categoryText: { flex: 2, fontWeight: 'bold', color: 'black' },
  answerText: { flex: 3, fontStyle: 'italic', color: 'black' },
  scoreText: { flex: 2, textAlign: 'right', color: 'black', fontWeight: 'bold' },
  waitingText: { padding: 20, textAlign: 'center', fontSize: 16, fontStyle: 'italic', color: 'black' },
});

export default ScoreScreen;