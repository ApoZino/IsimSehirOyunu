module.exports = (socket, io, rooms) => {
    socket.on('sendMessage', ({ roomCode, message }) => {
        const room = rooms[roomCode];
        if (room) {
            const sender = room.players.find(p => p.id === socket.id);
            if (sender) {
                const messageData = {
                    senderUsername: sender.username,
                    text: message,
                    timestamp: new Date()
                };
                // Mesajı odadaki herkese (gönderen dahil) gönder
                io.to(roomCode).emit('newMessage', messageData);
            }
        }
    });
};