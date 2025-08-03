import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Button, Alert } from 'react-native';
import { socket } from '../services/socket';
import { useNavigation } from '@react-navigation/native';

const ScoreScreen = ({ route }) => {
    const navigation = useNavigation();
    // 'finalResults' olarak geliyor, bu yüzden buradan da 'finalResults' olarak almalıyız
    const { finalResults, roomCode } = route.params;

    // Sunucudan yeni tur başlama veya oyun bitme olaylarını dinle
    useEffect(() => {
        const onGameStarted = (data) => {
            console.log("ScoreScreen: Yeni tur başladı, Game ekranına yönlendiriliyor:", JSON.stringify(data, null, 2));
            navigation.replace('Game', {
                letter: data.letter,
                roomCode: roomCode,
                duration: data.duration,
                categories: data.categories,
                currentRound: data.currentRound,
                totalRounds: data.totalRounds,
                refereeId: data.refereeId // Hakem ID'sini GameScreen'e ilet
            });
        };

        const onGameOver = (data) => { // 'finalResults' yerine 'data' kullandım çünkü server'dan genel data objesi geliyor.
            console.log("ScoreScreen: Oyun bitti, GameOver ekranına yönlendiriliyor:", JSON.stringify(data, null, 2));
            navigation.replace('GameOver', { finalResults: data }); // `finalResults` olarak iletiyoruz
        };

        const onError = (error) => {
            console.error("ScoreScreen'de Sunucu Hatası:", error.message || error);
            Alert.alert("Hata", error.message || "Bir hata oluştu.");
        };

        socket.on('gameStarted', onGameStarted);
        socket.on('gameOver', onGameOver);
        socket.on('error', onError);

        return () => {
            socket.off('gameStarted', onGameStarted);
            socket.off('gameOver', onGameOver);
            socket.off('error', onError);
        };
    }, [navigation, roomCode]);

    // Sonuçları puana göre sırala
    // `finalResults` bir dizi olmalı, her elemanı bir oyuncunun tur sonuçları olmalı.
    const sortedResults = Array.isArray(finalResults) ? finalResults.sort((a, b) => b.totalScore - a.totalScore) : [];

    if (!Array.isArray(finalResults) || finalResults.length === 0) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Tur Sonuçları</Text>
                <Text style={styles.noResultsText}>Henüz sonuç yok veya veri yüklenemedi.</Text>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Tur Sonuçları!</Text>
            {sortedResults.map((playerResult, index) => (
                // playerResult.username'in null/undefined olabileceği durumlar için alternatif key
                <View key={playerResult.username || `player-${index}`} style={styles.playerCard}>
                    <Text style={styles.playerRank}>#{index + 1}</Text>
                    <Text style={styles.playerName}>{playerResult.username || 'Bilinmeyen Oyuncu'}</Text>
                    <Text style={styles.roundScore}>Tur Puanı: {playerResult.roundScore !== undefined ? playerResult.roundScore : 0}</Text>
                    <Text style={styles.totalScore}>Toplam Puan: {playerResult.totalScore !== undefined ? playerResult.totalScore : 0}</Text>

                    {playerResult.answers && Object.keys(playerResult.answers).length > 0 && (
                        <>
                            <Text style={styles.answersHeader}>Cevaplar ve Puanlar:</Text>
                            {Object.keys(playerResult.answers).map(category => (
                                <View key={category} style={styles.answerItem}>
                                    <Text style={styles.categoryText}>{category.charAt(0).toUpperCase() + category.slice(1)}:</Text>
                                    <Text style={styles.answerText}>
                                        {playerResult.answers[category] || '-'} (Puan: {playerResult.scores?.[category] || 0})
                                    </Text>
                                </View>
                            ))}
                        </>
                    )}
                    {!playerResult.answers || Object.keys(playerResult.answers).filter(cat => playerResult.answers[cat] && playerResult.answers[cat].trim() !== '').length === 0 && (
                        <Text style={styles.noAnswersText}>Bu turda cevap girmedi.</Text>
                    )}
                </View>
            ))}
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
        flexShrink: 1,
        marginLeft: 5,
    },
    noResultsText: {
        fontSize: 18,
        textAlign: 'center',
        marginTop: 50,
        color: '#888',
    },
    noAnswersText: {
        fontSize: 14,
        color: '#888',
        marginTop: 5,
        fontStyle: 'italic',
    }
});

export default ScoreScreen;