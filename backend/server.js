const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const registerSocketHandlers = require('./sockets'); // Bütün olayları yöneten ana dosyayı import et
const authRoutes = require('./routes/auth');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000; // Render için PORT ayarı

// JSON body'lerini okuyabilmek için bu middleware'i ekle
app.use(express.json());

// Merkezi oyun durumu (state)
const rooms = {};

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// API rotalarını kullan
app.use('/api/auth', authRoutes);

// io örneğini ve rooms objesini tüm olay yöneticilerine (socket handlers) ilet
registerSocketHandlers(io, rooms);

server.listen(PORT, () => {
    console.log(`Socket.IO sunucusu ${PORT} portunda çalışıyor.`);
});