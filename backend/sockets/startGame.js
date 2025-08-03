// backend/sockets/startGame.js
module.exports = (socket, io, rooms, startNewRound) => {
    socket.on('startGame', ({ roomCode, categories, totalRounds }) => {
        const room = rooms[roomCode];
        // Sadece odanın kurucusu (hakem) oyunu başlatabilir
        if (room && room.players.length > 0 && room.players[0].id === socket.id) {
            if (room.gameStarted) {
                socket.emit('error', { message: 'Oyun zaten başlamış.' });
                return;
            }
            room.totalRounds = totalRounds || 5;
            room.currentRound = 0; // Yeni oyun için sıfırla
            room.categories = categories || ['isim', 'şehir', 'hayvan', 'bitki', 'eşya'];
            // Tüm oyuncuların skorlarını sıfırla
            Object.keys(room.playerScores).forEach(playerId => { room.playerScores[playerId] = 0; });
            
            console.log(`Oda ${roomCode} için oyun başlatıldı. Tur sayısı: ${room.totalRounds}, Kategoriler: ${JSON.stringify(room.categories)}`);
            startNewRound(io, rooms, roomCode); // Yardımcı fonksiyonu çağır
        } else {
            socket.emit('error', { message: 'Sadece odanın kurucusu oyunu başlatabilir veya oda bulunamadı.' });
        }
    });
};