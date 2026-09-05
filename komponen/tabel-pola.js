/* tabel-pola.js - tabel pola bilangan beserta kolom selisih.
 *
 * Barisan aritmetika terlihat dari kolom selisih pertama yang tetap;
 * barisan bertingkat dua terlihat dari kolom selisih kedua yang tetap.
 * Komponen ini hanya menghitung dan menampilkan, tidak menyimpulkan.
 *
 * Pemakaian:
 *   TabelPola.buat(wadah, { suku: [2, 5, 8, 11, 14], tingkat: 1 });
 */
(function (akar) {
  'use strict';

  function selisih(deret) {
    var hasil = [];
    for (var i = 1; i < deret.length; i++) hasil.push(deret[i] - deret[i - 1]);
    return hasil;
  }

  function buat(wadah, atur) {
    atur = atur || {};
    var suku = (atur.suku || []).slice();
    var tingkat = atur.tingkat === undefined ? 1 : atur.tingkat;
    var interaktif = atur.interaktif !== false;

    wadah.innerHTML = '';
    var bungkus = document.createElement('div');
    bungkus.className = 'tabel-gulir';
    wadah.appendChild(bungkus);

    var kendali = document.createElement('div');
    kendali.className = 'deret';
    kendali.style.marginTop = '.5rem';
    if (interaktif) wadah.appendChild(kendali);

    function sel(nama, isi, kelas) {
      var e = document.createElement(nama);
      e.textContent = isi;
      if (kelas) e.className = kelas;
      return e;
    }

    function gambar() {
      var tabel = document.createElement('table');
      var kepala = document.createElement('tr');
      kepala.appendChild(sel('th', 'Suku ke-'));
      suku.forEach(function (_, i) { kepala.appendChild(sel('th', String(i + 1), 'angka')); });
      tabel.appendChild(kepala);

      var barisNilai = document.createElement('tr');
      barisNilai.appendChild(sel('th', 'Nilai'));
      suku.forEach(function (n) { barisNilai.appendChild(sel('td', String(n), 'angka')); });
      tabel.appendChild(barisNilai);

      var deret = suku;
      for (var t = 1; t <= tingkat; t++) {
        deret = selisih(deret);
        if (!deret.length) break;
        var baris = document.createElement('tr');
        baris.appendChild(sel('th', t === 1 ? 'Selisih' : 'Selisih ke-' + t));
        /* Sel kosong di depan supaya tiap selisih berdiri di antara dua
           suku yang menghasilkannya. */
        for (var k = 0; k < t; k++) baris.appendChild(sel('td', ''));
        deret.forEach(function (n) {
          baris.appendChild(sel('td', (n > 0 ? '+' : '') + n, 'angka'));
        });
        tabel.appendChild(baris);
      }

      bungkus.innerHTML = '';
      bungkus.appendChild(tabel);
      if (atur.onUbah) atur.onUbah({ suku: suku.slice() });
    }

    function tombol(isi, aksi) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tombol mungil';
      b.textContent = isi;
      b.addEventListener('click', aksi);
      kendali.appendChild(b);
    }

    if (interaktif) {
      tombol('Tambah suku', function () {
        /* Suku berikutnya diteruskan dengan menganggap selisih tingkat
           terakhir tetap. Untuk deret yang memang berpola, hasilnya benar. */
        var tumpuk = [suku.slice()];
        for (var t = 0; t < tingkat; t++) tumpuk.push(selisih(tumpuk[t]));
        var akhir = tumpuk[tumpuk.length - 1];
        if (!akhir.length) return;
        var tambahan = akhir[akhir.length - 1];
        for (var i = tumpuk.length - 2; i >= 0; i--) {
          tambahan = tumpuk[i][tumpuk[i].length - 1] + tambahan;
        }
        suku.push(tambahan);
        gambar();
      });
      tombol('Kurangi suku', function () {
        if (suku.length > 2) { suku.pop(); gambar(); }
      });
    }

    gambar();

    return {
      nilai: function () { return suku.slice(); },
      set: function (arr) { suku = (arr || []).slice(); gambar(); }
    };
  }

  akar.TabelPola = { buat: buat, selisih: selisih };
})(window);
