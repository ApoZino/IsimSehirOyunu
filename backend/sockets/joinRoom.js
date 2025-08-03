// sockets/joinRoom.js
module.exports = (socket, io, rooms) => {
    socket.on('joinRoom', ({ roomCode, username }) => {
        const room = rooms[roomCode];
        if (room) {
            if(room.gameStarted || room.votingStarted) {
                return socket.emit('error', {message: 'Oyun çoktan başladı veya oylama devam ediyor. Katılamazsınız.'});
            }
            const player = { id: socket.id, username };
            room.players.push(player);
            rooms[roomCode].playerScores[socket.id] = 0;
            socket.join(roomCode);
            socket.emit('roomJoined', { roomCode, players: room.players });
            socket.to(roomCode).emit('playerJoined', room.players); // Notify others in the room
            console.log(`${username} odaya katıldı: ${roomCode}`);
        } else {
            socket.emit('error', { message: 'Oda bulunamadı.' });
            console.log(`${username} geçersiz oda koduyla katılmaya çalıştı: ${roomCode}`);
        }
    });
};