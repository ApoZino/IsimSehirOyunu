import React, { useState, useContext, useRef, useEffect } from 'react';
import { 
    View, Text, TextInput, StyleSheet, ActivityIndicator, 
    TouchableOpacity, Animated, KeyboardAvoidingView, Platform 
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import Icon from 'react-native-vector-icons/Ionicons';

const LoginScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(''); // Hata mesajları için state
    const { login, isLoading } = useContext(AuthContext);

    // Animasyon için
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
        }).start();
    }, [fadeAnim]);

    const handleLogin = async () => {
        setError(''); // Önceki hatayı temizle
        if (!email || !password) {
            setError('Lütfen tüm alanları doldurun.');
            return;
        }
        const errorMessage = await login(email, password);
        if (errorMessage) {
            setError(errorMessage);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                <Text style={styles.title}>İsim Şehir</Text>
                <Text style={styles.subtitle}>Giriş Yap</Text>

                <View style={styles.inputContainer}>
                    <Icon name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput 
                        style={styles.input} 
                        placeholder="Email" 
                        value={email} 
                        onChangeText={setEmail} 
                        keyboardType="email-address"
                        placeholderTextColor="#666"
                    />
                </View>
                <View style={styles.inputContainer}>
                    <Icon name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput 
                        style={styles.input} 
                        placeholder="Şifre" 
                        value={password} 
                        onChangeText={setPassword} 
                        secureTextEntry 
                        placeholderTextColor="#666"
                    />
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={isLoading}>
                    {isLoading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.buttonText}>GİRİŞ YAP</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Register')}>
                    <Text style={styles.linkButtonText}>Hesabın yok mu? Kayıt Ol</Text>
                </TouchableOpacity>
            </Animated.View>
        </KeyboardAvoidingView>
    );
};

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
        backgroundColor: '#007bff',
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

export default LoginScreen;