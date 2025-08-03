// sockets/joinRoom.js
module.exports = (socket, io, rooms) => {
    socket.on('joinRoom', ({ roomCode, username }) => {
        const room = rooms[roomCode];
        if (room) {
            if(room.gameStarted || room.votingStarted) {
                return socket.emit('error', {message: 'Oyun çoktan başladı veya oylama devam ediyor. Katılamazsınız.'});
            }
            // Players joining are not referees
            const player = { id: socket.id, username, isReferee: false }; // <-- NEW: Player joining is NOT a referee
            room.players.push(player);
            rooms[roomCode].playerScores[socket.id] = 0;
            socket.join(roomCode);

            // Emit room joined with updated player info and refereeId
            socket.emit('roomJoined', { roomCode, players: room.players, refereeId: room.refereeId });
            // Notify others in the room about the new player and update the player list
            socket.to(roomCode).emit('playerJoined', room.players); // Players array now includes isReferee
            console.log(`${username} odaya katıldı: ${roomCode}`);
        } else {
            socket.emit('error', { message: 'Oda bulunamadı.' });
            console.log(`${username} geçersiz oda koduyla katılmaya çalıştı: ${roomCode}`);
        }
    });
};