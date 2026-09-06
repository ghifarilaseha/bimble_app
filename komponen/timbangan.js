/* timbangan.js - timbangan dua lengan untuk PLSV dan PtLSV.
 *
 * Menumpang kartu-suku.js: tiap sisi hanyalah satu area kartu, jadi kotak
 * dan bola di sini adalah kartu yang sama dengan yang dipakai di bab Bentuk
 * Aljabar. Yang ditambahkan timbangan cuma dua hal: sepasang sisi, dan
 * gagasan bahwa keduanya harus diperlakukan sama.
 *
 * Yang membuat komponen ini mengajari sesuatu adalah kemampuannya
 * dikenakan pada SATU sisi saja. Membuang satu kelereng dari sisi kiri
 * membuat timbangannya benar-benar miring di layar, dan persamaannya
 * benar-benar menjadi tidak benar. Setelah melihat itu, "pindah ruas jadi
 * lawannya" tidak lagi terdengar seperti mantra.
 *
 * Miring atau tidaknya diperiksa dengan menghitung kedua sisi pada
 * penyelesaian aslinya. Jadi timbangan tidak berpura-pura: ia benar-benar
 * menimbang.
 *
 * Untuk PtLSV, timbangannya memang berat sebelah. Mengalikan kedua sisi
 * dengan bilangan negatif membuat sisi yang tadinya berat menjadi ringan,
 * sehingga tandanya ikut berbalik -- dan pembalikan tanda itu terlihat
 * sebagai akibat, bukan sebagai aturan tambahan.
 *
 * Pemakaian:
 *   var t = Timbangan.buat(wadah, {
 *     kiri: { x: 2, n: 1 }, kanan: { x: 0, n: 7 }, relasi: '='
 *   });
 *   t.buang('kiri', 'n', 1);   // miring
 *   t.buang('kanan', 'n', 1);  // seimbang lagi
 *   t.bagi('dua', 2);
 */
(function (akar) {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  var LAWAN = { '<': '>', '>': '<', '<=': '>=', '>=': '<=', '=': '=' };
  var TAMPIL = { '<': '<', '>': '>', '<=': '\\le', '>=': '\\ge', '=': '=' };

  function svgEl(nama, sifat) {
    var e = document.createElementNS(NS, nama);
    for (var k in sifat) if (Object.prototype.hasOwnProperty.call(sifat, k)) {
      e.setAttribute(k, sifat[k]);
    }
    return e;
  }

  function buat(wadah, atur) {
    atur = atur || {};
    var lambang = atur.lambang || 'x';
    var relasiAwal = atur.relasi || '=';
    var awalKiri = salin(atur.kiri || { x: 0, n: 0 });
    var awalKanan = salin(atur.kanan || { x: 0, n: 0 });

    var kiri = salin(awalKiri);
    var kanan = salin(awalKanan);
    var relasi = relasiAwal;
    var pesanTerakhir = '';
    var jenisTerakhirDibalik = false;

    function salin(s) { return { x: s.x || 0, n: s.n || 0 }; }

    var JENIS = [
      { kunci: 'x', nama: 'kotak', lambang: lambang, warna: 'var(--aksen)' },
      { kunci: 'n', nama: 'kelereng', lambang: '', warna: 'var(--tinta-lembut)' }
    ];

    /* ---------- nilai uji: pada berapa timbangan ini ditimbang ---------- */

    /* Untuk persamaan, dipakai penyelesaian aslinya. Di titik itulah kedua
       sisi memang sama berat, sehingga setiap langkah yang sah akan tetap
       menjaganya seimbang dan setiap langkah yang tidak sah langsung
       terlihat miring. */
    function hitungUji() {
      if (atur.ujiPada !== undefined) return atur.ujiPada;
      var bedaX = awalKiri.x - awalKanan.x;
      if (bedaX === 0) return 0;
      return (awalKanan.n - awalKiri.n) / bedaX;
    }
    var ujiPada = hitungUji();

    function berat(sisi) { return sisi.x * ujiPada + sisi.n; }

    /* Relasi yang sebenarnya berlaku di antara kedua sisi saat ini. */
    function relasiSebenarnya() {
      var a = berat(kiri), b = berat(kanan);
      if (Math.abs(a - b) < 1e-9) return '=';
      return a < b ? '<' : '>';
    }

    function benar() {
      var nyata = relasiSebenarnya();
      if (relasi === '=') return nyata === '=';
      if (relasi === '<') return nyata === '<';
      if (relasi === '>') return nyata === '>';
      if (relasi === '<=') return nyata === '<' || nyata === '=';
      if (relasi === '>=') return nyata === '>' || nyata === '=';
      return false;
    }

    function persamaan() {
      return sisiTeks(kiri) + ' ' + TAMPIL[relasi] + ' ' + sisiTeks(kanan);
    }

    function sisiTeks(s) {
      var bagian = [];
      if (s.x !== 0) {
        bagian.push((s.x === 1 ? '' : (s.x === -1 ? '-' : String(s.x))) + lambang);
      }
      if (s.n !== 0 || !bagian.length) {
        if (!bagian.length) bagian.push(String(s.n));
        else bagian.push((s.n < 0 ? '- ' : '+ ') + Math.abs(s.n));
      }
      return bagian.join(' ');
    }

    /* ---------- aksi ---------- */

    function sisiDari(nama) {
      if (nama === 'kiri') return [kiri];
      if (nama === 'kanan') return [kanan];
      return [kiri, kanan];
    }

    function tambah(nama, jenis, banyak) {
      banyak = banyak === undefined ? 1 : banyak;
      sisiDari(nama).forEach(function (s) { s[jenis] += banyak; });
      pesanTerakhir = kalimatAksi('Menambahkan', nama, jenis, banyak);
      selesaiAksi(nama);
      return true;
    }

    function buang(nama, jenis, banyak) {
      banyak = banyak === undefined ? 1 : banyak;
      sisiDari(nama).forEach(function (s) { s[jenis] -= banyak; });
      pesanTerakhir = kalimatAksi('Membuang', nama, jenis, banyak);
      selesaiAksi(nama);
      return true;
    }

    /* Membagi hanya diizinkan bila kedua sisi terbagi rata. Membiarkan
       setengah kotak tergambar akan menimbulkan pertanyaan yang bukan
       urusan bab ini. */
    function bagi(nama, pembagi) {
      if (!pembagi) return tolak('Tidak bisa dibagi nol.');
      var sisi = sisiDari(nama);
      var rata = sisi.every(function (s) {
        return s.x % pembagi === 0 && s.n % pembagi === 0;
      });
      if (!rata) {
        return tolak('Belum bisa dibagi ' + pembagi + ' dengan rapi. ' +
          'Sederhanakan dulu sisinya.');
      }
      sisi.forEach(function (s) { s.x /= pembagi; s.n /= pembagi; });
      pesanTerakhir = 'Membagi ' + sebutSisi(nama) + ' dengan ' + pembagi + '.';
      selesaiAksi(nama);
      return true;
    }

    function kali(nama, faktor) {
      sisiDari(nama).forEach(function (s) { s.x *= faktor; s.n *= faktor; });
      pesanTerakhir = 'Mengalikan ' + sebutSisi(nama) + ' dengan ' + faktor + '.';
      selesaiAksi(nama);
      return true;
    }

    function kalimatAksi(kerja, nama, jenis, banyak) {
      var benda = jenis === 'x' ? 'kotak' : 'kelereng';
      return kerja + ' ' + Math.abs(banyak) + ' ' + benda + ' ' +
        (kerja === 'Membuang' ? 'dari ' : 'ke ') + sebutSisi(nama) + '.';
    }

    function sebutSisi(nama) {
      if (nama === 'kiri') return 'ruas kiri saja';
      if (nama === 'kanan') return 'ruas kanan saja';
      return 'kedua ruas';
    }

    function tolak(pesan) {
      pesanTerakhir = pesan;
      gambar();
      return false;
    }

    /* Setelah setiap aksi, tanda pertidaksamaan diperiksa ulang. Kalau
       kedua sisi bertukar berat -- yang terjadi persis saat dikali atau
       dibagi bilangan negatif -- tandanya dibalik, dan alasannya disebut.
       Untuk persamaan tidak ada yang dibalik: yang terjadi cuma timbangan
       jadi miring, dan itu memang yang ingin diperlihatkan. */
    function selesaiAksi(nama) {
      jenisTerakhirDibalik = false;
      if (relasi !== '=' && !benar()) {
        relasi = LAWAN[relasi];
        jenisTerakhirDibalik = true;
        pesanTerakhir += ' Kedua ruas bertukar posisi, jadi tandanya ikut dibalik ' +
          'menjadi ' + bacaRelasi(relasi) + '.';
      } else if (relasi === '=' && !benar()) {
        pesanTerakhir += ' Timbangannya jadi miring: persamaannya sekarang tidak benar, ' +
          'karena ' + sebutSisi(nama) + ' diperlakukan berbeda.';
      }
      gambar();
      if (atur.onUbah) atur.onUbah(keadaan());
    }

    function bacaRelasi(r) {
      return { '<': 'kurang dari', '>': 'lebih dari',
               '<=': 'kurang dari atau sama dengan',
               '>=': 'lebih dari atau sama dengan', '=': 'sama dengan' }[r];
    }

    function keadaan() {
      return {
        kiri: salin(kiri), kanan: salin(kanan), relasi: relasi,
        benar: benar(), miring: relasiSebenarnya(),
        teks: persamaan(), pesan: pesanTerakhir, dibalik: jenisTerakhirDibalik
      };
    }

    /* ---------- rangka ---------- */

    wadah.innerHTML = '';
    var bungkus = document.createElement('div');
    bungkus.className = 'timbangan';
    wadah.appendChild(bungkus);

    var svgWadah = document.createElement('div');
    bungkus.appendChild(svgWadah);

    var barisEl = document.createElement('div');
    barisEl.className = 'tb-baris';
    bungkus.appendChild(barisEl);

    var kiriEl = document.createElement('div');
    kiriEl.className = 'tb-sisi';
    var relasiEl = document.createElement('div');
    relasiEl.className = 'tb-relasi';
    var kananEl = document.createElement('div');
    kananEl.className = 'tb-sisi';
    barisEl.appendChild(kiriEl);
    barisEl.appendChild(relasiEl);
    barisEl.appendChild(kananEl);

    var persamaanEl = document.createElement('p');
    persamaanEl.className = 'tb-persamaan';
    bungkus.appendChild(persamaanEl);

    var pesanEl = document.createElement('div');
    pesanEl.className = 'tb-pesan';
    bungkus.appendChild(pesanEl);

    var kartuKiri = null, kartuKanan = null;

    function gambarSisi(el, sisi) {
      return akar.KartuSuku.buat(el, {
        jenis: JENIS,
        awal: { x: sisi.x, n: sisi.n },
        baki: false,
        interaktif: false
      });
    }

    /* Timbangannya digambar terpisah dari kartunya. Kartu tetap tegak dan
       terbaca; yang memiringkan cuma palang di atasnya. */
    function gambarPalang() {
      var nyata = relasiSebenarnya();
      var sudut = nyata === '=' ? 0 : (nyata === '<' ? 7 : -7);
      var W = 260, H = 86;

      svgWadah.innerHTML = '';
      var s = svgEl('svg', {
        viewBox: '0 0 ' + W + ' ' + H, width: '100%', height: H,
        role: 'img', 'aria-label': 'Timbangan ' +
          (nyata === '=' ? 'seimbang' : 'miring ke ' + (nyata === '<' ? 'kanan' : 'kiri'))
      });
      s.style.maxWidth = W + 'px';
      s.style.display = 'block';
      s.style.margin = '0 auto';

      var cx = W / 2, cy = 30, panjang = 96;
      var rad = sudut * Math.PI / 180;
      var x1 = cx - panjang * Math.cos(rad), y1 = cy - panjang * Math.sin(rad);
      var x2 = cx + panjang * Math.cos(rad), y2 = cy + panjang * Math.sin(rad);

      s.appendChild(svgEl('path', {
        d: 'M ' + (cx - 16) + ' ' + (H - 12) + ' L ' + cx + ' ' + (cy + 6) +
           ' L ' + (cx + 16) + ' ' + (H - 12) + ' Z',
        fill: 'var(--tinta-lembut)', 'fill-opacity': .28,
        stroke: 'var(--tinta-lembut)', 'stroke-width': 1.5
      }));
      s.appendChild(svgEl('line', {
        x1: x1, y1: y1, x2: x2, y2: y2,
        stroke: 'var(--tinta)', 'stroke-width': 3, 'stroke-linecap': 'round'
      }));
      s.appendChild(svgEl('circle', { cx: cx, cy: cy, r: 4, fill: 'var(--tinta)' }));

      [[x1, y1], [x2, y2]].forEach(function (p) {
        s.appendChild(svgEl('line', {
          x1: p[0], y1: p[1], x2: p[0], y2: p[1] + 18,
          stroke: 'var(--tinta-lembut)', 'stroke-width': 1.5
        }));
        s.appendChild(svgEl('path', {
          d: 'M ' + (p[0] - 20) + ' ' + (p[1] + 18) + ' h 40 l -6 10 h -28 z',
          fill: 'var(--kartu)', stroke: 'var(--tinta)', 'stroke-width': 1.8
        }));
      });

      svgWadah.appendChild(s);
    }

    function gambar() {
      gambarPalang();

      if (!kartuKiri) {
        kartuKiri = gambarSisi(kiriEl, kiri);
        kartuKanan = gambarSisi(kananEl, kanan);
      } else {
        kartuKiri.set({ x: kiri.x, n: kiri.n });
        kartuKanan.set({ x: kanan.x, n: kanan.n });
      }

      relasiEl.textContent = { '<': '<', '>': '>', '<=': '≤', '>=': '≥', '=': '=' }[relasi];

      var teks = persamaan();
      if (akar.Rumus) akar.Rumus.isi(persamaanEl, '$' + teks + '$');
      else persamaanEl.textContent = teks;

      var jenisPesan = benar() ? 'sip' : 'awas';
      pesanEl.innerHTML = pesanTerakhir
        ? '<div class="pesan ' + jenisPesan + '">' + lolos(pesanTerakhir) + '</div>'
        : '';
    }

    function lolos(t) {
      return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function ulang() {
      kiri = salin(awalKiri);
      kanan = salin(awalKanan);
      relasi = relasiAwal;
      pesanTerakhir = '';
      jenisTerakhirDibalik = false;
      gambar();
      if (atur.onUbah) atur.onUbah(keadaan());
    }

    gambar();

    return {
      tambah: tambah,
      buang: buang,
      bagi: bagi,
      kali: kali,
      ulang: ulang,
      teks: persamaan,
      keadaan: keadaan,
      benar: benar,
      ujiPada: function () { return ujiPada; }
    };
  }

  akar.Timbangan = { buat: buat };
})(window);
