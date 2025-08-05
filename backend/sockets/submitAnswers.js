module.exports = (socket, io, rooms, startDisputePhase) => {
    socket.on('submitAnswers', ({ roomCode, answers }) => {
        const room = rooms[roomCode];
        // Oda var mı, oyun cevap gönderme aşamasında mı ve oyuncu zaten cevap göndermemiş mi?
        if (room && room.gameStarted && !room.submissions[socket.id]) {
            
            room.submissions[socket.id] = answers;
            console.log(`Cevap alındı: ${socket.id}. Toplam cevap: ${Object.keys(room.submissions).length}/${room.players.length}`);

            const submittedPlayerCount = Object.keys(room.submissions).length;
            const totalPlayers = room.players.length;

            // ---- KRİTİK KONTROL ----
            // Eğer cevap verenlerin sayısı odadaki oyuncu sayısına eşitse, turu bitir.
            if (submittedPlayerCount === totalPlayers) {
                console.log(`Tüm cevaplar oda ${roomCode} için toplandı. Süre beklemeden itiraz aşamasına geçiliyor.`);
                clearTimeout(room.timerId); // Mevcut zamanlayıcıyı (5dk veya 15sn) durdur
                startDisputePhase(io, rooms, roomCode); // Bir sonraki aşamayı hemen başlat
            }
            // Eğer ilk cevap veren oyuncuysa ve birden fazla oyuncu varsa 15sn sayacını başlat
            else if (totalPlayers > 1 && submittedPlayerCount === 1) {
                const FINAL_COUNTDOWN_DURATION = 15;
                clearTimeout(room.timerId); // 5 dakikalık ana zamanlayıcıyı durdur
                io.to(roomCode).emit('finalCountdown', { duration: FINAL_COUNTDOWN_DURATION });
                console.log(`Oda ${roomCode} için son 15 saniye geri sayımı başlatıldı.`);
                room.timerId = setTimeout(() => startDisputePhase(io, rooms, roomCode), FINAL_COUNTDOWN_DURATION * 1000);
            }
        }
    });
};