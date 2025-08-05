module.exports = (socket, io, rooms, startDisputePhase) => {
    socket.on('submitAnswers', ({ roomCode, answers }) => {
        const room = rooms[roomCode];
        if (room && room.gameStarted && !room.submissions[socket.id]) {
            room.submissions[socket.id] = answers;
            if (Object.keys(room.submissions).length === room.players.length) {
                clearTimeout(room.timerId);
                startDisputePhase(io, rooms, roomCode);
            }
        }
    });
};