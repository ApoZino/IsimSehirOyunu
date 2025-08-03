// sockets/submitVotes.js
module.exports = (socket, io, rooms, calculateFinalScores) => {
    socket.on('submitVotes', ({ roomCode, playerVotes }) => {
        const room = rooms[roomCode];

        // 1. Oda ve oyun durumu kontrolleri
        if (room && room.votingStarted) {
            // 2. Oyuncunun zaten oy verip vermediği kontrolü
            if (room.playerVotes[socket.id]) {
                console.warn(`Oylar gönderilemedi (${socket.id}): Zaten oy kullandınız. Oda: ${roomCode}`);
                socket.emit('error', { message: 'Zaten oy kullandınız.' });
                return; // Zaten oy kullandıysa işlemi sonlandır
            }

            // Oyuncuyu oy verenler listesine ekle
            room.playerVotes[socket.id] = true;

            // Oyları toplama
            Object.keys(playerVotes).forEach(answer => {
                const normalizedAnswer = answer.trim().toLowerCase(); // Client'tan gelen anahtarı normalleştir
                if (!room.votes[normalizedAnswer]) {
                    room.votes[normalizedAnswer] = { approve: 0, reject: 0 };
                }

                // Client'tan gelen oy değerini doğrudan kullan
                if (playerVotes[answer] === 'approve') {
                    room.votes[normalizedAnswer].approve++;
                } else if (playerVotes[answer] === 'reject') {
                    room.votes[normalizedAnswer].reject++;
                }
            });

            console.log(`Oylar alındı (${socket.id}) oda ${roomCode} için.`);
            console.log(`Mevcut oylar (room.votes):`, room.votes); // Toplanan tüm oyları logla

            // --- HATA AYIKLAMA İÇİN EK LOGLAR ---
            const playersInRoom = room.players.map(p => p.id);
            const playersWhoVoted = Object.keys(room.playerVotes);

            console.log(`Odadaki toplam oyuncu sayısı (room.players.length): ${room.players.length}`);
            console.log(`Oy vermiş oyuncu sayısı (Object.keys(room.playerVotes).length): ${playersWhoVoted.length}`);
            console.log("Odadaki tüm oyuncu ID'leri:", playersInRoom);
            console.log("Oy veren oyuncu ID'leri:", playersWhoVoted);
            // --- EK LOGLAR SONU ---

            // 3. Tüm oyuncuların oy verip vermediği kontrolü
            if (playersWhoVoted.length === room.players.length) {
                console.log(`Tüm oylar oda ${roomCode} için toplandı. Skor hesaplanıyor.`);
                clearTimeout(room.timerId); // Oylama süresini durdur
                calculateFinalScores(io, rooms, roomCode); // Skorları hesapla
            } else {
                console.log(`Oda ${roomCode} için tüm oylar henüz gelmedi. Bekleniyor...`);
            }
        } else {
            // 4. Oda veya oylama durumu geçersizse
            console.warn(`Oylar gönderilemedi (${socket.id}): Oda bulunamadı veya oylama başlamadı. Oda: ${roomCode}, RoomExists: ${!!room}, VotingStarted: ${room?.votingStarted}`);
            socket.emit('error', { message: 'Oylar gönderilemedi: Oda bulunamadı veya oylama başlamadı.' });
        }
    });
};