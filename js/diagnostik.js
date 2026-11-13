/* diagnostik.js - peta kuat-lemah per materi untuk asesmen diagnostik.
 *
 * Bank soal diagnostik ditandai lewat meta.diagnostik:
 *   { "opsiBelumTahu": "e", "materi": ["Bilangan Bulat & Pecahan", ...] }
 * dan setiap soalnya membawa "materi" (nomor 1..n) serta level 1-3.
 * Satu materi diwakili tiga soal: mudah, sedang, sulit.
 *
 * Dipakai di dua tempat dengan aturan yang sama persis: layar hasil siswa
 * (latihan.js) dan dashboard guru (guru.js). Aturan kategorinya mengikuti
 * kisi-kisi asesmen:
 *   belum  : ketiga soal dijawab "Belum tahu" atau dilewati
 *   cek    : soal mudah tidak benar, tetapi soal sedang/sulit benar
 *   kuat   : soal sulit benar (dan soal mudah benar)
 *   cukup  : soal sedang benar, soal sulit tidak
 *   lemah  : selain itu
 */
(function (akar, pabrik) {
  var api = pabrik();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else akar.Diagnostik = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var KATEGORI = {
    kuat:  { label: 'Kuat',             saran: 'Cukup latihan soal TO.' },
    cukup: { label: 'Cukup',            saran: 'Latihan soal cerita dan penalaran.' },
    lemah: { label: 'Lemah',            saran: 'Ulang konsep dasarnya.' },
    belum: { label: 'Belum dipelajari', saran: 'Pelajari materinya dari awal.' },
    cek:   { label: 'Cek ulang',        saran: 'Mungkin menebak atau ceroboh; tanyakan langsung.' }
  };

  /* Urutan prioritas: yang paling perlu dikejar lebih dulu. */
  var URUT_PRIORITAS = ['belum', 'lemah', 'cek', 'cukup', 'kuat'];

  function adalah(meta) { return !!(meta && meta.diagnostik && meta.diagnostik.materi); }

  /* Status satu butir: benar, salah, belum (memilih "Belum tahu"), kosong. */
  function statusButir(jawab, benar, opsiBelumTahu) {
    var j = jawab === undefined || jawab === null ? '' : String(jawab);
    if (benar === true) return 'benar';
    if (j === '') return 'kosong';
    if (opsiBelumTahu && j === opsiBelumTahu) return 'belum';
    return 'salah';
  }

  function kategori(sel) {
    var benar = sel.map(function (s) { return s === 'benar'; });
    var tidakTahu = sel.every(function (s) { return s === 'belum' || s === 'kosong' || s === null; });
    if (tidakTahu) return 'belum';
    if (!benar[0] && (benar[1] || benar[2])) return 'cek';
    if (benar[2]) return 'kuat';
    if (benar[1]) return 'cukup';
    return 'lemah';
  }

  /* perId: id soal -> soal (dari berkas bank). idSoal, jawaban, benar:
     senarai sejajar seperti yang dikirim ke spreadsheet.
     Hasil: [{ no, judul, sel: [status mudah, sedang, sulit], kategori }] */
  function petakan(meta, perId, idSoal, jawaban, benar) {
    var daftar = meta.diagnostik.materi;
    var e = meta.diagnostik.opsiBelumTahu;
    var peta = daftar.map(function (judul, i) {
      return { no: i + 1, judul: judul, sel: [null, null, null] };
    });
    idSoal.forEach(function (id, i) {
      var s = perId[id];
      if (!s || !s.materi || !peta[s.materi - 1]) return;
      if ([1, 2, 3].indexOf(s.level) < 0) return;
      peta[s.materi - 1].sel[s.level - 1] = statusButir(jawaban[i], benar[i], e);
    });
    peta.forEach(function (m) { m.kategori = kategori(m.sel); });
    return peta;
  }

  function prioritas(peta, n) {
    return peta.filter(function (m) { return m.kategori !== 'kuat'; })
      .sort(function (a, b) {
        var d = URUT_PRIORITAS.indexOf(a.kategori) - URUT_PRIORITAS.indexOf(b.kategori);
        return d || a.no - b.no;
      })
      .slice(0, n || 3);
  }

  function lolos(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var TANDA = { benar: '✓', salah: '✗', belum: '?', kosong: '–' };
  var JUDUL_SEL = { benar: 'Benar', salah: 'Salah', belum: 'Belum tahu', kosong: 'Dilewati' };

  function selHTML(s) {
    if (!s) return '<td class="dg-sel"></td>';
    return '<td class="dg-sel dg-' + s + '" title="' + JUDUL_SEL[s] + '">' + TANDA[s] + '</td>';
  }

  function capHTML(k) {
    return '<span class="dg-cap dg-k-' + k + '">' + KATEGORI[k].label + '</span>';
  }

  /* Tabel peta satu siswa: satu baris per materi, nama materi dan label
     penguasaannya di kolom pertama, lalu tiga sel mudah, sedang, sulit.
     Sengaja hanya empat kolom supaya muat di layar HP tanpa digeser. */
  function petaHTML(peta) {
    return '<table class="dg-peta"><thead><tr>' +
      '<th>Materi</th><th class="dg-sel">Mudah</th><th class="dg-sel">Sedang</th>' +
      '<th class="dg-sel">Sulit</th></tr></thead><tbody>' +
      peta.map(function (m) {
        return '<tr><td>' + m.no + '. ' + lolos(m.judul) + '<br>' + capHTML(m.kategori) + '</td>' +
          m.sel.map(selHTML).join('') + '</tr>';
      }).join('') + '</tbody></table>' + keteranganHTML();
  }

  function keteranganHTML() {
    return '<p class="kecil samar dg-ket">' +
      ['benar', 'salah', 'belum', 'kosong'].map(function (s) {
        return '<span class="dg-mini dg-' + s + '">' + TANDA[s] + '</span> ' + JUDUL_SEL[s];
      }).join(' &nbsp; ') + '</p>';
  }

  function prioritasHTML(peta) {
    var p = prioritas(peta, 3);
    if (!p.length) return '<p>Semua materi sudah kuat. Pertahankan dengan latihan soal TO.</p>';
    return '<ol class="dg-prioritas">' + p.map(function (m) {
      return '<li><strong>' + lolos(m.judul) + '</strong> ' + capHTML(m.kategori) +
        '<br><span class="kecil samar">' + KATEGORI[m.kategori].saran + '</span></li>';
    }).join('') + '</ol>';
  }

  /* Rekap satu kelas. pengerjaan: [{ nama, peta }]. Satu baris per siswa,
     satu kolom per materi, isinya inisial kategori berwarna. */
  function rekapKelasHTML(daftarMateri, pengerjaan) {
    var INISIAL = { kuat: 'K', cukup: 'C', lemah: 'L', belum: 'B', cek: '!' };
    var hitung = daftarMateri.map(function () { return { kuat: 0, cukup: 0, lemah: 0, belum: 0, cek: 0 }; });
    pengerjaan.forEach(function (p) {
      p.peta.forEach(function (m, i) { hitung[i][m.kategori]++; });
    });

    var urutLemah = daftarMateri.map(function (j, i) {
      return { no: i + 1, judul: j, perlu: hitung[i].lemah + hitung[i].belum + hitung[i].cek, h: hitung[i] };
    }).sort(function (a, b) { return b.perlu - a.perlu || a.no - b.no; });

    var bagian1 = '<h3>Materi yang paling perlu dikejar</h3>' +
      '<div class="tabel-gulir"><table class="dg-peta"><thead><tr><th>Materi</th>' +
      ['kuat', 'cukup', 'lemah', 'belum', 'cek'].map(function (k) {
        return '<th class="angka">' + capHTML(k) + '</th>';
      }).join('') + '</tr></thead><tbody>' +
      urutLemah.map(function (m) {
        return '<tr><td>' + m.no + '. ' + lolos(m.judul) + '</td>' +
          ['kuat', 'cukup', 'lemah', 'belum', 'cek'].map(function (k) {
            return '<td class="angka">' + (m.h[k] || '<span class="samar">0</span>') + '</td>';
          }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';

    var bagian2 = '<h3 class="dg-judul">Peta per siswa</h3>' +
      '<div class="tabel-gulir"><table class="dg-peta dg-rapat"><thead><tr><th>Nama</th>' +
      daftarMateri.map(function (j, i) {
        return '<th class="dg-sel" title="' + lolos(j) + '">' + (i + 1) + '</th>';
      }).join('') + '</tr></thead><tbody>' +
      pengerjaan.map(function (p) {
        return '<tr><td>' + lolos(p.nama) + '</td>' + p.peta.map(function (m) {
          return '<td class="dg-sel dg-k-' + m.kategori + '" title="' + lolos(m.judul) + ': ' +
            KATEGORI[m.kategori].label + '">' + INISIAL[m.kategori] + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>' +
      '<p class="kecil samar dg-ket">K = Kuat, C = Cukup, L = Lemah, B = Belum dipelajari, ! = Cek ulang. ' +
      'Nomor kolom mengikuti nomor materi pada tabel di atas.</p>';

    return bagian1 + bagian2;
  }

  return {
    KATEGORI: KATEGORI,
    adalah: adalah,
    statusButir: statusButir,
    kategori: kategori,
    petakan: petakan,
    prioritas: prioritas,
    petaHTML: petaHTML,
    prioritasHTML: prioritasHTML,
    rekapKelasHTML: rekapKelasHTML
  };
});
