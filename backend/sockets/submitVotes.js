// sockets/submitVotes.js
module.exports = (socket, io, rooms, calculateFinalScores) => {
    socket.on('submitVotes', ({ roomCode, playerVotes }) => {
        const room = rooms[roomCode];

        // 1. Basic room and voting phase checks
        if (!room || !room.votingStarted) {
            console.warn(`Oylar gönderilemedi (${socket.id}): Oda bulunamadı veya oylama başlamadı. Oda: ${roomCode}, RoomExists: ${!!room}, VotingStarted: ${room?.votingStarted}`);
            socket.emit('error', { message: 'Oylar gönderilemedi: Oda bulunamadı veya oylama başlamadı.' });
            return;
        }

        // 2. NEW: Check if the submitter is the referee
        if (socket.id !== room.refereeId) {
            console.warn(`Oylar gönderilemedi (${socket.id}): Sadece hakem oy kullanabilir. Oda: ${roomCode}, Hakem ID: ${room.refereeId}`);
            socket.emit('error', { message: 'Sadece hakem oy kullanabilir.' });
            return;
        }

        // 3. NEW: Check if the referee has already voted for this round
        // This is important because the referee might submit once, then change their mind and re-submit.
        // If the intention is to allow referee to re-submit until time runs out, remove this check.
        // For simplicity, let's assume referee can submit only once per round to advance the game.
        // If referee can change votes, the game will advance when the timer runs out.
        if (room.playerVotes[socket.id]) { // This actually checks if referee already submitted votes
            console.warn(`Oylar gönderilemedi (${socket.id}): Hakem zaten oy kullandı. Oda: ${roomCode}`);
            socket.emit('error', { message: 'Hakem zaten oy kullandı.' });
            return;
        }

        // Mark referee as voted for this round
        room.playerVotes[socket.id] = true;

        // Store the referee's votes.
        // Since only one person votes, we can directly assign their decisions.
        // We can still use room.votes structure, but it will only contain referee's votes.
        room.votes = {}; // Clear previous votes for clarity if referee re-submits (though logic currently prevents it)
        Object.keys(playerVotes).forEach(answer => {
            const normalizedAnswer = answer.trim().toLowerCase();
            room.votes[normalizedAnswer] = {
                approve: playerVotes[answer] === 'approve' ? 1 : 0,
                reject: playerVotes[answer] === 'reject' ? 1 : 0,
            };
        });

        console.log(`Hakem oyları alındı (${socket.id}) oda ${roomCode} için.`);
        console.log(`Mevcut hakem oyları (room.votes):`, room.votes);

        // NEW: Game advances immediately after referee submits votes.
        // No need to check for all players voting anymore.
        console.log(`Oda ${roomCode} için hakem oyları toplandı. Skor hesaplanıyor.`);
        clearTimeout(room.timerId); // Stop the voting timer immediately
        calculateFinalScores(io, rooms, roomCode); // Call the helper function

        // No else block here because only the referee's single submission advances the game.
    });
};