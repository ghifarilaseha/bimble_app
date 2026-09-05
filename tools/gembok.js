#!/usr/bin/env node
/* gembok.js - mengubah bank soal mentah menjadi bank soal siap deploy.
 *
 *   node tools/gembok.js            menggembok semua berkas
 *   node tools/gembok.js kelas7     menggembok yang jalurnya memuat "kelas7"
 *
 * Guru menyunting berkas di data/soal-mentah/ dengan kunci yang terbaca.
 * Skrip ini menghasilkan berkas di data/soal/ dengan kunci berupa hash,
 * sehingga siapa pun yang membuka berkas JSON di situs tidak menemukan
 * jawabannya. Ini penghalang, bukan keamanan sungguhan: bila suatu saat
 * kuis benar-benar bernilai rapor, penilaian dipindahkan ke Apps Script.
 *
 * Berkas mentah tidak boleh ikut ter-deploy; netlify.toml sudah mengatur
 * supaya folder data/soal-mentah tidak ikut terunggah.
 */
'use strict';

var fs = require('node:fs');
var path = require('node:path');
var Validasi = require('../js/validasi.js');
var GembokInti = require('../js/gembok-inti.js');

var AKAR = path.join(__dirname, '..');
var SUMBER = path.join(AKAR, 'data', 'soal-mentah');
var TUJUAN = path.join(AKAR, 'data', 'soal');

function berkasJson(dir) {
  var hasil = [];
  if (!fs.existsSync(dir)) return hasil;
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (d) {
    var p = path.join(dir, d.name);
    if (d.isDirectory()) hasil = hasil.concat(berkasJson(p));
    else if (d.name.endsWith('.json')) hasil.push(p);
  });
  return hasil;
}

function jalan() {
  var saring = process.argv[2] || '';
  var daftar = berkasJson(SUMBER).filter(function (p) { return p.indexOf(saring) >= 0; });

  if (!daftar.length) {
    console.error('Tidak ada berkas mentah yang cocok di ' + path.relative(AKAR, SUMBER));
    process.exit(1);
  }

  var adaGalat = false;

  return daftar.reduce(function (rantai, berkas) {
    return rantai.then(function () {
      var rel = path.relative(SUMBER, berkas);
      var mentah;
      try {
        mentah = JSON.parse(fs.readFileSync(berkas, 'utf8'));
      } catch (e) {
        adaGalat = true;
        console.error('X  ' + rel + ' -- bukan JSON yang sah: ' + e.message);
        return;
      }

      return Validasi.periksa(mentah, { bentuk: 'mentah' }).then(function (lapor) {
        lapor.peringatan.forEach(function (p) {
          console.warn('!  ' + rel + ' [' + p.dimana + '] ' + p.pesan);
        });
        if (lapor.galat.length) {
          adaGalat = true;
          lapor.galat.forEach(function (g) {
            console.error('X  ' + rel + ' [' + g.dimana + '] ' + g.pesan);
          });
          /* Berkas lama di data/soal/ sengaja dibiarkan apa adanya, supaya
             kesalahan sunting tidak langsung merusak yang sudah tayang. */
          return;
        }
        return GembokInti.bank(mentah).then(function (jadi) {
          var keluar = path.join(TUJUAN, rel);
          fs.mkdirSync(path.dirname(keluar), { recursive: true });
          fs.writeFileSync(keluar, JSON.stringify(jadi, null, 2) + '\n', 'utf8');
          console.log('OK ' + rel + ' -- ' + lapor.jumlah.aktif + ' soal aktif dari ' +
            lapor.jumlah.soal + ' (level 1/2/3: ' + lapor.jumlah.level[1] + '/' +
            lapor.jumlah.level[2] + '/' + lapor.jumlah.level[3] + ')');
        });
      });
    });
  }, Promise.resolve()).then(function () {
    if (adaGalat) {
      console.error('\nAda berkas yang gagal. Berkas lama di data/soal/ tidak diubah.');
      process.exit(1);
    }
    console.log('\nSelesai. Commit data/soal/ juga, bukan hanya data/soal-mentah/.');
  });
}

jalan();
