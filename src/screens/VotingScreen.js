import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { socket } from '../services/socket';

const VotingScreen = ({ route }) => {
    const { submissions, players, roomCode } = route.params;
    const [votes, setVotes] = useState({}); // { 'kedi': 'approve', 'aslan': 'reject' }

    const handleVote = (answer, vote) => {
        setVotes(prev => ({ ...prev, [answer]: vote }));
    };

    const submitVotes = () => {
        socket.emit('submitVotes', { roomCode, playerVotes: votes });
        // Butonu pasif yap veya "Oylandı" de...
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Oylama Zamanı!</Text>
            {/* Tüm oyuncuların tüm cevaplarını listele */}
            {players.map(player => (
                <View key={player.id} style={styles.playerSection}>
                    <Text style={styles.username}>{player.username}'in Cevapları:</Text>
                    {Object.keys(submissions[player.id] || {}).map(category => {
                        const answer = submissions[player.id][category];
                        if (!answer) return null;
                        const voteStatus = votes[answer.toLowerCase()];
                        return (
                            <View key={category} style={styles.answerRow}>
                                <Text style={styles.answerText}>{category}: {answer}</Text>
                                <View style={styles.voteButtons}>
                                    <TouchableOpacity 
                                        style={[styles.button, voteStatus === 'approve' && styles.approveSelected]}
                                        onPress={() => handleVote(answer.toLowerCase(), 'approve')}>
                                        <Text style={styles.buttonText}>✅</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.button, voteStatus === 'reject' && styles.rejectSelected]}
                                        onPress={() => handleVote(answer.toLowerCase(), 'reject')}>
                                        <Text style={styles.buttonText}>❌</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    })}
                </View>
            ))}
            <Button title="Oyları Gönder" onPress={submitVotes} />
        </ScrollView>
    );
};
// Bu ekran için stilleri eklemeniz gerekecek.
const styles = StyleSheet.create({ /* ... */ });
export default VotingScreen;