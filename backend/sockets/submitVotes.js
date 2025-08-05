module.exports = (socket, io, rooms, calculateFinalScores) => {
    socket.on('submitVotes', ({ roomCode, playerVotes }) => {
        const room = rooms[roomCode];
        if (room && room.votingStarted && socket.id === room.refereeId) {
            room.votes = playerVotes;
            clearTimeout(room.timerId);
            calculateFinalScores(io, rooms, roomCode);
        }
    });
};