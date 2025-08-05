import React, { useState, useEffect, useRef } from 'react';
import { 
    View, 
    Text, 
    TextInput, 
    Button, 
    StyleSheet, 
    ScrollView, 
    KeyboardAvoidingView, 
    Platform, 
    Modal, 
    TouchableOpacity, 
    SafeAreaView,
    FlatList,
    ActivityIndicator
} from 'react-native';
import LottieView from 'lottie-react-native';
import { socket } from '../services/socket';
import { useNavigation } from '@react-navigation/native';

const GameScreen = ({ route }) => {
  const navigation = useNavigation();
  // initialGameData'nın undefined olma ihtimaline karşı boş bir obje ile başlat
  const { initialGameData = {}, roomCode } = route.params;
  const { 
    letter, 
    duration, 
    categories = [], // categories'in undefined olmasını engelle
    currentRound, 
    totalRounds,
    username // username'i de alalım, sohbet için lazım
  } = initialGameData;

  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(duration || 300);
  const [submitted, setSubmitted] = useState(false);
  
  // Sohbet için State'ler
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const chatListRef = useRef(null);
  
  // Zamanlayıcı için useEffect
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (!submitted) {
        handleSubmitAnswers();
    }
  }, [timeLeft, submitted]);

  // Socket olayları için useEffect
  useEffect(() => {
    const onRoundOver = (results) => {
      navigation.replace('Score', { finalResults: results, roomCode });
    };
    
    const onDisputePhaseStarted = (data) => {
      navigation.replace('Dispute', { ...data, roomCode });
    };

    const onNewMessage = (newMessage) => {
        setMessages(prevMessages => [...prevMessages, newMessage]);
        if (!isChatVisible) {
            setHasNewMessage(true);
        }
    };

    socket.on('roundOver', onRoundOver);
    socket.on('disputePhaseStarted', onDisputePhaseStarted);
    socket.on('newMessage', onNewMessage);

    return () => {
      socket.off('roundOver', onRoundOver);
      socket.off('disputePhaseStarted', onDisputePhaseStarted);
      socket.off('newMessage', onNewMessage);
    };
  }, [navigation, roomCode, isChatVisible]);

  const handleInputChange = (category, value) => {
    setAnswers(prev => ({ ...prev, [category.toLowerCase()]: value }));
  };

  const handleSubmitAnswers = () => {
    if(!submitted) {
      socket.emit('submitAnswers', { roomCode, answers });
      setSubmitted(true);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

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

  return (
    <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.roundInfo}>Tur: {currentRound} / {totalRounds}</Text>
            <Text style={styles.timer}>Kalan Süre: {formatTime(timeLeft)}</Text>
            <Text style={styles.header}>Seçilen Harf:</Text>
            <Text style={styles.letterText}>{letter}</Text>
            
            {categories.map((category) => (
              <TextInput
                key={category}
                style={styles.input}
                placeholder={category}
                placeholderTextColor="black"
                onChangeText={text => handleInputChange(category, text)}
                autoCapitalize="words"
                editable={!submitted}
              />
            ))}

            <View style={styles.buttonContainer}>
              {submitted ? (
                <View style={styles.waitingContainer}>
                  <LottieView
                    source={require('../assets/waiting.json')}
                    autoPlay
                    loop
                    style={{ width: 150, height: 150 }}
                  />
                  <Text style={styles.waitingText}>Diğer oyuncular ve süre bekleniyor...</Text>
                </View>
              ) : (
                <Button 
                  title="Cevapları Gönder" 
                  onPress={handleSubmitAnswers} 
                  disabled={timeLeft === 0} 
                />
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

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
                    <Text style={styles.chatHeader}>Oyun İçi Sohbet</Text>
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
  roundInfo: { fontSize: 18, fontWeight: '500', textAlign: 'center', marginBottom: 5 },
  timer: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', color: 'black', marginBottom: 10 },
  warningText: { fontSize: 16, textAlign: 'center', color: '#d9534f', marginBottom: 10, fontWeight: 'bold' },
  header: { fontSize: 24, color: '#333', textAlign: 'center' },
  letterText: { fontSize: 96, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#007bff' },
  input: {
    borderWidth: 1, borderColor: '#ccc', backgroundColor: 'white', padding: 10,
    borderRadius: 5, fontSize: 16, marginBottom: 10, color: 'black',
  },
  buttonContainer: { marginTop: 10, alignItems: 'center' },
  waitingContainer: { alignItems: 'center', padding: 20 },
  waitingText: { marginTop: 10, fontSize: 16, fontWeight: 'bold', color: 'black' },
  chatButton: {
      position: 'absolute', top: 50, right: 20, backgroundColor: 'white',
      width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center',
      elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84,
  },
  chatButtonText: { fontSize: 28 },
  notificationDot: {
      position: 'absolute', top: 8, right: 8, width: 12, height: 12,
      borderRadius: 6, backgroundColor: 'red', borderWidth: 2, borderColor: 'white',
  },
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: {
      height: '80%', backgroundColor: '#f0f0f0', borderTopLeftRadius: 20,
      borderTopRightRadius: 20, padding: 20,
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

export default GameScreen;