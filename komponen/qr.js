/* qr.js - penyandi QR code seadanya, khusus untuk tautan sesi.
 *
 * Ditulis sendiri, bukan diambil dari CDN, karena satu-satunya pemakainya
 * adalah pembuat sesi di halaman guru dan situs ini harus tetap utuh
 * bertahun-tahun tanpa perlu memperbarui apa pun.
 *
 * Lingkupnya sengaja disempitkan: mode byte, tingkat koreksi galat L,
 * versi 1 sampai 10. Tautan sesi terpanjang pun hanya sekitar 150 karakter,
 * sedangkan versi 10-L memuat 271 karakter.
 *
 * Pemakaian:
 *   var m = QR.matriks('https://contoh.netlify.app/latihan.html?...');
 *   wadah.appendChild(QR.keSvg(m, { ukuran: 240 }));
 */
(function (akar) {
  'use strict';

  /* ---------- aritmetika lapangan Galois GF(256) ---------- */

  var EXP = new Array(512), LOG = new Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  })();

  function kali(a, b) {
    if (a === 0 || b === 0) return 0;
    return EXP[LOG[a] + LOG[b]];
  }

  /* Polinom pembangkit untuk n simbol koreksi galat. */
  function pembangkit(n) {
    var g = [1];
    for (var i = 0; i < n; i++) {
      var baru = new Array(g.length + 1).fill(0);
      /* Koefisien disimpan menurun: indeks 0 adalah suku berpangkat
         tertinggi, sesuai yang diharapkan pembagian di koreksi(). */
      for (var j = 0; j < g.length; j++) {
        baru[j] ^= g[j];
        baru[j + 1] ^= kali(g[j], EXP[i]);
      }
      g = baru;
    }
    return g;
  }

  /* Sisa pembagian polinom data oleh polinom pembangkit: itulah simbol EC. */
  function koreksi(data, jumlahEc) {
    var g = pembangkit(jumlahEc);
    var sisa = data.slice().concat(new Array(jumlahEc).fill(0));
    for (var i = 0; i < data.length; i++) {
      var koef = sisa[i];
      if (!koef) continue;
      for (var j = 0; j < g.length; j++) sisa[i + j] ^= kali(g[j], koef);
    }
    return sisa.slice(data.length);
  }

  /* ---------- tabel versi, khusus tingkat koreksi L ---------- */

  /* [total codeword, codeword data, jumlah blok, ec per blok] */
  var VERSI = {
    1:  [26, 19, 1, 7],
    2:  [44, 34, 1, 10],
    3:  [70, 55, 1, 15],
    4:  [100, 80, 1, 20],
    5:  [134, 108, 1, 26],
    6:  [172, 136, 2, 18],
    7:  [196, 156, 2, 20],
    8:  [242, 194, 2, 24],
    9:  [292, 232, 2, 30],
    10: [346, 274, 4, 18]
  };

  var TITIK_SELARAS = {
    1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
    6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50]
  };

  /* Bit format untuk tingkat L, satu untuk tiap pola topeng. */
  var BIT_FORMAT = [0x77c4, 0x72f3, 0x7daa, 0x789d, 0x662f, 0x6318, 0x6c41, 0x6976];

  /* Bit versi, hanya perlu mulai versi 7. */
  var BIT_VERSI = { 7: 0x07c94, 8: 0x085bc, 9: 0x09a99, 10: 0x0a4d3 };

  /* Bit sisa yang ditambahkan setelah seluruh codeword. */
  var BIT_SISA = { 1: 0, 2: 7, 3: 7, 4: 7, 5: 7, 6: 7, 7: 0, 8: 0, 9: 0, 10: 0 };

  /* ---------- menyusun aliran bit ---------- */

  function keUtf8(teks) {
    var bita = [];
    var s = unescape(encodeURIComponent(String(teks)));
    for (var i = 0; i < s.length; i++) bita.push(s.charCodeAt(i));
    return bita;
  }

  function pilihVersi(panjang) {
    for (var v = 1; v <= 10; v++) {
      var bitHitung = v < 10 ? 8 : 16;
      var perluBit = 4 + bitHitung + 8 * panjang;
      if (Math.ceil(perluBit / 8) <= VERSI[v][1]) return v;
    }
    return 0;
  }

  function aliranBit(bita, versi) {
    var bit = [];
    function tulis(nilai, panjang) {
      for (var i = panjang - 1; i >= 0; i--) bit.push((nilai >> i) & 1);
    }
    tulis(0x4, 4);                              /* mode byte */
    tulis(bita.length, versi < 10 ? 8 : 16);
    bita.forEach(function (b) { tulis(b, 8); });

    var kapasitasBit = VERSI[versi][1] * 8;
    var akhir = Math.min(4, kapasitasBit - bit.length);
    tulis(0, akhir);
    while (bit.length % 8) bit.push(0);

    var isian = [0xec, 0x11], k = 0;
    while (bit.length < kapasitasBit) { tulis(isian[k % 2], 8); k++; }

    var codeword = [];
    for (var i = 0; i < bit.length; i += 8) {
      var b = 0;
      for (var j = 0; j < 8; j++) b = (b << 1) | bit[i + j];
      codeword.push(b);
    }
    return codeword;
  }

  /* Data dipecah menjadi blok, tiap blok dihitung koreksinya, lalu
     keduanya dijalin ulang sesuai aturan QR. */
  function jalin(codeword, versi) {
    var spek = VERSI[versi];
    var jumlahBlok = spek[2], ecPerBlok = spek[3], dataTotal = spek[1];
    var dasar = Math.floor(dataTotal / jumlahBlok);
    var lebih = dataTotal % jumlahBlok;

    var blokData = [], blokEc = [], pos = 0;
    for (var i = 0; i < jumlahBlok; i++) {
      var panjang = dasar + (i >= jumlahBlok - lebih ? 1 : 0);
      var d = codeword.slice(pos, pos + panjang);
      pos += panjang;
      blokData.push(d);
      blokEc.push(koreksi(d, ecPerBlok));
    }

    var keluar = [], maks = Math.max.apply(null, blokData.map(function (b) { return b.length; }));
    for (var k = 0; k < maks; k++) {
      for (i = 0; i < jumlahBlok; i++) if (k < blokData[i].length) keluar.push(blokData[i][k]);
    }
    for (k = 0; k < ecPerBlok; k++) {
      for (i = 0; i < jumlahBlok; i++) keluar.push(blokEc[i][k]);
    }
    return keluar;
  }

  /* ---------- menyusun matriks ---------- */

  function matriksKosong(ukuran) {
    var m = [];
    for (var i = 0; i < ukuran; i++) m.push(new Array(ukuran).fill(null));
    return m;
  }

  function taruhPencari(m, baris, kolom) {
    for (var r = -1; r <= 7; r++) {
      for (var c = -1; c <= 7; c++) {
        var y = baris + r, x = kolom + c;
        if (y < 0 || y >= m.length || x < 0 || x >= m.length) continue;
        var diCincin = (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
                       (c >= 0 && c <= 6 && (r === 0 || r === 6));
        var diInti = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        m[y][x] = (diCincin || diInti) ? 1 : 0;
      }
    }
  }

  function taruhSelaras(m, versi) {
    var titik = TITIK_SELARAS[versi];
    titik.forEach(function (b) {
      titik.forEach(function (k) {
        /* Sudut yang sudah ditempati pola pencari dilewati. */
        if (m[b][k] !== null) return;
        for (var r = -2; r <= 2; r++) {
          for (var c = -2; c <= 2; c++) {
            var tepi = Math.max(Math.abs(r), Math.abs(c));
            m[b + r][k + c] = (tepi !== 1) ? 1 : 0;
          }
        }
      });
    });
  }

  function taruhPolaTetap(m, versi) {
    var n = m.length;
    taruhPencari(m, 0, 0);
    taruhPencari(m, 0, n - 7);
    taruhPencari(m, n - 7, 0);
    taruhSelaras(m, versi);
    for (var i = 8; i < n - 8; i++) {
      m[6][i] = (i % 2 === 0) ? 1 : 0;
      m[i][6] = (i % 2 === 0) ? 1 : 0;
    }
    m[n - 8][8] = 1;   /* modul gelap yang selalu ada */
  }

  function cadangkanFormat(m) {
    var n = m.length, i;
    for (i = 0; i <= 8; i++) {
      if (m[8][i] === null) m[8][i] = 2;
      if (m[i][8] === null) m[i][8] = 2;
    }
    for (i = n - 8; i < n; i++) {
      if (m[8][i] === null) m[8][i] = 2;
      if (m[i][8] === null) m[i][8] = 2;
    }
  }

  function cadangkanVersi(m, versi) {
    if (versi < 7) return;
    var n = m.length;
    for (var i = 0; i < 6; i++) {
      for (var j = 0; j < 3; j++) {
        m[i][n - 11 + j] = 2;
        m[n - 11 + j][i] = 2;
      }
    }
  }

  /* ---------- topeng ---------- */

  function topeng(pola, b, k) {
    switch (pola) {
      case 0: return (b + k) % 2 === 0;
      case 1: return b % 2 === 0;
      case 2: return k % 3 === 0;
      case 3: return (b + k) % 3 === 0;
      case 4: return (Math.floor(b / 2) + Math.floor(k / 3)) % 2 === 0;
      case 5: return ((b * k) % 2) + ((b * k) % 3) === 0;
      case 6: return (((b * k) % 2) + ((b * k) % 3)) % 2 === 0;
      default: return (((b + k) % 2) + ((b * k) % 3)) % 2 === 0;
    }
  }

  /* Modul data ditaruh berkelok dari kanan bawah, dua kolom sekaligus,
     melewati kolom penanda waktu. */
  function taruhData(m, codeword, pola) {
    var n = m.length, arah = -1, baris = n - 1, bit = 7, bita = 0;
    for (var kolom = n - 1; kolom > 0; kolom -= 2) {
      if (kolom === 6) kolom--;
      for (;;) {
        for (var c = 0; c < 2; c++) {
          if (m[baris][kolom - c] !== null) continue;
          var gelap = false;
          if (bita < codeword.length) gelap = ((codeword[bita] >>> bit) & 1) === 1;
          if (topeng(pola, baris, kolom - c)) gelap = !gelap;
          m[baris][kolom - c] = gelap ? 1 : 0;
          bit--;
          if (bit === -1) { bita++; bit = 7; }
        }
        baris += arah;
        if (baris < 0 || baris >= n) { baris -= arah; arah = -arah; break; }
      }
    }
  }

  function tulisFormat(m, pola) {
    var n = m.length, bits = BIT_FORMAT[pola];
    for (var i = 0; i < 15; i++) {
      var b = (bits >> i) & 1;
      if (i < 6) m[i][8] = b;
      else if (i < 8) m[i + 1][8] = b;
      else m[n - 15 + i][8] = b;

      if (i < 8) m[8][n - i - 1] = b;
      else if (i < 9) m[8][15 - i] = b;
      else m[8][15 - i - 1] = b;
    }
    m[n - 8][8] = 1;
  }

  function tulisVersi(m, versi) {
    if (versi < 7) return;
    var n = m.length, bits = BIT_VERSI[versi];
    for (var i = 0; i < 18; i++) {
      var b = (bits >> i) & 1;
      m[Math.floor(i / 3)][i % 3 + n - 11] = b;
      m[i % 3 + n - 11][Math.floor(i / 3)] = b;
    }
  }

  /* ---------- penilaian topeng ---------- */

  function denda(m) {
    var n = m.length, total = 0, i, j, hitung, gelap = 0;

    function deret(ambil) {
      var nilai = 0;
      for (i = 0; i < n; i++) {
        var berjalan = 1;
        for (j = 1; j < n; j++) {
          if (ambil(i, j) === ambil(i, j - 1)) berjalan++;
          else { if (berjalan >= 5) nilai += 3 + (berjalan - 5); berjalan = 1; }
        }
        if (berjalan >= 5) nilai += 3 + (berjalan - 5);
      }
      return nilai;
    }
    total += deret(function (a, b) { return m[a][b]; });
    total += deret(function (a, b) { return m[b][a]; });

    for (i = 0; i < n - 1; i++) {
      for (j = 0; j < n - 1; j++) {
        var s = m[i][j] + m[i][j + 1] + m[i + 1][j] + m[i + 1][j + 1];
        if (s === 0 || s === 4) total += 3;
      }
    }

    var pola = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    var polaBalik = pola.slice().reverse();
    function cocok(i2, j2, arahBaris, p) {
      for (var k = 0; k < 11; k++) {
        var b = arahBaris ? i2 : i2 + k;
        var k2 = arahBaris ? j2 + k : j2;
        if (m[b][k2] !== p[k]) return false;
      }
      return true;
    }
    for (i = 0; i < n; i++) {
      for (j = 0; j + 10 < n; j++) {
        if (cocok(i, j, true, pola) || cocok(i, j, true, polaBalik)) total += 40;
        if (cocok(j, i, false, pola) || cocok(j, i, false, polaBalik)) total += 40;
      }
    }

    for (i = 0; i < n; i++) for (j = 0; j < n; j++) if (m[i][j]) gelap++;
    hitung = Math.abs((gelap * 100) / (n * n) - 50);
    total += Math.floor(hitung / 5) * 10;

    return total;
  }

  /* ---------- antarmuka umum ---------- */

  function matriks(teks, atur) {
    atur = atur || {};
    var bita = keUtf8(teks);
    var versi = pilihVersi(bita.length);
    if (!versi) throw new Error('Teks terlalu panjang untuk QR versi 10 (maksimal sekitar 270 huruf).');

    var codeword = jalin(aliranBit(bita, versi), versi);
    var n = 17 + 4 * versi;

    var dasar = matriksKosong(n);
    taruhPolaTetap(dasar, versi);
    cadangkanFormat(dasar);
    cadangkanVersi(dasar, versi);

    var terbaik = null, dendaTerbaik = Infinity;
    /* atur.topeng memaksa satu pola topeng. Dipakai hanya oleh berkas uji
       untuk membandingkan keluaran dengan implementasi rujukan. */
    var mulai = (typeof atur.topeng === "number") ? atur.topeng : 0;
    var henti = (typeof atur.topeng === "number") ? atur.topeng : 7;
    for (var pola = mulai; pola <= henti; pola++) {
      var m = dasar.map(function (baris) { return baris.slice(); });
      taruhData(m, codeword, pola);
      tulisFormat(m, pola);
      tulisVersi(m, versi);
      var d = denda(m);
      if (d < dendaTerbaik) { dendaTerbaik = d; terbaik = m; }
    }
    terbaik.versi = versi;
    return terbaik;
  }

  /* Digambar sebagai SVG supaya tetap tajam saat diproyeksikan ke layar
     kelas, dan tetap terbaca saat dicetak. */
  function keSvg(m, atur) {
    atur = atur || {};
    var n = m.length, tepi = atur.tepi === undefined ? 4 : atur.tepi;
    var sisi = n + tepi * 2;
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + sisi + ' ' + sisi);
    svg.setAttribute('width', atur.ukuran || 220);
    svg.setAttribute('height', atur.ukuran || 220);
    svg.setAttribute('class', 'qr');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Kode QR tautan sesi');

    var alas = document.createElementNS(NS, 'rect');
    alas.setAttribute('width', sisi);
    alas.setAttribute('height', sisi);
    alas.setAttribute('fill', '#ffffff');
    svg.appendChild(alas);

    var d = '';
    for (var i = 0; i < n; i++) {
      for (var j = 0; j < n; j++) {
        if (m[i][j]) d += 'M' + (j + tepi) + ' ' + (i + tepi) + 'h1v1h-1z';
      }
    }
    var jalur = document.createElementNS(NS, 'path');
    jalur.setAttribute('d', d);
    jalur.setAttribute('fill', '#000000');
    svg.appendChild(jalur);
    return svg;
  }

  akar.QR = { matriks: matriks, keSvg: keSvg, VERSI: VERSI };
})(typeof self !== 'undefined' ? self : this);

if (typeof module === 'object' && module.exports) module.exports = this.QR || QR;
