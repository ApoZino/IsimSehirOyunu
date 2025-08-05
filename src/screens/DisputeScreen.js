import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { socket } from '../services/socket';

const DisputeScreen = ({ route, navigation }) => {
    const { submissions, players, roomCode } = route.params;
    const [disputedAnswers, setDisputedAnswers] = useState({}); // itiraz edilen cevapları tutar

    useEffect(() => {
        // Başka bir oyuncu bir cevaba itiraz ettiğinde arayüzü güncelle
        const onAnswerDisputed = (submissionId) => {
            setDisputedAnswers(prev => ({ ...prev, [submissionId]: true }));
        };
        // Oylama aşaması başladığında VotingScreen'e git
        const onVotingStarted = (data) => {
            navigation.replace('Voting', { ...data, roomCode });
        };
        // Tur bittiğinde (hiç itiraz yoksa) ScoreScreen'e git
        const onRoundOver = (results) => {
            navigation.replace('Score', { results, roomCode });
        };

        socket.on('answerDisputed', onAnswerDisputed);
        socket.on('votingStarted', onVotingStarted);
        socket.on('roundOver', onRoundOver);

        return () => {
            socket.off('answerDisputed', onAnswerDisputed);
            socket.off('votingStarted', onVotingStarted);
            socket.off('roundOver', onRoundOver);
        };
    }, [navigation, roomCode]);

    const handleDispute = (playerId, category, answer) => {
        const submissionId = `${playerId}|${category.toLowerCase()}|${answer.trim().toLowerCase()}`;
        if (disputedAnswers[submissionId]) return; // Zaten itiraz edilmiş
        setDisputedAnswers(prev => ({ ...prev, [submissionId]: true }));
        socket.emit('submitDispute', { roomCode, submissionId });
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>İtiraz Aşaması (30s)</Text>
            <Text style={styles.subtitle}>Şüpheli bulduğun cevaplara itiraz et!</Text>
            {players.map(player => (
                <View key={player.id} style={styles.playerSection}>
                    <Text style={styles.username}>{player.username}'in Cevapları:</Text>
                    {Object.keys(submissions[player.id] || {}).map(category => {
                        const answer = submissions[player.id][category];
                        if (!answer) return null;
                        const submissionId = `${player.id}|${category.toLowerCase()}|${answer.trim().toLowerCase()}`;
                        const isDisputed = disputedAnswers[submissionId];

                        // Kendi cevabına itiraz edemezsin
                        const canDispute = player.id !== socket.id;

                        return (
                            <View key={category} style={styles.answerRow}>
                                <Text style={styles.answerText}>{`${category}: ${answer}`}</Text>
                                {canDispute && (
                                    <TouchableOpacity 
                                        style={[styles.disputeButton, isDisputed && styles.disputedButton]}
                                        onPress={() => handleDispute(player.id, category, answer)}
                                        disabled={isDisputed}
                                    >
                                        <Text style={styles.buttonText}>{isDisputed ? 'İtiraz Edildi' : 'İtiraz Et 🚩'}</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        );
                    })}
                </View>
            ))}
        </ScrollView>
    );
};
// Bu ekran için stilleri eklemeniz gerekecek.
const styles = StyleSheet.create({ /* ... */ });
export default DisputeScreen;