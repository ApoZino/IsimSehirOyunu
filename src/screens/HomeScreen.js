import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native'; // ActivityIndicator eklendi
import { socket } from '../services/socket';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HomeScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Yükleme durumu için

  useEffect(() => {
    const loadUsername = async () => {
      try {
        const savedUsername = await AsyncStorage.getItem('username');
        if (savedUsername !== null) {
          setUsername(savedUsername);
        }
      } catch (e) {
        console.error('Kullanıcı adı yüklenirken hata oluştu', e);
      }
    };
    loadUsername();

    // Socket bağlantısı için genel hata dinleyicisi
    const onError = (data) => {
        setIsLoading(false); // Hata durumunda yüklemeyi durdur
        Alert.alert('Hata', data.message || 'Bir hata oluştu.');
    };
    socket.on('error', onError);

    // Oda oluşturma ve katılma olayları için kalıcı dinleyiciler
    // Bu dinleyiciler, başarılı olduktan sonra navigation yapacaklar.
    const onRoomCreated = (data) => {
        setIsLoading(false);
        navigation.navigate('Lobby', { ...data, username });
    };

    const onRoomJoined = (data) => {
        setIsLoading(false);
        navigation.navigate('Lobby', { ...data, username });
    };

    socket.on('roomCreated', onRoomCreated);
    socket.on('roomJoined', onRoomJoined);

    // Component unmount olduğunda dinleyicileri temizle
    return () => {
        socket.off('error', onError);
        socket.off('roomCreated', onRoomCreated);
        socket.off('roomJoined', onRoomJoined);
    };
  }, [username, navigation]); // username ve navigation bağımlılık olarak eklendi

  const handleUsernameChange = async (text) => {
    setUsername(text);
    try {
      await AsyncStorage.setItem('username', text);
    } catch (e) {
      console.error('Kullanıcı adı kaydedilirken hata oluştu', e);
    }
  };

  const handleCreateRoom = () => {
    if (!username) {
      Alert.alert('Hata', 'Lütfen bir kullanıcı adı girin.');
      return;
    }
    setIsLoading(true); // Yüklemeyi başlat
    socket.connect(); // Bağlantıyı kur
    socket.emit('createRoom', username);
  };

  const handleJoinRoom = () => {
    if (!username || !roomCode) {
      Alert.alert('Hata', 'Kullanıcı adı ve oda kodu boş bırakılamaz.');
      return;
    }
    setIsLoading(true); // Yüklemeyi başlat
    socket.connect(); // Bağlantıyı kur
    socket.emit('joinRoom', { roomCode, username });
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