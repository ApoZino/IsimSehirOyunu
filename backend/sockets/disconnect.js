// sockets/disconnect.js
module.exports = (socket, io, rooms, startVotingPhase, calculateFinalScores) => {
    socket.on('disconnect', () => {
        console.log(`Bir kullanıcı ayrıldı: ${socket.id}`);
        for (const roomCode in rooms) {
            const room = rooms[roomCode];
            const playerIndex = room.players.findIndex(player => player.id === socket.id);

            if (playerIndex !== -1) {
                const disconnectedPlayer = room.players[playerIndex];
                room.players.splice(playerIndex, 1); // Oyuncuyu odanın listesinden kaldır
                delete room.playerScores[socket.id]; // Skorunu sil
                delete room.submissions[socket.id]; // Cevaplarını sil
                delete room.playerVotes[socket.id]; // Oylama durumunu sil

                io.to(roomCode).emit('playerLeft', room.players); // Odadaki diğer oyunculara bildir

                if (room.players.length === 0) {
                    // Oda boşalırsa sil ve tüm zamanlayıcıları temizle
                    clearTimeout(room.timerId);
                    delete rooms[roomCode];
                    console.log(`Boş oda silindi: ${roomCode}`);
                } else if (room.gameStarted) {
                    // Oyun aktifken bir oyuncu ayrılırsa, herkesin cevap verip vermediğini kontrol et
                    if (Object.keys(room.submissions).length === room.players.length) {
                        console.log(`Oyun devam ederken bir oyuncu ayrıldı. Kalanlar cevap verdi. ${roomCode} için oylama başlatılıyor.`);
                        clearTimeout(room.timerId);
                        startVotingPhase(io, rooms, roomCode);
                    }
                } else if (room.votingStarted) {
                    // Oylama aktifken bir oyuncu (özellikle hakem) ayrılırsa
                    if (socket.id === room.refereeId) {
                        // Eğer hakem ayrıldıysa, yeni bir hakem atayabiliriz veya oyunu bitirebiliriz.
                        // Şimdilik, Hakem ayrılırsa oylama bitmiş gibi işlem yapıp skorları hesaplayalım.
                        console.log(`Hakem ayrıldı! ${roomCode} için skorlar hesaplanıyor.`);
                        clearTimeout(room.timerId);
                        calculateFinalScores(io, rooms, roomCode);
                    }
                    // Eğer hakem dışındaki bir oyuncu ayrıldıysa, hakem zaten tek başına oy verdiği için sorun yok.
                }
                break; // Oyuncu bulundu ve işlem yapıldı, diğer odaları kontrol etmeye gerek yok
            }
        }
    });
};