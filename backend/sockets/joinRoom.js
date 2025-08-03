// sockets/joinRoom.js
module.exports = (socket, io, rooms) => {
    socket.on('joinRoom', ({ roomCode, username }) => {
        const room = rooms[roomCode];
        if (room) {
            if(room.gameStarted || room.votingStarted) {
                socket.emit('error', {message: 'Oyun çoktan başladı veya oylama devam ediyor. Katılamazsınız.'});
                return;
            }
            // Katılan oyuncular hakem değildir
            const player = { id: socket.id, username, isReferee: false }; // Hakem: Katılan oyuncu hakem DEĞİLDİR
            room.players.push(player);
            rooms[roomCode].playerScores[socket.id] = 0;
            socket.join(roomCode);

            // Odaya katılma bilgisini güncel oyuncu bilgisi ve hakem ID'si ile gönder
            socket.emit('roomJoined', { roomCode, players: room.players, refereeId: room.refereeId });
            // Odadaki diğerlerine yeni oyuncu katıldığını ve oyuncu listesini güncellemesini bildir
            io.to(roomCode).emit('playerJoined', room.players); // Players array now includes isReferee
            console.log(`${username} odaya katıldı: ${roomCode}`);
        } else {
            socket.emit('error', { message: 'Oda bulunamadı.' });
            console.log(`${username} geçersiz oda koduyla katılmaya çalıştı: ${roomCode}`);
        }
    });
};