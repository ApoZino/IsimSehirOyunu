import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { socket } from '../services/socket';
import { useNavigation } from '@react-navigation/native';

const DisputeScreen = ({ route }) => {
    const navigation = useNavigation();
    const { submissions, players, roomCode, refereeId } = route.params;
    const [disputedAnswers, setDisputedAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(30); // İtiraz süresi için sayaç

    useEffect(() => {
        // Geri sayım sayacı
        if (timeLeft > 0) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [timeLeft]);

    useEffect(() => {
        const onAnswerDisputed = (submissionId) => {
            setDisputedAnswers(prev => ({ ...prev, [submissionId]: true }));
        };
        const onVotingStarted = (data) => {
            navigation.replace('Voting', { ...data, roomCode, refereeId });
        };
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
    }, [navigation, roomCode, refereeId]);

    const handleDispute = (playerId, category, answer) => {
        const submissionId = `${playerId}|${category.toLowerCase()}|${answer.trim().toLowerCase()}`;
        if (disputedAnswers[submissionId]) return;
        setDisputedAnswers(prev => ({ ...prev, [submissionId]: true }));
        socket.emit('submitDispute', { roomCode, submissionId });
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.title}>İtiraz Aşaması</Text>
                <Text style={styles.timer}>Kalan Süre: {timeLeft}s</Text>
                
                {players.map(player => {
                    // Oyuncunun kendi cevaplarına itiraz etmesini engelle
                    const canDispute = player.id !== socket.id;
                    const playerSubmissions = submissions[player.id] || {};
                    const hasAnswers = Object.values(playerSubmissions).some(ans => ans && ans.trim() !== '');

                    return (
                        <View key={player.id} style={styles.playerCard}>
                            <Text style={styles.username}>{player.username}</Text>
                            
                            {!hasAnswers && <Text style={styles.noAnswerText}>Bu turda cevap girmedi.</Text>}

                            {Object.keys(playerSubmissions).map(category => {
                                const answer = playerSubmissions[category];
                                if (!answer) return null;

                                const submissionId = `${player.id}|${category.toLowerCase()}|${answer.trim().toLowerCase()}`;
                                const isDisputed = disputedAnswers[submissionId];

                                return (
                                    <View key={category} style={styles.answerRow}>
                                        <View style={styles.answerTextContainer}>
                                            <Text style={styles.categoryText}>{category.charAt(0).toUpperCase() + category.slice(1)}:</Text>
                                            <Text style={styles.answerText}>{answer}</Text>
                                        </View>
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
                    );
                })}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f0f0f0',
    },
    container: {
        padding: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        color: 'black',
    },
    timer: {
        fontSize: 18,
        textAlign: 'center',
        color: 'red',
        marginBottom: 20,
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
    },
    username: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#007bff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 10,
    },
    noAnswerText: {
        fontStyle: 'italic',
        color: '#888',
        textAlign: 'center',
        paddingVertical: 10,
    },
    answerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    answerTextContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    categoryText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'black',
        marginRight: 5,
    },
    answerText: {
        fontSize: 16,
        color: '#333',
    },
    disputeButton: {
        backgroundColor: '#f8f9fa',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#ced4da',
    },
    disputedButton: {
        backgroundColor: '#ffeeba',
        borderColor: '#ffc107',
    },
    buttonText: {
        fontSize: 14,
        color: 'black',
    }
});

export default DisputeScreen;