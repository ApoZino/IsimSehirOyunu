import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { socket } from '../services/socket';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HomeScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');

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
  }, []);

  const handleUsernameChange = async (text) => {
    setUsername(text);
    try {
      await AsyncStorage.setItem('username', text);
    } catch (e) {
      console.error('Kullanıcı adı kaydedilirken hata oluştu', e);
    }
  };

  const joinLobby = (data) => {
    navigation.navigate('Lobby', { ...data, username });
  };

  const handleCreateRoom = () => {
    if (!username) return alert('Lütfen bir kullanıcı adı girin.');
    socket.connect();
    socket.emit('createRoom', username);
    socket.once('roomCreated', joinLobby);
  };

  const handleJoinRoom = () => {
    if (!username || !roomCode) return alert('Kullanıcı adı ve oda kodu boş bırakılamaz.');
    socket.connect();
    socket.emit('joinRoom', { roomCode, username });
    socket.once('roomJoined', joinLobby);
    socket.once('error', (data) => alert(data.message));
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
        />
        <Button title="Yeni Oda Kur" onPress={handleCreateRoom} />
        <Text style={styles.orText}>- VEYA -</Text>
        <TextInput
          style={styles.input}
          placeholder="Oda Kodu"
          placeholderTextColor="black"
          value={roomCode}
          onChangeText={setRoomCode}
          autoCapitalize="characters"
        />
        <Button title="Odaya Katıl" onPress={handleJoinRoom} />
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
  }
});

export default HomeScreen;