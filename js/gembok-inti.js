/* gembok-inti.js - mengubah satu butir soal mentah menjadi butir tergembok.
 *
 * Dipisahkan dari tools/gembok.js supaya berkas uji bisa memakai jalur
 * penggembokan yang persis sama dengan yang dipakai saat menyiapkan soal.
 * Kalau uji memakai jalur sendiri, ia akan menguji hal yang salah.
 */
(function (akar, pabrik) {
  var diNode = (typeof module === 'object' && module.exports);
  var Kunci = diNode ? require('./kunci.js') : akar.Kunci;
  var Nilai = diNode ? require('./nilai.js') : akar.Nilai;
  var api = pabrik(Kunci, Nilai);
  if (diNode) module.exports = api;
  else akar.GembokInti = api;
})(typeof self !== 'undefined' ? self : this, function (Kunci, Nilai) {
  'use strict';

  /* "bantu" ikut disalin apa adanya: isinya bangun asal, garis cermin, dan
     pusat transformasi, yang memang harus terlihat sebelum siswa menjawab.
     Tidak ada kunci di dalamnya, jadi tidak ada yang perlu disembunyikan.
     "materi" adalah nomor kelompok materi pada asesmen diagnostik, dipakai
     untuk menyusun peta kuat-lemah per materi. */
  var DISALIN = ['id', 'level', 'tipe', 'varian', 'aktif', 'pertanyaan',
                 'opsi', 'grid', 'bantu', 'acakOpsi', 'induk', 'materi'];

  function butir(s, id) {
    var keluar = {};
    DISALIN.forEach(function (k) { if (s[k] !== undefined) keluar[k] = s[k]; });
    keluar.id = id;

    var tugas = [];

    /* Pembahasan hanya di-encode, bukan diamankan. Tujuannya supaya tidak
       terbaca sekilas saat berkas dibuka, bukan supaya mustahil dibaca. */
    keluar.pembahasan = Kunci.keBase64(s.pembahasan || '');

    if (s.tipe === 'pg') {
      tugas.push(Kunci.hash(id, String(s.kunci)).then(function (h) { keluar.kunci = h; }));
    }

    if (s.tipe === 'isian') {
      tugas.push(Promise.all(s.jawaban.map(function (j) {
        return Kunci.hash(id, Nilai.kanonik(j));
      })).then(function (hs) { keluar.kunci = hs; }));
    }

    if (s.tipe === 'benar-salah') {
      keluar.pernyataan = s.pernyataan.map(function (p) { return { teks: p.teks }; });
      s.pernyataan.forEach(function (p, i) {
        tugas.push(Kunci.hash(id + '#' + i, String(p.kunci)).then(function (h) {
          keluar.pernyataan[i].kunci = h;
        }));
      });
    }

    if (s.tipe === 'koordinat') {
      /* Titik kunci disimpan ter-encode, terpisah dari hash penilaian.
         Yang ini dibaca hanya setelah siswa submit, untuk menumpuk kunci
         di atas jawaban siswa pada bidang yang sama. */
      keluar.kunciTampil = Kunci.keBase64(JSON.stringify(s.kunci));

      if (s.varian === 'garis') {
        var pers = Nilai.kanonikGaris(s.kunci[0], s.kunci[1]);
        tugas.push(Kunci.hash(id + '#garis', pers).then(function (h) { keluar.kunci = h; }));
      } else if (s.varian === 'bangun') {
        var ruas = Nilai.unik(Nilai.ruasBangun(s.kunci));
        keluar.jumlahKunci = ruas.length;
        tugas.push(Promise.all(ruas.map(function (r) {
          return Kunci.hash(id + '#ruas', r);
        })).then(function (hs) { keluar.kunci = hs; }));
      } else {
        var titik = Nilai.unik(s.kunci.map(Nilai.kanonikTitik));
        keluar.jumlahKunci = titik.length;
        tugas.push(Promise.all(titik.map(function (t) {
          return Kunci.hash(id + '#titik', t);
        })).then(function (hs) { keluar.kunci = hs; }));
      }
    }

    if (s.lanjutan) {
      tugas.push(butir(s.lanjutan, id + '-l').then(function (l) { keluar.lanjutan = l; }));
    }

    return Promise.all(tugas).then(function () { return keluar; });
  }

  function bank(mentah) {
    return Promise.all(mentah.soal.map(function (s) { return butir(s, s.id); }))
      .then(function (soal) {
        return {
          meta: mentah.meta,
          terkunci: true,
          digembok: new Date().toISOString().slice(0, 10),
          soal: soal
        };
      });
  }

  return { butir: butir, bank: bank };
});
