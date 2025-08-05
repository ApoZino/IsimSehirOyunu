const createRoomHandler = require('./createRoom');
const joinRoomHandler = require('./joinRoom');
const startGameHandler = require('./startGame');
const submitAnswersHandler = require('./submitAnswers');
const submitVotesHandler = require('./submitVotes');
const submitDisputeHandler = require('./submitDispute');
const disconnectHandler = require('./disconnect');
const chatHandler = require('./chatHandler');

// --- ÇEKİRDEK OYUN FONKSİYONLARI ---

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
    const DURATION = 300;
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
    
    const disputedSubmissions = {};
    room.players.forEach(p => {
        const playerAnswers = room.submissions[p.id] || {};
        Object.keys(playerAnswers).forEach(category => {
            const answer = playerAnswers[category];
            if (answer) {
                const submissionId = `${p.id}|${category.toLowerCase()}|${answer.trim().toLowerCase()}`;
                if(room.disputes[submissionId]) {
                    if (!disputedSubmissions[p.id]) disputedSubmissions[p.id] = {};
                    disputedSubmissions[p.id][category] = answer;
                }
            }
        });
    });

    if (Object.keys(room.disputes).length === 0) {
        calculateFinalScores(io, rooms, roomCode);
    } else {
        startVotingPhase(io, rooms, roomCode, disputedSubmissions);
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
    const room = rooms[roomCode];
    if (!room) return;
    
    room.votingStarted = false;
    room.disputePhase = false;

    const { players, submissions, votes, currentLetter, categories, disputes } = room;
    const roundResults = {};

    try {
        const answersCount = {};
        categories.forEach(cat => {
            answersCount[cat] = {};
        });

        // 1. Adım: Tüm geçerli cevapları say
        players.forEach(player => {
            const playerAnswers = submissions[player.id] || {};
            categories.forEach(category => {
                const answer = (playerAnswers[category] || "").trim().toLowerCase();
                if (!answer) return;

                const submissionId = `${player.id}|${category}|${answer}`;
                const isDisputed = disputes && disputes[submissionId];
                const refereeVote = votes ? votes[submissionId] : undefined;
                let isApproved = !isDisputed || refereeVote === 'approve';

                if (isApproved && answer.startsWith(currentLetter.toLowerCase())) {
                    answersCount[category][answer] = (answersCount[category][answer] || 0) + 1;
                }
            });
        });

        // 2. Adım: Her oyuncu için puanları hesapla
        players.forEach(player => {
            const playerAnswers = submissions[player.id] || {};
            let roundScore = 0;
            const scoresByCategory = {};

            categories.forEach(category => {
                const answer = (playerAnswers[category] || "").trim().toLowerCase();
                let points = 0;

                const submissionId = `${player.id}|${category}|${answer}`;
                const isDisputed = disputes && disputes[submissionId];
                const refereeVote = votes ? votes[submissionId] : undefined;
                
                let isApproved = !isDisputed || refereeVote === 'approve';

                if (answer && answer.startsWith(currentLetter.toLowerCase()) && isApproved) {
                    const count = answersCount[category][answer] || 0;
                    if (count === 1) {
                        points = 10;
                    } else if (count > 1) {
                        points = 5;
                    }
                }
                
                const capitalizedCategory = category.charAt(0).toUpperCase() + category.slice(1);
                scoresByCategory[capitalizedCategory] = points;
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

        const finalResults = Object.values(roundResults);
        io.to(roomCode).emit('roundOver', finalResults);

        if (room.currentRound >= room.totalRounds) {
            io.to(roomCode).emit('gameOver', finalResults.sort((a,b) => b.totalScore - a.totalScore));
            delete rooms[roomCode];
        } else {
            setTimeout(() => startNewRound(io, rooms, roomCode), 10000);
        }
    } catch (e) {
        console.error(`!!!! PUANLAMA SIRASINDA KRİTİK HATA !!!! Oda: ${roomCode}`, e);
        io.to(roomCode).emit('error', { message: 'Puanlama sırasında sunucuda bir hata oluştu.' });
    }
}


// --- ANA BAĞLANTI YÖNETİCİSİ ---
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
        chatHandler(socket, io, rooms);
    });
};