// sockets/submitVotes.js
module.exports = (socket, io, rooms, calculateFinalScores) => {
    socket.on('submitVotes', ({ roomCode, playerVotes }) => {
        const room = rooms[roomCode];
        if (room && room.votingStarted && !room.playerVotes[socket.id]) { // Ensure player hasn't voted yet
            room.playerVotes[socket.id] = true; // Mark player as voted
            Object.keys(playerVotes).forEach(answer => {
                const normalizedAnswer = answer.trim().toLowerCase(); // Normalize for consistent voting
                if (!room.votes[normalizedAnswer]) room.votes[normalizedAnswer] = { approve: 0, reject: 0 };
                if (playerVotes[answer] === 'approve') room.votes[normalizedAnswer].approve++;
                else if (playerVotes[answer] === 'reject') room.votes[normalizedAnswer].reject++;
            });
            console.log(`Oylar alındı (${socket.id}) oda ${roomCode} için.`);

            // Check if all players have submitted their votes
            if (Object.keys(room.playerVotes).length === room.players.length) {
                console.log(`Tüm oylar oda ${roomCode} için toplandı. Skor hesaplanıyor.`);
                clearTimeout(room.timerId); // Stop the voting timer
                calculateFinalScores(io, rooms, roomCode); // Call the helper function
            }
        } else {
            socket.emit('error', { message: 'Oylar gönderilemedi: Oylama başlamadı, zaten oy kullandınız veya oda bulunamadı.' });
        }
    });
};