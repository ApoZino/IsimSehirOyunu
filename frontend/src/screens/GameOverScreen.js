import React from 'react';
import { View, Text, FlatList, StyleSheet, Button, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const GameOverScreen = ({ route }) => {
  // finalResults parametresini al
  const { finalResults } = route.params; 

  // finalResults'ın dizi olduğundan emin ol ve sırala
  const results = Array.isArray(finalResults) ? finalResults.sort((a, b) => b.totalScore - a.totalScore) : [];
  
  const winner = results.length > 0 ? results[0] : null;

  const navigation = useNavigation(); // navigation objesini al

  const renderPlayerResult = ({ item, index }) => (
    <View style={[styles.playerContainer, index === 0 && styles.winnerContainer]}>
      <Text style={styles.rank}>{index + 1}.</Text>
      <Text style={styles.username}>{item.username || 'Bilinmeyen Oyuncu'}</Text>
      <Text style={styles.totalScore}>{item.totalScore !== undefined ? item.totalScore : 0} Puan</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.pageTitle}>Oyun Bitti!</Text>
      {winner && <Text style={styles.winnerText}>Kazanan: {winner.username || 'Bilinmeyen Oyuncu'}</Text>}
      
      <Text style={styles.finalScoresHeader}>Nihai Puan Durumu</Text>
      <FlatList
        data={results}
        renderItem={renderPlayerResult}
        keyExtractor={(item) => item.username || item.id || String(Math.random())} // Daha sağlam keyExtractor
        style={styles.playerList}
      />
      <Button title="Yeni Oyun" onPress={() => navigation.replace('Home')} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f0f0f0' },
  pageTitle: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginVertical: 10, color: 'black' },
  winnerText: { fontSize: 24, color: 'green', fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  finalScoresHeader: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 10, borderBottomWidth: 1, paddingBottom: 5, color: 'black' },
  playerList: { flexGrow: 1, width: '100%' }, // FlatList'in scroll olabilmesi için
  playerContainer: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 10 },
  winnerContainer: { backgroundColor: '#d4edda', borderColor: 'green' },
  rank: { fontSize: 18, fontWeight: 'bold', marginRight: 15, color: 'black' },
  username: { flex: 1, fontSize: 18, color: 'black' },
  totalScore: { fontSize: 18, fontWeight: 'bold', color: 'black' },
});

export default GameOverScreen;