module.exports = (socket, io, rooms, startNewRound) => {
    socket.on('startGame', ({ roomCode, categories, totalRounds }) => {
        const room = rooms[roomCode];
        if (room && room.players[0]?.id === socket.id) {
            if (room.gameStarted) return socket.emit('error', { message: 'Oyun zaten başlamış.' });
            room.totalRounds = totalRounds || 5;
            room.currentRound = 0;
            room.categories = categories.map(cat => cat.trim().toLowerCase());
            Object.keys(room.playerScores).forEach(playerId => { room.playerScores[playerId] = 0; });
            startNewRound(io, rooms, roomCode);
        } else {
            socket.emit('error', { message: 'Sadece odanın kurucusu oyunu başlatabilir.' });
        }
    });
};