// backend/sockets/index.js
const createRoomHandler = require('./createRoom');
const joinRoomHandler = require('./joinRoom');
const startGameHandler = require('./startGame');
const submitAnswersHandler = require('./submitAnswers');
const submitVotesHandler = require('./submitVotes');
const disconnectHandler = require('./disconnect');

// --- YARDIMCI FONKSİYONLAR ---
// Bu fonksiyonlar, çekirdek oyun durumu geçişlerini yönetir ve tüm handler'lar tarafından paylaşılır.

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
    room.votes = {}; // Yeni tur için oyları temizle
    room.playerVotes = {}; // Yeni tur için hakemin oy durumu bilgisini temizle
    room.finalCountdownStarted = false; // Yeni tur için final geri sayım durumunu sıfırla

    const allowedLetters = "ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ";
    const randomLetter = allowedLetters[Math.floor(Math.random() * allowedLetters.length)];
    room.currentLetter = randomLetter;

    const DURATION = 300; // Cevap gönderme aşamasının süresi (5 dakika)
    
    console.log(`Oda: ${roomCode}, Tur: ${room.currentRound}/${room.totalRounds} başlatıldı. Harf: ${randomLetter}`);
    
    io.to(roomCode).emit('gameStarted', {
        letter: randomLetter,
        duration: DURATION,
        categories: room.categories.map(c => c.charAt(0).toUpperCase() + c.slice(1)),
        currentRound: room.currentRound,
        totalRounds: room.totalRounds,
        players: room.players, // Güncel oyuncu listesini (isReferee bayraklı) gönder
        refereeId: room.refereeId // Hakem ID'sini gönder
    });

    // Cevap gönderme aşaması için zamanlayıcıyı ayarla. Süre bitince otomatik olarak oylama aşamasına geç.
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

    room.gameStarted = false; // Cevap gönderme aşaması bitti
    room.votingStarted = true; // Oylama aşaması başladı

    console.log(`Oda ${roomCode} için oylama aşaması başladı (Hakem Oyu bekleniyor).`);
    
    // Client'lara oylama aşaması bilgisini gönder
    io.to(roomCode).emit('votingStarted', {
        submissions: room.submissions, // Gönderilen tüm cevaplar
        players: room.players, // Tüm oyuncular (hakem durumu dahil)
        refereeId: room.refereeId // Hakemin ID'si
    });

    // Hakemin oy kullanmaması durumunda oylama aşaması için zamanlayıcı ayarla.
    const VOTING_DURATION = 60; // Hakem'in oy kullanması için 60 saniye
    room.timerId = setTimeout(() => {
        console.log(`Oda ${roomCode} için hakem oylama süresi doldu. Skor hesaplanıyor.`);
        // Hakem manuel olarak oy göndermediyse 'room.votes' boş olabilir.
        // calculateFinalScores'ın bunu zarifçe işlemesi gerekir (örn. tüm cevaplar 0 puan alır).
        calculateFinalScores(io, rooms, roomCode);
    }, VOTING_DURATION * 1000);
}

function calculateFinalScores(io, rooms, roomCode) {
    const room = rooms[roomCode];
    if (!room) {
        console.error(`Error: calculateFinalScores called for non-existent room ${roomCode}`);
        return;
    }

    room.votingStarted = false; 
    const { players, submissions, votes, currentLetter, categories, refereeId } = room;
    const roundResults = {}; 
    const validAnswers = {}; 

    // Yeni eklenen detaylı loglar:
    console.log(`calculateFinalScores [${roomCode}]: Girdi verileri - CurrentLetter: ${currentLetter}, Categories: ${JSON.stringify(categories)}`);
    console.log(`calculateFinalScores [${roomCode}]: Başlangıç oyuncu listesi: ${JSON.stringify(players.map(p => ({id: p.id, username: p.username})), null, 2)}`);
    console.log(`calculateFinalScores [${roomCode}]: Toplanan cevaplar (submissions): ${JSON.stringify(submissions, null, 2)}`);
    console.log(`calculateFinalScores [${roomCode}]: Toplanan oylar (votes): ${JSON.stringify(votes, null, 2)}`);


    Object.keys(votes).forEach(answer => {
        const answerVotes = votes[answer];
        if (answerVotes.approve > 0) {
            validAnswers[answer] = true;
        }
    });
    console.log(`calculateFinalScores [${roomCode}]: Hakem tarafından geçerli bulunan cevaplar (validAnswers): ${JSON.stringify(validAnswers, null, 2)}`);

    console.log(`calculateFinalScores [${roomCode}]: Oyuncu skorları hesaplanmaya başlanıyor. Toplam oyuncu: ${players.length}`);
    
    players.forEach(player => {
        console.log(`calculateFinalScores [${roomCode}]: Oyuncu ${player.username} (${player.id}) için skor hesaplanıyor.`);
        const playerAnswers = submissions[player.id] || {}; // Oyuncunun cevapları, yoksa boş obje
        console.log(`calculateFinalScores [${roomCode}]:   - Oyuncu cevapları (playerAnswers): ${JSON.stringify(playerAnswers)}`);

        let roundScore = 0;
        const scoresByCategory = {};

        const answersCountPerCategory = {};
        categories.forEach(categoryDisplayForm => { // categories here are capitalized forms like "İsim"
            const categoryLowerCase = categoryDisplayForm.toLowerCase(); // e.g., "i̇sim" or "şehir"
            const tempCategoryAnswers = {};
            
            players.forEach(p => {
                // Access submission using its original category key if available, else lowercase.
                // Assuming client submissions use exact category string as key.
                const originalCategoryKey = Object.keys(submissions[p.id] || {}).find(key => key.toLowerCase() === categoryLowerCase);
                const ans = (submissions[p.id]?.[originalCategoryKey || categoryDisplayForm] || "").trim().toLowerCase(); 
                
                if (ans && validAnswers[ans]) { 
                    tempCategoryAnswers[ans] = (tempCategoryAnswers[ans] || 0) + 1;
                }
            });
            answersCountPerCategory[categoryDisplayForm] = tempCategoryAnswers; // Store by display form
        });
        console.log(`calculateFinalScores [${roomCode}]:   - Kategori bazında cevap sayıları (answersCountPerCategory): ${JSON.stringify(answersCountPerCategory)}`);


        categories.forEach(categoryDisplayForm => { // Iterate through capitalized forms like "İsim"
            // !!! CRITICAL FIX: Get player's answer using the correct category key from playerAnswers !!!
            const originalCategoryKey = Object.keys(playerAnswers).find(key => key.toLowerCase() === categoryDisplayForm.toLowerCase());
            const playerAnswer = (playerAnswers[originalCategoryKey || categoryDisplayForm] || "").trim().toLowerCase(); 

            let points = 0;

            // Puanlama Mantığı BURADA DEĞİŞİYOR
            if (playerAnswer.startsWith(currentLetter.toLowerCase()) && validAnswers[playerAnswer]) {
                // Cevap doğru harfle başlıyor VE hakem tarafından onaylandı
                const countInThisCategory = answersCountPerCategory[categoryDisplayForm]?.[playerAnswer] || 0; 
                
                if (countInThisCategory === 1) {
                    points = 10; // Doğru ve Benzersiz cevap
                } else if (countInThisCategory > 1) {
                    points = 5;  // Doğru ve Paylaşılan (aynı) cevap
                }
            } else {
                // Cevap yanlış harfle başlıyor VEYA hakem reddetti/oylamadı (Yanlış cevap)
                points = 0; 
            }

            scoresByCategory[categoryDisplayForm] = points; 
            roundScore += points;
        });
        console.log(`calculateFinalScores [${roomCode}]:   - Oyuncu ${player.username} için kategori skorları: ${JSON.stringify(scoresByCategory)}`);
        console.log(`calculateFinalScores [${roomCode}]:   - Oyuncu ${player.username} için tur puanı (roundScore): ${roundScore}`);


        // room.playerScores[player.id] değerinin başlangıçta undefined olmaması için kontrol
        room.playerScores[player.id] = (room.playerScores[player.id] || 0) + roundScore;
        roundResults[player.id] = {
            username: player.username,
            roundScore: roundScore,
            totalScore: room.playerScores[player.id],
            scores: scoresByCategory,
            answers: playerAnswers
        };
        console.log(`calculateFinalScores [${roomCode}]:   - Oyuncu ${player.username} için güncel toplam skor: ${room.playerScores[player.id]}`);
    });

    // --- KRİTİK LOG: roundResults'ın içeriğini gönderilmeden önce logla ---
    const finalRoundResultsArray = Object.values(roundResults); // Objeyi diziye çevir
    console.log(`calculateFinalScores [${roomCode}]: Hesaplanan tur sonuçları (finalRoundResultsArray): ${JSON.stringify(finalRoundResultsArray, null, 2)}`);

    io.to(roomCode).emit('roundOver', finalRoundResultsArray); // Dizi olarak gönder
    console.log(`Oda: ${roomCode}, Tur: ${room.currentRound} bitti. Sonuçlar gönderiliyor.`);

    if (room.currentRound >= room.totalRounds) {
        console.log(`Oda: ${roomCode}, Oyun bitti. Final sonuçlar gönderiliyor.`);
        io.to(roomCode).emit('gameOver', finalRoundResultsArray.sort((a,b) => b.totalScore - a.totalScore));
        delete rooms[roomCode];
    } else {
        console.log(`Oda: ${roomCode}, Yeni tur 10 saniye içinde başlıyor.`);
        setTimeout(() => startNewRound(io, rooms, roomCode), 10000);
    }
}

// --- SOCKET OLAYLARI ---
// Bu modül, 'io' örneğini ve 'rooms' objesini alır ve tüm bireysel soket handler'larını kaydeder.
module.exports = (io, rooms) => {
    io.on('connection', (socket) => {
        console.log(`Yeni bir kullanıcı bağlandı: ${socket.id}`);

        // Bireysel soket handler'larını kaydet, gerekli bağımlılıkları geçirerek
        createRoomHandler(socket, io, rooms);
        joinRoomHandler(socket, io, rooms);
        startGameHandler(socket, io, rooms, startNewRound);
        submitAnswersHandler(socket, io, rooms, startVotingPhase);
        submitVotesHandler(socket, io, rooms, calculateFinalScores);
        disconnectHandler(socket, io, rooms, startVotingPhase, calculateFinalScores);
    });
};