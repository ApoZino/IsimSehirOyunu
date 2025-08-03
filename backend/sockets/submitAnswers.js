// sockets/submitAnswers.js
module.exports = (socket, io, rooms, startVotingPhase) => {
    socket.on('submitAnswers', ({ roomCode, answers }) => {
        const room = rooms[roomCode];
        // Oda var mı ve oyun başladı mı? Ayrıca oyuncu zaten cevap göndermemiş mi?
        if (room && room.gameStarted && !room.submissions[socket.id]) {
            room.submissions[socket.id] = answers;
            console.log(`Cevap alındı (${socket.id}) oda ${roomCode} için.`);

            const submittedPlayerCount = Object.keys(room.submissions).length;
            const totalPlayers = room.players.length;

            // NEW: Eğer bu, ilk cevap veren oyuncuysa (veya son oyuncu değilse)
            // ve birden fazla oyuncu varsa (çünkü tek oyuncuda son sayım olmaz)
            if (totalPlayers > 1 && submittedPlayerCount === 1) { // Bu, ilk cevap veren oyuncuysa
                // 15 saniyelik geri sayımı başlat
                const FINAL_COUNTDOWN_DURATION = 15;
                room.finalCountdownStarted = true; // Durumu işaretle
                
                // Mevcut tur zamanlayıcısını temizle ve 15 saniyelik yeni bir sayacı başlat
                clearTimeout(room.timerId); // Mevcut tur zamanlayıcısını durdur

                // Client'a 'finalCountdown' olayını gönder
                io.to(roomCode).emit('finalCountdown', { duration: FINAL_COUNTDOWN_DURATION });
                console.log(`Oda ${roomCode} için son 15 saniye geri sayımı başlatıldı.`);

                // 15 saniye sonra oylama aşamasına geç
                room.timerId = setTimeout(() => startVotingPhase(io, rooms, roomCode), FINAL_COUNTDOWN_DURATION * 1000);

            } else if (submittedPlayerCount === totalPlayers) {
                // NEW: Tüm oyuncular cevap verdiyse (son 15 saniye beklenmeden)
                // Mevcut zamanlayıcıyı temizle ve hemen oylama aşamasına geç
                console.log(`Tüm cevaplar oda ${roomCode} için toplandı. Oylama aşamasına geçiliyor.`);
                clearTimeout(room.timerId); // Mevcut tur veya son geri sayım zamanlayıcısını durdur
                startVotingPhase(io, rooms, roomCode);
            }
            // NOT: Eğer ilk oyuncu değilse ama tüm oyuncular da cevap vermediyse, hiçbir şey yapılmaz,
            // diğer oyuncuların cevapları beklenir veya ana tur zamanlayıcısı devam eder.
        } else {
            // Hata durumu logunu düzeltildi
            console.warn(`Cevap gönderilemedi (${socket.id}): Oyun başlamadı, zaten cevap gönderdiniz veya oda bulunamadı. Oda: ${roomCode}, GameStarted: ${room?.gameStarted}, Zaten Gönderildi: ${room?.submissions[socket.id]}`);
            socket.emit('error', { message: 'Cevap gönderilemedi: Oyun başlamadı, zaten cevap gönderdiniz veya oda bulunamadı.' });
        }
    });
};