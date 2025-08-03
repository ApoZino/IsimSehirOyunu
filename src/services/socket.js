// src/services/socket.js
import { io } from 'socket.io-client';

// Canlı Render.com backend URL'niz
const SOCKET_URL = 'https://isimsehiroyunu.onrender.com'; 

// Socket.IO client'ı oluştur
const socket = io(SOCKET_URL, {
    autoConnect: false, // Manuel olarak bağlanacağız
    transports: ['websocket'], // Sadece websocket kullanmaya zorlayabiliriz
});

// Socket'i dışa aktar
export { socket };