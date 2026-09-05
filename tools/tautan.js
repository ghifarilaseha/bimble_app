#!/usr/bin/env node
/* tautan.js - memastikan semua rujukan antar berkas benar-benar ada.
 *
 *   node tools/tautan.js
 *
 * Memeriksa src dan href pada seluruh halaman HTML, jalur berkas soal dan
 * materi di data/daftar-bab.json, serta pasangan berkas mentah dengan hasil
 * gemboknya. Salah ketik satu huruf pada nama berkas tidak menimbulkan galat
 * yang terlihat di peramban, hanya halaman yang diam-diam tidak berfungsi.
 */
'use strict';

var fs = require('node:fs');
var path = require('node:path');

var AKAR = path.join(__dirname, '..');
var masalah = [];

function berkasBerakhiran(dir, akhiran, abaikan) {
  var hasil = [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (d) {
    if (abaikan.indexOf(d.name) >= 0) return;
    var p = path.join(dir, d.name);
    if (d.isDirectory()) hasil = hasil.concat(berkasBerakhiran(p, akhiran, abaikan));
    else if (d.name.endsWith(akhiran)) hasil.push(p);
  });
  return hasil;
}

function periksaHtml(berkas) {
  var isi = fs.readFileSync(berkas, 'utf8');
  var rel = path.relative(AKAR, berkas);

  /* Isi blok script dibuang lebih dulu. Di dalamnya ada potongan HTML yang
     dirakit dari variabel, dan itu bukan rujukan berkas sungguhan. Atribut
     src pada tag script sendiri tetap ikut terperiksa. */
  isi = isi.replace(/<script\b([^>]*)>[\s\S]*?<\/script>/gi, '<script$1></script>');

  var re = /(?:src|href)="([^"#?]+)"/g;
  var m;
  while ((m = re.exec(isi)) !== null) {
    var rujukan = m[1];
    if (/^(https?:|mailto:|data:|#)/.test(rujukan)) continue;
    var tujuan = rujukan.charAt(0) === '/'
      ? path.join(AKAR, rujukan.slice(1))
      : path.join(path.dirname(berkas), rujukan);
    if (!fs.existsSync(tujuan)) {
      masalah.push(rel + ' menunjuk ke ' + rujukan + ' yang tidak ada');
    }
  }
}

function periksaDaftarBab() {
  var peta = JSON.parse(fs.readFileSync(path.join(AKAR, 'data', 'daftar-bab.json'), 'utf8'));
  (peta.kelas || []).forEach(function (k) {
    (k.bab || []).forEach(function (b) {
      ['soal', 'materi'].forEach(function (bidang) {
        if (!b[bidang]) return;
        if (!fs.existsSync(path.join(AKAR, b[bidang]))) {
          masalah.push('daftar-bab.json [' + k.tingkat + '/' + b.kode + '] ' +
            bidang + ' menunjuk ke ' + b[bidang] + ' yang tidak ada');
        }
      });
    });
  });
}

/* Tiap berkas mentah harus punya pasangan tergembok yang tidak lebih tua,
   dan tiap berkas tergembok harus punya asal-usulnya. */
function periksaPasanganSoal() {
  var mentah = path.join(AKAR, 'data', 'soal-mentah');
  var jadi = path.join(AKAR, 'data', 'soal');

  berkasBerakhiran(mentah, '.json', []).forEach(function (m) {
    var pasangan = path.join(jadi, path.relative(mentah, m));
    if (!fs.existsSync(pasangan)) {
      masalah.push(path.relative(AKAR, m) + ' belum digembok. Jalankan: node tools/gembok.js');
    } else if (fs.statSync(m).mtimeMs > fs.statSync(pasangan).mtimeMs) {
      masalah.push(path.relative(AKAR, m) + ' lebih baru daripada hasil gemboknya. ' +
        'Jalankan ulang: node tools/gembok.js');
    }
  });

  berkasBerakhiran(jadi, '.json', []).forEach(function (j) {
    if (!fs.existsSync(path.join(mentah, path.relative(jadi, j)))) {
      masalah.push(path.relative(AKAR, j) + ' tidak punya berkas mentah. ' +
        'Kalau babnya memang dihapus, hapus juga berkas ini.');
    }
  });
}

berkasBerakhiran(AKAR, '.html', ['.git', 'node_modules', 'vendor']).forEach(periksaHtml);
periksaDaftarBab();
periksaPasanganSoal();

if (masalah.length) {
  masalah.forEach(function (m) { console.error('X  ' + m); });
  console.error('\n' + masalah.length + ' rujukan bermasalah.');
  process.exit(1);
}
console.log('Semua rujukan antar berkas cocok.');
