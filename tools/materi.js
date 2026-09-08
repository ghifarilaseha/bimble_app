#!/usr/bin/env node
/* materi.js - memeriksa halaman materi terhadap PAKEM-MATERI.md.
 *
 *   node tools/materi.js                  memeriksa semua halaman materi
 *   node tools/materi.js kelas7-pecahan   memeriksa yang jalurnya cocok
 *
 * Pakem yang hanya ditulis akan dilanggar diam-diam. Yang diperiksa di sini
 * adalah bagian yang bisa dihitung mesin: kelengkapan tujuh bagian, judul
 * baku, kepadatan interaksi per tab, dan jebakan teknis yang tidak menimbulkan
 * galat apa pun di peramban. Selera bahasa tetap urusan manusia.
 *
 * Pemeriksaannya berbasis pola teks, bukan pengurai HTML sungguhan. Itu cukup
 * karena halaman materi ditulis tangan dengan bentuk yang seragam.
 */
'use strict';

var fs = require('node:fs');
var path = require('node:path');

var AKAR = path.join(__dirname, '..');
var DIR = path.join(AKAR, 'materi');

/* Tujuh bagian, berurutan. Judul baku diperiksa bila ada polanya. */
var BAGIAN = [
  { no: 1, nama: 'Tujuan', judul: /<h3[^>]*>Yang akan kamu bisa<\/h3>/ },
  { no: 2, nama: 'Pemantik', judul: null },
  { no: 3, nama: 'Eksplorasi', judul: /<h2>\s*Coba sendiri:/ },
  { no: 4, nama: 'Perumusan', judul: /<h2>\s*Aturannya\s*<\/h2>/ },
  { no: 5, nama: 'Contoh bertahap', judul: /<h2>\s*Contoh bertahap\s*<\/h2>/ },
  { no: 6, nama: 'Cek pemahaman', judul: /<h2>\s*Cek pemahaman\s*<\/h2>/ },
  { no: 7, nama: 'Tautan latihan', judul: /<h2>\s*Sudah paham\?\s*<\/h2>/ }
];

/* Jatah kata tiap bagian, dari PAKEM-MATERI.md. Batasnya longgar: yang
   dicari adalah halaman yang jauh melenceng, bukan selisih beberapa kata. */
var JATAH = {
  2: [30, 90],
  3: [40, 120]
};

/* Berkas berawalan garis bawah adalah kerangka, bukan halaman. Kerangka
   kosong memang belum punya interaksi di tiap tabnya, jadi memeriksanya
   hanya menghasilkan galat yang selalu ada. */
function berkasHtml(saring) {
  return fs.readdirSync(DIR)
    .filter(function (n) { return n.endsWith('.html') && n.charAt(0) !== '_'; })
    .filter(function (n) { return n.indexOf(saring) >= 0; })
    .map(function (n) { return path.join(DIR, n); });
}

/* Isi <script> dibuang supaya penghitungan kata dan pencarian warna heksa
   tidak tertipu oleh kode. Blok skripnya diperiksa terpisah. */
function tanpaSkrip(isi) {
  return isi.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
}

function isiSkrip(isi) {
  var keluar = '', re = /<script\b[^>]*>([\s\S]*?)<\/script>/gi, m;
  while ((m = re.exec(isi)) !== null) keluar += m[1] + '\n';
  return keluar;
}

function hitungKata(teks) {
  var bersih = teks.replace(/<[^>]+>/g, ' ').replace(/\$[^$]*\$/g, ' x ');
  var kata = bersih.split(/\s+/).filter(function (w) { return /[0-9a-zA-Z]/.test(w); });
  return kata.length;
}

function periksa(berkas) {
  var isi = fs.readFileSync(berkas, 'utf8');
  var rel = path.relative(AKAR, berkas);
  var galat = [], awas = [];

  function salah(p) { galat.push(p); }
  function ingat(p) { awas.push(p); }

  var html = tanpaSkrip(isi);
  var skrip = isiSkrip(isi);

  /* ---------- 1. tujuh bagian ada dan berurutan ---------- */
  var posisi = [];
  BAGIAN.forEach(function (b) {
    var tanda = new RegExp('<!--\\s*-+\\s*' + b.no + '\\.\\s*' + b.nama + '\\s*-+\\s*-->', 'i');
    var m = tanda.exec(isi);
    if (!m) {
      salah('Bagian ' + b.no + ' (' + b.nama + ') tidak ada penanda komentarnya.');
      posisi.push(-1);
      return;
    }
    posisi.push(m.index);
    if (b.judul && !b.judul.test(isi)) {
      salah('Bagian ' + b.no + ' (' + b.nama + ') judulnya tidak baku.');
    }
  });
  for (var i = 1; i < posisi.length; i++) {
    if (posisi[i] >= 0 && posisi[i - 1] >= 0 && posisi[i] < posisi[i - 1]) {
      salah('Bagian ' + BAGIAN[i].no + ' muncul sebelum bagian ' + BAGIAN[i - 1].no + '.');
    }
  }

  /* ---------- 2. kepadatan interaksi per tab ---------- */
  var tab = [], reTab = /<section[^>]*data-tab="([^"]*)"[^>]*>([\s\S]*?)<\/section>/gi, m2;
  while ((m2 = reTab.exec(html)) !== null) tab.push({ nama: m2[1], isi: m2[2] });

  if (posisi[3] >= 0 && !tab.length) {
    salah('Bagian 4 (Perumusan) tidak punya satu pun <section data-tab>.');
  }
  if (tab.length && (tab.length < 3 || tab.length > 4)) {
    ingat('Bagian 4 punya ' + tab.length + ' tab; pakem menyarankan 3 sampai 4.');
  }

  var tabSepi = [];
  tab.forEach(function (t) {
    /* Sebuah tab dianggap punya interaksi bila memuat kendali sungguhan,
       atau sebuah <div id> kosong yang jelas dipakai skrip sebagai wadah. */
    var adaKendali = /<(button|input|select|textarea)\b/i.test(t.isi);
    var wadah = /<div[^>]*id="([^"]+)"[^>]*>\s*<\/div>/gi;
    var adaWadah = false, m3;
    while ((m3 = wadah.exec(t.isi)) !== null) {
      if (new RegExp('[\'"]' + m3[1] + '[\'"]').test(skrip)) { adaWadah = true; break; }
    }
    if (!adaKendali && !adaWadah) tabSepi.push(t.nama);
  });
  if (tabSepi.length) {
    salah('Tab tanpa interaksi (' + tabSepi.length + ' dari ' + tab.length + '): ' +
      tabSepi.join('; ') + '.');
  }

  /* ---------- 3. jatah kata ---------- */
  Object.keys(JATAH).forEach(function (no) {
    var idx = Number(no) - 1;
    if (posisi[idx] < 0) return;
    var akhir = posisi[idx + 1] > 0 ? posisi[idx + 1] : isi.length;
    var potong = tanpaSkrip(isi.slice(posisi[idx], akhir));
    var n = hitungKata(potong.replace(/<!--[\s\S]*?-->/g, ' '));
    var batas = JATAH[no];
    if (n < batas[0] || n > batas[1]) {
      ingat('Bagian ' + no + ' (' + BAGIAN[idx].nama + ') ' + n + ' kata, ' +
        'jatahnya ' + batas[0] + '-' + batas[1] + '.');
    }
  });

  /* ---------- 4. jebakan teknis ---------- */
  var sapu = (skrip.match(/Rumus\.sapu\s*\(/g) || []).length;
  if (sapu === 0) salah('Rumus.sapu tidak pernah dipanggil.');
  else if (sapu > 1) salah('Rumus.sapu dipanggil ' + sapu + ' kali; cukup sekali.');

  var heksa = html.match(/#[0-9a-fA-F]{3,8}\b/g);
  if (heksa) {
    salah('Ada warna heksa di HTML (' + heksa.slice(0, 3).join(', ') +
      '); pakai variabel CSS supaya mode gelap tidak rusak.');
  }

  /* Markup di dalam string JavaScript tidak pernah tampil sebagai markup:
     Rumus melolos-kan segala yang di luar $...$. */
  var reString = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g, m4;
  var markupMati = [];
  while ((m4 = reString.exec(skrip)) !== null) {
    var s = m4[1] !== undefined ? m4[1] : m4[2];
    if (/<(b|strong|em|i)>/i.test(s) && !/class=/.test(s)) markupMati.push(s.slice(0, 45));
  }
  if (markupMati.length) {
    ingat('Markup penekanan di dalam string JS akan tampil sebagai tulisan: ' +
      markupMati.slice(0, 2).join(' | ') + '. Pakai matematika untuk menekankan.');
  }

  if (/\bsiswa\b/.test(hitungTeksTampil(html))) {
    ingat('Kata "siswa" muncul di teks yang dibaca siswa; pakem memakai sapaan "kamu".');
  }
  if (/\bAnda\b/.test(hitungTeksTampil(html))) {
    salah('Kata "Anda" muncul di teks halaman; pakem memakai sapaan "kamu".');
  }

  return { rel: rel, galat: galat, awas: awas, tab: tab.length, tabSepi: tabSepi.length };
}

/* Teks yang benar-benar dibaca siswa: tanpa komentar dan tanpa atribut tag. */
function hitungTeksTampil(html) {
  return html.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ');
}

function jalan() {
  var saring = process.argv[2] || '';
  var daftar = berkasHtml(saring);
  if (!daftar.length) {
    console.error('Tidak ada halaman materi yang cocok.');
    process.exit(1);
  }

  var adaGalat = false, totalTab = 0, totalSepi = 0;

  daftar.forEach(function (b) {
    var h = periksa(b);
    totalTab += h.tab;
    totalSepi += h.tabSepi;
    h.awas.forEach(function (p) { console.warn('!  ' + h.rel + ' -- ' + p); });
    h.galat.forEach(function (p) { console.error('X  ' + h.rel + ' -- ' + p); });
    if (h.galat.length) adaGalat = true;
    else if (!h.awas.length) console.log('OK ' + h.rel + ' -- ' + h.tab + ' tab, semuanya punya interaksi');
  });

  console.log('\n' + daftar.length + ' halaman diperiksa. Tab seluruhnya ' + totalTab +
    ', yang belum punya interaksi ' + totalSepi + '.');
  if (adaGalat) process.exit(1);
}

jalan();
