#!/usr/bin/env node
/* sajikan.js - server statis seadanya untuk mencoba situs di komputer sendiri.
 *
 *   node tools/sajikan.js            lalu buka http://localhost:8080
 *   node tools/sajikan.js 3000       memakai porta lain
 *
 * Membuka berkas langsung lewat file:// tidak bisa dipakai: fetch menolak
 * memuat berkas JSON, dan crypto.subtle yang dipakai untuk mencocokkan kunci
 * hanya tersedia pada konteks aman. localhost dianggap aman, jadi cukup ini.
 *
 * Hanya untuk mencoba. Jangan dipakai melayani siapa pun di jaringan.
 */
'use strict';

var http = require('node:http');
var fs = require('node:fs');
var path = require('node:path');

var AKAR = path.join(__dirname, '..');
var PORTA = Number(process.argv[2]) || 8080;

var TIPE = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

http.createServer(function (permintaan, jawaban) {
  var jalur = decodeURIComponent(permintaan.url.split('?')[0]);
  if (jalur === '/') jalur = '/index.html';

  var berkas = path.join(AKAR, jalur);

  /* Penjagaan supaya permintaan seperti /../../rahasia.txt tidak keluar
     dari folder situs. */
  if (path.relative(AKAR, berkas).startsWith('..')) {
    jawaban.writeHead(403).end('Terlarang');
    return;
  }

  fs.readFile(berkas, function (galat, isi) {
    if (galat) {
      jawaban.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.readFile(path.join(AKAR, '404.html'), function (g2, isi404) {
        jawaban.end(g2 ? 'Tidak ditemukan: ' + jalur : isi404);
      });
      return;
    }
    jawaban.writeHead(200, {
      'Content-Type': TIPE[path.extname(berkas).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    jawaban.end(isi);
  });
}).listen(PORTA, function () {
  console.log('Situs disajikan di http://localhost:' + PORTA);
  console.log('Tekan Ctrl+C untuk berhenti.');
});
