const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const registerSocketHandlers = require('./sockets');
const authRoutes = require('./routes/auth');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// --- KRİTİK DÜZELTME BURADA ---
// Bu satır, sunucuya gelen JSON formatındaki verileri okuyup
// req.body'nin içine koymasını sağlar.
// Bu satır, rotalardan ('/api/auth') ÖNCE gelmelidir.
app.use(express.json());

// API rotalarını kullan
app.use('/api/auth', authRoutes);

// Merkezi oyun durumu
const rooms = {};

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// io örneğini ve rooms objesini soket handler'larınıza iletin
registerSocketHandlers(io, rooms);

server.listen(PORT, () => {
    console.log(`Socket.IO sunucusu ${PORT} portunda çalışıyor.`);
});