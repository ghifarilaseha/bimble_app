/* identitas.js - nama siswa, normalisasi, dan ingatan di localStorage.
 *
 * Tidak ada verifikasi identitas. Sistem ini berjalan atas dasar
 * kepercayaan kelas. Yang dilakukan di sini hanya merapikan ketikan dan
 * mengingat jawaban terakhir supaya siswa tidak mengetik ulang tiap kali.
 */
(function (akar, pabrik) {
  var api = pabrik();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else akar.Identitas = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var KUNCI_SIMPAN = 'bimble.identitas';

  /* Kata yang tetap huruf kecil di tengah nama. */
  var KECIL = { 'bin': 1, 'binti': 1, 'al': 1, 'van': 1, 'de': 1, 'da': 1 };

  /* "  budi   SANTOSO " menjadi "Budi Santoso" */
  function rapikanNama(x) {
    var s = String(x == null ? '' : x)
      .replace(/[\u00a0]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    if (!s) return '';
    return s.split(' ').map(function (kata, i) {
      if (i > 0 && KECIL[kata]) return kata;
      /* nama berpenghubung seperti "abdul-aziz" ikut dikapitalkan */
      return kata.split('-').map(function (bagian) {
        return bagian ? bagian.charAt(0).toUpperCase() + bagian.slice(1) : bagian;
      }).join('-');
    }).join(' ');
  }

  /* Bentuk pembanding: dipakai untuk mencocokkan dengan daftar kelas,
     tidak pernah ditampilkan. */
  function kunciNama(x) {
    return rapikanNama(x).toLowerCase();
  }

  /* Saran nama sambil mengetik. Cocokkan awal kata dulu, baru potongan
     di tengah, sehingga mengetik "bud" memunculkan "Budi Santoso" di atas. */
  function saran(daftar, ketikan, batas) {
    batas = batas || 6;
    var q = kunciNama(ketikan);
    if (!q) return [];
    var awal = [], tengah = [];
    (daftar || []).forEach(function (nama) {
      var k = kunciNama(nama);
      if (k === q) return awal.unshift(nama);
      var kata = k.split(' ');
      var cocokAwal = kata.some(function (w) { return w.indexOf(q) === 0; });
      if (cocokAwal) awal.push(nama);
      else if (k.indexOf(q) >= 0) tengah.push(nama);
    });
    return awal.concat(tengah).slice(0, batas);
  }

  function adaDiDaftar(daftar, nama) {
    var k = kunciNama(nama);
    return (daftar || []).some(function (n) { return kunciNama(n) === k; });
  }

  /* Bila nama siswa cocok dengan daftar, pakai ejaan resmi dari daftar
     supaya rekap tidak terpecah karena beda ejaan. */
  function samakanDenganDaftar(daftar, nama) {
    var k = kunciNama(nama);
    var cocok = (daftar || []).filter(function (n) { return kunciNama(n) === k; })[0];
    return cocok || rapikanNama(nama);
  }

  function simpan(id) {
    try {
      localStorage.setItem(KUNCI_SIMPAN, JSON.stringify({
        nama: id.nama, kelas: id.kelas, waktu: Date.now()
      }));
    } catch (e) { /* mode penyamaran atau kuota penuh: abaikan saja */ }
  }

  function baca() {
    try {
      var mentah = localStorage.getItem(KUNCI_SIMPAN);
      if (!mentah) return null;
      var d = JSON.parse(mentah);
      return (d && d.nama) ? d : null;
    } catch (e) { return null; }
  }

  function lupakan() {
    try { localStorage.removeItem(KUNCI_SIMPAN); } catch (e) { /* abaikan */ }
  }

  return {
    rapikanNama: rapikanNama,
    kunciNama: kunciNama,
    saran: saran,
    adaDiDaftar: adaDiDaftar,
    samakanDenganDaftar: samakanDenganDaftar,
    simpan: simpan,
    baca: baca,
    lupakan: lupakan
  };
});
