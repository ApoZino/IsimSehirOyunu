// sockets/index.js
const createRoomHandler = require('./createRoom');
const joinRoomHandler = require('./joinRoom');
const startGameHandler = require('./startGame');
const submitAnswersHandler = require('./submitAnswers');
const submitVotesHandler = require('./submitVotes');
const disconnectHandler = require('./disconnect');

// --- YARDIMCI FONKSİYONLAR (Helper Functions) ---
// These functions are defined here as they are shared across multiple handlers
// and manage the core game state transitions.

function startNewRound(io, rooms, roomCode) {
    const room = rooms[roomCode];
    if (!room) {
        console.error(`Error: startNewRound called for non-existent room ${roomCode}`);
        return;
    }

    room.currentRound += 1;
    room.gameStarted = true;
    room.votingStarted = false;
    room.submissions = {};
    room.votes = {}; // Ensure votes are cleared for the new round
    room.playerVotes = {}; // Ensure playerVotes (referee's vote status) is cleared for the new round
    room.finalCountdownStarted = false;

    const allowedLetters = "ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ";
    const randomLetter = allowedLetters[Math.floor(Math.random() * allowedLetters.length)];
    room.currentLetter = randomLetter;

    const DURATION = 300; // 5 dakika (answer submission phase)
    
    // Log for debugging
    console.log(`Oda: ${roomCode}, Tur: ${room.currentRound}/${room.totalRounds} başlatıldı. Harf: ${randomLetter}`);
    
    io.to(roomCode).emit('gameStarted', {
        letter: randomLetter,
        duration: DURATION,
        categories: room.categories.map(c => c.charAt(0).toUpperCase() + c.slice(1)),
        currentRound: room.currentRound,
        totalRounds: room.totalRounds,
        players: room.players // Send updated player list (with isReferee flag)
    });

    // Set a timeout for the answer submission phase.
    // When time runs out, automatically move to voting phase.
    room.timerId = setTimeout(() => {
        console.log(`Oda ${roomCode} için tur süresi doldu. Oylama aşaması başlatılıyor.`);
        startVotingPhase(io, rooms, roomCode);
    }, DURATION * 1000);
}

function startVotingPhase(io, rooms, roomCode) {
    const room = rooms[roomCode];
    if (!room) {
        console.error(`Error: startVotingPhase called for non-existent room ${roomCode}`);
        return;
    }

    room.gameStarted = false; // Game submission phase is over
    room.votingStarted = true; // Voting phase begins

    console.log(`Oda ${roomCode} için oylama aşaması başladı (Hakem Oyu bekleniyor).`);
    
    // Emit votingStarted event with necessary data for clients
    io.to(roomCode).emit('votingStarted', {
        submissions: room.submissions, // All submitted answers
        players: room.players, // All players (including referee status)
        refereeId: room.refereeId // ID of the referee
    });

    // Set a timeout for the voting phase in case the referee doesn't vote manually.
    const VOTING_DURATION = 60; // Referee has 60 seconds to vote
    room.timerId = setTimeout(() => {
        console.log(`Oda ${roomCode} için hakem oylama süresi doldu. Skor hesaplanıyor.`);
        // If the referee didn't submit votes, 'room.votes' might be empty.
        // calculateFinalScores must handle this gracefully (e.g., all answers get 0 points)
        calculateFinalScores(io, rooms, roomCode);
    }, VOTING_DURATION * 1000);
}

function calculateFinalScores(io, rooms, roomCode) {
    const room = rooms[roomCode];
    if (!room) {
        console.error(`Error: calculateFinalScores called for non-existent room ${roomCode}`);
        return;
    }

    room.votingStarted = false; // Voting is definitely over
    const { players, submissions, votes, currentLetter, categories, refereeId } = room;
    const roundResults = {};
    const validAnswers = {}; // Answers deemed valid by the referee

    // Iterate through the referee's votes (which are stored in room.votes)
    // The `submitVotes` handler now ensures `room.votes` contains only the referee's decisions.
    Object.keys(votes).forEach(answer => {
        const answerVotes = votes[answer];
        // If the referee approved the answer (approve count is 1)
        if (answerVotes.approve > 0) {
            validAnswers[answer] = true;
        }
    });

    // Calculate scores for each player
    players.forEach(player => {
        const playerAnswers = submissions[player.id] || {};
        let roundScore = 0;
        const scoresByCategory = {};

        // Determine unique/shared answers for point calculation
        const answersCountPerCategory = {};
        categories.forEach(category => {
            const tempCategoryAnswers = {};
            players.forEach(p => {
                const ans = (submissions[p.id]?.[category] || "").trim().toLowerCase();
                if (ans && validAnswers[ans]) { // Only count if valid by referee
                    tempCategoryAnswers[ans] = (tempCategoryAnswers[ans] || 0) + 1;
                }
            });
            answersCountPerCategory[category] = tempCategoryAnswers;
        });

        categories.forEach(category => {
            const playerAnswer = (playerAnswers[category] || "").trim().toLowerCase();
            let points = 0;

            // Check if the answer starts with the correct letter AND is deemed valid by the referee
            if (playerAnswer.startsWith(currentLetter.toLowerCase()) && validAnswers[playerAnswer]) {
                const countInThisCategory = answersCountPerCategory[category]?.[playerAnswer] || 0;
                if (countInThisCategory === 1) {
                    points = 15; // Unique & Valid by referee
                } else if (countInThisCategory > 1) {
                    points = 10; // Shared & Valid by referee
                }
            } else {
                // If the answer does not start with the current letter, or it was rejected/not voted by the referee, it gets 0 points.
                points = 0;
            }
            scoresByCategory[category] = points;
            roundScore += points;
        });

        room.playerScores[player.id] += roundScore;
        roundResults[player.id] = {
            username: player.username,
            roundScore: roundScore,
            totalScore: room.playerScores[player.id],
            scores: scoresByCategory, // Score per category for this player
            answers: playerAnswers // Player's submitted answers
        };
    });

    // Emit 'roundOver' event with the calculated results to all clients in the room
    console.log(`Oda: ${roomCode}, Tur: ${room.currentRound} bitti. Sonuçlar gönderiliyor.`);
    io.to(roomCode).emit('roundOver', Object.values(roundResults));

    // Check if the game has finished all rounds or if a new round should start
    if (room.currentRound >= room.totalRounds) {
        console.log(`Oda: ${roomCode}, Oyun bitti. Final sonuçlar gönderiliyor.`);
        io.to(roomCode).emit('gameOver', Object.values(roundResults).sort((a,b) => b.totalScore - a.totalScore));
        delete rooms[roomCode]; // Remove the room from active rooms
    } else {
        // Start a new round after a short delay
        console.log(`Oda: ${roomCode}, Yeni tur 10 saniye içinde başlıyor.`);
        setTimeout(() => startNewRound(io, rooms, roomCode), 10000);
    }
}

// --- SOCKET OLAYLARI (Event Handlers Registration) ---
// This module exports a function that takes the `io` instance and `rooms` object
// and registers all individual socket handlers.
module.exports = (io, rooms) => {
    io.on('connection', (socket) => {
        console.log(`Yeni bir kullanıcı bağlandı: ${socket.id}`);

        // Register individual socket handlers, passing necessary dependencies
        // Helper functions (startNewRound, etc.) are passed if they need to be called
        // from within these handlers.
        createRoomHandler(socket, io, rooms);
        joinRoomHandler(socket, io, rooms);
        // startGameHandler needs startNewRound to initiate the game
        startGameHandler(socket, io, rooms, startNewRound);
        // submitAnswersHandler needs startVotingPhase to transition after all answers
        submitAnswersHandler(socket, io, rooms, startVotingPhase);
        // submitVotesHandler needs calculateFinalScores to finalize the round after referee vote
        submitVotesHandler(socket, io, rooms, calculateFinalScores);
        // disconnectHandler needs helper functions to adjust game state if players leave
        disconnectHandler(socket, io, rooms, startVotingPhase, calculateFinalScores);
    });
};