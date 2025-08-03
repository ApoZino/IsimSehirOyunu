import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { socket } from '../services/socket';
import { useNavigation } from '@react-navigation/native';

const VotingScreen = ({ route }) => {
    const navigation = useNavigation();
    // refereeId'yi route.params'tan alıyoruz
    const { submissions, players, roomCode, refereeId } = route.params;

    const [votes, setVotes] = useState({}); // { 'normalizedAnswer': 'approve' | 'reject' }
    const [isSubmitting, setIsSubmitting] = useState(false); // Gönderme sırasında butonu devre dışı bırakmak için

    // Mevcut kullanıcının hakem olup olmadığını kontrol et
    const isCurrentUserReferee = socket.id === refereeId;

    // --- Helper function to handle vote selection ---
    const handleVote = (answer, vote) => {
        const normalizedAnswer = answer.trim().toLowerCase();
        setVotes(prev => ({ ...prev, [normalizedAnswer]: vote }));
    };

    // --- Function to submit votes ---
    const submitVotes = () => {
        // Hakem değilse oy gönderme izni verme (Client tarafı UI kontrolü)
        if (!isCurrentUserReferee) {
            Alert.alert("Hata", "Sadece hakem oy kullanabilir.");
            return;
        }

        // Tüm benzersiz cevaplar için oy kullanılıp kullanılmadığını kontrol et
        const uniqueAnswersToVote = new Set();
        players.forEach(player => {
            const playerSubmissions = submissions[player.id] || {};
            Object.values(playerSubmissions).forEach(ans => {
                if (ans && ans.trim() !== '') { // Sadece boş olmayan cevapları dahil et
                    uniqueAnswersToVote.add(ans.trim().toLowerCase());
                }
            });
        });

        // Eğer oylanmamış cevap varsa uyarı göster
        if (Object.keys(votes).length < uniqueAnswersToVote.size) {
            Alert.alert(
                "Eksik Oy!",
                "Lütfen tüm geçerli cevaplar için oy kullanın.",
                [{ text: "Tamam" }]
            );
            return;
        }

        if (isSubmitting) return; // Zaten gönderiliyorsa tekrar tetiklemeyi engelle

        setIsSubmitting(true); // Gönderme işlemi başladı
        console.log("VotingScreen: Oyları sunucuya gönderiliyor:", JSON.stringify({ roomCode, playerVotes: votes }, null, 2));
        socket.emit('submitVotes', { roomCode, playerVotes: votes });

        // Navigasyon sunucudan gelecek 'roundOver' veya 'gameOver' olayları ile yapılacak
    };

    // --- Socket Olay Dinleyicileri (Oyun durumu geçişleri için) ---
    useEffect(() => {
        // Ekran yüklendiğinde isSubmitting'i sıfırla
        // Bu, önceki ekranlardan hızlı geçişlerde isSubmitting'in takılı kalmamasını sağlar.
        setIsSubmitting(false);

        // Debug logları:
        console.log("VotingScreen: Yüklendi ve dinleyiciler ayarlandı.");
        console.log("VotingScreen: Mevcut Socket ID:", socket.id);
        console.log("VotingScreen: Hakem ID (route.params.refereeId):", refereeId);
        console.log("VotingScreen: Mevcut kullanıcı hakem mi (isCurrentUserReferee):", isCurrentUserReferee);


        const onRoundOver = (results) => {
            console.log("VotingScreen: Tur bitti, Score ekranına yönlendiriliyor.", JSON.stringify(results, null, 2));
            setIsSubmitting(false); // Gönderme durumunu sıfırla
            navigation.replace('Score', { results, roomCode });
        };

        const onGameStarted = (data) => {
            console.log("VotingScreen: Yeni tur başladı, Game ekranına yönlendiriliyor.", JSON.stringify(data, null, 2));
            setIsSubmitting(false); // Gönderme durumunu sıfırla
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

        const onGameOver = (finalResults) => {
            console.log("VotingScreen: Oyun bitti, GameOver ekranına yönlendiriliyor.", JSON.stringify(finalResults, null, 2));
            setIsSubmitting(false); // Gönderme durumunu sıfırla
            navigation.replace('GameOver', { finalResults });
        };
        
        const onError = (error) => {
            console.error("VotingScreen'de Sunucu Hatası:", error.message || error);
            Alert.alert("Hata", error.message || "Bir hata oluştu.");
            setIsSubmitting(false); // Hata durumunda gönderme durumunu sıfırla
        };

        // Socket olaylarını dinlemeye başla
        socket.on('roundOver', onRoundOver);
        socket.on('gameStarted', onGameStarted);
        socket.on('gameOver', onGameOver);
        socket.on('error', onError);

        // Component unmount olduğunda veya effect tekrar çalıştığında dinleyicileri temizle
        return () => {
            console.log("VotingScreen: Dinleyiciler temizleniyor.");
            socket.off('roundOver', onRoundOver);
            socket.off('gameStarted', onGameStarted);
            socket.off('gameOver', onGameOver);
            socket.off('error', onError);
        };
    }, [navigation, roomCode, refereeId, isCurrentUserReferee]); // `isCurrentUserReferee` de bağımlılıklara eklendi

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Oylama Zamanı!</Text>

            {/* Gönderme sırasında yükleme göstergesi */}
            {isSubmitting && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#007bff" />
                    <Text style={styles.loadingText}>Oylar gönderiliyor...</Text>
                </View>
            )}

            {isCurrentUserReferee ? (
                // HAKEMİN ARAYÜZÜ: Oy kullanma butonları görünür
                <>
                    <Text style={styles.infoText}>Siz hakemsiniz. Cevapları oylayın.</Text>
                    {players.map(player => (
                        <View key={player.id} style={styles.playerSection}>
                            <Text style={styles.username}>{player.username}'in Cevapları:</Text>
                            {/* Yalnızca boş olmayan cevapları oylama için göster */}
                            {Object.keys(submissions[player.id] || {})
                                .filter(category => submissions[player.id][category] && submissions[player.id][category].trim() !== '')
                                .map(category => {
                                    const answer = submissions[player.id][category];
                                    const normalizedAnswer = answer.trim().toLowerCase();
                                    const voteStatus = votes[normalizedAnswer];

                                    return (
                                        <View key={category + player.id} style={styles.answerRow}>
                                            <Text style={styles.answerText}>{category.charAt(0).toUpperCase() + category.slice(1)}: {answer}</Text>
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
                            {(!submissions[player.id] || Object.keys(submissions[player.id]).filter(cat => submissions[player.id][cat] && submissions[player.id][cat].trim() !== '').length === 0) &&
                                <Text style={styles.noAnswerGivenText}>{player.username} bu turda cevap girmedi.</Text>
                            }
                        </View>
                    ))}
                    <Button
                        title={isSubmitting ? "Oylar Gönderiliyor..." : "Oyları Gönder"}
                        onPress={submitVotes}
                        disabled={isSubmitting}
                        color={isSubmitting ? "#cccccc" : "#007bff"}
                    />
                </>
            ) : (
                // DİĞER OYUNCULARIN ARAYÜZÜ: Cevapları gösterir ama oy butonları yoktur
                <View style={styles.observerSection}>
                    <Text style={styles.infoText}>Hakem oylama yapıyor. Lütfen bekleyiniz...</Text>
                    {players.map(player => (
                        <View key={player.id} style={styles.playerSection}>
                            <Text style={styles.username}>{player.username}'in Cevapları:</Text>
                            {/* Yalnızca boş olmayan cevapları göster */}
                            {Object.keys(submissions[player.id] || {})
                                .filter(category => submissions[player.id][category] && submissions[player.id][category].trim() !== '')
                                .map(category => {
                                    const answer = submissions[player.id][category];
                                    return (
                                        <View key={category + player.id} style={styles.answerRow}>
                                            <Text style={styles.answerText}>{category.charAt(0).toUpperCase() + category.slice(1)}: {answer}</Text>
                                            {/* Oy butonları burada yok */}
                                        </View>
                                    );
                                })}
                            {(!submissions[player.id] || Object.keys(submissions[player.id]).filter(cat => submissions[player.id][cat] && submissions[player.id][cat].trim() !== '').length === 0) &&
                                <Text style={styles.noAnswerGivenText}>{player.username} bu turda cevap girmedi.</Text>
                            }
                        </View>
                    ))}
                </View>
            )}
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
    infoText: {
        fontSize: 18,
        textAlign: 'center',
        marginVertical: 20,
        color: '#555',
        fontWeight: 'bold',
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
    observerSection: {
        // Observer görünümü için ek stil
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10, // Üstte olmasını sağlar
    },
    loadingText: {
        marginTop: 10,
        fontSize: 18,
        color: '#333',
    },
    noAnswerGivenText: {
        fontSize: 14,
        color: '#888',
        marginTop: 5,
        fontStyle: 'italic',
    }
});

export default VotingScreen;