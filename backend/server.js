const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const PORT = 3000;

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const rooms = {};

function startNewRound(roomCode) {
    const room = rooms[roomCode];
    if (!room) return;

    room.currentRound += 1;
    room.gameStarted = true;
    room.submissions = {};
    room.finalCountdownStarted = false;

    const allowedLetters = "ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ";
    const randomLetter = allowedLetters[Math.floor(Math.random() * allowedLetters.length)];
    room.currentLetter = randomLetter;

    const DURATION = 300; // 5 dakika
    
    io.to(roomCode).emit('gameStarted', {
        letter: randomLetter,
        duration: DURATION,
        categories: room.categories.map(c => c.charAt(0).toUpperCase() + c.slice(1)),
        currentRound: room.currentRound,
        totalRounds: room.totalRounds
    });
    console.log(`Oda: ${roomCode}, Tur: ${room.currentRound}/${room.totalRounds} başlatıldı. Harf: ${randomLetter}`);

    room.timerId = setTimeout(() => scoreRound(roomCode), DURATION * 1000);
}

function scoreRound(roomCode) {
    const room = rooms[roomCode];
    if (!room || !room.gameStarted) return;

    room.gameStarted = false;
    const { players, submissions, currentLetter, categories } = room;
    const roundResults = {};

    players.forEach(player => {
        const playerAnswers = submissions[player.id] || {};
        let roundScore = 0;
        const scoresByCategory = {};

        categories.forEach(category => {
            const answersForCategory = {};
            players.forEach(p => {
                const ans = (submissions[p.id]?.[category] || "").trim().toLowerCase();
                if (ans && ans.startsWith(currentLetter.toLowerCase())) {
                    answersForCategory[ans] = (answersForCategory[ans] || 0) + 1;
                }
            });

            const playerAnswer = (playerAnswers[category] || "").trim().toLowerCase();
            let points = 0;
            if (playerAnswer && playerAnswer.startsWith(currentLetter.toLowerCase())) {
                if (answersForCategory[playerAnswer] === 1) points = 10;
                else if (answersForCategory[playerAnswer] > 1) points = 5;
            }
            scoresByCategory[category] = points;
            roundScore += points;
        });

        room.playerScores[player.id] += roundScore;
        roundResults[player.id] = {
            username: player.username,
            roundScore: roundScore,
            totalScore: room.playerScores[player.id],
            scores: scoresByCategory,
            answers: playerAnswers
        };
    });

    io.to(roomCode).emit('roundOver', Object.values(roundResults));
    console.log(`Oda: ${roomCode}, Tur: ${room.currentRound} bitti.`);

    if (room.currentRound >= room.totalRounds) {
        console.log(`Oda: ${roomCode}, Oyun bitti.`);
        io.to(roomCode).emit('gameOver', Object.values(roundResults).sort((a,b) => b.totalScore - a.totalScore));
        delete rooms[roomCode];
    } else {
        setTimeout(() => startNewRound(roomCode), 10000);
    }
}

io.on('connection', (socket) => {
    console.log(`Yeni bir kullanıcı bağlandı: ${socket.id}`);

    socket.on('createRoom', (username) => {
        let roomCode;
        do { roomCode = Math.random().toString(36).substring(2, 7).toUpperCase(); } while (rooms[roomCode]);
        
        rooms[roomCode] = { players: [], playerScores: {}, submissions: {} };
        const player = { id: socket.id, username };
        rooms[roomCode].players.push(player);
        rooms[roomCode].playerScores[socket.id] = 0;
        socket.join(roomCode);
        socket.emit('roomCreated', { roomCode, players: rooms[roomCode].players });
    });

    socket.on('joinRoom', ({ roomCode, username }) => {
        const room = rooms[roomCode];
        if (room) {
            if(room.gameStarted) return socket.emit('error', {message: 'Oyun çoktan başladı!'});
            const player = { id: socket.id, username };
            room.players.push(player);
            rooms[roomCode].playerScores[socket.id] = 0;
            socket.join(roomCode);
            socket.emit('roomJoined', { roomCode, players: room.players });
            socket.to(roomCode).emit('playerJoined', room.players);
        } else {
            socket.emit('error', { message: 'Oda bulunamadı.' });
        }
    });

    socket.on('startGame', ({ roomCode, categories, totalRounds }) => {
        const room = rooms[roomCode];
        if (room && room.players[0].id === socket.id) {
            room.totalRounds = totalRounds || 5;
            room.currentRound = 0;
            room.categories = categories || ['isim', 'şehir', 'hayvan', 'bitki', 'eşya'];
            
            Object.keys(room.playerScores).forEach(playerId => {
                room.playerScores[playerId] = 0;
            });

            startNewRound(roomCode);
        }
    });

    socket.on('submitAnswers', ({ roomCode, answers }) => {
        const room = rooms[roomCode];
        if (room && room.gameStarted) {
            if (!room.submissions[socket.id]) {
                room.submissions[socket.id] = answers;
                console.log(`Cevap alındı: ${socket.id}`);

                if (!room.finalCountdownStarted) {
                    room.finalCountdownStarted = true;
                    clearTimeout(room.timerId);
                    console.log(`${roomCode} odasında bir oyuncu erken bitirdi. Ana zamanlayıcı iptal edildi.`);
                    
                    io.to(roomCode).emit('finalCountdown', { duration: 15 });
                    
                    room.timerId = setTimeout(() => {
                        console.log(`${roomCode} odasında 15 saniyelik süre doldu.`);
                        scoreRound(roomCode);
                    }, 15 * 1000);
                }
            }
        }
    });

    // ... disconnect ...
});

server.listen(PORT, () => {
    console.log(`Socket.IO sunucusu http://localhost:${PORT} adresinde çalışıyor.`);
});