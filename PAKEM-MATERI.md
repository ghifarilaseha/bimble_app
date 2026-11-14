# Pakem Halaman Materi

Aturan mengubah rangkuman materi menjadi halaman interaktif. Tujuannya satu:
halaman bab mana pun, kelas berapa pun, terasa seperti ditulis orang yang sama.

Mulailah dengan menyalin `materi/_templat.html`. Periksa hasilnya dengan
`node tools/materi.js`.

Alasan di balik urutan tujuh bagian ada di **bagian I** (hierarki belajar dari
keseharian ke rumus). Aturan tampilan ada di **bagian J**, dan aturan kepadatan
teks di **bagian K**.

**Tiga aturan yang paling sering dilanggar**, taruh di kepala lebih dulu:

1. Tiap tab di bagian "Aturannya" wajib punya interaksinya sendiri.
2. Di dalam string JavaScript, markup mati. `<b>` akan tampil sebagai tulisan.
3. Sapa pembaca dengan **"kamu"**. Kata "siswa" hanya boleh ada di komentar kode.

---

## A. Anatomi tujuh bagian

Setiap halaman punya tujuh bagian, berurutan, masing-masing dibuka penanda
komentar `<!-- ---------- N. Nama ---------- -->`. Penanda ini bukan hiasan:
`tools/materi.js` memakainya untuk memeriksa kelengkapan.

| # | Bagian | Judul baku | Jatah | Interaksi |
|---|---|---|---|---|
| 1 | Tujuan | `h3.rapat` "Yang akan kamu bisa" | 3 butir, 6–13 kata | tidak ada |
| 2 | Pemantik | nama adegan konkret | 4–5 kalimat, 40–60 kata | tidak ada |
| 3 | Eksplorasi | `Coba sendiri: <frasa benda>` | 50–90 kata | tepat satu widget |
| 4 | Perumusan | `Aturannya` | 3–4 tab, 600–900 kata | **satu per tab** |
| 5 | Contoh bertahap | `Contoh bertahap` | 3 contoh, 2–5 langkah | buka langkah |
| 6 | Cek pemahaman | `Cek pemahaman` | 4–5 soal | `CekPaham` |
| 7 | Tautan latihan | `Sudah paham?` | 1 kalimat | tidak ada |

### 1. Tujuan

Tiga butir. Satu kalimat masing-masing, diawali kata kerja ber-*meN-*
("Membaca", "Menghitung", "Menentukan"). Butir terakhir boleh diawali "Tahu"
untuk hal yang sifatnya pengertian, bukan keterampilan: "Tahu kenapa negatif
dikali negatif hasilnya positif."

Tulis yang akan **bisa dilakukan**, bukan yang akan dipelajari. Bukan
"Mempelajari sifat komutatif", melainkan "Menjumlahkan tanpa bingung tanda".

### 2. Pemantik

Judulnya nama adegan, tidak pernah kata "pemantik": "Lift di parkiran mal",
"Dua toko, sepatu yang sama", "Kotak yang tidak boleh dibuka".

Empat sampai lima kalimat, ditutup **pertanyaan yang memang belum bisa dijawab
sekarang**. Itulah gunanya bagian ini: membuka jarak yang akan diisi bab ini.
Kalimat terakhir `<p class="kecil samar">` berisi ajakan berhenti sejenak —
"Pikirkan dulu sebentar, baru lanjut." atau "Berhenti dulu di sini."

Sengaja tanpa interaksi. Bagian ini menahan, bukan menyibukkan.

### 3. Eksplorasi

Judulnya selalu `Coba sendiri: <frasa benda>`.

Tepat satu widget, di dalam satu `div.kartu`, didampingi satu `<div>` kosong
untuk pesan yang muncul belakangan. Sebelum widgetnya, satu paragraf berisi
tugas yang diawali kata **"Tugasnya"** dan ditutup pertanyaan pendek:

```html
<p>Tugasnya satu: <strong>ubah $5 - 3$ menjadi $5 + (-3)$.</strong> Berubah tidak?</p>
```

Titik pasangnya dibakukan: `id="jelajah"` untuk widget, `id="pesanJelajah"`
untuk pesannya.

### 4. Perumusan

Judulnya selalu `Aturannya`. Isinya 3–4 tab. Tab dibangun `Materi.tab()` dari
`<section data-tab="...">` yang ada di halaman — section pertama tampil,
sisanya diberi atribut `hidden`.

Ini bagian terpanjang, dan di sinilah aturan kepadatan berlaku. Lihat bagian B.

Rumus yang dipajang ditulis `<p class="tengah">$$...$$</p>`. Tabel rujukan
selalu dibungkus `<div class="tabel-gulir">`.

**Setiap tab menoleh ke belakang, ke bagian 3.** Ada satu kalimat baku untuk
ini, dan empat dari lima halaman sudah memakainya: "Inilah yang tadi kamu
lihat sendiri di garis bilangan …", "Inilah yang tadi kamu coba di kertas
berpetak …". Pakai kalimat ini paling sedikit sekali per halaman.

### 5. Contoh bertahap

Tiga contoh, dibangun `Materi.contoh()`. Tiap contoh `{ judul, soal, langkah }`
dengan 2–5 langkah, dan langkahnya dibuka satu per satu — jangan sekaligus.
Bagian menebak sebelum langkah berikutnya terbuka itulah yang mengajari;
menampilkan seluruh penyelesaian sekaligus mengubahnya jadi bacaan.

`judul` cukup label 2–4 kata. Pengantar bagian ini satu kalimat:
"Tebak dulu jawabannya sebelum membuka langkahnya."

### 6. Cek pemahaman

Empat sampai lima soal lewat `CekPaham.buat()`, dengan tangga level `1, 1, 2, 2`
atau `1, 1, 2, 2, 3`. Campur `isian` dan `pg`.

Isi utama tiap soal **bukan kuncinya, melainkan `salahUmum`** — daftar kekeliruan
yang memang diperkirakan, masing-masing dengan umpan baliknya sendiri. Dua sampai
tiga per soal isian. Soal tanpa `salahUmum` hanya bisa menjawab "belum tepat",
dan itu tidak mengajari apa-apa.

Untuk `pg`, `umpan` diisi untuk **setiap opsi kecuali kuncinya**.

`petunjuk` hanyalah placeholder kotak isian. Gunanya menyatakan bentuk jawaban
yang diharapkan supaya pencocokan berhasil: "Tulis angkanya saja", "Contoh
penulisan: 2 3/4".

Id soal memakai kode bab: `pecahan-cek-1`, bukan `pc-cek-1`.

Pengantarnya satu kalimat: "Hasilnya tidak dikirim ke mana-mana dan tidak masuk
nilai."

### 7. Tautan latihan

Judulnya `Sudah paham?`, satu kalimat, lalu tombol. Dijaga
`Materi.tautanLatihan(el, tingkat, kode)` supaya tombolnya berganti catatan bila
bank soalnya belum ada atau sudah dinonaktifkan.

---

## B. Aturan kepadatan — inti pakem ini

> **Setiap `<section data-tab>` wajib memuat paling sedikit satu interaksi.**

Ini aturan yang paling menentukan rasa halamannya, dan yang paling sering
terlanggar. Saat pakem ini ditulis, dari **19 tab** di lima halaman kelas 7
hanya **5 tab yang punya interaksi**. Keempat belas sisanya sudah dibenahi, dan
seluruh **55 tab** di keempat belas halaman kini hijau di `node tools/materi.js`.
Angka itu gampang melorot lagi: yang menjaganya cuma pemeriksa, bukan ingatan.

Penomoran komentar di dalam skrip mengikuti tabnya: `4a`, `4b`, `4c`, `4d`.

```js
/* ---------- 4a. Interaksi tab pertama ---------- */
/* ---------- 4b. Interaksi tab kedua ---------- */
```

Kalau sebuah tab tidak terpikirkan interaksinya, itu tanda tabnya terlalu tipis.
**Gabungkan dengan tab sebelahnya, jangan biarkan jadi tab teks.** Tiga tab yang
hidup lebih baik daripada lima tab yang dua di antaranya bacaan.

Interaksinya tidak harus besar. Tabel yang dilengkapi lalu diperiksa sudah cukup.
Yang tidak cukup: tombol yang hanya membuka teks lain.

---

## C. Tujuh jenis interaksi

Diurutkan dari yang paling murah. Pakai yang sudah ada dulu; menulis widget baru
hanya kalau tak satu pun jenis ini muat.

| # | Jenis | Contoh yang sudah ada |
|---|---|---|
| 1 | Widget dari `komponen/` | lihat bagian D |
| 2 | Tabel yang diisi lalu diperiksa | `#tabelSifat`, `materi/kelas7-bilangan-bulat.html` |
| 3 | Penggeser terikat ekspresi hidup | `Materi.geser()`; pola asalnya `#geserX` di bentuk-aljabar |
| 4 | Pembongkar: ketik bentuk, halaman membongkarnya jadi tabel bagian | *belum ada, tulis baru* |
| 5 | Langkah yang dibuka satu per satu | `Materi.langkah()`; pola asalnya "Buka kurung" di bentuk-aljabar |
| 6 | Kalkulator konsep: beberapa isian, hasil bertahap | diskon bertingkat, `materi/kelas7-aritmetika-sosial.html` |
| 7 | `CekPaham` | khusus bagian 6 |

Jenis 4 adalah yang paling ampuh untuk bab yang bahasannya "kenali bagian-bagian
dari sesuatu": siswa mengetik bentuknya sendiri, halaman membongkarnya menjadi
tabel. Karena siswa yang memilih masukannya, ia bisa menguji dugaannya sendiri —
sesuatu yang tidak bisa dilakukan contoh yang sudah jadi.

---

## D. Widget yang tersedia

Semuanya dipanggil sama: `Nama.buat(wadah, atur)`, callback lewat `atur.onUbah`.

| Widget | Untuk apa | Bab |
|---|---|---|
| `GarisBilangan` | penjumlahan sebagai gerak; mode `daerah` untuk daerah penyelesaian | bilangan bulat, PtLSV |
| `BatangPecahan` | kenapa 1/2 = 3/6: panjangnya tetap, potongannya berubah | pecahan |
| `KartuSuku` | suku sejenis secara fisik; menolak gabungan yang salah **beserta alasannya** | aljabar, dan apa pun yang bersuku |
| `Timbangan` | kedua ruas harus diperlakukan sama, kalau tidak miring | PLSV, PtLSV, SPLDV |
| `BatangHarga` | untung Rp20.000 atas modal berbeda bukan persen yang sama | aritmetika sosial |
| `TabelPola` | barisan beserta baris selisihnya | pola bilangan |
| `BidangKoordinat` | bidang kartesius yang bisa diketuk, dengan lapisan acuan | koordinat, transformasi |

**`KartuSuku` paling luas pakainya.** Lewat opsi `jenis` ia bisa mewakili suku
bernama apa pun, bukan hanya x/y:

```js
KartuSuku.buat(el, {
  jenis: [
    { kunci: 'p', nama: 'kotak', lambang: 'p', warna: 'var(--peran-variabel)' },
    { kunci: 'n', nama: 'bola',  lambang: '',  warna: 'var(--tinta-lembut)' }
  ],
  awal: { p: 2, n: 3 }
});
```

**Dua hal yang menjebak:**

- `buat()` **menghapus isi wadah**. Widget anak dibuat sekali lalu di-`set()`,
  jangan dibangun ulang tiap kali gambar berubah.
- Menyusun widget di atas widget lain: lihat `komponen/timbangan.js` yang memakai
  `komponen/kartu-suku.js`. Induk memegang datanya, anak hanya menggambar.

---

## E. Kesimpulan yang ditahan

Widget eksplorasi **tidak boleh langsung menyimpulkan**. Ia mencatat keadaan mana
saja yang sudah benar-benar dicoba, dan baru memunculkan kesimpulan setelah
keadaan kuncinya terlihat.

```js
var pernah = {};
GarisBilangan.buat(el, {
  onUbah: function (k) {
    pernah[k.awal + '|' + k.langkah.join(',')] = true;
    if (pernah['5|-3'] && pernah['5|3']) {
      elPesan.innerHTML = '<div class="pesan sip">' +
        Rumus.keHTML('Panahnya sama persis. Mengurangi $3$ sama dengan menambah $-3$.') +
        '</div>';
    }
  }
});
```

Alasannya: kesimpulan yang muncul sebelum siswa mencoba akan dibaca sebagai
aturan yang harus dihafal. Kesimpulan yang muncul sesudahnya dibaca sebagai
penamaan atas sesuatu yang barusan ia lihat sendiri.

---

## F. Suara dan bahasa

**Sapaan.** "kamu", selalu. Tidak pernah "siswa", tidak pernah "Anda", tidak
pernah "kita". Kata "siswa" hanya boleh muncul di komentar kode — pembatas ini
tegas dan diperiksa `tools/materi.js`.

**Panjang kalimat.** 8–20 kata, kebanyakan 12–16. Pecah dengan tanda pisah atau
titik dua, bukan anak kalimat bertingkat. Sesekali kalimat pendek sebagai
pukulan: "Angka rupiahnya sama, persennya tidak."

**Istilah.** Ditebalkan saat pertama muncul, lalu langsung didefinisikan dengan
kata sehari-hari: "$4$ adalah **koefisien**, yaitu banyaknya variabel."

**Analogi** harus fisik dan Indonesia: lift parkiran mal, timbangan dua lengan,
papan harga toko, karung beras. Nama orang lokal — Pak Tohir, Bu Ninda, Upik.
Rupiah ditulis lengkap: Rp154.000.

**Sebut miskonsepsinya terang-terangan.** Ini ciri khas halaman-halaman ini dan
harus dipertahankan: "ini penting dan sering luput", "Ini titik gagal terbesar di
bab ini", "Langkah ketiga yang paling sering terlewat."

**Tolak aturan hafalan.** "Bukan mantra", "bukan huruf ajaib", "tanpa menghafal
tabel". Kalau sebuah aturan diperkenalkan, tunjukkan asalnya.

**Umpan balik yang salah** dibuka "Sepertinya …", tidak pernah "Salah". Akui dulu
bagian yang sudah benar, lalu perbaiki satu hal saja:

> "Bagian $x$-nya sudah benar. Perhatikan tanda konstantanya."
> "Urutanmu sudah benar, hanya arahnya terbalik."

**Yang harus dihindari:** kalimat bertingkat, kata serapan akademik ("elaborasi",
"konsepsi", "mengidentifikasi"), paragraf lebih dari empat kalimat, dan
penjelasan yang mendahului percobaan.

---

## G. Aturan teknis yang menjebak

- `Rumus.sapu(document.querySelector('main'))` jadi **pernyataan pertama** IIFE,
  sekali saja.
- **Di dalam string JavaScript, markup mati.** Semua yang di luar `$...$`
  dilolos-kan, jadi `<b>x</b>` tampil sebagai tulisan `<b>x</b>`. Untuk menekankan
  di string JS, pakai matematika: `'$-2x - 19$'`.
- Garis miring LaTeX **digandakan di string JS** (`'$\\frac{1}{2}$'`), tunggal di
  HTML (`$\frac{1}{2}$`).
- `$...$` sebaris tidak boleh terpotong ganti baris.
- Desimal ditulis `0{,}75` di dalam mode matematika, supaya spasinya benar.
- **Semua hitungan angka lewat `js/pecahan.js`**, jangan desimal bawaan
  JavaScript. `Pecahan.dari()` menerima `'3/4'`, `'1 3/4'`, `'0,75'`, `'75%'`, dan
  melempar galat untuk yang tidak dikenal — bungkus masukan siswa dengan try/catch.
- **Jangan pernah menulis warna heksa.** Selalu variabel CSS, kalau tidak mode
  gelap rusak.
- Tabel selalu dibungkus `<div class="tabel-gulir">`.
- Muat hanya `komponen/*.js` yang benar-benar dipakai.

Urutan `<script>` tidak boleh diubah:

```
katex → rumus.js → pecahan.js → kunci.js → nilai.js → cek-paham.js → materi.js → komponen/*
```

---

## H. Warna sebagai makna

Tiga peran, satu kode warna, berlaku di semua bab dan semua kelas. Siswa belajar
kode ini sekali.

| Peran | Kelas CSS | Token |
|---|---|---|
| variabel | `.peran-v` | `--peran-variabel` |
| koefisien | `.peran-k` | `--peran-koefisien` |
| konstanta | `.peran-c` | `--peran-konstanta` |

Untuk menyorot sekelompok suku sejenis, pakai latar lembutnya: `.sorot-v`,
`.sorot-k`, `.sorot-c`. Jangan pakai warna teks dan latar sekaligus pada elemen
yang sama.

**Dua syarat, keduanya wajib:**

1. **Legenda muncul saat warna pertama dipakai** di sebuah halaman.
2. **Warna tidak pernah jadi satu-satunya pembawa makna.** Istilahnya tetap
   ditulis. Ada siswa yang tidak membedakan warna, dan halaman ini juga dicetak
   hitam putih.

```html
<div class="legenda">
  <span><i style="background:var(--peran-koefisien)"></i>koefisien — angka pengali</span>
  <span><i style="background:var(--peran-variabel)"></i>variabel — huruf pengganti nilai</span>
  <span><i style="background:var(--peran-konstanta)"></i>konstanta — suku tanpa variabel</span>
</div>
```

Warna peran sengaja terpisah dari warna status (`--aksen`, `--benar`, `--salah`,
`--sorot`). Jangan pakai warna status untuk menandai bagian rumus, dan sebaliknya.

Ketiganya sudah diperiksa saat dipilih: kontras terhadap latar kartu, latar
halaman, dan latar lembutnya sendiri lolos 4,5:1 di mode terang maupun gelap
(paling rendah 4,88:1), dan ketiganya tetap terbedakan pada simulasi deuteranopia,
protanopia, maupun tritanopia (selisih terkecil dE 34,8). Kalau warnanya diubah,
periksa ulang kedua hal itu — bukan hanya "kelihatan enak".

---

## I. Hierarki belajar: dari keseharian ke rumus

Dasarnya **PMRI** (Pendidikan Matematika Realistik Indonesia), versi Indonesia
dari Realistic Mathematics Education (Freudenthal). Matematika dipelajari
sebagai kegiatan, bukan rumus jadi yang diberikan di depan. Belajar dimulai dari
situasi nyata, lalu siswa dibimbing menemukan kembali konsepnya lewat dua arah:

- **Matematisasi horizontal:** dari situasi ke bahasa matematika. "Untung
  Rp20.000 dari modal Rp100.000" menjadi $\frac{20.000}{100.000}$.
- **Matematisasi vertikal:** mengolah di dalam matematika sampai jadi aturan
  umum. $\frac{\text{untung}}{\text{modal}} \times 100\%$.

Keduanya wajib ada. Tanpa horizontal, rumus lepas dari kegunaannya. Tanpa
vertikal, siswa tidak pernah sampai ke aturan yang bisa dipakai di soal lain.

### Tangga di setiap halaman

| Tahap | Bagian halaman | Yang terjadi |
|---|---|---|
| Konteks nyata | 2. Pemantik | Adegan sehari-hari, ditutup pertanyaan yang belum bisa dijawab |
| Model | 3. Eksplorasi | Widget yang dicoba sendiri: batang harga, timbangan, garis bilangan |
| Formal | 4. Aturannya | Rumus muncul **setelah** dicoba, menoleh ke bagian 3 |
| Bertahap | 5. Contoh bertahap | Langkah dibuka satu per satu |
| Kembali ke konteks | 6. Cek pemahaman, 7. Latihan | Soal cerita dengan konteks baru |

Urutan ini tidak boleh dibalik. Rumus yang mendahului percobaan mengubah halaman
jadi hafalan.

### Konteks yang dipakai

Konteks harus **dekat dengan keseharian anak SMP**, bukan dunia orang dewasa:
warung dan kantin, diskon minimarket, kuota internet, ongkos angkot atau ojek,
tabungan, uang saku, lomba tujuh belasan, pertandingan futsal. Hindari konteks
yang asing bagi mereka (saham, kredit rumah, laba perusahaan) kecuali babnya
memang menuntut.

Satu konteks utama dibawa dari pemantik sampai perumusan, jangan berganti
cerita di tiap tab. Angkanya realistis: harga jajan tidak Rp1.000.000, uang
saku tidak Rp5.

### Level soal mengikuti tangga yang sama

| Level | Bentuk |
|---|---|
| 1 | Hitungan langsung dalam konteks sederhana, satu langkah |
| 2 | Perlu menerjemahkan konteks ke matematika dulu, dua langkah |
| 3 | Konteks bertingkat atau multi-langkah, ada informasi yang harus dipilih |

### Catatan kelas (bagian tambahan)

Catatan pertemuan tertentu untuk siswa yang tidak masuk ditempatkan sebagai
**bagian tambahan di antara bagian 6 dan 7**, bukan sebagai tab di bagian 4.
Tab bagian 4 khusus perumusan. Isinya: ringkasan papan tulis yang diketik
ulang (tanpa foto), soal pemanasan mudah, lalu soal dari papan tulis dengan
langkah yang dibuka bertahap. Tautannya memakai jangkar `#catatan`.

---

## J. Tampilan: tema, warna, bentuk

**Tema terang adalah bawaan.** Teks gelap di atas latar terang lebih teliti
dibaca, terutama untuk huruf kecil, pecahan, dan pangkat. Mode gelap tetap
tersedia sebagai pilihan untuk belajar malam, bukan mengikuti HP secara
otomatis.

**Warna.**
- Latar krem hangat; warna hangat dipakai sebagai aksen, bukan latar penuh.
- Kontras teks paling rendah 4,5:1, termasuk teks abu-abu (`samar`) dan
  placeholder kotak isian. Teks besar (24 px, atau 19 px tebal) cukup 3:1.
- Status benar/salah selalu disertai tanda ✓ ✗ atau kata, tidak pernah warna
  saja. Kira-kira 1 dari 12 anak laki-laki buta warna merah-hijau.
- Aturan warna peran tetap di bagian H.

**Bentuk.** Sudut membulat, radiusnya seragam di kartu, tombol, dan label.
Jangan campur bentuk lancip dan bulat di satu halaman. Bentuk melengkung terasa
lebih ramah dan aman.

**Tanpa hiasan.** Gambar, animasi, ikon, dan latar yang tidak menjelaskan
materi tidak dipasang. Hiasan semacam itu terbukti sedikit menurunkan hasil
belajar, dan anak lebih rentan daripada orang dewasa. Gambar dipakai hanya bila
ia sendiri yang menjelaskan: batang harga, grafik, diagram.

**Ukuran sentuh.** Tombol dan pilihan jawaban paling kecil 44 × 44 px di HP,
dengan jarak antartombol.

---

## K. Kepadatan teks

Melengkapi bagian F. Prinsipnya: **setiap kata ikut berebut tempat di ingatan
kerja.** Kalimat yang tidak perlu bukan netral, ia mengurangi hasil belajar.

1. **Angka, rumus, dan model dulu; kata seperlunya.** Kata dipakai untuk
   "kenapa" dan "kapan dipakai", bukan untuk mengulang yang sudah terlihat di
   rumus atau tabel.
2. **Satu kartu atau satu langkah, satu ide.**
3. **Keterangan menempel pada yang diterangkan.** Catatan untuk sebuah rumus
   ditulis tepat di bawah rumus itu, bukan di akhir tab.
4. **Paling banyak satu catatan kecil (`kecil samar`) per bagian.** Kalimat baku
   yang diwajibkan pakem (ajakan berhenti di pemantik, pengantar cek
   pemahaman) sudah dihitung sebagai catatan bagian itu.
5. **Peringatan salah konsep dipindah ke umpan balik.** Tempatnya di
   `salahUmum` dan `umpan`, muncul saat siswa memang keliru, bukan dipasang di
   depan untuk semua orang. Di teks perumusan cukup satu kalimat tegas untuk
   miskonsepsi terbesar bab itu (lihat bagian F).
6. **Tandai, jangan tambah.** Yang penting ditebalkan, tidak diberi kalimat
   tambahan "ini penting".
7. **Mulai dari yang mudah.** Soal pertama di cek pemahaman dan di catatan kelas
   harus bisa dijawab hampir semua siswa, supaya mereka merasa berhasil dulu.

---

## L. Daftar periksa sebelum halaman dianggap selesai

Jalankan `node tools/materi.js materi/berkasmu.html` lebih dulu; sisanya dilihat
sendiri di peramban lewat `node tools/sajikan.js`.

1. Tujuh bagian lengkap, berurutan, penanda komentarnya ada.
2. Judul baku bagian 3–7 persis.
3. **Tiap tab bagian 4 punya interaksinya sendiri.**
4. Bagian 3 punya tepat satu widget, dan kesimpulannya ditahan.
5. Paling sedikit satu kalimat "Inilah yang tadi kamu …" di bagian 4.
6. Tiga contoh bertahap, langkahnya dibuka satu per satu.
7. 4–5 soal cek pemahaman, tangga levelnya benar, tiap soal isian punya 2–3
   `salahUmum`.
8. Tidak ada kata "siswa" atau "Anda" di teks yang dibaca.
9. Tidak ada warna heksa; legenda ada bila warna peran dipakai.
10. Semua hitungan lewat `Pecahan`.
11. Dilihat di lebar HP, dan **dilihat dalam mode gelap**.
12. `node tools/tautan.js` hijau.
13. Pemantik memakai konteks keseharian anak SMP, dan konteks itu dibawa sampai
    perumusan (bagian I).
14. Rumus tidak muncul sebelum bagian 3 dicoba.
15. Tidak ada hiasan; kontras teks `samar` dan placeholder lolos 4,5:1;
    tombol paling kecil 44 px (bagian J).
16. Paling banyak satu catatan kecil per bagian, dan peringatan salah konsep
    ada di umpan balik, bukan di teks (bagian K).

---

## Lampiran: keadaan halaman yang sudah ada

**Belum sesuai bagian I–K (dicatat 14 November 2026, menunggu audit):**

- Mode gelap masih mengikuti pengaturan HP secara otomatis; belum ada bawaan
  terang dan tombol pilihan tema (bagian J).
- Kontras teks `samar`, placeholder, dan ukuran tombol kecil ("Lihat
  pembahasan", tombol tab) belum diukur (bagian J).
- Jumlah catatan kecil per bagian belum diperiksa di keempat belas halaman
  (bagian K).
- `kelas7-aritmetika-sosial.html` masih memuat "Catatan kelas 14 Nov" sebagai
  tab kelima di bagian 4. Pindahkan ke bagian tambahan di antara bagian 6 dan
  7 (bagian I).
- Konteks pemantik semua bab belum diperiksa kedekatannya dengan keseharian
  anak SMP (bagian I).

Keempat belas halaman materi hijau di `node tools/materi.js`: lima bab kelas 7,
empat bab kelas 8 (pola bilangan, relasi dan fungsi, persamaan garis lurus,
SPLDV), dan lima bab kelas 9 (pangkat dan akar, transformasi, peluang,
kesebangunan, bangun ruang sisi lengkung). Kalau butuh contoh saat menulis
halaman baru, ambil dari mana pun di antara keempat belasnya.

Kelima halaman kelas 7 ditulis sebelum pakem ini ada, lalu dibenahi menyusul:

- Empat belas tab yang tadinya murni teks kini punya interaksinya sendiri.
- Pembangun tab, perender contoh, dan penjaga tautan tidak lagi disalin per
  halaman; semuanya memanggil `js/materi.js`.
- Titik pasang eksplorasinya sudah dibakukan menjadi `#jelajah` dan
  `#pesanJelajah`.
- Awalan id soal cek pemahaman sudah memakai kode bab, bukan singkatan dua
  huruf.
- Kelimanya punya lima soal cek pemahaman dengan tangga level `1, 1, 2, 2, 3`.

Satu catatan lama yang ternyata keliru: `kelas7-plsv-ptlsv.html` memang memuat
`komponen/kartu-suku.js` tanpa memanggilnya langsung, tetapi berkas itu tetap
perlu — `komponen/timbangan.js` menumpang di atasnya. Jangan dibuang.
