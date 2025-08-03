// sockets/startGame.js
module.exports = (socket, io, rooms, startNewRound) => {
    socket.on('startGame', ({ roomCode, categories, totalRounds }) => {
        const room = rooms[roomCode];
        // Ensure the player is the host (first player in the array)
        if (room && room.players.length > 0 && room.players[0].id === socket.id) {
            if (room.gameStarted) {
                return socket.emit('error', { message: 'Oyun zaten başlamış.' });
            }
            room.totalRounds = totalRounds || 5;
            room.currentRound = 0; // Reset for a new game
            room.categories = categories || ['isim', 'şehir', 'hayvan', 'bitki', 'eşya'];
            Object.keys(room.playerScores).forEach(playerId => { room.playerScores[playerId] = 0; }); // Reset scores
            console.log(`Oda ${roomCode} için oyun başlatıldı. Tur sayısı: ${room.totalRounds}, Kategoriler: ${room.categories.join(', ')}`);
            startNewRound(io, rooms, roomCode); // Call the helper function
        } else {
            socket.emit('error', { message: 'Sadece odanın kurucusu oyunu başlatabilir veya oda bulunamadı.' });
        }
    });
};