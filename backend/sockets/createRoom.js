// sockets/createRoom.js
module.exports = (socket, io, rooms) => {
    socket.on('createRoom', (username) => {
        let roomCode;
        do { roomCode = Math.random().toString(36).substring(2, 7).toUpperCase(); } while (rooms[roomCode]);
        rooms[roomCode] = {
            players: [],
            playerScores: {},
            submissions: {},
            gameStarted: false, // Initialize state
            votingStarted: false, // Initialize state
            currentRound: 0,
            totalRounds: 0,
            categories: [],
            currentLetter: '',
            votes: {},
            playerVotes: {},
            timerId: null
        };
        const player = { id: socket.id, username };
        rooms[roomCode].players.push(player);
        rooms[roomCode].playerScores[socket.id] = 0;
        socket.join(roomCode);
        socket.emit('roomCreated', { roomCode, players: rooms[roomCode].players });
        console.log(`Oda oluşturuldu: ${roomCode} tarafından ${username}`);
    });
};