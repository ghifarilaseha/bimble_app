/* tema.js - pilihan tema terang/gelap.
 *
 * Bawaannya selalu terang, tidak mengikuti pengaturan HP: teks gelap di atas
 * latar terang lebih teliti dibaca, terutama pecahan dan pangkat
 * (PAKEM-MATERI.md bagian J). Mode gelap tetap tersedia untuk belajar malam,
 * lewat tombol di kepala halaman. Pilihannya diingat di HP masing-masing.
 *
 * Dimuat di <head> tanpa defer, supaya tema sudah terpasang sebelum halaman
 * tergambar dan tidak berkedip dari terang ke gelap.
 */
(function () {
  'use strict';
  var KUNCI = 'tema';
  var akar = document.documentElement;

  function baca() {
    try { return localStorage.getItem(KUNCI) === 'gelap' ? 'gelap' : 'terang'; }
    catch (e) { return 'terang'; }
  }
  function simpan(t) {
    try { localStorage.setItem(KUNCI, t); } catch (e) { /* mode privat: cukup untuk sesi ini */ }
  }
  function pasang(t) {
    if (t === 'gelap') akar.setAttribute('data-tema', 'gelap');
    else akar.removeAttribute('data-tema');
  }

  pasang(baca());

  function buatTombol() {
    /* Selalu di ujung kanan .isi, bukan di dalam .kanan: beberapa halaman
       mengisi ulang teks .kanan (tahun ajaran di beranda) dan akan menghapusnya. */
    var isi = document.querySelector('.kepala .isi');
    if (!isi || isi.querySelector('.tombol-tema')) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'tombol mungil tombol-tema';
    function label() {
      var gelap = akar.getAttribute('data-tema') === 'gelap';
      /* Ikon saja: kepala halaman di HP sudah sempit. Namanya tetap
         terbaca pembaca layar lewat aria-label. */
      b.textContent = gelap ? '☀' : '☾';
      b.setAttribute('aria-pressed', gelap ? 'true' : 'false');
      b.title = gelap ? 'Ganti ke tampilan terang' : 'Ganti ke tampilan gelap';
      b.setAttribute('aria-label', b.title);
    }
    b.addEventListener('click', function () {
      var t = akar.getAttribute('data-tema') === 'gelap' ? 'terang' : 'gelap';
      pasang(t);
      simpan(t);
      label();
    });
    label();
    isi.appendChild(b);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buatTombol);
  else buatTombol();
})();
