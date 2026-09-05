/* nilai.js - normalisasi jawaban dan penilaian semua tipe soal.
 *
 * Semua perbandingan dilakukan terhadap hash, bukan kunci terbaca.
 * Fungsi normalisasi di sini dipakai dua kali: oleh tools/gembok.js saat
 * membuat hash dari file mentah, dan oleh browser saat menilai jawaban siswa.
 * Kalau keduanya tidak memakai fungsi yang sama persis, penilaian akan meleset.
 * Karena itu berkas ini dimuat apa adanya di kedua tempat.
 */
(function (akar, pabrik) {
  var Kunci = (typeof module === 'object' && module.exports)
    ? require('./kunci.js')
    : akar.Kunci;
  var api = pabrik(Kunci);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else akar.Nilai = api;
})(typeof self !== 'undefined' ? self : this, function (Kunci) {
  'use strict';

  /* ---------- normalisasi teks ---------- */

  /* Satuan hanya dibuang bila yang tersisa di depannya berupa angka.
     Penjagaan ini penting: tanpa itu jawaban "trapesium" akan kehilangan
     huruf "m" di ujungnya. */
  var SATUAN = [
    'derajatcelcius', 'derajatcelsius', 'derajat', 'persegi', 'kubik', 'persen',
    'rupiah', 'sentimeter', 'centimeter', 'kilometer', 'milimeter', 'mililiter',
    'kilogram', 'meter', 'liter', 'gram', 'satuan', 'siswa', 'orang', 'buah',
    'tahun', 'bulan', 'hari', 'menit', 'detik', 'jam',
    'cm2', 'cm3', 'mm2', 'mm3', 'km2', 'km3', 'dm2', 'dm3', 'm2', 'm3',
    'cm', 'mm', 'dm', 'km', 'kg', 'ml', 'gr', 'm', 'l', 'g', '%', '\u00b0'
  ];
  var RE_SATUAN = new RegExp('^(-?[0-9.,/_]+)(?:' + SATUAN.join('|') + ')+$');

  function normalisasiTeks(x) {
    var s = String(x == null ? '' : x);
    s = s.replace(/[\u00a0\u2007\u202f]/g, ' ');
    s = s.replace(/[\u2010-\u2015\u2212]/g, '-');
    s = s.toLowerCase().replace(/\s+/g, ' ').trim();
    s = s.replace(/\brp\.?\s*/g, '');
    /* pecahan campuran "1 3/4" dipertahankan bentuknya sebelum spasi dibuang */
    s = s.replace(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/, '$1_$2/$3');
    s = s.replace(/\s+/g, '');
    var m = s.match(RE_SATUAN);
    if (m) s = m[1];
    /* pemisah ribuan versus pemisah desimal */
    if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    else if (s.indexOf('.') >= 0 && s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(/,/g, '.');
    else s = s.replace(/,/g, '.');
    return s;
  }

  /* Bentuk baku yang di-hash. Angka disamakan secara numerik supaya
     0,750 dan 0.75 menghasilkan hash yang sama. Pecahan dibiarkan apa adanya
     karena bentuk pecahan sering justru yang diminta soal. */
  function kanonik(x) {
    var s = normalisasiTeks(x);
    if (/^-?\d+(\.\d+)?$/.test(s)) {
      var n = Number(s);
      if (isFinite(n)) s = String(n === 0 ? 0 : n);
    }
    return s;
  }

  function apakahAngka(x) {
    return /^-?\d+(\.\d+)?$/.test(normalisasiTeks(x));
  }

  /* ---------- normalisasi koordinat ---------- */

  function bulat(n) {
    var b = Math.round(Number(n));
    return b === 0 ? 0 : b;
  }

  function kanonikTitik(t) { return bulat(t[0]) + ',' + bulat(t[1]); }

  /* Ruas garis tidak berarah: (A,B) sama dengan (B,A). */
  function kanonikRuas(a, b) {
    var A = kanonikTitik(a), B = kanonikTitik(b);
    return A <= B ? A + '|' + B : B + '|' + A;
  }

  function fpb(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { var t = a % b; a = b; b = t; }
    return a;
  }

  /* Persamaan garis melalui dua titik grid, dibakukan menjadi ax + by = c
     dengan fpb 1 dan tanda a positif (atau a nol dan b positif).
     Dengan begitu dua siswa yang menarik garis sama lewat pasangan titik
     berbeda tetap menghasilkan bentuk identik. */
  function kanonikGaris(p, q) {
    var a = bulat(q[1]) - bulat(p[1]);
    var b = bulat(p[0]) - bulat(q[0]);
    if (a === 0 && b === 0) return null;
    var c = a * bulat(p[0]) + b * bulat(p[1]);
    var g = fpb(fpb(a, b), c);
    if (g > 1) { a /= g; b /= g; c /= g; }
    if (a < 0 || (a === 0 && b < 0)) { a = -a; b = -b; c = -c; }
    return a + ',' + b + ',' + c;
  }

  /* Daftar ruas dari rangkaian titik yang membentuk bangun tertutup. */
  function ruasBangun(titik) {
    var hasil = [];
    for (var i = 0; i < titik.length; i++) {
      var j = (i + 1) % titik.length;
      if (kanonikTitik(titik[i]) === kanonikTitik(titik[j])) continue;
      hasil.push(kanonikRuas(titik[i], titik[j]));
    }
    return hasil;
  }

  function unik(daftar) {
    var lihat = Object.create(null), hasil = [];
    for (var i = 0; i < daftar.length; i++) {
      if (!lihat[daftar[i]]) { lihat[daftar[i]] = 1; hasil.push(daftar[i]); }
    }
    return hasil;
  }

  /* ---------- penilaian ---------- */

  function kosong(j) {
    if (j === null || j === undefined || j === '') return true;
    if (Array.isArray(j)) {
      return j.length === 0 || j.every(function (x) { return x === null || x === undefined; });
    }
    return false;
  }

  function hasilKosong(soal, poinMaks) {
    return {
      id: soal.id, tipe: soal.tipe, level: soal.level || 1,
      poinMaks: poinMaks, poin: 0, bagian: 0, benar: false, dijawab: false
    };
  }

  function bungkus(soal, poinMaks, bagian) {
    bagian = Math.max(0, Math.min(1, bagian));
    return {
      id: soal.id, tipe: soal.tipe, level: soal.level || 1,
      poinMaks: poinMaks,
      poin: Math.round(poinMaks * bagian * 1000) / 1000,
      bagian: bagian,
      benar: bagian >= 1,
      dijawab: true
    };
  }

  /* Menilai satu soal. Mengembalikan Promise karena hashing bersifat async
     di browser. opsi.bobotRata membuat semua soal bernilai 1 poin. */
  function nilaiSoal(soal, jawaban, opsi) {
    opsi = opsi || {};
    var poinMaks = opsi.bobotRata ? 1 : (soal.level || 1);
    if (kosong(jawaban)) return Promise.resolve(hasilKosong(soal, poinMaks));

    if (soal.tipe === 'pg') {
      return Kunci.hash(soal.id, String(jawaban)).then(function (h) {
        return bungkus(soal, poinMaks, Kunci.sama(h, soal.kunci) ? 1 : 0);
      });
    }

    if (soal.tipe === 'isian') {
      return Kunci.hash(soal.id, kanonik(jawaban)).then(function (h) {
        return bungkus(soal, poinMaks, Kunci.adaDalam(soal.kunci, h) ? 1 : 0);
      });
    }

    if (soal.tipe === 'benar-salah') {
      var n = soal.pernyataan.length;
      var janji = soal.pernyataan.map(function (p, i) {
        var jw = jawaban[i];
        if (jw !== true && jw !== false) return Promise.resolve(false);
        return Kunci.hash(soal.id + '#' + i, String(jw)).then(function (h) {
          return Kunci.sama(h, p.kunci);
        });
      });
      return Promise.all(janji).then(function (cocok) {
        var benar = cocok.filter(Boolean).length;
        return bungkus(soal, poinMaks, n ? benar / n : 0);
      });
    }

    if (soal.tipe === 'koordinat') return nilaiKoordinat(soal, jawaban, poinMaks);

    return Promise.resolve(hasilKosong(soal, poinMaks));
  }

  function nilaiKoordinat(soal, jawaban, poinMaks) {
    var varian = soal.varian || 'titik';

    if (varian === 'garis') {
      if (!Array.isArray(jawaban) || jawaban.length < 2) {
        return Promise.resolve(hasilKosong(soal, poinMaks));
      }
      var pers = kanonikGaris(jawaban[0], jawaban[1]);
      if (!pers) return Promise.resolve(hasilKosong(soal, poinMaks));
      return Kunci.hash(soal.id + '#garis', pers).then(function (h) {
        return bungkus(soal, poinMaks, Kunci.sama(h, soal.kunci) ? 1 : 0);
      });
    }

    if (varian === 'bangun') {
      var ruas = unik(ruasBangun(jawaban || []));
      if (!ruas.length) return Promise.resolve(hasilKosong(soal, poinMaks));
      return Promise.all(ruas.map(function (r) { return Kunci.hash(soal.id + '#ruas', r); }))
        .then(function (hs) {
          var cocok = hs.filter(function (h) { return Kunci.adaDalam(soal.kunci, h); }).length;
          /* Bangun dinilai utuh: seluruh ruas harus tepat, tidak lebih dan
             tidak kurang. Nilai sebagian hanya berlaku untuk beberapa-titik. */
          var pas = cocok === hs.length && hs.length === soal.jumlahKunci;
          return bungkus(soal, poinMaks, pas ? 1 : 0);
        });
    }

    var titik = unik((jawaban || []).map(kanonikTitik));
    if (!titik.length) return Promise.resolve(hasilKosong(soal, poinMaks));
    return Promise.all(titik.map(function (t) { return Kunci.hash(soal.id + '#titik', t); }))
      .then(function (hs) {
        var cocok = hs.filter(function (h) { return Kunci.adaDalam(soal.kunci, h); }).length;
        var lebih = hs.length - cocok;
        if (varian === 'titik') {
          return bungkus(soal, poinMaks, (cocok === 1 && hs.length === 1) ? 1 : 0);
        }
        var total = soal.jumlahKunci || 1;
        /* Titik yang ditaburkan asal-asalan mengurangi hasil, tetapi nilai
           tidak pernah turun di bawah nol. */
        return bungkus(soal, poinMaks, (cocok - lebih) / total);
      });
  }

  /* Menilai seluruh soal sekaligus lalu menghitung nilai akhir. */
  function nilaiSemua(daftarSoal, jawaban, opsi) {
    opsi = opsi || {};
    return Promise.all(daftarSoal.map(function (s) {
      return nilaiSoal(s, jawaban[s.id], opsi);
    })).then(function (butir) {
      var poinTotal = 0, poinRaih = 0;
      butir.forEach(function (b) { poinTotal += b.poinMaks; poinRaih += b.poin; });
      return {
        butir: butir,
        poinTotal: Math.round(poinTotal * 1000) / 1000,
        poinRaih: Math.round(poinRaih * 1000) / 1000,
        nilai: poinTotal > 0 ? Math.round((poinRaih / poinTotal) * 100) : 0
      };
    });
  }

  return {
    normalisasiTeks: normalisasiTeks,
    kanonik: kanonik,
    apakahAngka: apakahAngka,
    kanonikTitik: kanonikTitik,
    kanonikRuas: kanonikRuas,
    kanonikGaris: kanonikGaris,
    ruasBangun: ruasBangun,
    unik: unik,
    nilaiSoal: nilaiSoal,
    nilaiSemua: nilaiSemua
  };
});
