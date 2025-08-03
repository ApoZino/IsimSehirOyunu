import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { socket } from '../services/socket'; // Socket bağlantınız
import AsyncStorage from '@react-native-async-storage/async-storage'; // Kullanıcı adı kaydetmek için

const HomeScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Yükleme durumu için state

  // Component yüklendiğinde kullanıcı adını AsyncStorage'dan yükle
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

    // Socket bağlantısı için genel hata dinleyicisi
    const onError = (data) => {
        console.error('HomeScreen: Sunucu Hatası alındı:', JSON.stringify(data, null, 2));
        setIsLoading(false); // Hata durumunda yüklemeyi durdur
        Alert.alert('Hata', data.message || 'Bir hata oluştu.');
    };
    socket.on('error', onError);

    // Oda oluşturulduğunda veya odaya katıldığında tetiklenecek dinleyiciler
    const onRoomCreated = (data) => {
        console.log('HomeScreen: "roomCreated" olayı alındı:', JSON.stringify(data, null, 2));
        setIsLoading(false); // Yüklemeyi durdur
        navigation.navigate('Lobby', { ...data, username }); // Lobi ekranına yönlendir
    };

    const onRoomJoined = (data) => {
        console.log('HomeScreen: "roomJoined" olayı alındı:', JSON.stringify(data, null, 2));
        setIsLoading(false); // Yüklemeyi durdur
        navigation.navigate('Lobby', { ...data, username }); // Lobi ekranına yönlendir
    };

    socket.on('roomCreated', onRoomCreated);
    socket.on('roomJoined', onRoomJoined);

    // Component unmount olduğunda veya effect yeniden çalıştığında dinleyicileri temizle
    return () => {
        console.log('HomeScreen: Socket dinleyicileri temizleniyor.');
        socket.off('error', onError);
        socket.off('roomCreated', onRoomCreated);
        socket.off('roomJoined', onRoomJoined);
    };
  }, [username, navigation]); // `username` ve `navigation` bağımlılık olarak eklendi

  // Kullanıcı adı değiştiğinde state'i ve AsyncStorage'ı güncelle
  const handleUsernameChange = async (text) => {
    setUsername(text);
    try {
      await AsyncStorage.setItem('username', text);
    } catch (e) {
      console.error('HomeScreen: Kullanıcı adı kaydedilirken hata oluştu:', e.message || e);
    }
  };

  // Yeni oda oluşturma işlemi
  const handleCreateRoom = () => {
    if (!username) {
      Alert.alert('Hata', 'Lütfen bir kullanıcı adı girin.');
      return;
    }
    setIsLoading(true); // Yüklemeyi başlat
    socket.connect(); // Socket bağlantısını kurmaya çalış
    console.log('HomeScreen: "createRoom" isteği gönderiliyor. Socket bağlı mı:', socket.connected);
    socket.emit('createRoom', username); // Sunucuya "createRoom" olayını gönder
  };

  // Mevcut odaya katılma işlemi
  const handleJoinRoom = () => {
    if (!username || !roomCode) {
      Alert.alert('Hata', 'Kullanıcı adı ve oda kodu boş bırakılamaz.');
      return;
    }
    setIsLoading(true); // Yüklemeyi başlat
    socket.connect(); // Socket bağlantısını kurmaya çalış
    console.log('HomeScreen: "joinRoom" isteği gönderiliyor. Oda kodu:', roomCode, 'Socket bağlı mı:', socket.connected);
    socket.emit('joinRoom', { roomCode, username }); // Sunucuya "joinRoom" olayını gönder
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
          editable={!isLoading} // Yükleme sırasında inputları devre dışı bırak
        />
        <Button
          title="Yeni Oda Kur"
          onPress={handleCreateRoom}
          disabled={isLoading} // Yükleme sırasında butonu devre dışı bırak
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
          editable={!isLoading} // Yükleme sırasında inputları devre dışı bırak
        />
        <Button
          title="Odaya Katıl"
          onPress={handleJoinRoom}
          disabled={isLoading} // Yükleme sırasında butonu devre dışı bırak
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
  }
});

export default HomeScreen;