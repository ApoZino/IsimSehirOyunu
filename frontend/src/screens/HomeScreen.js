// HomeScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { socket } from '../services/socket';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HomeScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [socketStatus, setSocketStatus] = useState('Disconnected'); // Yeni state

  useEffect(() => {
    const loadUsername = async () => {
      try {
        const savedUsername = await AsyncStorage.getItem('username');
        if (savedUsername !== null) {
          setUsername(savedUsername);
          console.log('HomeScreen: Kaydedilen kullanıcı adı yüklendi:', savedUsername);
        }
      } catch (e) {
        console.error('HomeScreen: Kullanıcı adı yüklenirken hata oluştu:', e.message || e);
      }
    };
    loadUsername();

    // Socket olay dinleyicileri
    const onConnect = () => {
      console.log('HomeScreen: Socket bağlandı!', socket.id);
      setSocketStatus('Connected');
    };
    const onDisconnect = () => {
      console.log('HomeScreen: Socket bağlantısı kesildi.');
      setSocketStatus('Disconnected');
      setIsLoading(false); // Bağlantı kesilirse yüklemeyi durdur
      Alert.alert('Uyarı', 'Sunucu bağlantısı kesildi. Lütfen tekrar deneyin.');
    };
    const onError = (data) => {
      console.error('HomeScreen: Sunucu Hatası alındı:', JSON.stringify(data, null, 2));
      setSocketStatus('Error');
      setIsLoading(false);
      Alert.alert('Hata', data.message || 'Bir hata oluştu.');
    };
    const onRoomCreated = (data) => {
      console.log('HomeScreen: "roomCreated" olayı alındı:', JSON.stringify(data, null, 2));
      setIsLoading(false);
      navigation.navigate('Lobby', { ...data, username });
    };
    const onRoomJoined = (data) => {
      console.log('HomeScreen: "roomJoined" olayı alındı:', JSON.stringify(data, null, 2));
      setIsLoading(false);
      navigation.navigate('Lobby', { ...data, username });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('error', onError);
    socket.on('roomCreated', onRoomCreated);
    socket.on('roomJoined', onRoomJoined);

    // Component unmount olduğunda dinleyicileri temizle
    return () => {
      console.log('HomeScreen: Socket dinleyicileri temizleniyor.');
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('error', onError);
      socket.off('roomCreated', onRoomCreated);
      socket.off('roomJoined', onRoomJoined);
    };
  }, [username, navigation]);

  const handleUsernameChange = async (text) => {
    setUsername(text);
    try {
      await AsyncStorage.setItem('username', text);
    } catch (e) {
      console.error('HomeScreen: Kullanıcı adı kaydedilirken hata oluştu:', e.message || e);
    }
  };

  const handleCreateRoom = () => {
    if (!username) {
      Alert.alert('Hata', 'Lütfen bir kullanıcı adı girin.');
      return;
    }
    setIsLoading(true);
    socket.connect(); // Bağlantıyı kurma isteği
    console.log('HomeScreen: "createRoom" isteği gönderiliyor. Başlangıç socket durumu:', socket.connected);
    // Bağlantı kurulana kadar beklemek için daha sağlam bir yaklaşım:
    if (socket.connected) {
        socket.emit('createRoom', username);
    } else {
        // Bağlantı kurulduktan sonra emit olayını tetikle
        socket.once('connect', () => {
            console.log('HomeScreen: Bağlandıktan sonra "createRoom" gönderiliyor.');
            socket.emit('createRoom', username);
        });
        socket.once('connect_error', (err) => { // Bağlantı hatası durumunda
            console.error('HomeScreen: Socket bağlantı hatası:', err.message || err);
            setIsLoading(false);
            Alert.alert('Bağlantı Hatası', 'Sunucuya bağlanılamadı. Lütfen sunucunun çalıştığından emin olun.');
        });
    }
  };

  const handleJoinRoom = () => {
    if (!username || !roomCode) {
      Alert.alert('Hata', 'Kullanıcı adı ve oda kodu boş bırakılamaz.');
      return;
    }
    setIsLoading(true);
    socket.connect(); // Bağlantıyı kurma isteği
    console.log('HomeScreen: "joinRoom" isteği gönderiliyor. Başlangıç socket durumu:', socket.connected);
    
    if (socket.connected) {
        socket.emit('joinRoom', { roomCode, username });
    } else {
        socket.once('connect', () => {
            console.log('HomeScreen: Bağlandıktan sonra "joinRoom" gönderiliyor.');
            socket.emit('joinRoom', { roomCode, username });
        });
        socket.once('connect_error', (err) => {
            console.error('HomeScreen: Socket bağlantı hatası:', err.message || err);
            setIsLoading(false);
            Alert.alert('Bağlantı Hatası', 'Sunucuya bağlanılamadı. Lütfen sunucunun çalıştığından emin olun.');
        });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <Text style={styles.title}>İsim Şehir</Text>
        <TextInput
          style={styles.input}
          placeholder="Kullanıcı Adınız"
          placeholderTextColor="black"
          value={username}
          onChangeText={handleUsernameChange}
          editable={!isLoading}
        />
        {/* Socket bağlantı durumunu göster */}
        <Text style={styles.statusText}>Durum: {socketStatus}</Text>
        <Button
          title="Yeni Oda Kur"
          onPress={handleCreateRoom}
          disabled={isLoading}
          color={isLoading ? "#cccccc" : "#007bff"}
        />
        <Text style={styles.orText}>- VEYA -</Text>
        <TextInput
          style={styles.input}
          placeholder="Oda Kodu"
          placeholderTextColor="black"
          value={roomCode}
          onChangeText={setRoomCode}
          autoCapitalize="characters"
          editable={!isLoading}
        />
        <Button
          title="Odaya Katıl"
          onPress={handleJoinRoom}
          disabled={isLoading}
          color={isLoading ? "#cccccc" : "#007bff"}
        />
        {isLoading && <ActivityIndicator size="large" color="#0000ff" style={styles.loadingIndicator} />}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: 'white'
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: 'black'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
    color: 'black'
  },
  orText: {
    textAlign: 'center',
    marginVertical: 20,
    fontSize: 16,
    color: 'black'
  },
  loadingIndicator: {
    marginTop: 20,
  },
  statusText: { // Yeni stil
    textAlign: 'center',
    marginBottom: 10,
    color: 'gray',
  }
});

export default HomeScreen;