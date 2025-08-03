// backend/sockets/submitVotes.js
module.exports = (socket, io, rooms, calculateFinalScores) => {
    socket.on('submitVotes', ({ roomCode, playerVotes }) => {
        const room = rooms[roomCode];

        if (!room) {
            console.warn(`submitVotes: Oda bulunamadı (${socket.id}). Oda Kodu: ${roomCode}`);
            socket.emit('error', { message: 'Oylar gönderilemedi: Oda bulunamadı.' });
            return;
        }
        if (!room.votingStarted) {
            console.warn(`submitVotes: Oylama aşaması başlamadı (${socket.id}). Oda Kodu: ${roomCode}`);
            socket.emit('error', { message: 'Oylar gönderilemedi: Oylama aşaması başlamadı.' });
            return;
        }

        // HAKEM KONTROLÜ: Sadece hakemin oy kullanmasına izin ver
        if (socket.id !== room.refereeId) {
            console.warn(`submitVotes: Yetkisiz oy denemesi (${socket.id}). Sadece hakem oy kullanabilir. Oda Kodu: ${roomCode}, Hakem ID: ${room.refereeId}`);
            socket.emit('error', { message: 'Sadece hakem oy kullanabilir.' });
            return;
        }

        // Hakem zaten oy kullandı mı kontrolü (bir turda sadece bir kez oy hakkı varsa)
        if (room.playerVotes[socket.id]) {
            console.warn(`submitVotes: Hakem bu turda zaten oy kullandı (${socket.id}). Oda Kodu: ${roomCode}`);
            socket.emit('error', { message: 'Hakem bu turda zaten oy kullandı.' });
            return;
        }

        // Hakem olarak işaretle
        room.playerVotes[socket.id] = true;

        // Hakemin oylarını sakla (room.votes içinde sadece hakemin kararları bulunur)
        room.votes = {}; // Önceki oyları temizle (emin olmak için)
        Object.keys(playerVotes).forEach(answer => {
            const normalizedAnswer = answer.trim().toLowerCase();
            room.votes[normalizedAnswer] = {
                approve: playerVotes[answer] === 'approve' ? 1 : 0,
                reject: playerVotes[answer] === 'reject' ? 1 : 0,
            };
        });

        console.log(`submitVotes: Hakem oyları alındı (${socket.id}) oda ${roomCode} için.`);
        console.log(`submitVotes: Mevcut hakem oyları (room.votes):`, JSON.stringify(room.votes, null, 2));

        // Hakem oyunu gönderdiği anda turu bitir ve skor hesapla
        console.log(`submitVotes: Oda ${roomCode} için hakem oyları toplandı. Skor hesaplanıyor.`);
        clearTimeout(room.timerId); // Oylama süresini durdur
        calculateFinalScores(io, rooms, roomCode); // Skorları hesapla
    });
};