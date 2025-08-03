import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, FlatList, Alert, ActivityIndicator, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { socket } from '../services/socket';

// Önerilen Kategoriler Listesi
const PREDEFINED_CATEGORIES = [
    'İsim', 'Şehir', 'Hayvan', 'Bitki', 'Eşya', // Klasik
    'Ülke', 'Sanatçı', 'Marka', 'Film/Dizi', 'Yemek', 'Meslek' // Ekstra
];

const LobbyScreen = ({ route, navigation }) => {
    const { roomCode, players: initialPlayers, username, refereeId: initialRefereeId } = route.params;

    const [players, setPlayers] = useState(initialPlayers);
    const [refereeId, setRefereeId] = useState(initialRefereeId);
    const [isLoading, setIsLoading] = useState(false); // Oyunu başlatma yükleme durumu

    // Başlangıçta klasik kategoriler seçili olsun
    const [selectedCategories, setSelectedCategories] = useState(['İsim', 'Şehir', 'Hayvan', 'Bitki', 'Eşya']);
    const [numRounds, setNumRounds] = useState('5'); // Tur sayısı, TextInput için string olarak

    // Odanın kurucusu (host) bu client mı? (Oyunu başlatma yetkisi için)
    const isHost = players[0]?.id === socket.id;

    useEffect(() => {
        console.log("LobbyScreen: useEffect çalıştı. Socket dinleyicileri kuruluyor.");
        console.log(`LobbyScreen: Socket ID: ${socket.id}, Bağlı mı: ${socket.connected}`);
        console.log(`LobbyScreen: route.params: ${JSON.stringify(route.params, null, 2)}`);


        const onPlayerJoined = (updatedPlayers) => {
            console.log('LobbyScreen: Oyuncu katıldı, güncel oyuncular:', JSON.stringify(updatedPlayers, null, 2));
            setPlayers(updatedPlayers);
        };

        const onPlayerLeft = (updatedPlayers) => {
            console.log('LobbyScreen: Oyuncu ayrıldı, güncel oyuncular:', JSON.stringify(updatedPlayers, null, 2));
            setPlayers(updatedPlayers);
            if (updatedPlayers.length === 0) {
                Alert.alert("Oda Boşaldı", "Tüm oyuncular ayrıldı, lobiye dönülüyor.");
                navigation.replace('Home');
            }
        };

        const onGameStarted = (data) => {
            console.log('LobbyScreen: >>> Received gameStarted event, preparing to navigate to GameScreen... <<<', JSON.stringify(data, null, 2));
            setIsLoading(false); // Yükleme animasyonunu durdur

            navigation.replace('Game', { 
                roomCode: roomCode, 
                initialGameData: data // GameScreen'e initial game state'i doğru adla gönderiliyor
            });
        };


        const onError = (error) => {
            console.error("LobbyScreen'de Sunucu Hatası:", error.message || error);
            Alert.alert("Hata", error.message || "Bir hata oluştu.");
            setIsLoading(false);
        };

        socket.on('playerJoined', onPlayerJoined);
        socket.on('playerLeft', onPlayerLeft);
        socket.on('gameStarted', onGameStarted); // 'gameStarted' olayını dinlemeye devam et
        socket.on('error', onError);

        // Temizlik fonksiyonu
        return () => {
            console.log("LobbyScreen: Socket dinleyicileri temizleniyor (cleanup).");
            socket.off('playerJoined', onPlayerJoined);
            socket.off('playerLeft', onPlayerLeft);
            socket.off('gameStarted', onGameStarted);
            socket.off('error', onError);
        };
    }, [navigation, roomCode]); 

    const handleStartGame = () => {
        if (players.length < 1) { // Min oyuncu sayısı kontrolü, 1 test için yeterli
            Alert.alert("Hata", "Oyunu başlatmak için en az 1 oyuncu olmalı.");
            return;
        }
        if (selectedCategories.length === 0) { // Seçili kategori yoksa
            Alert.alert("Hata", "Lütfen en az bir kategori seçin.");
            return;
        }
        const parsedRounds = parseInt(numRounds, 10);
        if (isNaN(parsedRounds) || parsedRounds <= 0) {
            Alert.alert("Hata", "Geçerli bir tur sayısı girin (örn: 5).");
            return;
        }

        setIsLoading(true);
        console.log('LobbyScreen: Oyunu başlatma isteği gönderiliyor...');
        socket.emit('startGame', {
            roomCode,
            categories: selectedCategories, // Seçili kategorileri kullan
            totalRounds: parsedRounds // Parse edilmiş tur sayısını kullan
        });
    };

    // Kategori seçme/kaldırma
    const toggleCategory = (category) => {
        if (selectedCategories.includes(category)) {
            setSelectedCategories(selectedCategories.filter(cat => cat !== category));
        } else {
            setSelectedCategories([...selectedCategories, category]);
        }
    };

    // --- renderPlayer fonksiyonu: Söz dizimi hatası giderildi ---
    const renderPlayer = ({ item }) => (
        <View style={styles.playerItem}>
            <Text style={styles.playerText}>
                {item.username}
                {item.id === refereeId && <Text style={styles.refereeTag}> (Hakem 👑)</Text>} {/* Hakem etiketi */}
                {item.id === socket.id && <Text style={styles.youTag}> (Sen)</Text>}
            </Text>
        </View>
    );

    // --- isLoading kontrolü: Söz dizimi hatası giderildi ---
    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007bff" />
                <Text style={styles.loadingText}>Oyun başlatılıyor...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.roomCodeText}>Oda Kodu: {roomCode}</Text>
            <Text style={styles.playerListHeader}>Oyuncular:</Text>
            <FlatList
                data={players}
                renderItem={renderPlayer} 
                keyExtractor={(item) => item.id}
                style={styles.playerList}
            />
            {isHost && (
                <ScrollView style={styles.hostControlsContainer}>
                    <Text style={styles.sectionHeader}>Oyun Ayarları:</Text>
                    
                    <Text style={styles.settingLabel}>Kategoriler:</Text>
                    <View style={styles.categoryButtonsContainer}>
                        {PREDEFINED_CATEGORIES.map(cat => (
                            <TouchableOpacity
                                key={cat}
                                style={[
                                    styles.categoryButton,
                                    selectedCategories.includes(cat) && styles.selectedCategoryButton
                                ]}
                                onPress={() => toggleCategory(cat)}
                            >
                                <Text style={[
                                    styles.categoryButtonText,
                                    selectedCategories.includes(cat) && styles.selectedCategoryButtonText
                                ]}>
                                    {cat}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    {selectedCategories.length > 0 && (
                        <Text style={styles.selectedCategoriesText}>
                            Seçilenler: {selectedCategories.join(', ')}
                        </Text>
                    )}

                    <Text style={styles.settingLabel}>Tur Sayısı:</Text>
                    <TextInput
                        style={styles.input}
                        value={numRounds}
                        onChangeText={setNumRounds}
                        keyboardType="numeric"
                        placeholder="Örn: 5"
                        placeholderTextColor="gray"
                    />

                    <Button
                        title="Oyunu Başlat"
                        onPress={handleStartGame}
                        disabled={isLoading}
                        color="#28a745"
                    />
                </ScrollView>
            )}
            {!isHost && (
                <Text style={styles.waitingHostText}>Oyunun başlaması için hakemi bekliyorsunuz...</Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f5f5',
        alignItems: 'center',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 18,
        color: '#333',
    },
    roomCodeText: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#007bff',
    },
    playerListHeader: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    playerList: {
        width: '100%',
        marginBottom: 20,
    },
    playerItem: {
        backgroundColor: 'white',
        padding: 10,
        borderRadius: 5,
        marginBottom: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
        elevation: 2,
    },
    playerText: {
        fontSize: 18,
        color: 'black',
    },
    refereeTag: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#ffc107', // Gold color for referee
        marginLeft: 5,
    },
    youTag: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#6c757d', // Gray for "You"
        marginLeft: 5,
    },
    waitingHostText: {
        fontSize: 16,
        color: '#666',
        marginTop: 20,
        textAlign: 'center',
    },
    hostControlsContainer: {
        width: '100%',
        paddingHorizontal: 10,
        marginBottom: 20,
        backgroundColor: 'white',
        borderRadius: 10,
        paddingVertical: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionHeader: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#333',
        textAlign: 'center',
    },
    settingLabel: {
        fontSize: 16,
        marginBottom: 5,
        color: 'black',
        fontWeight: '500',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        backgroundColor: '#f9f9f9',
        padding: 10,
        borderRadius: 5,
        fontSize: 16,
        marginBottom: 15,
        color: 'black',
    },
    categoryButtonsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 15,
    },
    categoryButton: {
        backgroundColor: '#e0e0e0',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        margin: 5,
    },
    selectedCategoryButton: {
        backgroundColor: '#007bff',
    },
    categoryButtonText: {
        color: 'black',
        fontSize: 14,
    },
    selectedCategoryButtonText: {
        color: 'white',
    },
    selectedCategoriesText: {
        fontSize: 14,
        color: '#555',
        marginBottom: 10,
        textAlign: 'center',
    },
});

export default LobbyScreen;