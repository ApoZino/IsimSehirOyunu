// sockets/submitAnswers.js
module.exports = (socket, io, rooms, startVotingPhase) => {
    socket.on('submitAnswers', ({ roomCode, answers }) => {
        const room = rooms[roomCode];
        // Oda var mı, oyun başladı mı ve oyuncu zaten cevap göndermemiş mi?
        if (room && room.gameStarted && !room.submissions[socket.id]) {
            room.submissions[socket.id] = answers;
            console.log(`Cevap alındı (${socket.id}) oda ${roomCode} için. Gönderilen cevaplar: ${JSON.stringify(answers)}`);

            const submittedPlayerCount = Object.keys(room.submissions).length;
            const totalPlayers = room.players.length;

            // Eğer bu, ilk cevap veren oyuncuysa (ve birden fazla oyuncu varsa)
            if (totalPlayers > 1 && submittedPlayerCount === 1) {
                const FINAL_COUNTDOWN_DURATION = 15; // 15 saniye son geri sayım
                room.finalCountdownStarted = true; // Durumu işaretle
                
                // Mevcut tur zamanlayıcısını durdur
                clearTimeout(room.timerId);

                // Client'a 'finalCountdown' olayını gönder
                io.to(roomCode).emit('finalCountdown', { duration: FINAL_COUNTDOWN_DURATION });
                console.log(`Oda ${roomCode} için son 15 saniye geri sayımı başlatıldı.`);

                // 15 saniye sonra oylama aşamasına geç
                room.timerId = setTimeout(() => startVotingPhase(io, rooms, roomCode), FINAL_COUNTDOWN_DURATION * 1000);

            } else if (submittedPlayerCount === totalPlayers) {
                // Tüm oyuncular cevap verdiyse (son 15 saniye beklenmeden)
                console.log(`Tüm cevaplar oda ${roomCode} için toplandı. Oylama aşamasına geçiliyor.`);
                clearTimeout(room.timerId); // Mevcut tur veya son geri sayım zamanlayıcısını durdur
                startVotingPhase(io, rooms, roomCode);
            }
        } else {
            console.warn(`Cevap gönderilemedi (${socket.id}): Oyun başlamadı, zaten cevap gönderdiniz veya oda bulunamadı. Oda: ${roomCode}, GameStarted: ${room?.gameStarted}, Zaten Gönderildi: ${room?.submissions[socket.id]}`);
            socket.emit('error', { message: 'Cevap gönderilemedi: Oyun başlamadı, zaten cevap gönderdiniz veya oda bulunamadı.' });
        }
    });
};