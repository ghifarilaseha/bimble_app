/* batang-pecahan.js - batang pecahan yang penyebutnya bisa diubah.
 *
 * Dua batang bertumpuk memperlihatkan mengapa 1/2 sama dengan 3/6:
 * panjang yang terarsir sama, hanya banyak potongnya yang berbeda.
 *
 * Pemakaian:
 *   BatangPecahan.buat(wadah, { pembilang: 1, penyebut: 2,
 *                               banding: { pembilang: 3, penyebut: 6 } });
 */
(function (akar) {
  'use strict';

  function buat(wadah, atur) {
    atur = atur || {};
    var pembilang = atur.pembilang === undefined ? 1 : atur.pembilang;
    var penyebut = atur.penyebut === undefined ? 4 : atur.penyebut;
    var penyebutMaks = atur.penyebutMaks || 12;
    var interaktif = atur.interaktif !== false;
    var banding = atur.banding || null;

    wadah.innerHTML = '';
    var bungkus = document.createElement('div');
    wadah.appendChild(bungkus);

    function gambarBatang(indukEl, pb, py, warna, bolehKetuk) {
      indukEl.innerHTML = '';
      var barisEl = document.createElement('div');
      barisEl.style.cssText = 'display:flex;gap:2px;height:2.6rem;margin:.4rem 0';
      for (var i = 0; i < py; i++) {
        var potong = document.createElement('button');
        potong.type = 'button';
        potong.disabled = !bolehKetuk;
        potong.setAttribute('aria-label', 'Potongan ke-' + (i + 1) + ' dari ' + py);
        potong.style.cssText =
          'flex:1;border:1px solid var(--garis);border-radius:4px;padding:0;' +
          'cursor:' + (bolehKetuk ? 'pointer' : 'default') + ';' +
          'background:' + (i < pb ? warna : 'var(--kartu)');
        (function (indeks) {
          potong.addEventListener('click', function () {
            /* Mengetuk potongan terisi paling kanan berarti mengurangi;
               selain itu berarti mengisi sampai potongan itu. */
            pembilang = (indeks + 1 === pembilang) ? indeks : indeks + 1;
            gambar();
          });
        })(i);
        barisEl.appendChild(potong);
      }
      indukEl.appendChild(barisEl);
    }

    var labelUtama = document.createElement('div');
    labelUtama.className = 'kecil samar';
    var utama = document.createElement('div');
    bungkus.appendChild(labelUtama);
    bungkus.appendChild(utama);

    var bandingEl = null, labelBanding = null;
    if (banding) {
      labelBanding = document.createElement('div');
      labelBanding.className = 'kecil samar';
      bandingEl = document.createElement('div');
      bungkus.appendChild(labelBanding);
      bungkus.appendChild(bandingEl);
    }

    var kendali = document.createElement('div');
    kendali.className = 'deret';
    kendali.style.marginTop = '.5rem';
    if (interaktif) bungkus.appendChild(kendali);

    function tombol(isi, aksi) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tombol mungil';
      b.textContent = isi;
      b.addEventListener('click', aksi);
      kendali.appendChild(b);
    }

    if (interaktif) {
      tombol('Penyebut kurang', function () {
        if (penyebut > 1) { penyebut--; pembilang = Math.min(pembilang, penyebut); gambar(); }
      });
      tombol('Penyebut tambah', function () {
        if (penyebut < penyebutMaks) { penyebut++; gambar(); }
      });
    }

    function gambar() {
      pembilang = Math.max(0, Math.min(pembilang, penyebut));
      labelUtama.textContent = pembilang + '/' + penyebut +
        ' = ' + (Math.round((pembilang / penyebut) * 1000) / 1000);
      gambarBatang(utama, pembilang, penyebut, 'var(--aksen)', interaktif);
      if (banding) {
        labelBanding.textContent = banding.pembilang + '/' + banding.penyebut;
        gambarBatang(bandingEl, banding.pembilang, banding.penyebut, 'var(--sorot)', false);
      }
      if (atur.onUbah) atur.onUbah({ pembilang: pembilang, penyebut: penyebut });
    }

    gambar();

    return {
      nilai: function () { return { pembilang: pembilang, penyebut: penyebut }; },
      set: function (pb, py) { pembilang = pb; penyebut = py; gambar(); }
    };
  }

  akar.BatangPecahan = { buat: buat };
})(window);
