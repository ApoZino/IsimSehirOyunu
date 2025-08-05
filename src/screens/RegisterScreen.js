import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';

const RegisterScreen = ({ navigation }) => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleRegister = async () => {
        try {
            const response = await fetch('https://isim-sehir-sunucu.onrender.com/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password }),
            });
            const data = await response.json();
            if (response.ok) {
                Alert.alert('Başarılı', 'Hesabınız başarıyla oluşturuldu! Lütfen giriş yapın.');
                navigation.navigate('Login');
            } else {
                Alert.alert('Kayıt Başarısız', data.message || 'Bir hata oluştu.');
            }
        } catch (e) {
            Alert.alert('Kayıt Hatası', 'Sunucuya bağlanılamadı.');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Hesap Oluştur</Text>
            <TextInput style={styles.input} placeholder="Kullanıcı Adı" value={username} onChangeText={setUsername} />
            <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
            <TextInput style={styles.input} placeholder="Şifre" value={password} onChangeText={setPassword} secureTextEntry />
            <Button title="Kayıt Ol" onPress={handleRegister} />
            <Button title="Zaten hesabım var? Giriş Yap" onPress={() => navigation.navigate('Login')} />
        </View>
    );
};

// HomeScreen'dekine benzer stiller kullanabilirsin
const styles = StyleSheet.create({ /* ... */ });
export default RegisterScreen;