# 📸 Internship Dump

Album digital santai untuk mendokumentasikan momen magang: foto, caption, reaction, dan komentar — real-time lewat Firebase.

## 🌐 Live App

- **https://internship-dump.web.app**

## 🎒 Cara Pakai (untuk teman)

1. Buka link di atas.
2. Saat modal *"Siapa Nama Kamu?"* muncul, isi nama panggilan kamu.
3. Klik **"Tambah Momen Baru"** → upload foto (drag & drop / kamera HP), isi judul, tanggal, kategori, caption.
4. Submit → foto langsung masuk album. Teman lain juga bisa ikut apload foto.

## 🚀 Deploy Ulang (jika ada perubahan)

```bash
firebase deploy --only hosting
firebase deploy --only storage
firebase deploy --only firestore:rules
```

## 🗂 Struktur Singkat

- `index.html` — UI utama
- `assets/js/app.js` — logika galeri, upload, edit, delete, reaction, komentar
- `assets/js/firebase.js` — init Firebase
- `firestore.rules` / `storage.rules` — security rules
