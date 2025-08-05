import React from 'react';
import { View, Text, FlatList, StyleSheet, Button, SafeAreaView, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ConfettiCannon from 'react-native-confetti-cannon'; // YENİ: Konfeti kütüphanesini import et

const GameOverScreen = ({ route }) => {
  const { finalResults } = route.params; 
  const results = Array.isArray(finalResults) ? finalResults.sort((a, b) => b.totalScore - a.totalScore) : [];
  const winner = results.length > 0 ? results[0] : null;
  const navigation = useNavigation();

  const renderPlayerResult = ({ item, index }) => (
    <View style={[styles.playerContainer, index === 0 && styles.winnerContainer]}>
      <Text style={styles.rank}>{index + 1}.</Text>
      <Text style={styles.username}>{item.username || 'Bilinmeyen Oyuncu'}</Text>
      <Text style={styles.totalScore}>{item.totalScore !== undefined ? item.totalScore : 0} Puan</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* --- YENİ: Konfeti Animasyonu --- */}
      {/* Kazanan belli olduğunda ekranın en üstünden konfeti patlaması yaşanacak */}
      {winner && (
          <ConfettiCannon
            count={300} // Konfeti sayısı
            origin={{ x: -10, y: 0 }} // Başlangıç noktası (ekranın sol üstü)
            autoStart={true} // Ekran açılır açılmaz başlasın
            fadeOut={true} // Konfetiler yavaşça kaybolsun
            explosionSpeed={400} // Patlama hızı
          />
      )}
      
      <Text style={styles.pageTitle}>Oyun Bitti!</Text>
      {winner && <Text style={styles.winnerText}>🏆 Kazanan: {winner.username || 'Bilinmeyen Oyuncu'} 🏆</Text>}
      
      <Text style={styles.finalScoresHeader}>Nihai Puan Durumu</Text>
      <FlatList
        data={results}
        renderItem={renderPlayerResult}
        keyExtractor={(item) => item.username || item.id || String(Math.random())}
        style={styles.playerList}
      />
      <Button title="Yeni Oyun" onPress={() => navigation.replace('Home')} />
    </SafeAreaView>
  );
};

// --- STİLLER GÜNCELLENDİ ---
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20, 
    backgroundColor: '#f0f0f0' 
  },
  pageTitle: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    marginVertical: 10, 
    color: 'black' 
  },
  winnerText: { 
    fontSize: 24, 
    color: '#28a745', // Daha canlı bir yeşil
    fontWeight: 'bold', 
    textAlign: 'center', 
    marginBottom: 20 
  },
  finalScoresHeader: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    marginBottom: 10, 
    borderBottomWidth: 1, 
    paddingBottom: 5, 
    color: 'black' 
  },
  playerList: { 
    flexGrow: 1, 
    width: '100%' 
  },
  playerContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 15, 
    backgroundColor: 'white', 
    borderWidth: 1, 
    borderColor: '#ddd', 
    borderRadius: 8, 
    marginBottom: 10,
    elevation: 2,
  },
  winnerContainer: { 
    backgroundColor: '#d4edda', 
    borderColor: 'green',
    borderWidth: 2,
    transform: [{ scale: 1.02 }] // Kazanan kartını hafifçe büyüt
  },
  rank: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginRight: 15, 
    color: 'black' 
  },
  username: { 
    flex: 1, 
    fontSize: 18, 
    color: 'black',
    fontWeight: '500'
  },
  totalScore: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: 'black' 
  },
});

export default GameOverScreen;