// sockets/disconnect.js
module.exports = (socket, io, rooms, startVotingPhase, calculateFinalScores) => {
    socket.on('disconnect', () => {
        console.log(`Bir kullanıcı ayrıldı: ${socket.id}`);
        for (const roomCode in rooms) {
            const room = rooms[roomCode];
            const playerIndex = room.players.findIndex(player => player.id === socket.id);

            if (playerIndex !== -1) {
                const disconnectedPlayer = room.players[playerIndex];
                room.players.splice(playerIndex, 1); // Remove player from the room's players list
                delete room.playerScores[socket.id]; // Remove their score
                delete room.submissions[socket.id]; // Remove their current round submissions
                delete room.playerVotes[socket.id]; // Remove their current round votes

                io.to(roomCode).emit('playerLeft', room.players); // Notify other players in the room

                if (room.players.length === 0) {
                    // If the room becomes empty, delete it and clear any timers
                    clearTimeout(room.timerId);
                    delete rooms[roomCode];
                    console.log(`Boş oda silindi: ${roomCode}`);
                } else if (room.gameStarted) {
                    // If the game is active and a player leaves, check if everyone else has submitted
                    if (Object.keys(room.submissions).length === room.players.length) {
                        console.log(`Oyun devam ederken bir oyuncu ayrıldı. Kalanlar cevap verdi. ${roomCode} için oylama başlatılıyor.`);
                        clearTimeout(room.timerId);
                        startVotingPhase(io, rooms, roomCode);
                    }
                } else if (room.votingStarted) {
                    // If voting is active and a player leaves, check if everyone else has voted
                    if (Object.keys(room.playerVotes).length === room.players.length) {
                        console.log(`Oylama devam ederken bir oyuncu ayrıldı. Kalanlar oy verdi. ${roomCode} için skorlar hesaplanıyor.`);
                        clearTimeout(room.timerId);
                        calculateFinalScores(io, rooms, roomCode);
                    }
                }
                break; // Player found and handled, no need to check other rooms
            }
        }
    });
};