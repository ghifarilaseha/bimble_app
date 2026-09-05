/* soal.js - memuat bank soal dan menyiapkan satu set soal untuk dikerjakan.
 *
 * Pengacakan memakai benih tetap yang diturunkan dari kode sesi dan nama
 * siswa. Akibatnya, siswa yang menutup tab lalu membuka lagi mendapat soal
 * yang persis sama, sementara dua siswa berbeda tetap mendapat urutan
 * berbeda. Tanpa benih tetap, fitur "lanjutkan pengerjaan" jadi mustahil.
 */
(function (akar, pabrik) {
  var api = pabrik();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else akar.Soal = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function benihDari(teks) {
    var h = 2166136261 >>> 0;
    teks = String(teks);
    for (var i = 0; i < teks.length; i++) {
      h = Math.imul(h ^ teks.charCodeAt(i), 16777619);
    }
    return h >>> 0;
  }

  /* mulberry32: kecil, cukup baik untuk mengacak soal, dan hasilnya sama
     di semua peramban. */
  function acakan(benih) {
    var a = benih >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function kocok(daftar, rnd) {
    var a = daftar.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* Memuat satu file bank soal. Kesalahan dilaporkan dengan pesan yang
     bisa dibaca guru, bukan tumpukan galat peramban. */
  function muat(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('File soal tidak ditemukan (' + r.status + '): ' + url);
      return r.text();
    }).then(function (teks) {
      var bank;
      try {
        bank = JSON.parse(teks);
      } catch (e) {
        throw new Error('File soal rusak, bukan JSON yang sah: ' + url);
      }
      if (!bank || !Array.isArray(bank.soal)) {
        throw new Error('File soal tidak berisi daftar "soal": ' + url);
      }
      if (!bank.terkunci) {
        throw new Error('File soal belum digembok. Jalankan: node tools/gembok.js');
      }
      return bank;
    });
  }

  /* Soal lanjutan (misalnya "bangun apa yang terbentuk?") diratakan menjadi
     butir tersendiri supaya penilaian dan analisis butir tidak perlu tahu
     bahwa ia menempel pada soal koordinat. */
  function ratakan(daftar) {
    var hasil = [];
    daftar.forEach(function (s) {
      var salinan = {};
      for (var k in s) if (Object.prototype.hasOwnProperty.call(s, k)) salinan[k] = s[k];
      var lanjutan = salinan.lanjutan;
      delete salinan.lanjutan;
      hasil.push(salinan);
      if (lanjutan) {
        lanjutan.induk = salinan.id;
        hasil.push(lanjutan);
      }
    });
    return hasil;
  }

  /* opsi: { level: [1,2], jumlah: 10, acak: true, acakOpsi: true, benih: 'kode|nama' } */
  function siapkan(bank, opsi) {
    opsi = opsi || {};
    var rnd = acakan(benihDari(opsi.benih || 'tetap'));
    var batasLevel = (opsi.level && opsi.level.length) ? opsi.level : null;

    var dipakai = bank.soal.filter(function (s) {
      if (s.aktif === false) return false;
      if (batasLevel && batasLevel.indexOf(s.level) < 0) return false;
      return true;
    });

    if (opsi.jumlah && opsi.jumlah > 0 && opsi.jumlah < dipakai.length) {
      /* Soal dipilih acak lewat indeksnya, lalu indeks terpilih diurutkan
         kembali. Dengan begitu, sesi yang tidak diacak tetap mendapat
         cuplikan acak tetapi urutannya masih mengikuti berkas. */
      var semua = dipakai;
      var indeks = kocok(semua.map(function (_, i) { return i; }), rnd)
        .slice(0, opsi.jumlah)
        .sort(function (a, b) { return a - b; });
      dipakai = indeks.map(function (i) { return semua[i]; });
    }

    if (opsi.acak) dipakai = kocok(dipakai, rnd);

    dipakai = ratakan(dipakai).filter(function (s) {
      /* Soal lanjutan ikut tersaring bila levelnya di luar batas sesi. */
      return !(batasLevel && batasLevel.indexOf(s.level) < 0);
    });

    dipakai.forEach(function (s) {
      if (s.tipe === 'pg' && s.opsi) {
        var huruf = Object.keys(s.opsi);
        /* Urutan tampilan disimpan terpisah. Jawaban yang dikirim tetap
           memakai huruf asli, karena hash kunci terikat pada huruf asli. */
        s.urutanOpsi = (opsi.acakOpsi !== false && s.acakOpsi !== false)
          ? kocok(huruf, rnd) : huruf;
      }
    });

    return dipakai;
  }

  return {
    muat: muat,
    siapkan: siapkan,
    ratakan: ratakan,
    kocok: kocok,
    acakan: acakan,
    benihDari: benihDari
  };
});
