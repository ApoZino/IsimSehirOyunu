import React, { useState, useContext } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator } from 'react-native';
import { AuthContext } from '../context/AuthContext';

const LoginScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login, isLoading } = useContext(AuthContext);

    if (isLoading) {
        return <View style={styles.container}><ActivityIndicator size="large" /></View>;
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Giriş Yap</Text>
            <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
            <TextInput style={styles.input} placeholder="Şifre" value={password} onChangeText={setPassword} secureTextEntry />
            <Button title="Giriş Yap" onPress={() => login(email, password)} />
            <Button title="Hesabın yok mu? Kayıt Ol" onPress={() => navigation.navigate('Register')} />
        </View>
    );
};

// RegisterScreen'dekine benzer stiller kullanabilirsin
const styles = StyleSheet.create({ /* ... */ });
export default LoginScreen;