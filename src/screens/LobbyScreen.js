import React, { useState, useEffect } from 'react';
// ScrollView buraya eklendi
import { View, Text, FlatList, StyleSheet, Button, TouchableOpacity, ScrollView } from 'react-native';
import { socket } from '../services/socket';

const ALL_CATEGORIES = ['İsim', 'Şehir', 'Hayvan', 'Bitki', 'Eşya', 'Ülke', 'Sanatçı', 'Marka', 'Film', 'Yemek', 'Meslek'];
const CLASSIC_CATEGORIES = ['İsim', 'Şehir', 'Hayvan', 'Bitki', 'Eşya'];
const ROUND_OPTIONS = [3, 5, 10];

const LobbyScreen = ({ route, navigation }) => {
    const { roomCode, players: initialPlayers, username } = route.params;
    const [players, setPlayers] = useState(initialPlayers);
    const [selectedCategories, setSelectedCategories] = useState(CLASSIC_CATEGORIES);
    const [totalRounds, setTotalRounds] = useState(5);

    const isHost = players.length > 0 && players[0].username === username;

    useEffect(() => {
        const onPlayerJoined = (updatedPlayers) => setPlayers(updatedPlayers);
        const onGameStarted = (gameData) => {
            navigation.replace('Game', { ...gameData, roomCode });
        };
        socket.on('playerJoined', onPlayerJoined);
        socket.on('gameStarted', onGameStarted);
        return () => {
            socket.off('playerJoined', onPlayerJoined);
            socket.off('gameStarted', onGameStarted);
        };
    }, [navigation, roomCode]);

    const toggleCategory = (category) => {
        if (!isHost) return;
        setSelectedCategories(prev => 
            prev.includes(category) 
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    const handleStartGame = () => {
        if (isHost) {
            socket.emit('startGame', { 
                roomCode, 
                categories: selectedCategories.map(c => c.toLowerCase()),
                totalRounds: totalRounds
            });
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.header}>Oda Kodu:</Text>
            <Text style={styles.roomCode}>{roomCode}</Text>
            <Text style={styles.playerHeader}>Oyuncular ({players.length})</Text>
            {/* FlatList bir ScrollView içinde olduğu için scroll özelliğini kapatıyoruz */}
            <FlatList
                data={players}
                keyExtractor={(item) => item.id}
                scrollEnabled={false} 
                renderItem={({ item }) => (
                  <View style={styles.playerRow}>
                    <Text style={styles.playerItem}>{item.username}</Text>
                    {players[0].id === item.id && <Text style={styles.hostLabel}>(Kurucu)</Text>}
                  </View>
                )}
            />

            {isHost && (
                <>
                    <View style={styles.categorySection}>
                        <Text style={styles.categoryHeader}>Kategorileri Seç:</Text>
                        <View style={styles.categoryGrid}>
                            {ALL_CATEGORIES.map(category => (
                                <TouchableOpacity
                                    key={category}
                                    style={[styles.chip, selectedCategories.includes(category) && styles.chipSelected]}
                                    onPress={() => toggleCategory(category)}
                                >
                                    <Text style={selectedCategories.includes(category) ? styles.chipTextSelected : styles.chipText}>
                                        {category}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                    <View style={styles.roundSection}>
                        <Text style={styles.categoryHeader}>Tur Sayısı:</Text>
                        <View style={styles.roundOptions}>
                            {ROUND_OPTIONS.map(rounds => (
                                <TouchableOpacity
                                    key={rounds}
                                    style={[styles.chip, totalRounds === rounds && styles.chipSelected]}
                                    onPress={() => setTotalRounds(rounds)}
                                >
                                    <Text style={totalRounds === rounds ? styles.chipTextSelected : styles.chipText}>{rounds} Tur</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </>
            )}

            {isHost && <Button title="Oyunu Başlat" onPress={handleStartGame} disabled={selectedCategories.length < 3} />}
            {!isHost && <Text style={styles.waitingText}>Kurucunun oyunu başlatması bekleniyor...</Text>}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    header: { fontSize: 18, color: 'grey', textAlign: 'center' },
    roomCode: { fontSize: 40, fontWeight: 'bold', textAlign: 'center', marginBottom: 15, color: '#007bff' },
    playerHeader: { fontSize: 22, marginBottom: 10 },
    playerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
    playerItem: { fontSize: 18 },
    hostLabel: { fontSize: 14, fontStyle: 'italic', color: 'green' },
    categorySection: { marginVertical: 15 },
    categoryHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    chip: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#e0e0e0', borderRadius: 16, margin: 4 },
    chipSelected: { backgroundColor: '#007bff' },
    chipText: { color: 'black' },
    chipTextSelected: { color: 'white' },
    roundSection: { marginBottom: 20 },
    roundOptions: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center' },
    waitingText: { padding: 20, textAlign: 'center', fontStyle: 'italic', color: 'grey' }
});

export default LobbyScreen;