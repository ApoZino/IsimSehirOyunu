import { io } from 'socket.io-client';

// Kendi bilgisayarınızın IP adresini yazın.
const SOCKET_URL = 'https://isimsehiroyunu.onrender.com';

// Uygulama boyunca kullanılacak tek bir socket bağlantısı oluşturup dışa aktarıyoruz.
export const socket = io(SOCKET_URL, {
  autoConnect: false // Henüz otomatik bağlanma
});