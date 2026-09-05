# Web Pendukung Pengajaran Matematika SMP

Situs sederhana untuk mengajar matematika SMP kelas 7 sampai 9: materi
interaktif, latihan soal yang dinilai otomatis, dan dashboard guru untuk
membaca hasilnya.

Semuanya berupa berkas polos: HTML, CSS, JavaScript, dan JSON. Tidak ada
build tool, tidak ada framework, tidak ada `npm install`. Satu-satunya yang
perlu dipasang adalah Node, itu pun hanya untuk menjalankan tiga alat bantu
di folder `tools/`. Situs yang tayang tidak memerlukannya sama sekali.

## Isi singkat

- Siswa membuka tautan, mengetik namanya, mengerjakan, lalu hasilnya masuk
  ke Google Spreadsheet milik guru.
- Tidak ada akun, tidak ada login. Identitas hanya sebatas nama yang diketik.
- Kunci jawaban tidak pernah dikirim ke peramban dalam bentuk terbaca.

## Mencoba di komputer sendiri

```
node tools/sajikan.js
```

lalu buka <http://localhost:8080>.

Membuka berkas HTML dengan klik ganda (`file://`) tidak akan berfungsi:
peramban menolak memuat berkas JSON lewat `fetch`, dan `crypto.subtle`
yang dipakai untuk mencocokkan kunci hanya tersedia pada konteks aman.
`localhost` sudah dianggap aman, jadi server kecil di atas sudah cukup.

## Struktur berkas

```
index.html              beranda: pilih kelas, lalu bab
latihan.html            mesin soal, seluruh pengaturannya dari parameter URL
guru.html               pembuat sesi dan dashboard
cek.html                pemeriksa bentuk berkas soal
uji.html                penjalan kasus uji penilaian di peramban
404.html                halaman untuk tautan yang salah

js/
  konfig.js             satu-satunya berkas yang disunting setelah deploy
  kunci.js              hashing kunci dan penyandian base64
  nilai.js              normalisasi jawaban dan penilaian semua tipe soal
  soal.js               memuat bank soal dan menyiapkan satu set soal
  identitas.js          nama siswa, saran pengetikan, ingatan di localStorage
  kirim.js              pengiriman hasil beserta antrean luring
  rumus.js              menerjemahkan $...$ menjadi rumus tercetak
  validasi.js           pemeriksaan bentuk bank soal
  gembok-inti.js        perubahan satu butir soal mentah menjadi tergembok
  latihan.js            alur halaman latihan
  guru.js               alur halaman guru

komponen/
  bidang-koordinat.js   bidang kartesius yang bisa diketuk
  garis-bilangan.js     garis bilangan dengan busur loncatan
  batang-pecahan.js     batang pecahan yang penyebutnya bisa diubah
  tabel-pola.js         tabel pola bilangan dengan kolom selisih
  qr.js                 penyandi QR untuk tautan sesi

data/
  kelas.json            daftar kelas dan nama siswa
  daftar-bab.json       peta kelas ke bab, berkas soal, dan materi
  soal-mentah/          bank soal dengan kunci terbaca (TIDAK ikut tayang)
  soal/                 bank soal tergembok, inilah yang dibaca situs

materi/                 satu berkas HTML per bab
tools/                  gembok.js, uji.js, tautan.js, sajikan.js
uji/kasus.js            kasus uji, dipakai uji.html dan tools/uji.js
apps-script/Kode.gs     salinan kode Apps Script untuk riwayat versi
vendor/katex/           KaTeX yang disalin lokal, bukan diambil dari CDN
```

Berkas `js/latihan.js` dan `js/guru.js` memisahkan alur halaman dari berkas
HTML-nya. Halamannya tetap bisa dibaca sebagai struktur, logikanya ada di
tempat yang bisa diperiksa dengan `node --check`.

## Menambah atau mengubah soal

Alurnya selalu sama:

1. Sunting berkas di `data/soal-mentah/kelasN/<bab>.json`. Di sinilah kunci
   jawaban ditulis apa adanya, supaya enak dibaca dan dikoreksi.
2. Jalankan penggembok:

   ```
   node tools/gembok.js
   ```

   Perintah ini memeriksa bentuk berkasnya lebih dulu. Bila ada yang salah,
   berkas lama di `data/soal/` sengaja dibiarkan utuh, sehingga kesalahan
   sunting tidak langsung merusak yang sedang tayang.
3. Jalankan pemeriksaan:

   ```
   node tools/uji.js
   node tools/tautan.js
   ```
4. Commit **keduanya**: `data/soal-mentah/` dan `data/soal/`.

Menggembok satu kelas saja: `node tools/gembok.js kelas7`.

### Aturan menulis soal

1. Tingkat kesulitan bervariasi dan diberi penanda level.
2. Jawaban harus dapat ditemukan tanpa kalkulator.
3. Kunci dan pembahasan singkat disediakan, tidak ditempel di bawah soal.
4. Soal termudah pun tetap menguji penalaran, bukan sekadar hafalan.
5. Jawaban jelas, tidak rancu, tidak ada jawaban imajiner atau tanpa jawaban.
6. Selalu ditinjau ulang: kejelasan, kesesuaian level, kebenaran kunci.

Satu hal yang tidak boleh dilanggar: **`id` soal tidak pernah diubah setelah
dipakai.** Rekap lama mengacu ke id itu. Soal yang tidak dipakai lagi cukup
diberi `"aktif": false`, jangan dihapus.

### Bentuk berkas soal mentah

```json
{
  "meta": {
    "kelas": 7, "semester": 1, "bab": "bilangan-bulat",
    "judul": "Bilangan Bulat", "versi": "2026-09-05"
  },
  "soal": [ ... ]
}
```

Setiap soal wajib punya `id`, `level` (1, 2, atau 3), `tipe`, `pertanyaan`,
`pembahasan`, dan `aktif`.

**Pilihan ganda**

```json
{
  "id": "bb-01", "level": 1, "tipe": "pg", "aktif": true,
  "pertanyaan": "Bilangan yang tiga lebih kecil dari dua adalah ...",
  "opsi": { "a": "$-2$", "b": "$-1$", "c": "$3$", "d": "$6$" },
  "kunci": "b",
  "acakOpsi": true,
  "pembahasan": "$2 - 3 = -1$"
}
```

Pakai `"acakOpsi": false` bila urutan opsinya bermakna, misalnya angka menaik.

**Isian**

```json
{
  "id": "pc-04", "level": 2, "tipe": "isian", "aktif": true,
  "pertanyaan": "Bentuk pecahan dari $75\%$ adalah ...",
  "jawaban": ["3/4", "0,75"],
  "pembahasan": "..."
}
```

Sebelum dibandingkan, jawaban siswa dirapikan: spasi dibuang, huruf
dikecilkan, "Rp" dan satuan umum (cm, kg, %, derajat, dan sejenisnya)
dibuang, titik pemisah ribuan dibuang, koma dan titik desimal disamakan.
Angka juga dibandingkan sebagai bilangan, jadi `0,750` diterima untuk kunci
`0,75` tanpa perlu didaftarkan. Bentuk pecahan tidak disederhanakan otomatis;
kalau `6/8` mau diterima, tulis sebagai jawaban tambahan.

Satuan hanya dibuang bila di depannya berupa angka, sehingga jawaban berupa
kata seperti `trapesium` tidak kehilangan huruf akhirnya.

**Benar-salah**

```json
{
  "id": "bb-12", "level": 2, "tipe": "benar-salah", "aktif": true,
  "pertanyaan": "Tentukan benar atau salah pernyataan berikut.",
  "pernyataan": [
    { "teks": "$7 > -90$", "kunci": true },
    { "teks": "$-9 < -19$", "kunci": false }
  ],
  "pembahasan": "..."
}
```

Bernilai sebagian: poin = level x (pernyataan tepat / seluruh pernyataan).

**Koordinat**

```json
{
  "id": "kd-03", "level": 2, "tipe": "koordinat",
  "varian": "beberapa-titik", "aktif": true,
  "pertanyaan": "Gambarlah titik $A(1,1)$, $B(4,1)$, dan $C(4,5)$.",
  "grid": { "xMin": -6, "xMax": 6, "yMin": -6, "yMax": 6 },
  "kunci": [[1,1],[4,1],[4,5]],
  "pembahasan": "..."
}
```

Empat varian:

| Varian | Jawaban siswa | Penilaian |
|---|---|---|
| `titik` | satu titik | penuh atau nol |
| `beberapa-titik` | beberapa titik | sebagian per titik tepat; titik ngawur mengurangi, tetapi nilai tidak pernah negatif |
| `bangun` | titik-titik yang membentuk bangun tertutup | himpunan ruas garis dibandingkan, jadi boleh mulai dari sudut mana pun dan arah mana pun; dinilai utuh |
| `garis` | dua titik yang dilalui garis | persamaan garisnya yang dibandingkan, bukan titiknya |

Rentang grid maksimal 13 satuan supaya tetap terbaca di layar HP.
Varian `bangun` boleh diberi `lanjutan` berupa soal `pg` atau `isian`
(misalnya menanyakan nama bangun atau luasnya) yang dinilai sebagai butir
tersendiri dengan id `<id induk>-l`.

### Mengapa kunci digembok

Berkas JSON yang sudah tayang bisa dibuka siapa pun yang tahu URL-nya.
Karena itu `node tools/gembok.js` mengubah:

- `kunci` menjadi hash SHA-256 dari jawaban yang sudah dinormalisasi,
  digarami dengan id soal. Peramban menilai dengan membandingkan hash
  lawan hash, kunci aslinya tidak pernah dikirim.
- `pembahasan` menjadi teks ter-encode base64, dibuka hanya setelah siswa
  mengumpulkan.
- pada soal koordinat, titik kuncinya disimpan terpisah sebagai
  `kunciTampil` yang juga ter-encode base64. Yang ini dibaca hanya untuk
  menumpuk kunci di atas jawaban siswa setelah ia mengumpulkan, dan tidak
  dipakai untuk menilai.

Base64 itu bukan pengamanan, hanya penghalang supaya tidak terbaca sekilas.
Hash-nya pun bisa dicoba satu per satu oleh orang yang benar-benar niat,
karena jawabannya berjumlah terbatas. Bila suatu saat kuis benar-benar
bernilai rapor, penilaian harus dipindahkan ke Apps Script dan soal
disajikan tanpa kunci sama sekali. Itu belum dibangun.

## Membuat sesi latihan

Buka `guru.html`, isi pilihannya, lalu salin tautannya atau tampilkan QR-nya
di layar kelas. Tidak ada sesi yang tersimpan di server: seluruh
pengaturannya ada di dalam tautan, jadi tidak ada apa pun yang perlu
dibereskan setelah pelajaran usai.

```
latihan.html?kelas=7&bab=bilangan-bulat&mode=kelas&kode=7A-01&durasi=25&jumlah=10&acak=1
```

| Mode | Parameter khusus | Perilaku |
|---|---|---|
| `kelas` | `kode`, `durasi` (menit) | Ada penghitung waktu. Sekali kerjakan. Pembahasan ditahan sampai guru membukanya. |
| `pr` | `kode`, `tenggat` (ISO) | Sekali kerjakan. Pembahasan muncul sendiri setelah tenggat lewat. |
| `mandiri` | - | Tautan permanen, boleh diulang, pembahasan langsung muncul. |

Parameter umum: `jumlah` (ambil sebagian soal), `acak=1` (acak urutan),
`level=1,2` (batasi level), `bobot=rata` (semua soal bernilai 1 poin),
`bahas=1` (buka pembahasan).

Untuk membahas bersama setelah latihan kelas selesai, pakai tombol
**Salin tautan pembahasan** di halaman guru: tautannya sama, hanya
ditambahi `&bahas=1`.

Soal yang didapat setiap siswa ditentukan oleh kode sesi dan namanya. Siswa
yang tabnya tertutup lalu membuka tautan yang sama akan mendapat soal yang
persis sama, beserta jawaban yang sudah terlanjur diisi.

## Memasang penerima data

1. Buat Google Spreadsheet baru di akun guru. Namanya bebas.
2. Menu **Extensions** lalu **Apps Script**.
3. Hapus isi `Code.gs` bawaannya, tempelkan seluruh isi
   `apps-script/Kode.gs` dari repo ini.
4. Di menu kiri, **Project Settings**, bagian **Script Properties**, tambahkan
   properti bernama `TOKEN` dengan nilai berupa kata sandi karangan sendiri.
   Nilai inilah yang nanti dimasukkan sebagai kode guru.
5. Kembali ke editor, jalankan fungsi `pasang` sekali untuk membuat sheet
   `Hasil` beserta baris judulnya. Google akan meminta izin; berikan.
6. **Deploy**, lalu **New deployment**, pilih tipe **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
7. Salin URL yang berakhiran `/exec`, tempelkan ke `ENDPOINT` di
   `js/konfig.js`, lalu commit.

"Who has access: Anyone" memang perlu, karena siswa tidak punya akun Google
yang dikenal skrip ini. Yang menjaga dashboard bukan URL-nya, melainkan
`TOKEN`: tanpa token yang cocok, `doGet` menolak semua permintaan. `doPost`
sengaja tidak memakai token, sebab siswa harus bisa mengirim hasil, tetapi ia
hanya menerima kiriman yang bentuknya lengkap dan tidak mengembalikan
apa-apa selain "diterima".

Bila kode di `apps-script/Kode.gs` disunting, tempelkan lagi ke Apps Script
lalu deploy ulang. Kalau tidak, salinan di repo dan yang benar-benar berjalan
akan berbeda diam-diam.

## Menaruh di Netlify

Pakai **Netlify dengan repo GitHub yang private**, bukan GitHub Pages.
GitHub Pages pada akun gratis mewajibkan repo publik, yang berarti bank soal
beserta berkas mentahnya bisa dibaca siapa pun lewat GitHub. Netlify bisa
men-deploy dari repo private tanpa biaya.

Repo private tidak membuat situsnya tertutup: berkas yang sudah ter-deploy
tetap bisa diakses siapa pun yang tahu URL-nya. Yang didapat hanyalah
sumbernya tidak terindeks dan tidak mudah ditelusuri.

Langkahnya: di Netlify, **Add new site**, **Import an existing project**,
pilih repo ini. Build command dikosongkan, publish directory diisi titik.
Berkas `netlify.toml` sudah mengatur sisanya, termasuk menutup akses ke
`/data/soal-mentah/`, `/tools/`, dan `/apps-script/`.

## Tiap tahun ajaran baru

Perbarui `data/kelas.json`: ganti `tahunAjaran`, ganti daftar kelas dan nama
siswanya. Daftar ini dipakai untuk saran nama saat mengetik dan untuk
mengetahui siapa yang belum mengerjakan.

Nama yang tidak ada di daftar tetap diterima, tetapi ditandai
`adaDiDaftar: false` dan muncul terpisah di dashboard supaya bisa diperiksa.

## Pengujian

Tanpa framework, tiga lapis:

```
node tools/uji.js       kasus uji penilaian, termasuk satu putaran menyeluruh
                        atas seluruh bank soal sungguhan
node tools/tautan.js    rujukan antar berkas dan kesegaran hasil gembok
node tools/gembok.js    ikut memeriksa bentuk berkas soal saat menggembok
```

Di peramban: `cek.html` memeriksa berkas soal (termasuk berkas mentah dari
komputer lewat pemilih berkas), dan `uji.html` menjalankan kasus uji yang
sama dengan `tools/uji.js`. Menjalankannya di peramban berguna untuk
memastikan penilaian berperilaku sama di ponsel yang benar-benar dipakai
siswa.

Uji `tools/uji.js` yang paling berguna adalah yang terakhir: seluruh bank
soal digembok, dijawab memakai kunci mentahnya, lalu harus bernilai 100.
Kalau penggembokan atau normalisasi rusak, uji itulah yang jatuh lebih dulu.

### Daftar periksa uji manual

Dikerjakan sekali sebelum dipakai di kelas sungguhan, dan sekali lagi
setiap kali `nilai.js`, `kirim.js`, atau `Kode.gs` disentuh.

- [ ] Satu putaran mode `kelas`: waktu berjalan, habis waktu mengumpulkan
      sendiri, membuka tautannya lagi menolak dengan sopan.
- [ ] Satu putaran mode `pr` dengan tenggat yang sudah lewat: pembahasan muncul.
- [ ] Satu putaran mode `mandiri` dua kali berturut-turut: soalnya berganti.
- [ ] Satu pengerjaan dalam keadaan luring (matikan wifi sebelum menekan
      Kumpulkan): muncul kode hasil, lalu terkirim sendiri saat wifi
      dinyalakan dan halaman mana pun dibuka.
- [ ] Tutup tab di tengah pengerjaan, buka lagi: jawaban yang sudah diisi
      masih ada.
- [ ] Satu berkas soal sengaja dirusak (hapus satu tanda kurung): halaman
      memberi pesan yang jelas dan bab lain tetap berfungsi.
- [ ] Buka `guru.html` di ponsel dan pindai QR-nya dengan ponsel lain.
- [ ] Kerjakan satu sesi dari dua HP berbeda, lalu periksa keempat tampilan
      dashboard.

## Kalau ada yang rusak

| Gejala | Kemungkinan penyebab |
|---|---|
| Halaman latihan bilang "File soal belum digembok" | `data/soal/` berisi berkas mentah, atau lupa menjalankan `node tools/gembok.js` |
| Hasil siswa tidak muncul di Spreadsheet | `ENDPOINT` di `js/konfig.js` kosong atau salah, atau deployment Apps Script belum diperbarui setelah kode disunting |
| Dashboard bilang token tidak cocok | Script Property `TOKEN` berbeda dengan kode guru yang dimasukkan |
| Dashboard kosong padahal siswa sudah mengumpulkan | Deployment lama masih dipakai; buat deployment baru lalu perbarui `ENDPOINT` |
| Rumus tampil sebagai teks mentah berlatar abu-abu | `vendor/katex/katex.min.js` gagal dimuat; halaman sengaja tetap terbaca |
| Nilai siswa nol padahal jawabannya benar | Jalankan `node tools/uji.js`. Bila putaran menyeluruh gagal, `nilai.js` dan hasil gembok tidak lagi sejalan; gembok ulang |
| Siswa mengaku sudah mengumpulkan tetapi tidak ada datanya | Minta kode hasil yang muncul di layarnya, lalu masukkan barisnya manual ke sheet |

Kode hasil berbentuk `<sesi>-<bab>-<nilai>-<enam huruf>`. Enam huruf
terakhir adalah cap dari isi hasilnya, sehingga angka nilainya tidak bisa
diubah diam-diam sebelum disetorkan.

## Yang sengaja tidak dibangun

Tidak ada akun siswa, tidak ada login sungguhan, tidak ada multi-guru, tidak
ada soal uraian yang dinilai manual, tidak ada unggah gambar oleh siswa,
tidak ada notifikasi, tidak ada aplikasi ponsel, tidak ada basis data selain
Spreadsheet, tidak ada kelas daring atau obrolan.

Keputusan yang masih terbuka: ambang "siswa perlu perhatian" masih tebakan
awal (60) dan perlu disetel ulang setelah sebulan dipakai; pemindahan
penilaian ke sisi server bila kuis mulai bernilai rapor; format ekspor nilai
untuk rapor menunggu formatnya diketahui.
