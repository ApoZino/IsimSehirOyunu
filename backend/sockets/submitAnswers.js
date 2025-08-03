// sockets/submitAnswers.js
module.exports = (socket, io, rooms, startVotingPhase) => {
    socket.on('submitAnswers', ({ roomCode, answers }) => {
        const room = rooms[roomCode];
        // Check if room exists, game is active, and player hasn't already submitted
        if (room && room.gameStarted && !room.submissions[socket.id]) {
            room.submissions[socket.id] = answers;
            console.log(`Cevap alındı (${socket.id}) oda ${roomCode} için.`);

            // Check if all active players have submitted their answers
            // It's important to check against `room.players.length` or the count of active players
            if (Object.keys(room.submissions).length === room.players.length) {
                console.log(`Tüm cevaplar oda ${roomCode} için toplandı. Oylama aşamasına geçiliyor.`);
                clearTimeout(room.timerId); // Stop the main round timer
                startVotingPhase(io, rooms, roomCode); // Call the helper function
            }
        } else {
            socket.emit('error', { message: 'Cevap gönderilemedi: Oyun başlamadı, zaten cevap gönderdiniz veya oda bulunamadı.' });
        }
    });
};