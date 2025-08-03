// server.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const registerSocketHandlers = require('./sockets'); // Import the new entry point

const app = express();
const server = http.createServer(app);
const PORT = 3000;

// Merkezi oyun durumu
const rooms = {};

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// io örneğini ve rooms objesini soket handler'larınıza iletin
registerSocketHandlers(io, rooms);

server.listen(PORT, () => {
    console.log(`Socket.IO sunucusu http://localhost:${PORT} adresinde çalışıyor.`);
});