import React from 'react';
import { View, Text, FlatList, StyleSheet, Button, SafeAreaView } from 'react-native';

const GameOverScreen = ({ route, navigation }) => {
  // CORRECTED LINE: Destructure finalResults instead of results
  const { finalResults } = route.params; 

  // Ensure finalResults is an array before using it
  const results = Array.isArray(finalResults) ? finalResults : [];

  const winner = results.length > 0 ? results[0] : null;

  const renderPlayerResult = ({ item, index }) => (
    <View style={[styles.playerContainer, index === 0 && styles.winnerContainer]}>
      <Text style={styles.rank}>{index + 1}.</Text>
      <Text style={styles.username}>{item.username}</Text>
      <Text style={styles.totalScore}>{item.totalScore} Puan</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.pageTitle}>Oyun Bitti!</Text>
      {winner && <Text style={styles.winnerText}>Kazanan: {winner.username}</Text>}
      
      <Text style={styles.finalScoresHeader}>Nihai Puan Durumu</Text>
      <FlatList
        data={results} // Now 'results' is guaranteed to be an array
        renderItem={renderPlayerResult}
        keyExtractor={(item) => item.username || item.id} // Added item.id as fallback for keyExtractor
      />
      <Button title="Yeni Oyun" onPress={() => navigation.navigate('Home')} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f0f0f0' },
  pageTitle: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginVertical: 10 },
  winnerText: { fontSize: 24, color: 'green', fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  finalScoresHeader: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 10, borderBottomWidth: 1, paddingBottom: 5 },
  playerContainer: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 10 },
  winnerContainer: { backgroundColor: '#d4edda', borderColor: 'green' },
  rank: { fontSize: 18, fontWeight: 'bold', marginRight: 15 },
  username: { flex: 1, fontSize: 18 },
  totalScore: { fontSize: 18, fontWeight: 'bold' },
});

export default GameOverScreen;