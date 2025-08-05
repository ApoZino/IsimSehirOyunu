module.exports = (socket, io, rooms) => {
    socket.on('submitDispute', ({ roomCode, submissionId }) => {
        const room = rooms[roomCode];
        if (room && room.disputePhase) {
            room.disputes[submissionId] = (room.disputes[submissionId] || 0) + 1;
            io.to(roomCode).emit('answerDisputed', submissionId);
        }
    });
};