import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { socket } from '../services/socket';
import { useNavigation } from '@react-navigation/native';

const VotingScreen = ({ route }) => {
    const navigation = useNavigation();
    const { submissions, players, roomCode, refereeId } = route.params;
    const [votes, setVotes] = useState({});
    const [submitted, setSubmitted] = useState(false);

    const isCurrentUserReferee = socket.id === refereeId;

    useEffect(() => {
        const onRoundOver = (results) => {
            navigation.replace('Score', { finalResults: results, roomCode });
        };
        socket.on('roundOver', onRoundOver);
        return () => {
            socket.off('roundOver', onRoundOver);
        };
    }, [navigation, roomCode]);

    const handleVote = (playerId, category, answerText, vote) => {
        if (submitted) return;
        const submissionId = `${playerId}|${category.toLowerCase()}|${answerText.trim().toLowerCase()}`;
        setVotes(prev => ({ ...prev, [submissionId]: vote }));
    };

    const submitVotes = () => {
        if (!isCurrentUserReferee) return;
        setSubmitted(true);
        socket.emit('submitVotes', { roomCode, playerVotes: votes });
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.title}>Oylama Zamanı!</Text>

                {isCurrentUserReferee ? (
                    <Text style={styles.subtitle}>Siz hakemsiniz. Lütfen cevapları oylayın.</Text>
                ) : (
                    <Text style={styles.subtitle}>Hakemin oylama yapması bekleniyor...</Text>
                )}

                {players.map(player => {
                    const playerSubmissions = submissions[player.id] || {};
                    const hasAnswers = Object.values(playerSubmissions).some(ans => ans && ans.trim() !== '');

                    return (
                        <View key={player.id} style={styles.playerCard}>
                            <Text style={styles.username}>{player.username}'in Cevapları:</Text>
                            {!hasAnswers && <Text style={styles.noAnswerText}>Bu turda cevap girmedi.</Text>}

                            {Object.keys(playerSubmissions).map(category => {
                                const answer = playerSubmissions[category];
                                if (!answer) return null;
                                const submissionId = `${player.id}|${category.toLowerCase()}|${answer.trim().toLowerCase()}`;
                                const voteStatus = votes[submissionId];

                                return (
                                    <View key={submissionId} style={styles.answerRow}>
                                        <Text style={styles.answerText}>{`${category.charAt(0).toUpperCase() + category.slice(1)}: ${answer}`}</Text>
                                        {isCurrentUserReferee && (
                                            <View style={styles.voteButtons}>
                                                <TouchableOpacity 
                                                    style={[styles.button, voteStatus === 'approve' && styles.approveSelected]}
                                                    onPress={() => handleVote(player.id, category, answer, 'approve')}>
                                                    <Text>✅</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity 
                                                    style={[styles.button, voteStatus === 'reject' && styles.rejectSelected]}
                                                    onPress={() => handleVote(player.id, category, answer, 'reject')}>
                                                    <Text>❌</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    );
                })}
                {isCurrentUserReferee && (
                    <View style={styles.submitButtonContainer}>
                        <Button 
                            title={submitted ? "Sonuçlar Hesaplanıyor..." : "Oyları Gönder"} 
                            onPress={submitVotes} 
                            disabled={submitted} 
                        />
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};
// Stillendirme (Styling)
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#f0f0f0' },
    container: { padding: 20 },
    title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center' },
    subtitle: { fontSize: 16, textAlign: 'center', color: 'gray', marginBottom: 20, marginTop: 5 },
    playerCard: { backgroundColor: 'white', borderRadius: 10, padding: 15, marginBottom: 15, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: {width: 0, height: 2} },
    username: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, color: '#007bff', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 10 },
    noAnswerText: { fontStyle: 'italic', color: '#888', textAlign: 'center', paddingVertical: 10 },
    answerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
    answerText: { flex: 1, fontSize: 16, color: 'black' },
    voteButtons: { flexDirection: 'row' },
    button: { padding: 10, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginLeft: 10 },
    approveSelected: { backgroundColor: 'lightgreen', borderColor: 'green' },
    rejectSelected: { backgroundColor: 'lightcoral', borderColor: 'red' },
    submitButtonContainer: { marginVertical: 20, paddingHorizontal: 20 },
});

export default VotingScreen;