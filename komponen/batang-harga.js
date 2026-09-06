/* batang-harga.js - dua batang harga bersusun dengan selisih tersorot.
 *
 * Bukan perluasan batang-pecahan.js, walaupun tampilannya sekeluarga.
 * Yang bisa dipakai ulang dari sana cuma cara menggambar deretan petak;
 * modelnya berbeda. Di sini kedua batang sama-sama bisa digeser (batang
 * pembanding di batang-pecahan bersifat tetap), nilainya rupiah dan bukan
 * pecahan dari satu, dan yang justru jadi pokok perhatian adalah selisih
 * antara keduanya.
 *
 * Gunanya satu: memperlihatkan bahwa untung Rp20.000 dari modal Rp100.000
 * dan untung Rp20.000 dari modal Rp200.000 adalah dua hal yang berbeda,
 * walaupun angka rupiahnya sama. Selisihnya sama panjang, tetapi batang
 * modalnya tidak -- dan persentase selalu dibandingkan terhadap modal.
 *
 * Semua nilai dikunci ke kelipatan "satuan", sehingga hitungannya selalu
 * bisa dikerjakan tanpa kalkulator.
 *
 * Pemakaian:
 *   BatangHarga.buat(wadah, {
 *     satuan: 20000, maks: 400000, beli: 100000, jual: 120000,
 *     onUbah: function (k) { ... }
 *   });
 */
(function (akar) {
  'use strict';

  function buat(wadah, atur) {
    atur = atur || {};
    var satuan = atur.satuan || 20000;
    var maks = atur.maks || 400000;
    var petak = Math.max(1, Math.round(maks / satuan));
    var interaktif = atur.interaktif !== false;

    var beli = bulatkan(atur.beli === undefined ? satuan * 5 : atur.beli);
    var jual = bulatkan(atur.jual === undefined ? satuan * 6 : atur.jual);
    var dariJual = false;

    function bulatkan(n) {
      var p = Math.round(n / satuan);
      return Math.min(petak, Math.max(0, p)) * satuan;
    }

    function rupiah(n) {
      return akar.Pecahan ? akar.Pecahan.rupiah(n) : 'Rp' + n;
    }

    function selisih() { return Math.abs(jual - beli); }

    function keadaan() {
      if (jual > beli) return 'untung';
      if (jual < beli) return 'rugi';
      return 'impas';
    }

    /* Persentase untung atau rugi. Pembaginya harga beli -- itulah yang
       sering keliru, dan karena itu "dariJual" disediakan: bukan untuk
       dipakai, melainkan supaya siswa melihat sendiri hasilnya berbeda. */
    function persen() {
      if (!akar.Pecahan) return null;
      var pembagi = dariJual ? jual : beli;
      if (!pembagi) return null;
      return akar.Pecahan.dari(selisih()).bagi(pembagi).persen();
    }

    /* ---------- rangka ---------- */

    wadah.innerHTML = '';
    var bungkus = document.createElement('div');
    bungkus.className = 'batang-harga';
    wadah.appendChild(bungkus);

    var petakEl = document.createElement('div');
    petakEl.className = 'bh-kertas';
    bungkus.appendChild(petakEl);

    var kendali = document.createElement('div');
    kendali.className = 'deret';
    kendali.style.marginTop = '.6rem';
    if (interaktif) bungkus.appendChild(kendali);

    var ringkasEl = document.createElement('div');
    ringkasEl.className = 'bh-ringkas';
    bungkus.appendChild(ringkasEl);

    function barisBatang(nama, nilai, warna, aturNilai) {
      var baris = document.createElement('div');
      baris.className = 'bh-baris';

      var label = document.createElement('div');
      label.className = 'kecil bh-label';
      label.innerHTML = '<span class="samar">' + nama + '</span> <strong>' +
        rupiah(nilai) + '</strong>';
      baris.appendChild(label);

      var deret = document.createElement('div');
      deret.className = 'bh-petak';

      var isiSampai = Math.round(nilai / satuan);
      var mulaiSorot = Math.round(Math.min(beli, jual) / satuan);
      var akhirSorot = Math.round(Math.max(beli, jual) / satuan);

      for (var i = 0; i < petak; i++) {
        var sel = document.createElement('button');
        sel.type = 'button';
        sel.disabled = !interaktif;
        sel.setAttribute('aria-label', nama + ' ' + rupiah((i + 1) * satuan));

        /* Petak selisih diberi warna sorot hanya pada batang yang lebih
           panjang, supaya yang tersorot terbaca sebagai "kelebihan"
           atau "kekurangan" terhadap batang satunya. */
        var terisi = i < isiSampai;
        var ikutSorot = terisi && i >= mulaiSorot && i < akhirSorot &&
          isiSampai === akhirSorot && keadaan() !== 'impas';

        sel.style.cssText =
          'flex:1;min-width:0;border:1px solid var(--garis);border-radius:3px;' +
          'padding:0;height:2.2rem;cursor:' + (interaktif ? 'pointer' : 'default') + ';' +
          'background:' + (ikutSorot ? 'var(--sorot)' : (terisi ? warna : 'transparent')) + ';' +
          'opacity:' + (ikutSorot ? '.9' : (terisi ? '.75' : '1'));

        (function (indeks) {
          sel.addEventListener('click', function () {
            aturNilai((indeks + 1) * satuan);
          });
        })(i);
        deret.appendChild(sel);
      }

      baris.appendChild(deret);
      return baris;
    }

    function tombol(isi, aksi, kelas) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tombol mungil' + (kelas ? ' ' + kelas : '');
      b.textContent = isi;
      b.addEventListener('click', aksi);
      kendali.appendChild(b);
      return b;
    }

    var tombolDari = null;
    if (interaktif) {
      tombol('Harga beli Rp100.000', function () { beli = 100000; gambar(); });
      tombol('Harga beli Rp200.000', function () { beli = 200000; gambar(); });
      tombolDari = tombol('Hitung persen dari harga jual', function () {
        dariJual = !dariJual;
        gambar();
      });
    }

    function gambar() {
      petakEl.innerHTML = '';
      petakEl.appendChild(barisBatang('Harga beli', beli, 'var(--tinta-lembut)',
        function (n) { beli = bulatkan(n); gambar(); }));
      petakEl.appendChild(barisBatang('Harga jual', jual, 'var(--aksen)',
        function (n) { jual = bulatkan(n); gambar(); }));

      var k = keadaan();
      var p = persen();
      var nama = { untung: 'Untung', rugi: 'Rugi', impas: 'Impas' }[k];

      if (tombolDari) {
        tombolDari.textContent = dariJual
          ? 'Kembali hitung dari harga beli'
          : 'Hitung persen dari harga jual';
        tombolDari.classList.toggle('bahaya', dariJual);
      }

      var isi = '<strong>' + nama + '</strong>';
      if (k !== 'impas') {
        isi += ' ' + rupiah(selisih());
        if (p) {
          isi += ', yaitu <strong>' + p.teksDesimal(2) + '%</strong> ' +
            (dariJual ? 'dari harga jual' : 'dari harga beli');
        }
      } else {
        isi += ' — harga jualnya sama dengan harga beli.';
      }
      if (dariJual && k !== 'impas') {
        isi += '<div class="pesan awas" style="margin-top:.5rem">Ini cara yang keliru. ' +
          'Persentase untung dan rugi selalu dihitung terhadap harga beli, ' +
          'bukan harga jual.</div>';
      }
      ringkasEl.innerHTML = isi;

      if (atur.onUbah) {
        atur.onUbah({
          beli: beli, jual: jual, selisih: selisih(),
          keadaan: k, dariJual: dariJual, persen: p
        });
      }
    }

    gambar();

    return {
      nilai: function () {
        return { beli: beli, jual: jual, selisih: selisih(), keadaan: keadaan() };
      },
      set: function (n) {
        if (n.beli !== undefined) beli = bulatkan(n.beli);
        if (n.jual !== undefined) jual = bulatkan(n.jual);
        gambar();
      },
      persen: persen,
      dariHargaJual: function (pakai) { dariJual = !!pakai; gambar(); }
    };
  }

  akar.BatangHarga = { buat: buat };
})(window);
