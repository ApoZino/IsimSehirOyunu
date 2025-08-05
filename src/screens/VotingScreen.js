import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { socket } from '../services/socket';
import { useNavigation } from '@react-navigation/native';

const VotingScreen = ({ route }) => {
    const navigation = useNavigation();
    const { submissions, players, roomCode, refereeId } = route.params;

    // votes state'inin yapısı değişiyor: { 'playerId|category|normalizedAnswer': 'approve' | 'reject' }
    const [votes, setVotes] = useState({}); 
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isCurrentUserReferee = socket.id === refereeId;

    // Her cevabın benzersiz bir kimliği için helper fonksiyon
    const getSubmissionId = (playerId, category, answerText) => {
        return `${playerId}|${category.toLowerCase()}|${answerText.trim().toLowerCase()}`;
    };

    // --- Oylama seçimi için helper fonksiyon ---
    const handleVote = (playerId, category, answerText, vote) => {
        const submissionId = getSubmissionId(playerId, category, answerText);
        setVotes(prev => ({ ...prev, [submissionId]: vote }));
    };

    // --- Oyları sunucuya gönderme fonksiyonu ---
    const submitVotes = () => {
        if (!isCurrentUserReferee) {
            Alert.alert("Hata", "Sadece hakem oy kullanabilir.");
            return;
        }

        // Referee'nin oylaması gereken tüm cevapların listesi (her oyuncu/kategori için benzersiz)
        const allSubmissionIdsToVote = new Set();
        players.forEach(player => {
            const playerSubmissions = submissions[player.id] || {};
            Object.keys(playerSubmissions).forEach(category => {
                const answerText = playerSubmissions[category];
                if (answerText && answerText.trim() !== '') {
                    allSubmissionIdsToVote.add(getSubmissionId(player.id, category, answerText));
                }
            });
        });

        // Tüm cevapların oylanıp oylanmadığını kontrol et
        if (Object.keys(votes).length < allSubmissionIdsToVote.size) {
            Alert.alert(
                "Eksik Oy!",
                "Lütfen tüm geçerli cevaplar için oy kullanın.",
                [{ text: "Tamam" }]
            );
            return;
        }

        if (isSubmitting) return;

        setIsSubmitting(true); 
        console.log("VotingScreen: Oyları sunucuya gönderiliyor:", JSON.stringify({ roomCode, playerVotes: votes }, null, 2));
        // Server'a gönderilen 'playerVotes' objesi artık benzersiz submission ID'leri içerecek
        socket.emit('submitVotes', { roomCode, playerVotes: votes });

        // Navigasyon sunucudan gelecek 'roundOver' veya 'gameOver' olayları ile yapılacak
    };

    // --- Socket Olay Dinleyicileri (Aynı kalacak) ---
    useEffect(() => {
        setIsSubmitting(false);
        console.log("VotingScreen: Yüklendi ve dinleyiciler ayarlandı.");
        console.log("VotingScreen: Mevcut Socket ID:", socket.id);
        console.log("VotingScreen: Hakem ID (route.params.refereeId):", refereeId);
        console.log("VotingScreen: Mevcut kullanıcı hakem mi (isCurrentUserReferee):", isCurrentUserReferee);

        const onRoundOver = (results) => { /* ... */ };
        const onGameStarted = (data) => { /* ... */ };
        const onGameOver = (finalResults) => { /* ... */ };
        const onError = (error) => { /* ... */ };

        socket.on('roundOver', onRoundOver);
        socket.on('gameStarted', onGameStarted);
        socket.on('gameOver', onGameOver);
        socket.on('error', onError);

        return () => {
            console.log("VotingScreen: Dinleyiciler temizleniyor.");
            socket.off('roundOver', onRoundOver);
            socket.off('gameStarted', onGameStarted);
            socket.off('gameOver', onGameOver);
            socket.off('error', onError);
        };
    }, [navigation, roomCode, refereeId, isCurrentUserReferee]); 

    // --- Component Render ---
    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Oylama Zamanı!</Text>

            {isSubmitting && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#007bff" />
                    <Text style={styles.loadingText}>Oylar gönderiliyor...</Text>
                </View>
            )}

            {isCurrentUserReferee ? (
                // HAKEMİN ARAYÜZÜ: Oy kullanma butonları görünür
                <>
                    <Text style={styles.infoText}>Siz hakemsiniz. Cevapları ayrı ayrı oylayın.</Text> {/* Metin güncellendi */}
                    {players.map(player => (
                        <View key={player.id} style={styles.playerSection}>
                            <Text style={styles.username}>{player.username}'in Cevapları:</Text>
                            {Object.keys(submissions[player.id] || {})
                                .filter(category => submissions[player.id][category] && submissions[player.id][category].trim() !== '')
                                .map(category => {
                                    const answer = submissions[player.id][category];
                                    const submissionId = getSubmissionId(player.id, category, answer); // Benzersiz ID
                                    const voteStatus = votes[submissionId]; // Benzersiz ID'ye göre durum al

                                    return (
                                        <View key={submissionId} style={styles.answerRow}> {/* Key de benzersiz ID olacak */}
                                            <Text style={styles.answerText}>{category.charAt(0).toUpperCase() + category.slice(1)}: {answer}</Text>
                                            <View style={styles.voteButtons}>
                                                <TouchableOpacity
                                                    style={[
                                                        styles.button, 
                                                        voteStatus === 'approve' && styles.approveSelected,
                                                        voteStatus === undefined && styles.defaultButton
                                                    ]}
                                                    onPress={() => handleVote(player.id, category, answer, 'approve')} // ID'leri geçir
                                                    disabled={isSubmitting} 
                                                >
                                                    <Text style={styles.buttonText}>✅</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[
                                                        styles.button, 
                                                        voteStatus === 'reject' && styles.rejectSelected,
                                                        voteStatus === undefined && styles.defaultButton
                                                    ]}
                                                    onPress={() => handleVote(player.id, category, answer, 'reject')} // ID'leri geçir
                                                    disabled={isSubmitting} 
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
                // DİĞER OYUNCULARIN ARAYÜZÜ (Aynı kalacak)
                <View style={styles.observerSection}>
                    <Text style={styles.infoText}>Hakem oylama yapıyor. Lütfen bekleyiniz...</Text>
                    {players.map(player => (
                        <View key={player.id} style={styles.playerSection}>
                            <Text style={styles.username}>{player.username}'in Cevapları:</Text>
                            {Object.keys(submissions[player.id] || {})
                                .filter(category => submissions[player.id][category] && submissions[player.id][category].trim() !== '')
                                .map(category => {
                                    const answer = submissions[player.id][category];
                                    return (
                                        <View key={category + player.id} style={styles.answerRow}>
                                            <Text style={styles.answerText}>{category.charAt(0).toUpperCase() + category.slice(1)}: {answer}</Text>
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
        backgroundColor: '#e0e0e0', // Varsayılan arka plan
    },
    defaultButton: {
        backgroundColor: '#e0e0e0', // Seçilmediyse varsayılan arka plan
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