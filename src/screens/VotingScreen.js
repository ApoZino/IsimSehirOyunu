import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { socket } from '../services/socket';
import { useNavigation } from '@react-navigation/native'; // useNavigation hook'u import edildi

const VotingScreen = ({ route }) => {
    const navigation = useNavigation(); // navigation objesi hook ile alındı
    const { submissions, players, roomCode } = route.params;
    const [votes, setVotes] = useState({}); // { 'cevap1': 'approve', 'cevap2': 'reject' }
    const [isSubmitting, setIsSubmitting] = useState(false); // Gönderme sırasında butonu devre dışı bırakmak için

    const handleVote = (answer, vote) => {
        // Cevabı küçük harfe çevirme ve boşlukları kırpma, sunucuyla uyumlu olmalı
        const normalizedAnswer = answer.trim().toLowerCase();
        setVotes(prev => ({ ...prev, [normalizedAnswer]: vote }));
    };

    const submitVotes = () => {
        // Eksik oy kontrolü
        const uniqueAnswersToVote = new Set();
        players.forEach(player => {
            const playerSubmissions = submissions[player.id] || {};
            Object.values(playerSubmissions).forEach(ans => {
                if (ans) { // Boş cevapları dahil etme
                    uniqueAnswersToVote.add(ans.trim().toLowerCase());
                }
            });
        });

        if (Object.keys(votes).length < uniqueAnswersToVote.size) {
            Alert.alert(
                "Eksik Oy!",
                "Lütfen tüm cevaplar için oy kullanın.",
                [{ text: "Tamam" }]
            );
            return;
        }

        if (isSubmitting) return; // Zaten gönderiliyorsa tekrar tetiklemeyi engelle

        setIsSubmitting(true); // Gönderme işlemi başladı
        // Düzeltildi: objeyi stringify yapıldı
        console.log("Oyları sunucuya gönderiliyor:", JSON.stringify({ roomCode, playerVotes: votes }, null, 2));
        socket.emit('submitVotes', { roomCode, playerVotes: votes });

        // Buton, isSubmitting state'i ile kontrol edilecek.
        // Navigasyon, aşağıda tanımlanan Socket.IO dinleyicileri tarafından yapılacak.
    };

    // --- Socket Olay Dinleyicileri ---
    useEffect(() => {
        // Tur bittiğinde skor ekranına yönlendir
        const onRoundOver = (results) => {
            // Düzeltildi: objeyi stringify yapıldı
            console.log("VotingScreen: Tur bitti, Score ekranına yönlendiriliyor.", JSON.stringify(results, null, 2));
            navigation.replace('Score', { results, roomCode });
        };

        // Yeni tur başladığında Game ekranına yönlendir (Oyun son turda bitmediyse)
        const onGameStarted = (data) => {
            // Düzeltildi: objeyi stringify yapıldı
            console.log("VotingScreen: Yeni tur başladı, Game ekranına yönlendiriliyor.", JSON.stringify(data, null, 2));
            navigation.replace('Game', {
                letter: data.letter,
                roomCode: roomCode,
                duration: data.duration,
                categories: data.categories,
                currentRound: data.currentRound,
                totalRounds: data.totalRounds
            });
        };

        // Oyun bittiğinde GameOver ekranına yönlendir (Oyun tüm turları tamamladıysa)
        const onGameOver = (finalResults) => {
            // Düzeltildi: objeyi stringify yapıldı
            console.log("VotingScreen: Oyun bitti, GameOver ekranına yönlendiriliyor.", JSON.stringify(finalResults, null, 2));
            navigation.replace('GameOver', { finalResults });
        };
        
        // Genel hata dinleyicisi
        const onError = (error) => {
            // Düzeltildi: error objesi yerine error.message kullanıldı
            console.error("VotingScreen'de Sunucu Hatası:", error.message || error);
            Alert.alert("Hata", error.message || "Bir hata oluştu.");
        };

        // Socket olaylarını dinlemeye başla
        socket.on('roundOver', onRoundOver);
        socket.on('gameStarted', onGameStarted);
        socket.on('gameOver', onGameOver);
        socket.on('error', onError);

        // Component unmount olduğunda veya effect tekrar çalıştığında dinleyicileri temizle
        return () => {
            socket.off('roundOver', onRoundOver);
            socket.off('gameStarted', onGameStarted);
            socket.off('gameOver', onGameOver);
            socket.off('error', onError);
        };
    }, [navigation, roomCode]); // `navigation` ve `roomCode` bağımlılık olarak eklendi

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Oylama Zamanı!</Text>
            {/* Tüm oyuncuların tüm cevaplarını listele */}
            {players.map(player => (
                <View key={player.id} style={styles.playerSection}>
                    <Text style={styles.username}>{player.username}'in Cevapları:</Text>
                    {Object.keys(submissions[player.id] || {}).map(category => {
                        const answer = submissions[player.id][category];
                        if (!answer) return null; // Boş cevapları gösterme

                        // Cevabı normalize et (küçük harf, kırpılmış)
                        const normalizedAnswer = answer.trim().toLowerCase();
                        const voteStatus = votes[normalizedAnswer]; // Normalize edilmiş cevabı kullan

                        return (
                            <View key={category + player.id} style={styles.answerRow}> {/* Key'i unique yapıldı */}
                                <Text style={styles.answerText}>{category}: {answer}</Text>
                                <View style={styles.voteButtons}>
                                    <TouchableOpacity
                                        style={[styles.button, voteStatus === 'approve' && styles.approveSelected]}
                                        onPress={() => handleVote(answer, 'approve')}
                                        disabled={isSubmitting} // Gönderme sırasında butonu devre dışı bırak
                                    >
                                        <Text style={styles.buttonText}>✅</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.button, voteStatus === 'reject' && styles.rejectSelected]}
                                        onPress={() => handleVote(answer, 'reject')}
                                        disabled={isSubmitting} // Gönderme sırasında butonu devre dışı bırak
                                    >
                                        <Text style={styles.buttonText}>❌</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    })}
                </View>
            ))}
            <Button
                title={isSubmitting ? "Oylar Gönderiliyor..." : "Oyları Gönder"}
                onPress={submitVotes}
                disabled={isSubmitting} // Gönderme sırasında butonu devre dışı bırak
                color={isSubmitting ? "#cccccc" : "#007bff"} // Renk değişimi
            />
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
        fontSize: 26,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
        color: '#333',
    },
    playerSection: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    username: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#007bff',
    },
    answerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    answerText: {
        flex: 1,
        fontSize: 18,
        color: 'black',
    },
    voteButtons: {
        flexDirection: 'row',
    },
    button: {
        padding: 8,
        borderRadius: 5,
        marginLeft: 10,
        backgroundColor: '#e0e0e0',
    },
    buttonText: {
        fontSize: 18,
    },
    approveSelected: {
        backgroundColor: '#28a745', // Yeşil
    },
    rejectSelected: {
        backgroundColor: '#dc3545', // Kırmızı
    },
});

export default VotingScreen;