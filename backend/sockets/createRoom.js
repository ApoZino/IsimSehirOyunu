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
            refereeId: socket.id, // Hakem: Odayı kuran kişi hakem olur
        };

        const player = { id: socket.id, username, isReferee: true }; // Hakem: Oyuncuyu hakem olarak işaretle
        rooms[roomCode].players.push(player);
        rooms[roomCode].playerScores[socket.id] = 0;
        socket.join(roomCode);

        // Odayı oluşturma bilgisini güncel oyuncu bilgisi (isReferee dahil) ve hakem ID'si ile gönder
        socket.emit('roomCreated', { roomCode, players: rooms[roomCode].players, refereeId: rooms[roomCode].refereeId });
        console.log(`Oda oluşturuldu: ${roomCode} tarafından ${username}. Hakem: ${username} (${socket.id})`);
    });
};