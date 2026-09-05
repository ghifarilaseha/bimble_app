/* kunci.js - hashing kunci jawaban.
 *
 * Kunci jawaban tidak pernah dikirim ke browser dalam bentuk terbaca.
 * Yang tersimpan di file soal adalah SHA-256 dari jawaban yang sudah
 * dikanonikkan, digarami dengan id soal. Browser menghitung hash jawaban
 * siswa lalu membandingkan hash dengan hash.
 *
 * Dipakai di browser (window.Kunci) dan di Node (require).
 */
(function (akar, pabrik) {
  var api = pabrik();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else akar.Kunci = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var nodeCrypto = null;
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    /* eslint-disable */
    nodeCrypto = require('node:crypto');
    /* eslint-enable */
  }

  /* Hash SHA-256 dari sebuah teks, dikembalikan sebagai heksadesimal. */
  function sha256(teks) {
    if (nodeCrypto) {
      return Promise.resolve(nodeCrypto.createHash('sha256').update(teks, 'utf8').digest('hex'));
    }
    var bita = new TextEncoder().encode(teks);
    return crypto.subtle.digest('SHA-256', bita).then(function (buf) {
      var arr = new Uint8Array(buf), keluar = '';
      for (var i = 0; i < arr.length; i++) keluar += arr[i].toString(16).padStart(2, '0');
      return keluar;
    });
  }

  /* Hash bergaram. Garam berisi id soal (dan penanda bagian bila perlu)
     supaya jawaban yang sama pada dua soal berbeda menghasilkan hash berbeda. */
  function hash(garam, nilai) {
    return sha256(String(garam) + '|' + String(nilai));
  }

  /* Bandingkan hash secara tetap-waktu sederhana. Bukan pertahanan sungguhan,
     hanya menghindari kebiasaan buruk. */
  function sama(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
    var beda = 0;
    for (var i = 0; i < a.length; i++) beda |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return beda === 0;
  }

  /* Apakah salah satu hash dalam daftar cocok. */
  function adaDalam(daftar, h) {
    if (!Array.isArray(daftar)) return false;
    for (var i = 0; i < daftar.length; i++) if (sama(daftar[i], h)) return true;
    return false;
  }

  /* Teks ter-encode base64 (aman UTF-8). Dipakai untuk pembahasan. */
  function keBase64(teks) {
    if (nodeCrypto) return Buffer.from(String(teks), 'utf8').toString('base64');
    var bita = new TextEncoder().encode(String(teks)), biner = '';
    for (var i = 0; i < bita.length; i++) biner += String.fromCharCode(bita[i]);
    return btoa(biner);
  }

  function dariBase64(b64) {
    if (!b64) return '';
    try {
      if (nodeCrypto) return Buffer.from(String(b64), 'base64').toString('utf8');
      var biner = atob(String(b64)), bita = new Uint8Array(biner.length);
      for (var i = 0; i < biner.length; i++) bita[i] = biner.charCodeAt(i);
      return new TextDecoder().decode(bita);
    } catch (e) {
      return '';
    }
  }

  return {
    sha256: sha256,
    hash: hash,
    sama: sama,
    adaDalam: adaDalam,
    keBase64: keBase64,
    dariBase64: dariBase64
  };
});
