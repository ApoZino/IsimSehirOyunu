import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [userToken, setUserToken] = useState(null);
    const [userInfo, setUserInfo] = useState(null);

    const API_URL = 'https://isim-sehir-sunucu.onrender.com/api/auth';

    const register = async (username, email, password) => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password }),
            });
            const data = await response.json();
            setIsLoading(false);

            if (response.ok) {
                return null; // Başarılı, hata yok
            } else {
                return data.message || 'Bilinmeyen bir hata oluştu.';
            }
        } catch (e) {
            console.error('Register error', e);
            setIsLoading(false);
            return 'Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.';
        }
    };

    const login = async (email, password) => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await response.json();

            if (data.token) {
                setUserToken(data.token);
                setUserInfo(data.user);
                await AsyncStorage.setItem('userToken', data.token);
                await AsyncStorage.setItem('userInfo', JSON.stringify(data.user));
                setIsLoading(false);
                return null; // Başarılı, hata yok
            } else {
                setIsLoading(false);
                return data.message || 'Bir hata oluştu.';
            }
        } catch (e) {
            console.error('Login error', e);
            setIsLoading(false);
            return 'Sunucuya bağlanılamadı.';
        }
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
        <AuthContext.Provider value={{ register, login, logout, isLoading, userToken, userInfo }}>
            {children}
        </AuthContext.Provider>
    );
};