// server.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const registerSocketHandlers = require('./sockets'); // Import the new entry point

const app = express();
const server = http.createServer(app);
const PORT = 3000;

// Centralized game state (important to keep this accessible)
// This object will be passed to all socket handlers
const rooms = {};

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// Pass the io instance and the rooms object to your socket handlers
registerSocketHandlers(io, rooms);

server.listen(PORT, () => {
    console.log(`Socket.IO sunucusu http://localhost:${PORT} adresinde çalışıyor.`);
});