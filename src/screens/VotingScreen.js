// VotingScreen.js
import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native'; // Alert'i ekleyelim
import { socket } from '../services/socket';

const VotingScreen = ({ route }) => {
    const { submissions, players, roomCode } = route.params;
    const [votes, setVotes] = useState({}); // { 'cevap1': 'approve', 'cevap2': 'reject' }
    const [isSubmitting, setIsSubmitting] = useState(false); // Gönderme sırasında butonu devre dışı bırakmak için

    const handleVote = (answer, vote) => {
        // Cevabı küçük harfe çevirme ve boşlukları kırpma, sunucuyla uyumlu olmalı
        const normalizedAnswer = answer.trim().toLowerCase();
        setVotes(prev => ({ ...prev, [normalizedAnswer]: vote }));
    };

    const submitVotes = () => {
        // Henüz tüm cevaplar için oy kullanılmadıysa uyarı verilebilir
        // Her oyuncunun her kategorisi için tekil cevapları listeleyip,
        // bu cevapların tamamının oylanıp oylanmadığını kontrol etmek daha sağlam olur.
        // Basitçe tüm gönderilen cevapların (unique) oylanmasını bekleyelim
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
        console.log("Oyları sunucuya gönderiliyor:", { roomCode, playerVotes: votes });
        socket.emit('submitVotes', { roomCode, playerVotes: votes });

        // Sunucudan yanıt beklemek veya doğrudan bir sonraki ekrana geçmek yerine,
        // sunucu "roundOver" olayını gönderdiğinde geçiş yapmalıyız.
        // Bu butonu artık devre dışı bırakmalıyız.
    };

    // Sunucudan 'roundOver' olayını dinleyelim (Bu genellikle oyun ekranında olur ama burada da dinlenebilir)
    // Ancak daha iyi bir mimari için, GameScreen'in 'roundOver'ı dinlemesi ve ScoreScreen'e yönlendirmesi daha iyidir.
    // Eğer burada dinleyecekseniz:
    /*
    useEffect(() => {
        const onRoundOver = (results) => {
            navigation.replace('Score', { results, roomCode });
        };
        socket.on('roundOver', onRoundOver);
        return () => {
            socket.off('roundOver', onRoundOver);
        };
    }, [navigation, roomCode]);
    */


    return (
        <ScrollView style={styles.container}>
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
                            <View key={category + player.id} style={styles.answerRow}> {/* Key'i unique yapalım */}
                                <Text style={styles.answerText}>{category}: {answer}</Text>
                                <View style={styles.voteButtons}>
                                    <TouchableOpacity
                                        style={[styles.button, voteStatus === 'approve' && styles.approveSelected]}
                                        onPress={() => handleVote(answer, 'approve')} // handleVote içine doğrudan answer'ı gönder
                                        disabled={isSubmitting} // Gönderme sırasında butonu devre dışı bırak
                                    >
                                        <Text style={styles.buttonText}>✅</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.button, voteStatus === 'reject' && styles.rejectSelected]}
                                        onPress={() => handleVote(answer, 'reject')} // handleVote içine doğrudan answer'ı gönder
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
    // Diğer stil tanımlamaları
});

export default VotingScreen;