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

    room.votingStarted = false; // Oylama kesinlikle bitti
    const { players, submissions, votes, currentLetter, categories, refereeId } = room;
    const roundResults = {};
    const validAnswers = {}; // Hakem tarafından geçerli kabul edilen cevaplar

    // Hakemin oyları üzerinde döngü yap (room.votes içinde sadece hakemin kararları bulunur)
    Object.keys(votes).forEach(answer => {
        const answerVotes = votes[answer];
        // Eğer hakem cevabı onayladıysa (approve sayısı 1'den büyükse)
        if (answerVotes.approve > 0) {
            validAnswers[answer] = true;
        }
    });

    // Her oyuncunun puanlarını hesapla
    players.forEach(player => {
        const playerAnswers = submissions[player.id] || {};
        let roundScore = 0;
        const scoresByCategory = {};

        // Tüm oyuncular arasındaki benzersiz/paylaşılan cevapları belirle (puan hesaplaması için)
        const answersCountPerCategory = {};
        categories.forEach(category => {
            const tempCategoryAnswers = {};
            players.forEach(p => {
                const ans = (submissions[p.id]?.[category] || "").trim().toLowerCase();
                if (ans && validAnswers[ans]) { // Sadece hakem tarafından geçerli kabul edildiyse say
                    tempCategoryAnswers[ans] = (tempCategoryAnswers[ans] || 0) + 1;
                }
            });
            answersCountPerCategory[category] = tempCategoryAnswers;
        });

        categories.forEach(category => {
            const playerAnswer = (playerAnswers[category] || "").trim().toLowerCase();
            let points = 0;

            // Cevabın doğru harfle başlayıp başlamadığını VE hakem tarafından geçerli kabul edilip edilmediğini kontrol et
            if (playerAnswer.startsWith(currentLetter.toLowerCase()) && validAnswers[playerAnswer]) {
                const countInThisCategory = answersCountPerCategory[category]?.[playerAnswer] || 0;
                if (countInThisCategory === 1) {
                    points = 15; // Benzersiz ve Hakem tarafından geçerli
                } else if (countInThisCategory > 1) {
                    points = 10; // Paylaşılan ve Hakem tarafından geçerli
                }
            } else {
                // Cevap doğru harfle başlamıyorsa VEYA hakem tarafından reddedildiyse/oylanmadıysa 0 puan.
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
            scores: scoresByCategory, // Oyuncunun kategori başına puanı
            answers: playerAnswers // Oyuncunun gönderdiği cevaplar
        };
    });

    // 'roundOver' olayını hesaplanan sonuçlarla odadaki tüm client'lara gönder
    console.log(`Oda: ${roomCode}, Tur: ${room.currentRound} bitti. Sonuçlar gönderiliyor.`);
    io.to(roomCode).emit('roundOver', Object.values(roundResults));

    // Oyun tüm turları tamamladıysa veya yeni bir tur başlamalıysa kontrol et
    if (room.currentRound >= room.totalRounds) {
        console.log(`Oda: ${roomCode}, Oyun bitti. Final sonuçlar gönderiliyor.`);
        io.to(roomCode).emit('gameOver', Object.values(roundResults).sort((a,b) => b.totalScore - a.totalScore));
        delete rooms[roomCode]; // Odayı aktif odalardan sil
    } else {
        // Kısa bir gecikmeden sonra yeni turu başlat
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