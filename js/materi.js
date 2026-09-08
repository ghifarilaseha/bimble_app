/* materi.js - potongan yang berulang di setiap halaman materi.
 *
 * Sebelum berkas ini ada, tiga blok disalin mentah ke lima halaman: pembangun
 * tab, perender contoh bertahap, dan penjaga tautan latihan. Setiap kali salah
 * satunya diperbaiki, empat salinan lain diam-diam tertinggal. Dua fungsi
 * terakhir (langkah dan geser) menampung pola yang selama ini ditulis ulang
 * di dalam halaman masing-masing.
 *
 * Aturan mainnya sama dengan komponen lain: wadah yang diberikan akan
 * dikosongkan lebih dulu, dan dependensi ke Rumus dijaga supaya halaman tetap
 * terbaca kalau KaTeX gagal dimuat.
 *
 * Lihat PAKEM-MATERI.md untuk aturan penulisan halamannya.
 */
(function (akar) {
  'use strict';

  /* Rumus dibaca saat dipanggil, bukan saat berkas dimuat, supaya urutan
     tag script tidak jadi jebakan halus. */
  function isi(el, teks) {
    if (akar.Rumus) akar.Rumus.isi(el, teks);
    else el.textContent = teks;
    return el;
  }

  function keHTML(teks) {
    return akar.Rumus ? akar.Rumus.keHTML(teks) : String(teks == null ? '' : teks);
  }

  /* ---------- tab bagian "Aturannya" ---------- */

  /* Tombolnya dibangun dari section[data-tab] yang ada di halaman, jadi
     menambah tab cukup dengan menambah satu <section data-tab="..." hidden>.
     Section pertama yang tampil; sisanya wajib diberi atribut hidden. */
  function tab(elTab, atur) {
    atur = atur || {};
    if (!elTab) return { jumlah: 0 };

    var bagian = Array.prototype.slice.call(
      document.querySelectorAll(atur.pilih || 'section[data-tab]'));
    if (!bagian.length) return { jumlah: 0 };

    elTab.innerHTML = '';
    elTab.setAttribute('role', 'tablist');

    function pilih(i) {
      bagian.forEach(function (s, j) { s.hidden = (j !== i); });
      Array.prototype.forEach.call(elTab.children, function (x, j) {
        x.setAttribute('aria-selected', j === i ? 'true' : 'false');
      });
      if (atur.onPilih) atur.onPilih(i, bagian[i]);
    }

    bagian.forEach(function (sec, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      b.textContent = sec.dataset.tab;
      b.addEventListener('click', function () { pilih(i); });
      elTab.appendChild(b);
    });

    pilih(0);
    return { jumlah: bagian.length, pilih: pilih };
  }

  /* ---------- contoh bertahap ---------- */

  /* Langkah sengaja dibuka satu per satu, bukan sekaligus. Bagian menebak
     sebelum langkah berikutnya terbuka itulah yang mengajari; menampilkan
     seluruh penyelesaian sekaligus mengubahnya jadi bacaan.
     daftar: [{ judul, soal, langkah: ['...', '...'] }] */
  function contoh(wadah, daftar) {
    if (!wadah) return { jumlah: 0 };
    wadah.innerHTML = '';
    daftar = (daftar || []).filter(Boolean);

    daftar.forEach(function (c, i) {
      var kotak = document.createElement('article');
      kotak.className = 'kartu';

      var nomor = document.createElement('div');
      nomor.className = 'nomor';
      nomor.textContent = 'Contoh ' + (i + 1) + ' — ' + c.judul;
      kotak.appendChild(nomor);

      var tanya = document.createElement('div');
      tanya.className = 'pertanyaan';
      isi(tanya, c.soal);
      kotak.appendChild(tanya);

      var urut = document.createElement('ol');
      urut.style.margin = '0';
      kotak.appendChild(urut);

      var langkah = c.langkah || [];
      var tombol = document.createElement('button');
      tombol.type = 'button';
      tombol.className = 'tombol mungil';
      tombol.style.marginTop = '.6rem';
      tombol.textContent = 'Buka langkah pertama';
      if (!langkah.length) tombol.hidden = true;
      kotak.appendChild(tombol);

      var ke = 0;
      tombol.addEventListener('click', function () {
        if (ke >= langkah.length) return;
        var li = document.createElement('li');
        isi(li, langkah[ke]);
        urut.appendChild(li);
        ke++;
        if (ke >= langkah.length) tombol.hidden = true;
        else tombol.textContent = 'Langkah berikutnya';
      });

      wadah.appendChild(kotak);
    });

    return { jumlah: daftar.length };
  }

  /* ---------- tautan latihan ---------- */

  /* Bank soal tiap bab dibuat terpisah dan bisa saja dinonaktifkan. Daripada
     menyodorkan tombol yang membawa siswa ke halaman galat, tombolnya diganti
     catatan bila babnya belum terdaftar atau sudah dimatikan. Kalau daftar
     babnya sendiri gagal dimuat, tombol dibiarkan apa adanya: lebih baik
     tombol yang mungkin salah daripada halaman yang kehilangan jalan keluar. */
  function tautanLatihan(wadah, tingkat, kode, atur) {
    atur = atur || {};
    if (!wadah) return Promise.resolve(null);

    return fetch(atur.peta || '../data/daftar-bab.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (peta) {
        if (!peta) return null;
        /* Terdaftar saja belum cukup: bab yang materinya sudah ada tetapi
           berkas soalnya masih kosong akan membawa siswa ke halaman latihan
           yang gagal memuat soal. */
        var ada = (peta.kelas || []).some(function (k) {
          return String(k.tingkat) === String(tingkat) &&
            (k.bab || []).some(function (b) {
              return b.kode === kode && b.aktif !== false && b.soal;
            });
        });
        if (ada) return true;
        wadah.innerHTML =
          '<div class="pesan info">Bank soal latihan untuk bab ini belum tersedia. ' +
          'Materinya sudah bisa dipelajari, dan tombol latihannya akan muncul sendiri ' +
          'begitu soalnya ditambahkan.</div>';
        return false;
      })
      .catch(function () { return null; });
  }

  /* ---------- langkah yang dibuka satu per satu ---------- */

  /* Sepupu contoh() untuk dipakai di dalam tab "Aturannya": menurunkan satu
     penjabaran selangkah demi selangkah tanpa kartu dan tanpa nomor contoh.
     daftar: ['$6x + 7y - 8x + 5y$', '...'] atau [{judul, teks}] */
  function langkah(wadah, daftar, atur) {
    atur = atur || {};
    if (!wadah) return { jumlah: 0 };
    wadah.innerHTML = '';
    daftar = (daftar || []).filter(Boolean).map(function (l) {
      return typeof l === 'string' ? { teks: l } : l;
    });

    var urut = document.createElement('ol');
    urut.className = 'langkah';
    wadah.appendChild(urut);

    var deret = document.createElement('div');
    deret.className = 'deret';
    wadah.appendChild(deret);

    var maju = document.createElement('button');
    maju.type = 'button';
    maju.className = 'tombol mungil';
    maju.textContent = atur.labelMulai || 'Buka langkah pertama';
    deret.appendChild(maju);

    var ulang = document.createElement('button');
    ulang.type = 'button';
    ulang.className = 'tombol mungil';
    ulang.textContent = 'Ulangi';
    ulang.hidden = true;
    deret.appendChild(ulang);

    var ke = 0;

    function tambah() {
      if (ke >= daftar.length) return;
      var l = daftar[ke];
      var li = document.createElement('li');
      if (l.judul) {
        var j = document.createElement('span');
        j.className = 'judul-langkah';
        j.textContent = l.judul;
        li.appendChild(j);
      }
      var isiEl = document.createElement('span');
      isi(isiEl, l.teks);
      li.appendChild(isiEl);
      urut.appendChild(li);
      ke++;
      if (ke >= daftar.length) {
        maju.hidden = true;
        ulang.hidden = false;
        if (atur.onSelesai) atur.onSelesai();
      } else {
        maju.textContent = atur.labelLanjut || 'Langkah berikutnya';
      }
    }

    function mulaiUlang() {
      urut.innerHTML = '';
      ke = 0;
      maju.hidden = false;
      maju.textContent = atur.labelMulai || 'Buka langkah pertama';
      ulang.hidden = true;
    }

    maju.addEventListener('click', tambah);
    ulang.addEventListener('click', mulaiUlang);
    if (!daftar.length) maju.hidden = true;

    return { jumlah: daftar.length, maju: tambah, ulang: mulaiUlang };
  }

  /* ---------- penggeser terikat ekspresi hidup ---------- */

  /* Menggeser nilai lalu melihat bentuk aljabarnya ikut berubah adalah cara
     paling murah menunjukkan bahwa huruf itu memang mewakili bilangan.
     atur: { label, min, maks, awal, langkah, hitung(nilai) -> string }
     hitung() mengembalikan teks yang boleh memuat $...$. */
  function geser(wadah, atur) {
    atur = atur || {};
    if (!wadah) return null;
    wadah.innerHTML = '';

    var min = atur.min === undefined ? 0 : atur.min;
    var maks = atur.maks === undefined ? 10 : atur.maks;
    var nilai = atur.awal === undefined ? min : atur.awal;

    var baris = document.createElement('div');
    baris.className = 'kolom';
    wadah.appendChild(baris);

    var label = document.createElement('label');
    baris.appendChild(label);

    var input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(maks);
    input.step = String(atur.langkah || 1);
    input.value = String(nilai);
    if (atur.label) input.setAttribute('aria-label', atur.label);
    baris.appendChild(input);

    var keluaran = document.createElement('div');
    keluaran.className = 'ekspresi';
    keluaran.setAttribute('aria-live', 'polite');
    wadah.appendChild(keluaran);

    function gambar() {
      nilai = Number(input.value);
      label.innerHTML = keHTML((atur.label || 'Nilai') + ' = $' + nilai + '$');
      if (atur.hitung) isi(keluaran, atur.hitung(nilai));
      if (atur.onUbah) atur.onUbah(nilai);
    }

    input.addEventListener('input', gambar);
    gambar();

    return { nilai: function () { return nilai; }, set: function (n) { input.value = String(n); gambar(); } };
  }

  akar.Materi = {
    tab: tab,
    contoh: contoh,
    tautanLatihan: tautanLatihan,
    langkah: langkah,
    geser: geser
  };
})(typeof self !== 'undefined' ? self : this);
