import React, { useState } from 'react';
import { 
    View, Text, TextInput, StyleSheet, Alert, 
    TouchableOpacity, ActivityIndicator, Animated, KeyboardAvoidingView, Platform 
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const RegisterScreen = ({ navigation }) => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleRegister = async () => {
        setError('');
        setIsLoading(true);
        try {
            const response = await fetch('https://isim-sehir-sunucu.onrender.com/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password }),
            });
            const data = await response.json();
            if (response.ok) {
                Alert.alert('Başarılı', 'Hesabınız oluşturuldu! Şimdi giriş yapabilirsiniz.');
                navigation.navigate('Login');
            } else {
                setError(data.message || 'Bir hata oluştu.');
            }
        } catch (e) {
            setError('Sunucuya bağlanılamadı.');
        }
        setIsLoading(false);
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>İsim Şehir</Text>
                <Text style={styles.subtitle}>Yeni Hesap Oluştur</Text>

                <View style={styles.inputContainer}>
                    <Icon name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput style={styles.input} placeholder="Kullanıcı Adı" value={username} onChangeText={setUsername} placeholderTextColor="#666"/>
                </View>
                <View style={styles.inputContainer}>
                    <Icon name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" placeholderTextColor="#666"/>
                </View>
                <View style={styles.inputContainer}>
                    <Icon name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput style={styles.input} placeholder="Şifre" value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor="#666"/>
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={isLoading}>
                    {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>KAYIT OL</Text>}
                </TouchableOpacity>

                <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Login')}>
                    <Text style={styles.linkButtonText}>Zaten hesabın var mı? Giriş Yap</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};

// LoginScreen ile aynı stilleri kullanabiliriz.
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f2f5', justifyContent: 'center' },
    content: { padding: 30 },
    title: { fontSize: 48, fontWeight: 'bold', color: '#007bff', textAlign: 'center', marginBottom: 10 },
    subtitle: { fontSize: 24, color: '#333', textAlign: 'center', marginBottom: 40 },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 10,
        marginBottom: 15,
        elevation: 2,
        shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, shadowOffset: {width: 0, height: 2},
    },
    inputIcon: { padding: 15 },
    input: { flex: 1, paddingVertical: 15, fontSize: 16, color: '#333' },
    button: {
        backgroundColor: '#28a745', // Yeşil renk
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    linkButton: { marginTop: 20, alignItems: 'center' },
    linkButtonText: { color: '#007bff', fontSize: 16 },
    errorText: { color: 'red', textAlign: 'center', marginBottom: 10 }
});


export default RegisterScreen;