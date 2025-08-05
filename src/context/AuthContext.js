import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react--native-async-storage/async-storage';
import { Alert } from 'react-native';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [userToken, setUserToken] = useState(null);
    const [userInfo, setUserInfo] = useState(null);

    const login = async (email, password) => {
        setIsLoading(true);
        try {
            // Render üzerindeki sunucumuzun adresi
            const response = await fetch('https://isim-sehir-sunucu.onrender.com/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });
            const data = await response.json();

            if (data.token) {
                setUserToken(data.token);
                setUserInfo(data.user);
                await AsyncStorage.setItem('userToken', data.token);
                await AsyncStorage.setItem('userInfo', JSON.stringify(data.user));
            } else {
                Alert.alert('Giriş Başarısız', data.message || 'Bir hata oluştu.');
            }
        } catch (e) {
            console.error('Login error', e);
            Alert.alert('Giriş Hatası', 'Sunucuya bağlanılamadı.');
        }
        setIsLoading(false);
    };

    const logout = async () => {
        setIsLoading(true);
        setUserToken(null);
        setUserInfo(null);
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userInfo');
        setIsLoading(false);
    };

    const isLoggedIn = async () => {
        try {
            let token = await AsyncStorage.getItem('userToken');
            let info = await AsyncStorage.getItem('userInfo');
            if (token && info) {
                setUserToken(token);
                setUserInfo(JSON.parse(info));
            }
        } catch (e) {
            console.error('isLoggedIn error', e);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        isLoggedIn();
    }, []);

    return (
        <AuthContext.Provider value={{ login, logout, isLoading, userToken, userInfo }}>
            {children}
        </AuthContext.Provider>
    );
};