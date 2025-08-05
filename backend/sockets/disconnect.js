module.exports = (socket, io, rooms, startDisputePhase, calculateFinalScores) => {
    socket.on('disconnect', () => {
        console.log(`Bir kullanıcı ayrıldı: ${socket.id}`);
        for (const roomCode in rooms) {
            const room = rooms[roomCode];
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                const wasReferee = room.players[playerIndex].isReferee;
                room.players.splice(playerIndex, 1);
                io.to(roomCode).emit('playerLeft', room.players);
                if (room.players.length === 0) {
                    clearTimeout(room.timerId);
                    delete rooms[roomCode];
                } else if (wasReferee) {
                    const newReferee = room.players[0];
                    newReferee.isReferee = true;
                    room.refereeId = newReferee.id;
                    io.to(roomCode).emit('newRefereeAssigned', {
                        newRefereeId: newReferee.id,
                        updatedPlayers: room.players
                    });
                }
                break;
            }
        }
    });
};