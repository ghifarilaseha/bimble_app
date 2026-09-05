#!/usr/bin/env node
/* uji.js - menjalankan kasus uji di baris perintah.
 *
 *   node tools/uji.js
 *
 * Menjalankan dua hal: kasus uji nilai.js (yang sama dengan uji.html),
 * lalu satu putaran menyeluruh atas seluruh bank soal sungguhan --
 * digembok, dijawab dengan kunci mentahnya, dan harus bernilai 100.
 * Uji terakhir inilah yang menangkap kesalahan penggembokan.
 */
'use strict';

var fs = require('node:fs');
var path = require('node:path');
var Kasus = require('../uji/kasus.js');
var Nilai = require('../js/nilai.js');
var Soal = require('../js/soal.js');
var Gembok = require('../js/gembok-inti.js');
var Validasi = require('../js/validasi.js');

var AKAR = path.join(__dirname, '..');
var SUMBER = path.join(AKAR, 'data', 'soal-mentah');

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

/* Jawaban yang seharusnya benar, disusun dari kunci pada berkas mentah. */
function jawabanBenar(s) {
  if (s.tipe === 'pg') return s.kunci;
  if (s.tipe === 'isian') return s.jawaban[0];
  if (s.tipe === 'benar-salah') return s.pernyataan.map(function (p) { return p.kunci; });
  if (s.tipe === 'koordinat') return s.kunci;
  return null;
}

function ujiBank(berkas) {
  var rel = path.relative(SUMBER, berkas);
  var mentah = JSON.parse(fs.readFileSync(berkas, 'utf8'));
  var aktif = mentah.soal.filter(function (s) { return s.aktif !== false; });

  return Gembok.bank(mentah).then(function (terkunci) {
    return Validasi.periksa(terkunci, { bentuk: 'terkunci' }).then(function (lapor) {
      if (lapor.galat.length) {
        return {
          nama: 'Bank ' + rel + ' lolos pemeriksaan bentuk tergembok',
          lulus: false,
          catatan: lapor.galat.map(function (g) { return g.dimana + ': ' + g.pesan; }).join('; ')
        };
      }
      var siap = Soal.ratakan(terkunci.soal.filter(function (s) { return s.aktif !== false; }));
      var jawaban = {};
      aktif.forEach(function (s) {
        jawaban[s.id] = jawabanBenar(s);
        if (s.lanjutan) jawaban[s.id + '-l'] = jawabanBenar(s.lanjutan);
      });
      return Nilai.nilaiSemua(siap, jawaban).then(function (h) {
        var meleset = h.butir.filter(function (b) { return !b.benar; });
        return {
          nama: 'Bank ' + rel + ' bernilai 100 bila dijawab dengan kuncinya',
          lulus: h.nilai === 100,
          catatan: h.nilai === 100
            ? siap.length + ' butir, poin total ' + h.poinTotal
            : 'butir meleset: ' + meleset.map(function (b) { return b.id; }).join(', ')
        };
      });
    });
  });
}

function cetak(baris) {
  console.log((baris.lulus ? 'LULUS ' : 'GAGAL ') + baris.nama +
    (baris.catatan ? '\n        ' + baris.catatan : ''));
}

Kasus.jalankan(cetak).then(function (hasil) {
  return Promise.all(berkasJson(SUMBER).map(ujiBank)).then(function (bank) {
    bank.forEach(cetak);
    return hasil.concat(bank);
  });
}).then(function (semua) {
  var gagal = semua.filter(function (b) { return !b.lulus; });
  console.log('\n' + (semua.length - gagal.length) + ' lulus, ' + gagal.length + ' gagal.');
  process.exit(gagal.length ? 1 : 0);
});
