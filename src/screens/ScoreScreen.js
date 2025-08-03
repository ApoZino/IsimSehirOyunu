// ScoreScreen.js
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Button } from 'react-native';
import { socket } from '../services/socket';
import { useNavigation } from '@react-navigation/native'; // useNavigation hook'unu import edin

const ScoreScreen = ({ route }) => {
    const navigation = useNavigation(); // navigation objesini hook ile alın
    const { results, roomCode } = route.params;

    // Sunucudan yeni tur başlama veya oyun bitme olaylarını dinle
    useEffect(() => {
        const onGameStarted = (data) => {
            console.log("Yeni tur başladı, GameScreen'e yönlendiriliyor:", data);
            navigation.replace('Game', {
                letter: data.letter,
                roomCode: roomCode, // roomCode'u mevcut route params'tan alabiliriz
                duration: data.duration,
                categories: data.categories,
                currentRound: data.currentRound,
                totalRounds: data.totalRounds
            });
        };

        const onGameOver = (finalResults) => {
            console.log("Oyun bitti, GameOverScreen'e yönlendiriliyor:", finalResults);
            navigation.replace('GameOver', { finalResults });
        };

        const onError = (error) => {
            console.error("ScoreScreen'de Sunucu Hatası:", error);
            // Alert.alert("Hata", error.message || "Bir hata oluştu."); // İsteğe bağlı
        };

        socket.on('gameStarted', onGameStarted);
        socket.on('gameOver', onGameOver);
        socket.on('error', onError);

        return () => {
            socket.off('gameStarted', onGameStarted);
            socket.off('gameOver', onGameOver);
            socket.off('error', onError);
        };
    }, [navigation, roomCode]); // Bağmlılıkları güncelleyin

    // Sonuçları puana göre sırala (isteğe bağlı)
    const sortedResults = results.sort((a, b) => b.totalScore - a.totalScore);

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Tur Sonuçları!</Text>
            {sortedResults.map((playerResult, index) => (
                <View key={playerResult.username || index} style={styles.playerCard}>
                    <Text style={styles.playerRank}>#{index + 1}</Text>
                    <Text style={styles.playerName}>{playerResult.username}</Text>
                    <Text style={styles.roundScore}>Tur Puanı: {playerResult.roundScore}</Text>
                    <Text style={styles.totalScore}>Toplam Puan: {playerResult.totalScore}</Text>

                    <Text style={styles.answersHeader}>Cevaplar ve Puanlar:</Text>
                    {/* Cevapları ve kategori puanlarını listele */}
                    {Object.keys(playerResult.answers || {}).map(category => (
                        <View key={category} style={styles.answerItem}>
                            <Text style={styles.categoryText}>{category}:</Text>
                            <Text style={styles.answerText}>
                                {playerResult.answers[category] || '-'} (Puan: {playerResult.scores[category] || 0})
                            </Text>
                        </View>
                    ))}
                </View>
            ))}
            
            {/* Bu buton, bir sonraki tura geçişi veya oyun sonu ekranına yönlendirmeyi server'ın kontrol etmesi gerektiği için genellikle bu ekranda olmaz.
                Ancak manuel test için tutulabilir. */}
            {/* <Button title="Devam Et" onPress={() => console.log('Devam et tıklandı')} /> */}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
        color: '#333',
    },
    playerCard: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        borderLeftWidth: 5,
        borderLeftColor: '#007bff',
    },
    playerRank: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#888',
        position: 'absolute',
        top: 10,
        right: 15,
    },
    playerName: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#007bff',
    },
    roundScore: {
        fontSize: 18,
        color: '#5cb85c', // Yeşil
        marginBottom: 3,
    },
    totalScore: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#f0ad4e', // Turuncu
        marginBottom: 10,
    },
    answersHeader: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 10,
        marginBottom: 5,
        color: '#555',
    },
    answerItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 3,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    categoryText: {
        fontSize: 16,
        fontWeight: '500',
        color: 'black',
    },
    answerText: {
        fontSize: 16,
        color: '#666',
        flexShrink: 1, // Uzun cevaplar için
        marginLeft: 5,
    },
});

export default ScoreScreen;