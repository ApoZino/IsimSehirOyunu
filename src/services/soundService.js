import Sound from 'react-native-sound';

// Ses çalarken hataları önlemek için bu ayar gereklidir.
Sound.setCategory('Playback');

/**
 * Belirtilen ses dosyasını çalan fonksiyon.
 * @param {string} soundFile - 'android/app/src/main/res/raw' içindeki dosyanın adı (örn: 'player_joined.mp3')
 */
export const playSound = (soundFile) => {
  // Sesi yükle
  const sound = new Sound(soundFile, Sound.MAIN_BUNDLE, (error) => {
    if (error) {
      console.log('Ses dosyası yüklenemedi:', error);
      return;
    }
    
    // Yükleme başarılıysa, sesi çal
    sound.play((success) => {
      if (success) {
        console.log(`${soundFile} başarıyla çalındı ve bitti.`);
      } else {
        console.log('Ses çalarken bir hata oluştu.');
      }
      // Çaldıktan sonra hafızadan temizle
      sound.release();
    });
  });
};