const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

// --- KULLANICI KAYIT ENDPOINT'İ ---
// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    // Basit kontrol
    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Tüm alanlar gereklidir.' });
    }

    try {
        // Kullanıcı veya email daha önce alınmış mı kontrol et
        const existingUser = await prisma.user.findFirst({
            where: { OR: [{ email: email }, { username: username }] }
        });

        if (existingUser) {
            return res.status(400).json({ message: 'Bu email veya kullanıcı adı zaten kullanılıyor.' });
        }

        // Şifreyi hash'le
        const hashedPassword = await bcrypt.hash(password, 10);

        // Yeni kullanıcıyı veritabanına oluştur
        const user = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword
            }
        });

        res.status(201).json({ message: 'Kullanıcı başarıyla oluşturuldu!', userId: user.id });

    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası.', error: error.message });
    }
});


// --- KULLANICI GİRİŞ ENDPOINT'İ ---
// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Tüm alanlar gereklidir.' });
    }

    try {
        // Kullanıcıyı email ile bul
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return res.status(400).json({ message: 'Geçersiz email veya şifre.' });
        }

        // Girilen şifre ile veritabanındaki hash'lenmiş şifreyi karşılaştır
        const isPasswordCorrect = await bcrypt.compare(password, user.password);

        if (!isPasswordCorrect) {
            return res.status(400).json({ message: 'Geçersiz email veya şifre.' });
        }

        // Şifre doğruysa, bir JWT oluştur
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '24h' } // Token 24 saat geçerli olsun
        );

        // Kullanıcıya token'ı ve bazı temel bilgileri geri gönder
        res.status(200).json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                level: user.level
            }
        });

    } catch (error) {
        res.status(500).json({ message: 'Sunucu hatası.', error: error.message });
    }
});

module.exports = router;