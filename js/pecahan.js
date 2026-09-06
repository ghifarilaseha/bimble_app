/* pecahan.js - aritmetika pecahan yang tepat, tanpa pembulatan diam-diam.
 *
 * Alasan berkas ini ada: bilangan pecahan tidak boleh dihitung sebagai
 * bilangan desimal peramban. Di JavaScript, 0,1 + 0,2 menghasilkan
 * 0.30000000000000004, dan 1/3 tidak pernah bisa ditulis utuh. Kalau angka
 * seperti itu muncul di layar siswa, halaman materinya gagal menjelaskan
 * apa pun.
 *
 * Karena itu semua nilai disimpan sebagai sepasang bilangan bulat,
 * pembilang dan penyebut, dan setiap operasi dikerjakan sebagai operasi
 * bilangan bulat lalu langsung disederhanakan. Bentuk desimalnya baru
 * dihitung saat hendak ditampilkan, dan itu pun lewat pembagian bersusun
 * yang tahu kapan angkanya berulang -- sehingga 1/3 tampil sebagai
 * "0,3333..." dan bukan sebagai desimal yang seolah-olah berhenti.
 *
 * Dipakai di peramban (window.Pecahan) dan di Node (require).
 *
 *   Pecahan.dari('3/4').tambah(Pecahan.dari('0,5')).teks()   // '5/4'
 *   Pecahan.dari('7/8').teksDesimal()                        // '0,875'
 *   Pecahan.dari('1/3').teksDesimal()                        // '0,3333...'
 */
(function (akar, pabrik) {
  var api = pabrik();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else akar.Pecahan = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var ELIPSIS = '…';

  function fpb(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { var t = a % b; a = b; b = t; }
    return a || 1;
  }

  function kpk(a, b) {
    if (a === 0 || b === 0) return 0;
    return Math.abs(a * b) / fpb(a, b);
  }

  function P(p, q) { this.p = p; this.q = q; }

  /* Penyebut selalu positif dan pecahan selalu dalam bentuk paling
     sederhana. Dengan begitu dua pecahan senilai punya wakil yang sama,
     sehingga membandingkan cukup dengan menyamakan pembilang-penyebut. */
  function buat(p, q) {
    if (q === undefined) q = 1;
    if (typeof p !== 'number' || typeof q !== 'number' ||
        !isFinite(p) || !isFinite(q) || p !== Math.trunc(p) || q !== Math.trunc(q)) {
      throw new Error('Pecahan hanya menerima bilangan bulat: ' + p + '/' + q);
    }
    if (q === 0) throw new Error('Penyebut tidak boleh nol.');
    if (q < 0) { p = -p; q = -q; }
    var g = fpb(p, q);
    return new P(p / g, q / g);
  }

  /* Menerima bentuk yang benar-benar dipakai siswa dan bank soal:
     3/4, 1 3/4, 0,75, 0.75, 75%, -2/3, dan bilangan bulat biasa. */
  function dari(x) {
    if (x instanceof P) return buat(x.p, x.q);
    if (typeof x === 'number') {
      if (x === Math.trunc(x)) return buat(x, 1);
      return dari(String(x));
    }

    var s = String(x == null ? '' : x).trim().toLowerCase();
    s = s.replace(/−/g, '-').replace(/\s+/g, ' ');
    if (!s) throw new Error('Pecahan kosong.');

    var persen = false;
    if (s.charAt(s.length - 1) === '%') { persen = true; s = s.slice(0, -1).trim(); }

    var hasil = urai(s);
    return persen ? hasil.bagi(buat(100, 1)) : hasil;
  }

  function urai(s) {
    var m;

    /* pecahan campuran: "1 3/4" atau "1_3/4" */
    m = s.match(/^(-?\d+)[ _](\d+)\/(\d+)$/);
    if (m) {
      var bulat = parseInt(m[1], 10);
      var pecah = buat(parseInt(m[2], 10), parseInt(m[3], 10));
      var tanda = (m[1].charAt(0) === '-') ? -1 : 1;
      return buat(bulat, 1).tambah(buat(tanda * pecah.p, pecah.q));
    }

    /* pecahan biasa: "3/4" */
    m = s.match(/^(-?\d+)\/(-?\d+)$/);
    if (m) return buat(parseInt(m[1], 10), parseInt(m[2], 10));

    /* desimal: "0,75" atau "0.75" -- diubah jadi pecahan per sepuluhan,
       bukan lewat parseFloat, supaya tidak ada galat pembulatan sama sekali */
    m = s.match(/^(-?)(\d*)[.,](\d+)$/);
    if (m) {
      var neg = m[1] === '-' ? -1 : 1;
      var depan = m[2] === '' ? '0' : m[2];
      var belakang = m[3];
      var atas = parseInt(depan + belakang, 10);
      var bawah = Math.pow(10, belakang.length);
      return buat(neg * atas, bawah);
    }

    /* bilangan bulat */
    m = s.match(/^-?\d+$/);
    if (m) return buat(parseInt(s, 10), 1);

    throw new Error('Bentuk pecahan tidak dikenal: ' + s);
  }

  P.prototype.tambah = function (lain) {
    var b = dari(lain);
    return buat(this.p * b.q + b.p * this.q, this.q * b.q);
  };
  P.prototype.kurang = function (lain) {
    var b = dari(lain);
    return buat(this.p * b.q - b.p * this.q, this.q * b.q);
  };
  P.prototype.kali = function (lain) {
    var b = dari(lain);
    return buat(this.p * b.p, this.q * b.q);
  };
  P.prototype.bagi = function (lain) {
    var b = dari(lain);
    if (b.p === 0) throw new Error('Tidak bisa dibagi nol.');
    return buat(this.p * b.q, this.q * b.p);
  };
  P.prototype.negatif = function () { return buat(-this.p, this.q); };
  P.prototype.kebalikan = function () {
    if (this.p === 0) throw new Error('Nol tidak punya kebalikan.');
    return buat(this.q, this.p);
  };

  /* Dibandingkan lewat perkalian silang, bukan lewat bentuk desimalnya,
     supaya 1/3 dan 0,333 tidak pernah dianggap sama. */
  P.prototype.banding = function (lain) {
    var b = dari(lain);
    var kiri = this.p * b.q, kanan = b.p * this.q;
    return kiri < kanan ? -1 : (kiri > kanan ? 1 : 0);
  };
  P.prototype.samaDengan = function (lain) { return this.banding(lain) === 0; };
  P.prototype.lebihDari = function (lain) { return this.banding(lain) > 0; };
  P.prototype.kurangDari = function (lain) { return this.banding(lain) < 0; };

  /* Hanya untuk keperluan yang memang butuh angka desimal, misalnya
     panjang batang di layar. Jangan dipakai untuk membandingkan. */
  P.prototype.keAngka = function () { return this.p / this.q; };

  P.prototype.bulat = function () { return this.q === 1; };

  P.prototype.teks = function () {
    return this.q === 1 ? String(this.p) : this.p + '/' + this.q;
  };

  P.prototype.rumus = function () {
    if (this.q === 1) return String(this.p);
    var tanda = this.p < 0 ? '-' : '';
    return tanda + '\\frac{' + Math.abs(this.p) + '}{' + this.q + '}';
  };

  P.prototype.campuran = function () {
    var tanda = this.p < 0 ? -1 : 1;
    var n = Math.abs(this.p);
    return { tanda: tanda, bulat: Math.floor(n / this.q), p: n % this.q, q: this.q };
  };

  P.prototype.teksCampuran = function () {
    var c = this.campuran();
    if (c.p === 0) return String(c.tanda * c.bulat);
    if (c.bulat === 0) return (c.tanda < 0 ? '-' : '') + c.p + '/' + c.q;
    return (c.tanda < 0 ? '-' : '') + c.bulat + ' ' + c.p + '/' + c.q;
  };

  P.prototype.rumusCampuran = function () {
    var c = this.campuran();
    if (c.p === 0) return String(c.tanda * c.bulat);
    var pecah = '\\frac{' + c.p + '}{' + c.q + '}';
    var tanda = c.tanda < 0 ? '-' : '';
    return c.bulat === 0 ? tanda + pecah : tanda + c.bulat + pecah;
  };

  /* Pembagian bersusun yang mencatat setiap sisa. Begitu sebuah sisa
     berulang, angkanya pasti berulang juga -- di situ pembagian dihentikan
     dan ditandai tidak berhenti. Inilah bedanya dengan membagi memakai
     bilangan desimal biasa, yang selalu berhenti diam-diam di angka ke-17. */
  P.prototype.desimal = function (maksAngka) {
    maksAngka = maksAngka === undefined ? 4 : maksAngka;
    var neg = this.p < 0;
    var n = Math.abs(this.p), d = this.q;
    var bulat = Math.floor(n / d);
    var sisa = n % d;

    if (sisa === 0) {
      return { bulat: bulat, angka: '', tepat: true, negatif: neg };
    }

    /* Sisa yang terulang menandakan angkanya berulang, tetapi pembagian
       tetap diteruskan sampai batas angka. Berhenti tepat saat pengulangan
       terdeteksi akan menampilkan 1/3 sebagai "0,3..." -- benar secara
       teknis, tetapi bukan bentuk yang dikenali siswa. */
    var angka = '', lihat = {}, berulang = false;
    while (sisa !== 0 && angka.length < maksAngka) {
      if (lihat[sisa] !== undefined) berulang = true;
      else lihat[sisa] = angka.length;
      sisa *= 10;
      angka += String(Math.floor(sisa / d));
      sisa = sisa % d;
    }
    if (sisa !== 0) berulang = true;

    return { bulat: bulat, angka: angka, tepat: !berulang, negatif: neg };
  };

  P.prototype.teksDesimal = function (maksAngka) {
    var d = this.desimal(maksAngka);
    var teks = (d.negatif ? '-' : '') + d.bulat;
    if (d.angka) teks += ',' + d.angka;
    if (!d.tepat) teks += ELIPSIS;
    return teks;
  };

  P.prototype.persen = function () { return this.kali(buat(100, 1)); };

  P.prototype.teksPersen = function (maksAngka) {
    var p = this.persen();
    return (p.q === 1 ? String(p.p) : p.teksDesimal(maksAngka === undefined ? 2 : maksAngka)) + '%';
  };

  /* Pemisah ribuan gaya Indonesia: titik untuk ribuan, koma untuk desimal.
     Kebalikan dari gaya Inggris, jadi tidak boleh memakai toLocaleString
     bawaan peramban yang mengikuti setelan perangkat siswa. */
  function ribuan(teks) {
    var s = String(teks);
    var negatif = s.charAt(0) === '-';
    if (negatif) s = s.slice(1);
    var bagian = s.split(',');
    bagian[0] = bagian[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (negatif ? '-' : '') + bagian.join(',');
  }

  function rupiah(x, maksAngka) {
    var n = dari(x);
    return 'Rp' + ribuan(n.teksDesimal(maksAngka === undefined ? 2 : maksAngka));
  }

  /* Mengurutkan daftar campuran (pecahan, desimal, persen) dengan benar,
     tanpa mengubahnya ke desimal lebih dulu. */
  function urut(daftar, menurun) {
    var isi = daftar.map(function (x) { return { asli: x, nilai: dari(x) }; });
    isi.sort(function (a, b) {
      return menurun ? b.nilai.banding(a.nilai) : a.nilai.banding(b.nilai);
    });
    return isi.map(function (x) { return x.asli; });
  }

  return {
    buat: buat,
    dari: dari,
    urut: urut,
    ribuan: ribuan,
    rupiah: rupiah,
    fpb: fpb,
    kpk: kpk,
    ELIPSIS: ELIPSIS
  };
});
