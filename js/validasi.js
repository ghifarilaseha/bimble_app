/* validasi.js - memeriksa bentuk sebuah bank soal.
 *
 * Dipakai dua kali: oleh tools/gembok.js sebelum menggembok berkas mentah,
 * dan oleh cek.html untuk memeriksa berkas yang sudah ter-deploy.
 * Pemeriksaan yang butuh kunci terbaca hanya berjalan pada bentuk mentah;
 * pada bentuk tergembok, kunci diperiksa dengan cara menghitung ulang hash
 * setiap opsi dan memastikan tepat satu yang cocok.
 */
(function (akar, pabrik) {
  var Kunci = (typeof module === 'object' && module.exports) ? require('./kunci.js') : akar.Kunci;
  var Nilai = (typeof module === 'object' && module.exports) ? require('./nilai.js') : akar.Nilai;
  var api = pabrik(Kunci, Nilai);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else akar.Validasi = api;
})(typeof self !== 'undefined' ? self : this, function (Kunci, Nilai) {
  'use strict';

  var TIPE = ['pg', 'isian', 'benar-salah', 'koordinat'];
  var VARIAN = ['titik', 'beberapa-titik', 'bangun', 'garis'];
  var RENTANG_MAKS = 13;

  function periksa(bank, opsi) {
    opsi = opsi || {};
    var bentuk = opsi.bentuk || (bank && bank.terkunci ? 'terkunci' : 'mentah');
    var galat = [], peringatan = [], janji = [];

    function salah(dimana, pesan) { galat.push({ dimana: dimana, pesan: pesan }); }
    function awas(dimana, pesan) { peringatan.push({ dimana: dimana, pesan: pesan }); }

    if (!bank || typeof bank !== 'object') {
      return Promise.resolve({ galat: [{ dimana: 'berkas', pesan: 'Isi berkas bukan objek JSON.' }], peringatan: [], jumlah: {} });
    }
    if (!Array.isArray(bank.soal)) {
      return Promise.resolve({ galat: [{ dimana: 'berkas', pesan: 'Tidak ada senarai "soal".' }], peringatan: [], jumlah: {} });
    }

    var meta = bank.meta || {};
    ['kelas', 'bab', 'judul', 'versi'].forEach(function (k) {
      if (!meta[k] && meta[k] !== 0) salah('meta', 'Field meta.' + k + ' kosong.');
    });

    var terlihat = Object.create(null);
    var perLevel = { 1: 0, 2: 0, 3: 0 };
    var perTipe = {};
    var aktif = 0;

    bank.soal.forEach(function (s, i) {
      var dimana = s && s.id ? s.id : 'soal ke-' + (i + 1);

      if (!s || typeof s !== 'object') return salah(dimana, 'Bukan objek.');
      if (!s.id) salah(dimana, 'Tidak punya id.');
      else if (terlihat[s.id]) salah(dimana, 'Id kembar dengan soal sebelumnya.');
      else terlihat[s.id] = true;

      if ([1, 2, 3].indexOf(s.level) < 0) salah(dimana, 'Level harus 1, 2, atau 3.');
      else if (s.aktif !== false) perLevel[s.level]++;

      if (TIPE.indexOf(s.tipe) < 0) salah(dimana, 'Tipe "' + s.tipe + '" tidak dikenal.');
      else if (s.aktif !== false) perTipe[s.tipe] = (perTipe[s.tipe] || 0) + 1;

      if (s.aktif !== false) aktif++;

      if (!s.pertanyaan || !String(s.pertanyaan).trim()) salah(dimana, 'Pertanyaan kosong.');
      if (!s.pembahasan) awas(dimana, 'Tidak ada pembahasan.');

      var dolar = (String(s.pertanyaan || '').match(/\$/g) || []).length;
      if (dolar % 2 !== 0) salah(dimana, 'Tanda $ pada pertanyaan tidak berpasangan.');

      janji.push(periksaButir(s, dimana, bentuk, salah, awas));

      if (s.lanjutan) {
        janji.push(periksaButir(s.lanjutan, dimana + ' (lanjutan)', bentuk, salah, awas));
      }
    });

    if (!aktif) salah('berkas', 'Tidak ada satu pun soal yang aktif.');

    return Promise.all(janji).then(function () {
      return {
        galat: galat,
        peringatan: peringatan,
        jumlah: { soal: bank.soal.length, aktif: aktif, level: perLevel, tipe: perTipe },
        meta: meta,
        bentuk: bentuk
      };
    });
  }

  function periksaButir(s, dimana, bentuk, salah, awas) {
    if (s.tipe === 'pg') return periksaPg(s, dimana, bentuk, salah, awas);
    if (s.tipe === 'isian') return periksaIsian(s, dimana, bentuk, salah, awas);
    if (s.tipe === 'benar-salah') return periksaBenarSalah(s, dimana, bentuk, salah, awas);
    if (s.tipe === 'koordinat') return periksaKoordinat(s, dimana, bentuk, salah, awas);
    return Promise.resolve();
  }

  function periksaPg(s, dimana, bentuk, salah, awas) {
    var huruf = s.opsi ? Object.keys(s.opsi) : [];
    if (huruf.length < 2) {
      salah(dimana, 'Soal pilihan ganda perlu paling sedikit dua opsi.');
      return Promise.resolve();
    }
    var isiOpsi = huruf.map(function (h) { return String(s.opsi[h]).trim(); });
    isiOpsi.forEach(function (t, i) {
      if (!t) salah(dimana, 'Opsi ' + huruf[i] + ' kosong.');
      if (isiOpsi.indexOf(t) !== i) salah(dimana, 'Opsi ' + huruf[i] + ' sama persis dengan opsi lain.');
    });

    if (bentuk === 'mentah') {
      if (huruf.indexOf(s.kunci) < 0) salah(dimana, 'Kunci "' + s.kunci + '" tidak mengacu ke opsi mana pun.');
      return Promise.resolve();
    }
    /* Bentuk tergembok: hitung ulang hash tiap huruf opsi. Tepat satu
       harus cocok. Ini menangkap kunci yang menunjuk opsi yang sudah
       dihapus, tanpa perlu tahu kunci aslinya. */
    return Promise.all(huruf.map(function (h) { return Kunci.hash(s.id, h); }))
      .then(function (hs) {
        var cocok = hs.filter(function (h) { return Kunci.sama(h, s.kunci); }).length;
        if (cocok !== 1) salah(dimana, 'Kunci tidak cocok dengan tepat satu opsi (cocok: ' + cocok + ').');
      });
  }

  function periksaIsian(s, dimana, bentuk, salah, awas) {
    if (bentuk === 'mentah') {
      if (!Array.isArray(s.jawaban) || !s.jawaban.length) {
        salah(dimana, 'Soal isian perlu senarai "jawaban" yang tidak kosong.');
        return Promise.resolve();
      }
      var kanonikan = s.jawaban.map(Nilai.kanonik);
      kanonikan.forEach(function (k, i) {
        if (!k) salah(dimana, 'Jawaban ke-' + (i + 1) + ' kosong setelah dinormalisasi.');
        if (kanonikan.indexOf(k) !== i) {
          awas(dimana, 'Jawaban "' + s.jawaban[i] + '" kembar setelah dinormalisasi, jadi mubazir.');
        }
      });
    } else if (!Array.isArray(s.kunci) || !s.kunci.length) {
      salah(dimana, 'Tidak ada hash kunci.');
    }
    return Promise.resolve();
  }

  function periksaBenarSalah(s, dimana, bentuk, salah, awas) {
    if (!Array.isArray(s.pernyataan) || s.pernyataan.length < 2) {
      salah(dimana, 'Soal benar-salah perlu paling sedikit dua pernyataan.');
      return Promise.resolve();
    }
    s.pernyataan.forEach(function (p, i) {
      if (!p || !String(p.teks || '').trim()) salah(dimana, 'Pernyataan ke-' + (i + 1) + ' kosong.');
      if (bentuk === 'mentah' && typeof p.kunci !== 'boolean') {
        salah(dimana, 'Kunci pernyataan ke-' + (i + 1) + ' harus true atau false.');
      }
      if (bentuk === 'terkunci' && typeof p.kunci !== 'string') {
        salah(dimana, 'Kunci pernyataan ke-' + (i + 1) + ' belum digembok.');
      }
    });
    if (bentuk === 'mentah') {
      var semua = s.pernyataan.map(function (p) { return p.kunci; });
      if (semua.every(Boolean) || !semua.some(Boolean)) {
        awas(dimana, 'Semua pernyataan berkunci sama; siswa bisa menebak sekaligus.');
      }
    }
    return Promise.resolve();
  }

  function periksaKoordinat(s, dimana, bentuk, salah, awas) {
    if (VARIAN.indexOf(s.varian) < 0) {
      salah(dimana, 'Varian "' + s.varian + '" tidak dikenal.');
      return Promise.resolve();
    }
    var g = s.grid;
    if (!g || ['xMin', 'xMax', 'yMin', 'yMax'].some(function (k) { return typeof g[k] !== 'number'; })) {
      salah(dimana, 'Grid harus punya xMin, xMax, yMin, dan yMax berupa angka.');
      return Promise.resolve();
    }
    if (g.xMax <= g.xMin || g.yMax <= g.yMin) salah(dimana, 'Rentang grid terbalik atau nol.');
    if (g.xMax - g.xMin > RENTANG_MAKS || g.yMax - g.yMin > RENTANG_MAKS) {
      salah(dimana, 'Rentang grid lebih dari ' + RENTANG_MAKS + ' satuan, tidak terbaca di layar HP.');
    }

    /* Gambar acuan disalin apa adanya saat digembok, sehingga bentuknya
       diperiksa pada berkas mentah maupun berkas yang sudah tayang. */
    if (s.bantu !== undefined) periksaBantu(s.bantu, g, dimana, salah, awas);

    if (bentuk === 'mentah') {
      if (!Array.isArray(s.kunci) || !s.kunci.length) {
        salah(dimana, 'Kunci koordinat kosong.');
        return Promise.resolve();
      }
      if (s.varian === 'titik' && s.kunci.length !== 1) {
        salah(dimana, 'Varian titik hanya boleh punya satu titik kunci.');
      }
      if (s.varian === 'garis' && s.kunci.length !== 2) {
        salah(dimana, 'Varian garis perlu tepat dua titik yang dilalui garis.');
      }
      if (s.varian === 'bangun' && s.kunci.length < 3) {
        salah(dimana, 'Bangun tertutup perlu paling sedikit tiga titik sudut.');
      }
      s.kunci.forEach(function (t, i) {
        if (!Array.isArray(t) || t.length !== 2 || t.some(function (n) { return typeof n !== 'number'; })) {
          return salah(dimana, 'Titik kunci ke-' + (i + 1) + ' bukan pasangan angka.');
        }
        if (t[0] !== Math.round(t[0]) || t[1] !== Math.round(t[1])) {
          salah(dimana, 'Titik kunci ke-' + (i + 1) + ' bukan titik grid bilangan bulat.');
        }
        if (t[0] < g.xMin || t[0] > g.xMax || t[1] < g.yMin || t[1] > g.yMax) {
          salah(dimana, 'Titik kunci ke-' + (i + 1) + ' berada di luar grid.');
        }
      });
    } else {
      var perluSenarai = s.varian !== 'garis';
      if (perluSenarai && (!Array.isArray(s.kunci) || !s.kunci.length)) salah(dimana, 'Hash kunci kosong.');
      if (!perluSenarai && typeof s.kunci !== 'string') salah(dimana, 'Hash kunci garis kosong.');
      if (perluSenarai && s.jumlahKunci !== s.kunci.length) {
        salah(dimana, 'jumlahKunci tidak sama dengan banyaknya hash kunci.');
      }
    }
    return Promise.resolve();
  }

  /* Titik acuan yang meleset keluar grid tidak menimbulkan galat apa pun di
     peramban: bangunnya hanya terpotong diam-diam, dan soalnya jadi mustahil
     dibaca siswa. Karena itu diperiksa di sini. */
  function periksaBantu(b, g, dimana, salah, awas) {
    if (!b || typeof b !== 'object' || Array.isArray(b)) {
      return salah(dimana, 'Field "bantu" harus berupa objek.');
    }

    function titikSah(t, sebut) {
      if (!Array.isArray(t) || t.length !== 2 ||
          t.some(function (n) { return typeof n !== 'number'; })) {
        salah(dimana, sebut + ' bukan pasangan angka.');
        return false;
      }
      if (t[0] !== Math.round(t[0]) || t[1] !== Math.round(t[1])) {
        salah(dimana, sebut + ' bukan titik grid bilangan bulat.');
        return false;
      }
      if (t[0] < g.xMin || t[0] > g.xMax || t[1] < g.yMin || t[1] > g.yMax) {
        salah(dimana, sebut + ' berada di luar grid.');
        return false;
      }
      return true;
    }

    if (b.acuan !== undefined) {
      if (!Array.isArray(b.acuan)) {
        salah(dimana, 'bantu.acuan harus berupa senarai bangun.');
      } else {
        b.acuan.forEach(function (bentuk, i) {
          var sebut = 'bantu.acuan ke-' + (i + 1);
          if (!bentuk || !Array.isArray(bentuk.titik) || !bentuk.titik.length) {
            return salah(dimana, sebut + ' tidak punya senarai "titik" yang berisi.');
          }
          bentuk.titik.forEach(function (t, j) {
            titikSah(t, sebut + ' titik ke-' + (j + 1));
          });
          if (bentuk.label && bentuk.label.length !== bentuk.titik.length) {
            awas(dimana, sebut + ' punya label yang jumlahnya tidak sama dengan titiknya.');
          }
        });
      }
    }

    if (b.cermin !== undefined) {
      if (!Array.isArray(b.cermin) || b.cermin.length !== 2) {
        salah(dimana, 'bantu.cermin perlu tepat dua titik yang dilalui garis cermin.');
      } else {
        var sah = b.cermin.map(function (t, i) {
          return titikSah(t, 'bantu.cermin titik ke-' + (i + 1));
        });
        if (sah[0] && sah[1] &&
            b.cermin[0][0] === b.cermin[1][0] && b.cermin[0][1] === b.cermin[1][1]) {
          salah(dimana, 'Dua titik bantu.cermin berimpit, garis cerminnya tidak tertentu.');
        }
      }
    }

    if (b.pusat !== undefined) titikSah(b.pusat, 'bantu.pusat');

    if (b.labelPusat !== undefined && typeof b.labelPusat !== 'string') {
      salah(dimana, 'bantu.labelPusat harus berupa teks.');
    }
    if (b.labelPusat && b.pusat === undefined) {
      awas(dimana, 'bantu.labelPusat ditulis tanpa bantu.pusat, jadi tidak tergambar.');
    }
  }

  return { periksa: periksa, TIPE: TIPE, VARIAN: VARIAN, RENTANG_MAKS: RENTANG_MAKS };
});
