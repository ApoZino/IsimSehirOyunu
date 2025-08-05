module.exports = (socket, io, rooms) => {
    socket.on('joinRoom', ({ roomCode, username }) => {
        const room = rooms[roomCode];
        if (room) {
            if(room.gameStarted || room.votingStarted || room.disputePhase) {
                return socket.emit('error', {message: 'Oyun şu anda aktif. Daha sonra tekrar deneyin.'});
            }
            const player = { id: socket.id, username, isReferee: false };
            room.players.push(player);
            rooms[roomCode].playerScores[socket.id] = 0;
            socket.join(roomCode);
            socket.emit('roomJoined', { roomCode, players: room.players, refereeId: room.refereeId });
            io.to(roomCode).emit('playerJoined', room.players);
        } else {
            socket.emit('error', { message: 'Oda bulunamadı.' });
        }
    });
};