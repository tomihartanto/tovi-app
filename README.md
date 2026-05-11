# Tovi Travel - AI Travel Assistant

**Nama Project:** tovi-app

Chatbot AI berbasis web yang membantu pengguna dengan rekomendasi destinasi wisata, perencanaan itinerary, tips perjalanan, kuliner lokal, dan informasi travel lainnya. Dibangun dengan Node.js + Express (backend) dan Vanilla JavaScript (frontend), menggunakan Google Gemini API.

## Target Pengguna

- Wisatawan domestik yang ingin menjelajahi destinasi di Indonesia
- Traveler internasional yang merencanakan perjalanan ke Asia Tenggara
- Backpacker dan wisatawan budget yang mencari tips hemat
- Pasangan yang mencari rekomendasi honeymoon
- Siapa saja yang membutuhkan panduan perjalanan (itinerary, transportasi, akomodasi, kuliner)

## Bagaimana Chatbot Ini Membantu Pengguna

- **Rekomendasi destinasi** — Memberikan saran tempat wisata berdasarkan preferensi dan budget pengguna
- **Perencanaan itinerary** — Membuat jadwal perjalanan harian yang terstruktur sesuai durasi dan tujuan
- **Tips budget** — Memberikan estimasi biaya dan tips hemat untuk transportasi, akomodasi, dan makanan
- **Info kuliner lokal** — Rekomendasikan makanan wajib coba di setiap destinasi
- **Panduan praktis** — Informasi visa, cuaca, budaya lokal, dan tips keselamatan
- **Respons adaptif** — AI otomatis menyesuaikan gaya jawaban: faktual untuk pertanyaan spesifik, kreatif untuk eksplorasi ide perjalanan

## Fitur

- AI Travel Assistant dengan persona khusus
- Multi-model dengan auto-fallback (Gemini 2.5 Flash → 2.0 Flash → 2.0 Flash Lite → 1.5 Flash)
- Dynamic temperature (otomatis menyesuaikan berdasarkan gaya bicara user)
- Chat history tersimpan di browser (localStorage)
- Markdown rendering untuk respons bot
- Dark mode toggle
- Copy button, retry, typing indicator
- Responsive design

## Multi-Model AI dengan Auto-Fallback

Chatbot ini menggunakan **4 model AI** dari Google Gemini sebagai fallback chain. Jika model utama sedang sibuk atau error, sistem otomatis beralih ke model berikutnya tanpa pengguna perlu melakukan apapun.

| Prioritas | Model | Keterangan |
|-----------|-------|------------|
| 1 | Gemini 2.5 Flash | Kualitas terbaik (prioritas utama) |
| 2 | Gemini 2.0 Flash | Stabil, kualitas bagus |
| 3 | Gemini 2.0 Flash Lite | Ringan, cepat |
| 4 | Gemini 1.5 Flash | Fallback terakhir, paling stabil |

**Flow:**
```
User kirim pesan
  → Gemini 2.5 Flash (kualitas terbaik)
  → Gagal? Otomatis coba Gemini 2.0 Flash
  → Gagal? Otomatis coba Gemini 2.0 Flash Lite
  → Gagal? Otomatis coba Gemini 1.5 Flash
  → Semua gagal? Tampilkan pesan error dengan tombol "Coba Lagi"
```

## Dynamic Temperature

AI secara otomatis menyesuaikan tingkat kreativitas respons berdasarkan gaya bicara pengguna:

| Deteksi | Temperature | Keterangan |
|---------|-------------|------------|
| Faktual ("berapa harga?", "jam berapa?") | 0.4 | Jawaban presisi dan akurat |
| Umum ("liburan ke Bali") | 0.8 | Seimbang antara akurat dan bervariasi |
| Kreatif ("rekomendasikan yang unik", "ide honeymoon") | 1.2 | Respons lebih bervariasi dan imajinatif |

## Setup

1. Clone repository
```bash
git clone <url-repo>
cd tovi-app
```

2. Install dependencies
```bash
npm install
```

3. Copy file environment
```bash
cp .env.example .env
```

4. Masukkan API key di `.env`
```
GEMINI_API_KEY=your_api_key_here
```

5. Jalankan server
```bash
npm run dev
```

6. Buka di browser
```
http://localhost:3000
```

## Struktur Project

```
tovi-app/
├── index.js              # Backend (Express + Gemini API)
├── public/
│   ├── index.html        # UI structure
│   ├── app.js            # Frontend logic (Vanilla JS)
│   └── style.css         # Styling + dark mode
├── .env.example          # Environment template
├── package.json
└── README.md
```

## API Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/chat` | Mengirim percakapan dan mendapatkan respons AI |

**Request body:**
```json
{
  "conversation": [
    { "role": "user", "text": "Rekomendasikan wisata di Bali" }
  ]
}
```

**Response:**
```json
{
  "result": "Berikut rekomendasi wisata di Bali...",
  "temperature": 1.2
}
```

## Scripts

```bash
npm run dev    # Development (auto-restart)
npm start     # Production
```

## Credits

- **Prompt & Developer:** Tomi Hartanto
- **AI Assistant:** z.ai GLM-5.1

Project ini dibangun dengan bantuan AI assistant z.ai GLM-5.1 untuk pembuatan kode, debugging, dan optimasi. Seluruh prompt, arsitektur, dan keputusan desain dilakukan oleh Tomi Hartanto.

## License

MIT
