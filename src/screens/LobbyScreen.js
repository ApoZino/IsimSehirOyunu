import React, { useState, useEffect, useRef } from 'react';
import { 
    View, 
    Text, 
    FlatList, 
    StyleSheet, 
    Button, 
    TouchableOpacity, 
    ScrollView, 
    Alert, 
    TextInput, 
    KeyboardAvoidingView, 
    Platform, 
    Modal, 
    SafeAreaView 
} from 'react-native';
import { socket } from '../services/socket';
import { playSound } from '../services/soundService'; // Ses servisini import et

const ALL_CATEGORIES = ['İsim', 'Şehir', 'Hayvan', 'Bitki', 'Eşya', 'Ülke', 'Sanatçı', 'Marka', 'Film/Dizi', 'Yemek', 'Meslek'];
const CLASSIC_CATEGORIES = ['İsim', 'Şehir', 'Hayvan', 'Bitki', 'Eşya'];

const LobbyScreen = ({ route, navigation }) => {
    const { roomCode, players: initialPlayers, username, refereeId: initialRefereeId } = route.params;
    
    const [players, setPlayers] = useState(initialPlayers);
    const [refereeId, setRefereeId] = useState(initialRefereeId);
    const [selectedCategories, setSelectedCategories] = useState(CLASSIC_CATEGORIES);
    const [totalRounds, setTotalRounds] = useState('5');
    
    const [isChatVisible, setIsChatVisible] = useState(false);
    const [hasNewMessage, setHasNewMessage] = useState(false);
    const [messages, setMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const chatListRef = useRef(null);

    const isHost = socket.id === refereeId;

    useEffect(() => {
        const onPlayerJoined = (updatedPlayers) => {
            // Sadece yeni bir oyuncu katıldığında ses çal (mevcut oyuncu sayısından fazlaysa)
            if (updatedPlayers.length > players.length) {
                playSound('player_joined.mp3'); // Dosya adının doğru olduğundan emin ol
            }
            setPlayers(updatedPlayers);
        };
        
        const onPlayerLeft = (updatedPlayers) => {
            setPlayers(updatedPlayers);
            if (updatedPlayers.length === 0) {
                Alert.alert("Oda Boşaldı", "Tüm oyuncular ayrıldı, ana menüye dönülüyor.");
                navigation.replace('Home');
            }
        };
        
        const onNewReferee = ({ newRefereeId, updatedPlayers }) => {
            setRefereeId(newRefereeId);
            setPlayers(updatedPlayers);
            if (socket.id === newRefereeId) Alert.alert("Yeni Rol", "Odanın yeni hakemi siz oldunuz!");
        };
        
        const onGameStarted = (gameData) => {
            navigation.replace('Game', { initialGameData: gameData, roomCode });
        };

        const onNewMessage = (newMessage) => {
            setMessages(prevMessages => [...prevMessages, newMessage]);
            if (!isChatVisible) {
                setHasNewMessage(true);
            }
        };
        
        socket.on('playerJoined', onPlayerJoined);
        socket.on('playerLeft', onPlayerLeft);
        socket.on('newRefereeAssigned', onNewReferee);
        socket.on('gameStarted', onGameStarted);
        socket.on('newMessage', onNewMessage);

        return () => {
            socket.off('playerJoined', onPlayerJoined);
            socket.off('playerLeft', onPlayerLeft);
            socket.off('newRefereeAssigned', onNewReferee);
            socket.off('gameStarted', onGameStarted);
            socket.off('newMessage', onNewMessage);
        };
    }, [isChatVisible, navigation, roomCode, players]); // `players`'ı bağımlılıklara ekledik

    const handleSendMessage = () => {
        if (chatInput.trim()) {
            socket.emit('sendMessage', { roomCode, message: chatInput });
            setChatInput('');
        }
    };
    
    const openChat = () => {
        setIsChatVisible(true);
        setHasNewMessage(false);
    };

    const handleStartGame = () => {
        const parsedRounds = parseInt(totalRounds, 10);
        if (isNaN(parsedRounds) || parsedRounds <= 0) {
            return Alert.alert("Hata", "Lütfen geçerli bir tur sayısı girin (örn: 5).");
        }
        if (selectedCategories.length < 3) {
            return Alert.alert("Hata", "Lütfen en az 3 kategori seçin.");
        }
        if (isHost) {
            socket.emit('startGame', { 
                roomCode, 
                categories: selectedCategories.map(c => c.toLowerCase()),
                totalRounds: parsedRounds
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
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.topSection}>
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
                </View>

                {isHost && (
                    <View style={styles.controlsContainer}>
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
                        <View style={styles.settingsSection}>
                            <Text style={styles.settingsHeader}>Tur Sayısı:</Text>
                            <TextInput
                                style={styles.input}
                                value={String(totalRounds)}
                                onChangeText={setTotalRounds}
                                keyboardType="numeric"
                            />
                        </View>
                        <Button title="Oyunu Başlat" onPress={handleStartGame} />
                    </View>
                )}
                {!isHost && <Text style={styles.waitingText}>Hakemin oyunu başlatması bekleniyor...</Text>}
            </ScrollView>

            <TouchableOpacity style={styles.chatButton} onPress={openChat}>
                <Text style={styles.chatButtonText}>💬</Text>
                {hasNewMessage && <View style={styles.notificationDot} />}
            </TouchableOpacity>

            <Modal
                animationType="slide"
                transparent={true}
                visible={isChatVisible}
                onRequestClose={() => setIsChatVisible(false)}
            >
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.chatHeader}>Sohbet</Text>
                        <FlatList
                            ref={chatListRef}
                            data={messages}
                            keyExtractor={(item, index) => `${item.timestamp}-${index}`}
                            renderItem={({ item }) => (
                                <View style={[styles.messageBubble, item.senderUsername === username ? styles.myMessage : styles.theirMessage]}>
                                    <Text style={[styles.messageSender, item.senderUsername === username ? {color: '#d1e7ff'} : {color: '#555'}]}>{item.senderUsername}</Text>
                                    <Text style={[styles.messageText, item.senderUsername === username ? styles.myMessageText : styles.theirMessageText]}>{item.text}</Text>
                                </View>
                            )}
                            onContentSizeChange={() => chatListRef.current?.scrollToEnd({ animated: true })}
                            style={styles.messageList}
                        />
                        <View style={styles.chatInputContainer}>
                            <TextInput
                                style={styles.chatInput}
                                value={chatInput}
                                onChangeText={setChatInput}
                                placeholder="Mesaj yaz..."
                                onSubmitEditing={handleSendMessage}
                            />
                            <Button title="Gönder" onPress={handleSendMessage} />
                        </View>
                        <View style={{marginTop: 10}}>
                           <Button title="Kapat" onPress={() => setIsChatVisible(false)} color="red" />
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#f0f0f0' },
    container: { padding: 20, flexGrow: 1 },
    topSection: { marginBottom: 15 },
    header: { fontSize: 18, color: 'grey', textAlign: 'center' },
    roomCode: { fontSize: 40, fontWeight: 'bold', textAlign: 'center', marginBottom: 15, color: '#007bff' },
    playerHeader: { fontSize: 22, marginBottom: 10 },
    playerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
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
    input: { borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 5, color: 'black', textAlign: 'center', fontSize: 18 },
    waitingText: { padding: 20, textAlign: 'center', fontStyle: 'italic', color: 'grey', flex: 1, justifyContent: 'center' },
    chatButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        backgroundColor: 'white',
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    chatButtonText: { fontSize: 28 },
    notificationDot: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: 'red',
        borderWidth: 2,
        borderColor: 'white',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        height: '80%',
        backgroundColor: '#f0f0f0',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
    },
    chatHeader: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
    messageList: { flex: 1, marginBottom: 10 },
    messageBubble: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 15, marginBottom: 8, maxWidth: '80%' },
    myMessage: { backgroundColor: '#007bff', alignSelf: 'flex-end' },
    theirMessage: { backgroundColor: 'white', alignSelf: 'flex-start' },
    messageSender: { fontWeight: 'bold', fontSize: 13, marginBottom: 2 },
    messageText: { fontSize: 16 },
    myMessageText: { color: 'white' },
    theirMessageText: { color: 'black' },
    chatInputContainer: { flexDirection: 'row', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#ccc' },
    chatInput: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 20, paddingHorizontal: 15, marginRight: 10, backgroundColor: 'white' },
});

export default LobbyScreen;