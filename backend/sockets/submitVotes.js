// sockets/submitVotes.js
module.exports = (socket, io, rooms, calculateFinalScores) => {
    socket.on('submitVotes', ({ roomCode, playerVotes }) => {
        const room = rooms[roomCode];

        // 1. Basic room and voting phase checks
        if (!room) {
            console.warn(`Oylar gönderilemedi (${socket.id}): Oda bulunamadı. Oda Kodu: ${roomCode}`);
            socket.emit('error', { message: 'Oylar gönderilemedi: Oda bulunamadı.' });
            return;
        }
        if (!room.votingStarted) {
            console.warn(`Oylar gönderilemedi (${socket.id}): Oylama aşaması başlamadı. Oda Kodu: ${roomCode}`);
            socket.emit('error', { message: 'Oylar gönderilemedi: Oylama aşaması başlamadı.' });
            return;
        }

        // 2. NEW: Check if the submitter is the referee
        if (socket.id !== room.refereeId) {
            console.warn(`Oylar gönderilemedi (${socket.id}): Sadece hakem oy kullanabilir. Oda Kodu: ${roomCode}, Hakem ID: ${room.refereeId}`);
            socket.emit('error', { message: 'Sadece hakem oy kullanabilir.' });
            return; // If not referee, stop here
        }

        // 3. NEW: Check if the referee has already submitted votes for this round
        // This prevents the referee from submitting multiple times for the same round
        // to advance the game. If you want the referee to be able to change their
        // vote until the timer runs out, remove this check.
        if (room.playerVotes[socket.id]) { // Checks if referee's ID is already in playerVotes
            console.warn(`Oylar gönderilemedi (${socket.id}): Hakem bu turda zaten oy kullandı. Oda Kodu: ${roomCode}`);
            socket.emit('error', { message: 'Hakem bu turda zaten oy kullandı.' });
            return;
        }

        // Mark referee as having submitted their vote for this round
        room.playerVotes[socket.id] = true;

        // Store the referee's votes.
        // As only the referee votes, we directly populate room.votes with their decisions.
        room.votes = {}; // Clear previous votes (if any, though theoretically cleared at round start)
        Object.keys(playerVotes).forEach(answer => {
            const normalizedAnswer = answer.trim().toLowerCase();
            room.votes[normalizedAnswer] = {
                approve: playerVotes[answer] === 'approve' ? 1 : 0,
                reject: playerVotes[answer] === 'reject' ? 1 : 0,
            };
        });

        console.log(`Hakem oyları alındı (${socket.id}) oda ${roomCode} için.`);
        console.log(`Mevcut hakem oyları (room.votes):`, JSON.stringify(room.votes, null, 2));

        // Since the referee's vote is the only one needed to advance the game,
        // we immediately proceed to score calculation.
        console.log(`Oda ${roomCode} için hakem oyları toplandı. Skor hesaplanıyor.`);
        clearTimeout(room.timerId); // Stop the voting phase timer immediately
        calculateFinalScores(io, rooms, roomCode); // Call the helper function to calculate scores
    });
};