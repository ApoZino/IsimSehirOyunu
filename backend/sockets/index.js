const createRoomHandler = require('./createRoom');
const joinRoomHandler = require('./joinRoom');
const startGameHandler = require('./startGame');
const submitAnswersHandler = require('./submitAnswers');
const submitVotesHandler = require('./submitVotes');
const submitDisputeHandler = require('./submitDispute');
const disconnectHandler = require('./disconnect');

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
        console.log(`Hiç itiraz yok, doğrudan puanlama. Oda: ${roomCode}`);
        calculateFinalScores(io, rooms, roomCode);
    } else {
        console.log(`${Object.keys(room.disputes).length} itiraz var, oylama başlıyor. Oda: ${roomCode}`);
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
    if (!room) {
        console.error(`HATA: calculateFinalScores içinde oda bulunamadı: ${roomCode}`);
        return;
    }
    
    console.log(`--- Puan Hesaplanıyor: Oda ${roomCode}, Tur ${room.currentRound} ---`);
    room.votingStarted = false;
    room.disputePhase = false; // Her ihtimale karşı

    const { players, submissions, votes, currentLetter, categories, disputes } = room;
    const roundResults = {};

    try {
        players.forEach(player => {
            const playerAnswers = submissions[player.id] || {};
            let roundScore = 0;
            const scoresByCategory = {};

            categories.forEach(category => {
                const catLower = category.toLowerCase();
                const answer = (playerAnswers[catLower] || "").trim().toLowerCase();
                const submissionId = `${player.id}|${catLower}|${answer}`;
                let points = 0;
                
                const isDisputed = disputes && disputes[submissionId];
                const refereeVote = votes ? votes[submissionId] : undefined;

                let isApproved = false;
                if (!isDisputed) {
                    isApproved = true; // İtiraz yoksa, onaylanmış say
                } else if (refereeVote === 'approve') {
                    isApproved = true; // İtiraz var ama hakem onayladı
                }

                if (answer && answer.startsWith(currentLetter.toLowerCase()) && isApproved) {
                    let count = 0;
                    players.forEach(p => {
                        const otherAnswer = (submissions[p.id]?.[catLower] || "").trim().toLowerCase();
                        if(otherAnswer === answer) {
                           const otherSubId = `${p.id}|${catLower}|${otherAnswer}`;
                           const otherIsDisputed = disputes && disputes[otherSubId];
                           const otherRefereeVote = votes ? votes[otherSubId] : undefined;
                           if (!otherIsDisputed || otherRefereeVote === 'approve') {
                               count++;
                           }
                        }
                    });
                    if (count === 1) points = 15;
                    else if (count > 1) points = 10;
                } else if (answer && answer.startsWith(currentLetter.toLowerCase()) && !isApproved) {
                    points = 5;
                }
                scoresByCategory[category.charAt(0).toUpperCase() + category.slice(1)] = points;
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
        console.log(`Puanlama Başarılı. Sonuçlar gönderiliyor: Oda ${roomCode}`);
        io.to(roomCode).emit('roundOver', finalResults);

        if (room.currentRound >= room.totalRounds) {
            console.log(`Oyun Bitti. Oda: ${roomCode}`);
            io.to(roomCode).emit('gameOver', finalResults.sort((a,b) => b.totalScore - a.totalScore));
            delete rooms[roomCode];
        } else {
            console.log(`Yeni tur 10 saniye içinde başlayacak. Oda: ${roomCode}`);
            setTimeout(() => startNewRound(io, rooms, roomCode), 10000);
        }
    } catch (e) {
        console.error(`!!!! PUANLAMA SIRASINDA KRİTİK HATA !!!! Oda: ${roomCode}`);
        console.error(e);
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
    });
};