// sockets/index.js
const createRoomHandler = require('./createRoom');
const joinRoomHandler = require('./joinRoom');
const startGameHandler = require('./startGame');
const submitAnswersHandler = require('./submitAnswers');
const submitVotesHandler = require('./submitVotes');
const disconnectHandler = require('./disconnect.js'); // Don't forget disconnect logic!

// --- YARDIMCI FONKSİYONLAR (Helper Functions) ---
// These functions need to be accessible by multiple handlers,
// so it's good to define them here or in a separate `utils.js` file.
function startNewRound(io, rooms, roomCode) {
    const room = rooms[roomCode];
    if (!room) return;

    room.currentRound += 1;
    room.gameStarted = true;
    room.votingStarted = false;
    room.submissions = {};
    room.votes = {};
    room.playerVotes = {};
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

    room.timerId = setTimeout(() => startVotingPhase(io, rooms, roomCode), DURATION * 1000);
}

function startVotingPhase(io, rooms, roomCode) {
    const room = rooms[roomCode];
    if (!room || !room.gameStarted) return;

    room.gameStarted = false;
    room.votingStarted = true;

    console.log(`Oda ${roomCode} için oylama aşaması başladı.`);
    io.to(roomCode).emit('votingStarted', { submissions: room.submissions, players: room.players });

    const VOTING_DURATION = 60;
    room.timerId = setTimeout(() => {
        console.log(`Oda ${roomCode} için oylama süresi doldu.`);
        calculateFinalScores(io, rooms, roomCode);
    }, VOTING_DURATION * 1000);
}

function calculateFinalScores(io, rooms, roomCode) {
    const room = rooms[roomCode];
    if (!room || !room.votingStarted) return;

    room.votingStarted = false;
    const { players, submissions, votes, currentLetter, categories } = room;
    const roundResults = {};
    const validAnswers = {};

    Object.keys(votes).forEach(answer => {
        const answerVotes = votes[answer];
        if (answerVotes.approve >= answerVotes.reject) {
            validAnswers[answer] = true;
        }
    });

    players.forEach(player => {
        const playerAnswers = submissions[player.id] || {};
        let roundScore = 0;
        const scoresByCategory = {};

        categories.forEach(category => {
            const answersForCategory = {};
            players.forEach(p => {
                const ans = (submissions[p.id]?.[category] || "").trim().toLowerCase();
                if (validAnswers[ans]) {
                    answersForCategory[ans] = (answersForCategory[ans] || 0) + 1;
                }
            });

            const playerAnswer = (playerAnswers[category] || "").trim().toLowerCase();
            let points = 0;
            if (validAnswers[playerAnswer] && playerAnswer.startsWith(currentLetter.toLowerCase())) {
                if (answersForCategory[playerAnswer] === 1) points = 15;
                else if (answersForCategory[playerAnswer] > 1) points = 10;
            } else if (playerAnswer.startsWith(currentLetter.toLowerCase())) {
                points = 5; // Onaylanmamış ama doğru harfle başlayanlara 5 puan
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
        setTimeout(() => startNewRound(io, rooms, roomCode), 10000);
    }
}


module.exports = (io, rooms) => {
    io.on('connection', (socket) => {
        console.log(`Yeni bir kullanıcı bağlandı: ${socket.id}`);

        // Pass io, rooms, and helper functions to each handler
        createRoomHandler(socket, io, rooms);
        joinRoomHandler(socket, io, rooms);
        startGameHandler(socket, io, rooms, startNewRound);
        submitAnswersHandler(socket, io, rooms, startVotingPhase);
        submitVotesHandler(socket, io, rooms, calculateFinalScores);
        disconnectHandler(socket, io, rooms, startVotingPhase, calculateFinalScores); // Pass helpers for disconnect
    });
};