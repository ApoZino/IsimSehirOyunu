import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, Button, Switch, SafeAreaView } from 'react-native';
import { AuthContext } from '../context/AuthContext';

const SettingsScreen = ({ navigation }) => {
    const { logout } = useContext(AuthContext);
    const [isSoundEnabled, setIsSoundEnabled] = useState(true);

    const toggleSound = () => {
        setIsSoundEnabled(previousState => !previousState);
        // Gelecekte bu ayarı AsyncStorage'a kaydedebilir ve
        // soundService'i bu ayara göre çalışacak şekilde güncelleyebiliriz.
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Ayarlar</Text>

            {/* Ses Ayarı */}
            <View style={styles.settingRow}>
                <Text style={styles.settingText}>Ses Efektleri</Text>
                <Switch
                    trackColor={{ false: "#767577", true: "#81b0ff" }}
                    thumbColor={isSoundEnabled ? "#f5dd4b" : "#f4f3f4"}
                    onValueChange={toggleSound}
                    value={isSoundEnabled}
                />
            </View>

            {/* Dil Ayarı (İleride eklenecek) */}
            <View style={styles.settingRow}>
                <Text style={styles.settingText}>Dil</Text>
                <Text style={styles.languageText}>Türkçe</Text>
            </View>
            
            {/* Profil ve Diğer Butonlar */}
            <View style={styles.buttonContainer}>
                <Button title="Profili Düzenle (Yakında)" onPress={() => {}} />
                <View style={{marginTop: 20}}>
                    <Button title="Çıkış Yap" onPress={logout} color="red" />
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        padding: 20, 
        backgroundColor: '#f5f5f5' 
    },
    title: { 
        fontSize: 32, 
        fontWeight: 'bold', 
        marginBottom: 30,
        color: 'black'
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        backgroundColor: 'white',
        paddingHorizontal: 15,
        borderRadius: 10,
        marginBottom: 10,
    },
    settingText: { 
        fontSize: 18,
        color: 'black'
    },
    languageText: { 
        fontSize: 18, 
        color: 'grey' 
    },
    buttonContainer: {
        marginTop: 'auto', // Butonları en alta iter
        paddingBottom: 20,
    }
});

export default SettingsScreen;