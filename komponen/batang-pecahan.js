/* batang-pecahan.js - batang pecahan yang penyebutnya bisa diubah.
 *
 * Dua batang bertumpuk memperlihatkan mengapa 1/2 sama dengan 3/6:
 * panjang yang terarsir sama, hanya banyak potongnya yang berbeda.
 *
 * Dengan "kunciNilai", mengubah penyebut mempertahankan nilainya, sehingga
 * 1/2 berubah sendiri menjadi 2/4, 3/6, dan 4/8 -- potongannya bertambah
 * banyak tetapi ujung batangnya tidak bergeser. Itulah yang membuat
 * pecahan senilai berhenti jadi hafalan.
 *
 * Dengan "skala", di bawah batang digambar garis bilangan 0 sampai 1 yang
 * petaknya mengikuti penyebut, supaya ujung batang bisa dibaca sebagai
 * sebuah titik, bukan sekadar panjang.
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
    var penyebutMin = atur.penyebutMin || 1;
    var interaktif = atur.interaktif !== false;
    var banding = atur.banding || null;
    var tampilLabel = atur.label !== false;
    var pakaiSkala = !!atur.skala;
    var kunciNilai = !!atur.kunciNilai;

    /* Nilai patokan untuk kunciNilai: pecahan terakhir yang disetel siswa. */
    var acuanP = pembilang, acuanQ = penyebut;

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
            acuanP = pembilang;
            acuanQ = penyebut;
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

    var skalaEl = null;
    if (pakaiSkala) {
      skalaEl = document.createElement('div');
      skalaEl.style.cssText = 'position:relative;height:1.75rem;margin:.1rem 0 .2rem';
      bungkus.appendChild(skalaEl);
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

    /* Penyebut berubah, nilainya dipertahankan. Yang dipakai sebagai patokan
       adalah nilai terakhir yang benar-benar disetel siswa, bukan pecahan
       yang sedang tampil. Bedanya terasa saat penyebutnya dilewati satu per
       satu: dari 1/2 menuju penyebut 3 nilainya memang tidak bisa
       dipertahankan, tetapi begitu sampai di 4 ia kembali tepat menjadi 2/4,
       lalu 3/6 dan 4/8. Kalau patokannya pecahan yang sedang tampil,
       pembulatan di penyebut 3 akan terbawa terus dan rantai senilainya
       putus di tengah jalan.

       Perkaliannya bilangan bulat lalu dibulatkan, bukan lewat bilangan
       desimal, supaya tidak ada galat pembulatan yang menyelinap. */
    function ubahPenyebut(baru) {
      if (baru < penyebutMin || baru > penyebutMaks) return;
      if (kunciNilai && acuanQ > 0) {
        pembilang = Math.round((acuanP * baru) / acuanQ);
      }
      penyebut = baru;
      pembilang = Math.max(0, Math.min(pembilang, penyebut));
      gambar();
    }

    if (interaktif) {
      tombol('Penyebut kurang', function () { ubahPenyebut(penyebut - 1); });
      tombol('Penyebut tambah', function () { ubahPenyebut(penyebut + 1); });
    }

    /* Garis 0 sampai 1 dengan petak sebanyak penyebutnya. Penandanya
       diletakkan pada pecahan yang tepat, bukan pada piksel hasil
       pembulatan, sehingga ujung batang dan titiknya selalu sejajar. */
    function gambarSkala() {
      skalaEl.innerHTML = '';

      var garis = document.createElement('div');
      garis.style.cssText =
        'position:absolute;left:0;right:0;top:.4rem;border-top:1px solid var(--tinta-lembut)';
      skalaEl.appendChild(garis);

      for (var i = 0; i <= penyebut; i++) {
        var tanda = document.createElement('div');
        var utamaTanda = (i === 0 || i === penyebut);
        tanda.style.cssText =
          'position:absolute;top:' + (utamaTanda ? '.15rem' : '.28rem') + ';' +
          'left:' + (i * 100 / penyebut) + '%;width:1px;' +
          'height:' + (utamaTanda ? '.55rem' : '.28rem') + ';' +
          'background:var(--tinta-lembut)';
        skalaEl.appendChild(tanda);
      }

      [[0, '0'], [penyebut, '1']].forEach(function (pasang) {
        var t = document.createElement('div');
        t.className = 'kecil samar';
        t.textContent = pasang[1];
        t.style.cssText = 'position:absolute;top:.85rem;left:' +
          (pasang[0] * 100 / penyebut) + '%;transform:translateX(-50%)';
        skalaEl.appendChild(t);
      });

      var penanda = document.createElement('div');
      penanda.style.cssText =
        'position:absolute;top:.1rem;left:' + (pembilang * 100 / penyebut) + '%;' +
        'width:2px;height:.7rem;background:var(--aksen);transform:translateX(-1px)';
      skalaEl.appendChild(penanda);
    }

    function teksLabel() {
      var dasar = pembilang + '/' + penyebut;
      /* Nilai desimalnya dihitung lewat Pecahan supaya 1/3 tampil sebagai
         0,3333... dan bukan sebagai desimal yang seolah-olah berhenti. */
      if (!akar.Pecahan) return dasar;
      return dasar + ' = ' + akar.Pecahan.buat(pembilang, penyebut).teksDesimal();
    }

    function gambar() {
      pembilang = Math.max(0, Math.min(pembilang, penyebut));
      if (tampilLabel) labelUtama.textContent = teksLabel();
      gambarBatang(utama, pembilang, penyebut, 'var(--aksen)', interaktif);
      if (banding) {
        labelBanding.textContent = banding.pembilang + '/' + banding.penyebut;
        gambarBatang(bandingEl, banding.pembilang, banding.penyebut, 'var(--sorot)', false);
      }
      if (skalaEl) gambarSkala();
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
