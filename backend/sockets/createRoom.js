// sockets/createRoom.js
module.exports = (socket, io, rooms) => {
    socket.on('createRoom', (username) => {
        let roomCode;
        do { roomCode = Math.random().toString(36).substring(2, 7).toUpperCase(); } while (rooms[roomCode]);

        rooms[roomCode] = {
            players: [],
            playerScores: {},
            submissions: {},
            gameStarted: false,
            votingStarted: false,
            currentRound: 0,
            totalRounds: 0,
            categories: [],
            currentLetter: '',
            votes: {},
            playerVotes: {},
            timerId: null,
            refereeId: socket.id, // <-- NEW: Assign the creator as the referee
        };

        const player = { id: socket.id, username, isReferee: true }; // <-- NEW: Mark player as referee
        rooms[roomCode].players.push(player);
        rooms[roomCode].playerScores[socket.id] = 0;
        socket.join(roomCode);

        // Emit room created with updated player info (including isReferee)
        socket.emit('roomCreated', { roomCode, players: rooms[roomCode].players, refereeId: rooms[roomCode].refereeId });
        console.log(`Oda oluşturuldu: ${roomCode} tarafından ${username}. Hakem: ${username} (${socket.id})`);
    });
};