module.exports = (socket, io, rooms) => {
    socket.on('createRoom', (username) => {
        let roomCode;
        do { roomCode = Math.random().toString(36).substring(2, 7).toUpperCase(); } while (rooms[roomCode]);
        rooms[roomCode] = {
            players: [], playerScores: {}, submissions: {}, votes: {}, playerVotes: {},
            gameStarted: false, votingStarted: false, disputePhase: false,
            currentRound: 0, totalRounds: 0, categories: [], currentLetter: '',
            timerId: null, refereeId: socket.id,
        };
        const player = { id: socket.id, username, isReferee: true };
        rooms[roomCode].players.push(player);
        rooms[roomCode].playerScores[socket.id] = 0;
        socket.join(roomCode);
        socket.emit('roomCreated', { roomCode, players: rooms[roomCode].players, refereeId: rooms[roomCode].refereeId });
    });
};