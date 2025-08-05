// src/services/socket.js
import { io } from 'socket.io-client';

const SOCKET_URL = 'https://isimsehiroyunu.onrender.com'; 

const socket = io(SOCKET_URL, {
    autoConnect: false,
    transports: ['websocket'],
    // !!! YENİ EKLENEN SATIRLAR !!!
    reconnectionAttempts: 5, // Yeniden bağlanma denemesi sayısı
    reconnectionDelay: 1000, // Yeniden bağlanma denemeleri arasındaki gecikme (ms)
    timeout: 20000, // Bağlantı veya ping için timeout (ms). Varsayılan 20 saniye, ama belki artırmak gerek
    pingTimeout: 15000, // Ping yanıtı için bekleme süresi (varsayılan 5000ms). Artırılabilir
    pingInterval: 10000, // Ping gönderme aralığı (varsayılan 25000ms). Düşürülebilir
    // !!! SON YENİ EKLENEN SATIRLAR !!!
});

export { socket };