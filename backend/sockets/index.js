const createRoomHandler = require('./createRoom');
const joinRoomHandler = require('./joinRoom');
const startGameHandler = require('./startGame');
const submitAnswersHandler = require('./submitAnswers');
const submitVotesHandler = require('./submitVotes');
const submitDisputeHandler = require('./submitDispute');
const disconnectHandler = require('./disconnect');

// Bu dosya, tüm yardımcı fonksiyonları ve ana bağlantı yöneticisini içerir.
// Her modülün ihtiyaç duyduğu fonksiyonları buradan almasını sağlar.

function startNewRound(io, rooms, roomCode) {
    const room = rooms[roomCode];
    if (!room) return;
    room.currentRound += 1;
    room.gameStarted = true;
    room.votingStarted = false;
    room.disputePhase = false;
    room.submissions = {};
    room.votes = {};
    room.playerVotes = {};
    room.disputes = {};
    const allowedLetters = "ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ";
    const randomLetter = allowedLetters[Math.floor(Math.random() * allowedLetters.length)];
    room.currentLetter = randomLetter;
    const DURATION = 300; // 5 dakika
    io.to(roomCode).emit('gameStarted', {
        letter: randomLetter,
        duration: DURATION,
        categories: room.categories.map(c => c.charAt(0).toUpperCase() + c.slice(1)),
        currentRound: room.currentRound,
        totalRounds: room.totalRounds,
        players: room.players,
        refereeId: room.refereeId
    });
    console.log(`Oda: ${roomCode}, Tur: ${room.currentRound}/${room.totalRounds} başladı. Harf: ${randomLetter}`);
    room.timerId = setTimeout(() => startDisputePhase(io, rooms, roomCode), DURATION * 1000);
}

function startDisputePhase(io, rooms, roomCode) {
    const room = rooms[roomCode];
    if (!room || !room.gameStarted) return;
    room.gameStarted = false;
    room.disputePhase = true;
    io.to(roomCode).emit('disputePhaseStarted', { submissions: room.submissions, players: room.players, refereeId: room.refereeId });
    const DISPUTE_DURATION = 30;
    room.timerId = setTimeout(() => processDisputes(io, rooms, roomCode), DISPUTE_DURATION * 1000);
}

function processDisputes(io, rooms, roomCode) {
    const room = rooms[roomCode];
    if (!room || !room.disputePhase) return;
    room.disputePhase = false;
    const disputedAnswers = {};
    room.players.forEach(p => {
        const playerAnswers = room.submissions[p.id] || {};
        Object.keys(playerAnswers).forEach(category => {
            const answer = playerAnswers[category];
            const submissionId = `${p.id}|${category.toLowerCase()}|${answer.trim().toLowerCase()}`;
            if(room.disputes[submissionId]) {
                if (!disputedAnswers[p.id]) disputedAnswers[p.id] = {};
                disputedAnswers[p.id][category] = answer;
            }
        });
    });
    if (Object.keys(room.disputes).length === 0) {
        calculateFinalScores(io, rooms, roomCode);
    } else {
        startVotingPhase(io, rooms, roomCode, disputedAnswers);
    }
}

function startVotingPhase(io, rooms, roomCode, disputedSubmissions) {
    const room = rooms[roomCode];
    if (!room) return;
    room.votingStarted = true;
    io.to(roomCode).emit('votingStarted', { submissions: disputedSubmissions, players: room.players, refereeId: room.refereeId });
    const VOTING_DURATION = 60;
    room.timerId = setTimeout(() => calculateFinalScores(io, rooms, roomCode), VOTING_DURATION * 1000);
}

function calculateFinalScores(io, rooms, roomCode) {
    // Bu fonksiyonun tam hali, önceki cevaplarımızda mevcut. Hakemli oylama sistemine göre çalışır.
    // ...
}

module.exports = (io, rooms) => {
    io.on('connection', (socket) => {
        console.log(`Yeni bir kullanıcı bağlandı: ${socket.id}`);
        
        createRoomHandler(socket, io, rooms);
        joinRoomHandler(socket, io, rooms);
        startGameHandler(socket, io, rooms, startNewRound);
        submitAnswersHandler(socket, io, rooms, startDisputePhase);
        submitVotesHandler(socket, io, rooms, calculateFinalScores);
        submitDisputeHandler(socket, io, rooms); 
        disconnectHandler(socket, io, rooms, startDisputePhase, calculateFinalScores);
    });
};