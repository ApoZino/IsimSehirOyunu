import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Button, TouchableOpacity, ScrollView, Alert, TextInput } from 'react-native';
import { socket } from '../services/socket';

const ALL_CATEGORIES = ['İsim', 'Şehir', 'Hayvan', 'Bitki', 'Eşya', 'Ülke', 'Sanatçı', 'Marka', 'Film/Dizi', 'Yemek', 'Meslek'];
const CLASSIC_CATEGORIES = ['İsim', 'Şehir', 'Hayvan', 'Bitki', 'Eşya'];

const LobbyScreen = ({ route, navigation }) => {
    const { roomCode, players: initialPlayers, username, refereeId: initialRefereeId } = route.params;
    
    const [players, setPlayers] = useState(initialPlayers);
    const [refereeId, setRefereeId] = useState(initialRefereeId);
    const [selectedCategories, setSelectedCategories] = useState(CLASSIC_CATEGORIES);
    // Tur sayısını artık metin olarak tutuyoruz (TextInput için)
    const [totalRounds, setTotalRounds] = useState('5');

    const isHost = socket.id === refereeId;

    useEffect(() => {
        // ... useEffect'in içeriği aynı kalıyor, değişiklik yok ...
    }, [navigation, roomCode]);

    const handleStartGame = () => {
        // Tur sayısını kontrol ederken metni sayıya çeviriyoruz
        const parsedRounds = parseInt(totalRounds, 10);
        if (isNaN(parsedRounds) || parsedRounds <= 0) {
            Alert.alert("Hata", "Lütfen geçerli bir tur sayısı girin (örn: 5).");
            return;
        }
        if (selectedCategories.length < 3) {
            Alert.alert("Hata", "Lütfen en az 3 kategori seçin.");
            return;
        }

        if (isHost) {
            socket.emit('startGame', { 
                roomCode, 
                categories: selectedCategories.map(c => c.toLowerCase()),
                totalRounds: parsedRounds // Sayıya çevrilmiş halini gönderiyoruz
            });
        }
    };

    const toggleCategory = (category) => {
        if (!isHost) return;
        setSelectedCategories(prev => 
            prev.includes(category) 
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    return (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
            <View style={styles.container}>
                <Text style={styles.header}>Oda Kodu:</Text>
                <Text style={styles.roomCode}>{roomCode}</Text>
                <Text style={styles.playerHeader}>Oyuncular ({players.length})</Text>
                <FlatList
                    data={players}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                    renderItem={({ item }) => (
                      <View style={styles.playerRow}>
                        <Text style={styles.playerItem}>{item.username}</Text>
                        {item.id === refereeId && <Text style={styles.hostLabel}>(Hakem)</Text>}
                      </View>
                    )}
                />

                <View style={styles.controlsContainer}>
                    {isHost && (
                        <>
                            <View style={styles.settingsSection}>
                                <Text style={styles.settingsHeader}>Kategorileri Seç:</Text>
                                <View style={styles.chipGrid}>
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

                            {/* --- DEĞİŞEN BÖLÜM BURASI --- */}
                            <View style={styles.settingsSection}>
                                <Text style={styles.settingsHeader}>Tur Sayısı:</Text>
                                <TextInput
                                    style={styles.input}
                                    value={totalRounds}
                                    onChangeText={setTotalRounds}
                                    keyboardType="numeric"
                                    placeholder="Örn: 5"
                                    placeholderTextColor="grey"
                                />
                            </View>
                            {/* --- DEĞİŞİKLİK SONU --- */}
                            
                            <Button title="Oyunu Başlat" onPress={handleStartGame} />
                        </>
                    )}
                    {!isHost && <Text style={styles.waitingText}>Hakemin oyunu başlatması bekleniyor...</Text>}
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    header: { fontSize: 18, color: 'grey', textAlign: 'center' },
    roomCode: { fontSize: 40, fontWeight: 'bold', textAlign: 'center', marginBottom: 15, color: '#007bff' },
    playerHeader: { fontSize: 22, marginBottom: 10, paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: '#eee' },
    playerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
    playerItem: { fontSize: 18 },
    hostLabel: { fontSize: 14, fontStyle: 'italic', color: 'green' },
    controlsContainer: { marginTop: 'auto', paddingTop: 20 },
    settingsSection: { marginBottom: 20 },
    settingsHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
    chip: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#e0e0e0', borderRadius: 16, margin: 4 },
    chipSelected: { backgroundColor: '#007bff' },
    chipText: { color: 'black' },
    chipTextSelected: { color: 'white' },
    input: { 
      borderWidth: 1, 
      borderColor: '#ccc', 
      padding: 10, 
      borderRadius: 5,
      color: 'black',
      textAlign: 'center',
      fontSize: 18
    },
    waitingText: { padding: 20, textAlign: 'center', fontStyle: 'italic', color: 'grey' }
});

export default LobbyScreen;