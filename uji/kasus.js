/* kasus.js - kumpulan kasus uji untuk nilai.js.
 *
 * Berjalan sama persis di Node (node tools/uji.js) dan di peramban
 * (buka uji.html). Setiap kasus menggembok soal mentah lewat jalur yang
 * sama dengan tools/gembok.js, lalu menilainya seperti browser siswa.
 * Dengan begitu yang diuji adalah rantai lengkapnya, bukan potongannya.
 */
(function (akar, pabrik) {
  var diNode = (typeof module === 'object' && module.exports);
  var Nilai = diNode ? require('../js/nilai.js') : akar.Nilai;
  var Gembok = diNode ? require('../js/gembok-inti.js') : akar.GembokInti;
  var api = pabrik(Nilai, Gembok);
  if (diNode) module.exports = api;
  else akar.KasusUji = api;
})(typeof self !== 'undefined' ? self : this, function (Nilai, Gembok) {
  'use strict';

  var kasus = [];

  function uji(nama, jalan) { kasus.push({ nama: nama, jalan: jalan }); }

  function samaDekat(a, b) { return Math.abs(a - b) < 1e-9; }

  /* Menggembok satu soal mentah lalu menilainya, seperti alur sungguhan. */
  function nilaiLewatGembok(mentah, jawaban, opsi) {
    return Gembok.butir(mentah, mentah.id).then(function (terkunci) {
      return Nilai.nilaiSoal(terkunci, jawaban, opsi);
    });
  }

  /* ---------- normalisasi ---------- */

  uji('Normalisasi isian menyamakan bentuk angka dan satuan', function () {
    var pasangan = [
      ['0,750', '0.75'],
      ['0.75', '0.75'],
      [' 3 / 4 ', '3/4'],
      ['Rp 1.500', '1500'],
      ['1.234.567', '1234567'],
      ['12,5 cm', '12.5'],
      ['21 derajat', '21'],
      ['75%', '75'],
      ['1 3/4', '1_3/4'],
      ['  TRAPESIUM ', 'trapesium'],
      ['segi tiga', 'segitiga']
    ];
    var gagal = pasangan.filter(function (p) { return Nilai.kanonik(p[0]) !== p[1]; });
    return Promise.resolve({
      lulus: gagal.length === 0,
      catatan: gagal.length ? gagal.map(function (p) {
        return JSON.stringify(p[0]) + ' menjadi ' + JSON.stringify(Nilai.kanonik(p[0])) +
          ', diharapkan ' + JSON.stringify(p[1]);
      }).join('; ') : pasangan.length + ' bentuk diperiksa'
    });
  });

  uji('Satuan tidak terpotong dari jawaban berupa kata', function () {
    /* Ini penjagaan terhadap bug yang mudah terjadi: membuang satuan "m"
       dari "trapesium". Satuan hanya dibuang bila di depannya angka. */
    var aman = ['trapesium', 'meter', 'gram', 'jam'].every(function (k) {
      return Nilai.kanonik(k) === k;
    });
    return Promise.resolve({ lulus: aman, catatan: 'kata utuh dipertahankan' });
  });

  uji('Isian menerima jawaban senilai yang ditulis berbeda', function () {
    var soal = {
      id: 'uji-isian', level: 2, tipe: 'isian',
      pertanyaan: 'Bentuk desimal dari tiga perempat adalah ...',
      jawaban: ['0,75'], pembahasan: '-'
    };
    return Promise.all([
      nilaiLewatGembok(soal, '0,750'),
      nilaiLewatGembok(soal, '0.75'),
      nilaiLewatGembok(soal, '  0,75  '),
      nilaiLewatGembok(soal, '3/4')
    ]).then(function (h) {
      return {
        lulus: h[0].benar && h[1].benar && h[2].benar && !h[3].benar,
        catatan: 'bentuk senilai diterima, bentuk lain yang tidak didaftarkan ditolak'
      };
    });
  });

  uji('Isian yang tidak dijawab bernilai nol dan ditandai belum dijawab', function () {
    var soal = {
      id: 'uji-kosong', level: 3, tipe: 'isian',
      pertanyaan: '...', jawaban: ['5'], pembahasan: '-'
    };
    return nilaiLewatGembok(soal, '').then(function (h) {
      return { lulus: h.poin === 0 && h.dijawab === false, catatan: 'poin ' + h.poin };
    });
  });

  /* ---------- pilihan ganda ---------- */

  uji('Pilihan ganda menilai berdasarkan huruf asli, bukan urutan tampilan', function () {
    var soal = {
      id: 'uji-pg', level: 1, tipe: 'pg',
      pertanyaan: '...', opsi: { a: '$-2$', b: '$-1$', c: '$3$' },
      kunci: 'b', pembahasan: '-'
    };
    return Promise.all([nilaiLewatGembok(soal, 'b'), nilaiLewatGembok(soal, 'c')])
      .then(function (h) {
        return {
          lulus: h[0].benar && h[0].poin === 1 && !h[1].benar && h[1].poin === 0,
          catatan: 'kunci b benar, opsi c salah'
        };
      });
  });

  /* ---------- benar-salah ---------- */

  var soalBS = {
    id: 'uji-bs', level: 2, tipe: 'benar-salah',
    pertanyaan: '...',
    pernyataan: [
      { teks: '$7 > -90$', kunci: true },
      { teks: '$-9 < -19$', kunci: false },
      { teks: '$-1 > 0$', kunci: false },
      { teks: '$0 > -1$', kunci: true }
    ],
    pembahasan: '-'
  };

  uji('Benar-salah memberi nilai sebagian sesuai jumlah pernyataan yang tepat', function () {
    return nilaiLewatGembok(soalBS, [true, false, true, true]).then(function (h) {
      /* tiga dari empat tepat, bobot level 2, jadi 2 x 0,75 = 1,5 */
      return {
        lulus: samaDekat(h.bagian, 0.75) && samaDekat(h.poin, 1.5) && h.benar === false,
        catatan: 'bagian ' + h.bagian + ', poin ' + h.poin
      };
    });
  });

  uji('Benar-salah yang seluruhnya tepat bernilai penuh', function () {
    return nilaiLewatGembok(soalBS, [true, false, false, true]).then(function (h) {
      return { lulus: h.benar && samaDekat(h.poin, 2), catatan: 'poin ' + h.poin };
    });
  });

  uji('Pernyataan yang dilewati dihitung tidak tepat, bukan dihukum', function () {
    return nilaiLewatGembok(soalBS, [true, false, null, null]).then(function (h) {
      return { lulus: samaDekat(h.bagian, 0.5) && h.poin >= 0, catatan: 'bagian ' + h.bagian };
    });
  });

  /* ---------- koordinat: titik ---------- */

  var soalTitik = {
    id: 'uji-titik', level: 1, tipe: 'koordinat', varian: 'titik',
    pertanyaan: '...', grid: { xMin: -6, xMax: 6, yMin: -6, yMax: 6 },
    kunci: [[-3, 2]], pembahasan: '-'
  };

  uji('Titik tunggal benar hanya bila tepat satu titik dan tepat letaknya', function () {
    return Promise.all([
      nilaiLewatGembok(soalTitik, [[-3, 2]]),
      nilaiLewatGembok(soalTitik, [[3, 2]]),
      nilaiLewatGembok(soalTitik, [[-3, 2], [1, 1]])
    ]).then(function (h) {
      return {
        lulus: h[0].benar && !h[1].benar && !h[2].benar,
        catatan: 'menaburkan titik tambahan tidak lagi dihitung benar'
      };
    });
  });

  /* ---------- koordinat: beberapa titik ---------- */

  var soalBeberapa = {
    id: 'uji-beberapa', level: 3, tipe: 'koordinat', varian: 'beberapa-titik',
    pertanyaan: '...', grid: { xMin: -6, xMax: 6, yMin: -6, yMax: 6 },
    kunci: [[1, 1], [4, 1], [4, 5]], pembahasan: '-'
  };

  uji('Beberapa titik dinilai sebagian, urutan tidak diperhitungkan', function () {
    return Promise.all([
      nilaiLewatGembok(soalBeberapa, [[4, 5], [1, 1], [4, 1]]),
      nilaiLewatGembok(soalBeberapa, [[1, 1], [4, 1]]),
      nilaiLewatGembok(soalBeberapa, [[1, 1], [4, 1], [4, 5], [0, 0]])
    ]).then(function (h) {
      return {
        lulus: h[0].benar && samaDekat(h[1].bagian, 2 / 3) && samaDekat(h[2].bagian, 2 / 3),
        catatan: 'urutan bebas; dua dari tiga bernilai 2/3; satu titik ngawur mengurangi satu'
      };
    });
  });

  uji('Menaburkan banyak titik tidak menghasilkan nilai', function () {
    var semua = [];
    for (var x = -6; x <= 6; x++) for (var y = -6; y <= 6; y++) semua.push([x, y]);
    return nilaiLewatGembok(soalBeberapa, semua).then(function (h) {
      return { lulus: h.poin === 0, catatan: '169 titik menghasilkan poin ' + h.poin };
    });
  });

  /* ---------- koordinat: bangun ---------- */

  var soalBangun = {
    id: 'uji-bangun', level: 2, tipe: 'koordinat', varian: 'bangun',
    pertanyaan: '...', grid: { xMin: -6, xMax: 6, yMin: -6, yMax: 6 },
    kunci: [[-4, -1], [2, -1], [2, 3], [-4, 3]], pembahasan: '-'
  };

  uji('Bangun benar meski dimulai dari titik lain dan arah terbalik', function () {
    return Promise.all([
      nilaiLewatGembok(soalBangun, [[2, 3], [-4, 3], [-4, -1], [2, -1]]),
      nilaiLewatGembok(soalBangun, [[-4, 3], [2, 3], [2, -1], [-4, -1]]),
      nilaiLewatGembok(soalBangun, [[-4, -1], [2, -1], [2, 3], [-4, 3]])
    ]).then(function (h) {
      return {
        lulus: h.every(function (x) { return x.benar; }),
        catatan: 'himpunan ruas garis yang dibandingkan, bukan urutan titik'
      };
    });
  });

  uji('Bangun yang kurang atau lebih satu titik sudut dinilai salah', function () {
    return Promise.all([
      nilaiLewatGembok(soalBangun, [[-4, -1], [2, -1], [2, 3]]),
      nilaiLewatGembok(soalBangun, [[-4, -1], [2, -1], [2, 3], [-4, 3], [-5, 1]])
    ]).then(function (h) {
      return {
        lulus: !h[0].benar && h[0].poin === 0 && !h[1].benar,
        catatan: 'bangun dinilai utuh, tanpa nilai sebagian'
      };
    });
  });

  /* ---------- koordinat: garis ---------- */

  var soalGaris = {
    id: 'uji-garis', level: 3, tipe: 'koordinat', varian: 'garis',
    pertanyaan: 'Gambarlah garis $y = 2x - 1$.',
    grid: { xMin: -6, xMax: 6, yMin: -6, yMax: 6 },
    kunci: [[0, -1], [2, 3]], pembahasan: '-'
  };

  uji('Garis dinilai dari persamaannya, bukan dari titik yang dipilih', function () {
    return Promise.all([
      nilaiLewatGembok(soalGaris, [[1, 1], [3, 5]]),
      nilaiLewatGembok(soalGaris, [[2, 3], [0, -1]]),
      nilaiLewatGembok(soalGaris, [[0, 0], [2, 4]]),
      nilaiLewatGembok(soalGaris, [[0, -1], [1, 1], [2, 3]])
    ]).then(function (h) {
      return {
        lulus: h[0].benar && h[1].benar && !h[2].benar && h[3].benar,
        catatan: 'dua titik mana pun pada garis yang sama diterima; garis sejajar ditolak'
      };
    });
  });

  uji('Garis mendatar dan tegak punya bentuk baku yang tetap', function () {
    var mendatar = Nilai.kanonikGaris([-3, 2], [4, 2]);
    var mendatarLain = Nilai.kanonikGaris([4, 2], [-1, 2]);
    var tegak = Nilai.kanonikGaris([5, -2], [5, 6]);
    var tegakLain = Nilai.kanonikGaris([5, 6], [5, 0]);
    return Promise.resolve({
      lulus: mendatar === mendatarLain && tegak === tegakLain && mendatar !== tegak,
      catatan: 'mendatar ' + mendatar + ', tegak ' + tegak
    });
  });

  /* ---------- penilaian keseluruhan ---------- */

  uji('Nilai akhir memakai bobot level, dan bobot dapat diratakan', function () {
    var mentah = [
      { id: 'a1', level: 1, tipe: 'isian', pertanyaan: '-', jawaban: ['1'], pembahasan: '-' },
      { id: 'a2', level: 3, tipe: 'isian', pertanyaan: '-', jawaban: ['2'], pembahasan: '-' }
    ];
    return Promise.all(mentah.map(function (s) { return Gembok.butir(s, s.id); }))
      .then(function (soal) {
        var jawaban = { a1: '1', a2: 'salah' };
        return Promise.all([
          Nilai.nilaiSemua(soal, jawaban),
          Nilai.nilaiSemua(soal, jawaban, { bobotRata: true })
        ]);
      }).then(function (h) {
        /* Berbobot: 1 dari 4 poin, jadi 25. Diratakan: 1 dari 2, jadi 50. */
        return {
          lulus: h[0].nilai === 25 && h[1].nilai === 50,
          catatan: 'berbobot ' + h[0].nilai + ', diratakan ' + h[1].nilai
        };
      });
  });

  uji('Soal lanjutan pada bangun dinilai sebagai butir tersendiri', function () {
    var mentah = {
      id: 'uji-lanjutan', level: 2, tipe: 'koordinat', varian: 'bangun',
      pertanyaan: '-', grid: { xMin: -6, xMax: 6, yMin: -6, yMax: 6 },
      kunci: [[0, 0], [4, 0], [4, 3], [0, 3]], pembahasan: '-',
      lanjutan: {
        level: 2, tipe: 'pg', pertanyaan: 'Luasnya ...',
        opsi: { a: '$7$', b: '$12$' }, kunci: 'b', pembahasan: '-'
      }
    };
    return Gembok.butir(mentah, mentah.id).then(function (terkunci) {
      var Soal = modulSoal();
      var rata = Soal.ratakan([terkunci]);
      return Nilai.nilaiSemua(rata, {
        'uji-lanjutan': [[0, 0], [4, 0], [4, 3], [0, 3]],
        'uji-lanjutan-l': 'b'
      }).then(function (h) {
        return {
          lulus: rata.length === 2 && h.butir.length === 2 && h.nilai === 100 &&
                 rata[1].induk === 'uji-lanjutan',
          catatan: rata.length + ' butir setelah diratakan, nilai ' + h.nilai
        };
      });
    });
  });


  /* ---------- kode QR ---------- */

  /* Keluaran penyandi QR pernah dibandingkan modul demi modul dengan
     implementasi rujukan (pustaka qrcode) dan sama persis, termasuk
     pemilihan pola topengnya. Sidik di bawah mengunci hasil itu supaya
     perubahan yang tidak disengaja langsung ketahuan, tanpa perlu
     memasang pustaka apa pun. */
  uji("Kode QR menghasilkan matriks yang sama seperti saat diverifikasi", function () {
    var QRLokal = (typeof require === "function" && typeof module === "object")
      ? require("../komponen/qr.js")
      : (typeof self !== "undefined" ? self.QR : null);
    if (!QRLokal) return Promise.resolve({ lulus: false, catatan: "qr.js belum dimuat" });

    var Kunci2 = (typeof require === "function" && typeof module === "object")
      ? require("../js/kunci.js")
      : (typeof self !== "undefined" ? self.Kunci : null);

    var contoh = [
      { teks: "https://a.netlify.app/latihan.html?kelas=7&bab=bilangan-bulat" +
               "&mode=kelas&kode=7A-01&durasi=25&jumlah=10&acak=1",
        versi: 6, ukuran: 41, sidik: "59a48d0f924dfffd" },
      { teks: "a", versi: 1, ukuran: 21, sidik: "2a29499fa66525ef" }
    ];

    return Promise.all(contoh.map(function (c) {
      var m = QRLokal.matriks(c.teks);
      if (m.versi !== c.versi || m.length !== c.ukuran) {
        return "versi " + m.versi + " ukuran " + m.length + ", diharapkan " +
               c.versi + " dan " + c.ukuran;
      }
      var rata = m.map(function (b) { return b.join(""); }).join("");
      return Kunci2.sha256(rata).then(function (h) {
        return h.slice(0, 16) === c.sidik ? null : "sidik " + h.slice(0, 16);
      });
    })).then(function (masalah) {
      var gagal = masalah.filter(Boolean);
      return {
        lulus: gagal.length === 0,
        catatan: gagal.length ? gagal.join("; ") : "versi 6 dan versi 1 cocok dengan sidik tersimpan"
      };
    });
  });

  uji("Kode QR menolak teks yang melebihi kapasitas versi 10", function () {
    var QRLokal = (typeof require === "function" && typeof module === "object")
      ? require("../komponen/qr.js")
      : (typeof self !== "undefined" ? self.QR : null);
    var ditolak = false;
    try { QRLokal.matriks(new Array(400).join("x")); }
    catch (e) { ditolak = true; }
    return Promise.resolve({
      lulus: ditolak,
      catatan: "teks 399 huruf ditolak dengan pesan yang jelas"
    });
  });

  /* ---------- penyiapan set soal ---------- */

  function modulSoal() {
    return (typeof require === 'function' && typeof module === 'object')
      ? require('../js/soal.js')
      : (typeof self !== 'undefined' ? self.Soal : null);
  }

  function bankPalsu() {
    var soal = [];
    for (var i = 1; i <= 12; i++) {
      soal.push({
        id: 'p' + (i < 10 ? '0' : '') + i,
        level: (i % 3) + 1,
        tipe: 'pg',
        pertanyaan: 'Soal ke-' + i,
        opsi: { a: '1', b: '2', c: '3', d: '4' },
        kunci: 'a',
        pembahasan: ''
      });
    }
    return { terkunci: true, meta: { versi: 'uji' }, soal: soal };
  }

  uji('Cuplikan soal tetap mengikuti urutan berkas bila tidak diacak', function () {
    var Soal = modulSoal();
    var dipakai = Soal.siapkan(bankPalsu(), { jumlah: 5, acak: false, benih: 'x' });
    var id = dipakai.map(function (s) { return s.id; });
    var urut = id.slice().sort();
    return Promise.resolve({
      lulus: id.length === 5 && id.join() === urut.join(),
      catatan: id.join(' ')
    });
  });

  uji('Benih yang sama memberi soal yang sama, benih berbeda memberi soal berbeda', function () {
    var Soal = modulSoal();
    function ambil(benih) {
      return Soal.siapkan(bankPalsu(), { jumlah: 5, acak: true, benih: benih })
        .map(function (s) { return s.id; }).join();
    }
    var a1 = ambil('7A-01|Budi'), a2 = ambil('7A-01|Budi');
    var lain = ['7A-01|Ahmad', '7A-01|Citra', '7A-02|Budi'].map(ambil);
    var adaYangBeda = lain.some(function (x) { return x !== a1; });
    return Promise.resolve({
      lulus: a1 === a2 && adaYangBeda,
      catatan: 'siswa yang sama mendapat set yang sama saat membuka ulang tautan'
    });
  });

  uji('Pembatas level ikut berlaku untuk soal lanjutan', function () {
    var Soal = modulSoal();
    var bank = bankPalsu();
    bank.soal[1].level = 2;
    bank.soal[1].lanjutan = {
      id: bank.soal[1].id + '-l', level: 1, tipe: 'isian',
      pertanyaan: 'Lanjutannya', kunci: [], pembahasan: ''
    };
    var dipakai = Soal.siapkan(bank, { level: [2], acak: false, benih: 'x' });
    var adaLevelLain = dipakai.some(function (s) { return s.level !== 2; });
    return Promise.resolve({
      lulus: dipakai.length > 0 && !adaLevelLain,
      catatan: dipakai.length + ' butir, semuanya level 2'
    });
  });

  uji('Pengacakan opsi tidak menghilangkan atau menggandakan opsi', function () {
    var Soal = modulSoal();
    var dipakai = Soal.siapkan(bankPalsu(), { acak: true, acakOpsi: true, benih: 'z' });
    var rusak = dipakai.filter(function (s) {
      var asli = Object.keys(s.opsi).slice().sort().join();
      var tampil = s.urutanOpsi.slice().sort().join();
      return asli !== tampil;
    });
    return Promise.resolve({
      lulus: rusak.length === 0,
      catatan: dipakai.length + ' soal diperiksa, urutan tampilan tetap memuat semua opsi'
    });
  });

  /* ---------- pelari ---------- */

  function jalankan(lapor) {
    return kasus.reduce(function (rantai, k) {
      return rantai.then(function (kumpul) {
        return Promise.resolve()
          .then(function () { return k.jalan(); })
          .catch(function (e) { return { lulus: false, catatan: 'galat: ' + e.message }; })
          .then(function (hasil) {
            var baris = { nama: k.nama, lulus: !!hasil.lulus, catatan: hasil.catatan || '' };
            if (lapor) lapor(baris);
            return kumpul.concat([baris]);
          });
      });
    }, Promise.resolve([]));
  }

  return { kasus: kasus, jalankan: jalankan };
});
