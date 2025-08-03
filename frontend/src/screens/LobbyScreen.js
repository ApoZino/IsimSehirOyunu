import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, FlatList, Alert, ActivityIndicator } from 'react-native';
import { socket } from '../services/socket';

const LobbyScreen = ({ route, navigation }) => {
    const { roomCode, players: initialPlayers, username, refereeId: initialRefereeId } = route.params;

    const [players, setPlayers] = useState(initialPlayers);
    const [refereeId, setRefereeId] = useState(initialRefereeId);
    const [isLoading, setIsLoading] = useState(false);

    // Odanın kurucusu (host) bu client mı? (Oyunu başlatma yetkisi için)
    const isHost = players[0]?.id === socket.id;

    useEffect(() => {
        const onPlayerJoined = (updatedPlayers) => {
            console.log('LobbyScreen: Oyuncu katıldı, güncel oyuncular:', JSON.stringify(updatedPlayers, null, 2));
            setPlayers(updatedPlayers);
            // Hakem bilgisi güncellenebilir eğer dynamic hakem seçimi varsa.
            // Şu anki senaryoda hakem sabit (oda kurucusu) olduğu için değişmez.
        };

        const onPlayerLeft = (updatedPlayers) => {
            console.log('LobbyScreen: Oyuncu ayrıldı, güncel oyuncular:', JSON.stringify(updatedPlayers, null, 2));
            setPlayers(updatedPlayers);
            // Eğer hakem ayrılırsa, yeni hakem atanmalı veya oyun iptal edilmeli.
            // Mevcut server logic'te hakem ayrılırsa oyun bitiyor/ilerliyor.
            // Lobiye geri dönme mantığı eklenebilir eğer tüm oyuncular ayrılırsa.
            if (updatedPlayers.length === 0) {
                Alert.alert("Oda Boşaldı", "Tüm oyuncular ayrıldı, lobiye dönülüyor.");
                navigation.replace('Home');
            }
        };

        const onGameStarted = (data) => {
            console.log('LobbyScreen: Oyun başladı, Game ekranına yönlendiriliyor:', JSON.stringify(data, null, 2));
            setIsLoading(false);
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

        const onError = (error) => {
            console.error("LobbyScreen'de Sunucu Hatası:", error.message || error);
            Alert.alert("Hata", error.message || "Bir hata oluştu.");
            setIsLoading(false);
        };

        socket.on('playerJoined', onPlayerJoined);
        socket.on('playerLeft', onPlayerLeft);
        socket.on('gameStarted', onGameStarted);
        socket.on('error', onError);

        return () => {
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
        setIsLoading(true);
        console.log('LobbyScreen: Oyunu başlatma isteği gönderiliyor...');
        socket.emit('startGame', {
            roomCode,
            categories: ['isim', 'şehir', 'hayvan', 'bitki', 'eşya'], // Varsayılan kategoriler
            totalRounds: 5 // Varsayılan tur sayısı
        });
    };

    const renderPlayer = ({ item }) => (
        <View style={styles.playerItem}>
            <Text style={styles.playerText}>
                {item.username}
                {item.id === refereeId && <Text style={styles.refereeTag}> (Hakem 👑)</Text>} {/* Hakem etiketi */}
                {item.id === socket.id && <Text style={styles.youTag}> (Sen)</Text>}
            </Text>
        </View>
    );

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
                <Button
                    title="Oyunu Başlat"
                    onPress={handleStartGame}
                    disabled={isLoading}
                    color="#28a745"
                />
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
});

export default LobbyScreen;