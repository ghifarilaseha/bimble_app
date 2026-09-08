/**
 * Kode.gs - penerima hasil pengerjaan dan pelayan dashboard.
 *
 * Salinan berkas ini disimpan di repo hanya untuk riwayat versi. Yang
 * benar-benar berjalan adalah salinannya di Apps Script milik guru.
 * Kalau berkas ini disunting, tempelkan lagi ke Apps Script lalu
 * deploy ulang, jika tidak keduanya akan berbeda diam-diam.
 *
 * Pemasangan pertama kali ada di README, bagian "Memasang penerima data".
 */

var NAMA_SHEET = 'Hasil';

var KOLOM = [
  'waktu', 'kodeSesi', 'mode', 'kelas', 'nama', 'adaDiDaftar', 'tingkat', 'bab',
  'versiSoal', 'jumlahSoal', 'poinTotal', 'poinRaih', 'nilai', 'durasiDetik',
  'idSoal', 'jawaban', 'benar', 'idKirim'
];

/* Field yang wajib ada. Kiriman tanpa salah satunya ditolak, supaya baris
   setengah jadi tidak mengotori rekap. */
var WAJIB = ['waktu', 'kodeSesi', 'mode', 'kelas', 'nama', 'bab', 'nilai', 'idSoal', 'benar'];

/**
 * Dijalankan sekali dari editor Apps Script setelah kode ditempel.
 * Membuat sheet beserta barisan judulnya bila belum ada.
 */
function pasang() {
  var sheet = sheetHasil();
  SpreadsheetApp.getUi().alert('Sheet "' + NAMA_SHEET + '" siap dengan ' +
    sheet.getLastRow() + ' baris. Jangan lupa isi Script Property bernama TOKEN.');
}

function sheetHasil() {
  var buku = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = buku.getSheetByName(NAMA_SHEET);
  if (!sheet) {
    sheet = buku.insertSheet(NAMA_SHEET);
    sheet.appendRow(KOLOM);
    sheet.setFrozenRows(1);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(KOLOM);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function jawab(objek) {
  return ContentService
    .createTextOutput(JSON.stringify(objek))
    .setMimeType(ContentService.MimeType.JSON);
}

function sukses(data) { return jawab({ status: 'ok', data: data }); }
function gagal(pesan) { return jawab({ status: 'galat', pesan: pesan }); }

function tokenSah(e) {
  var seharusnya = PropertiesService.getScriptProperties().getProperty('TOKEN');
  if (!seharusnya) return false;
  var diberi = (e && e.parameter && e.parameter.token) || '';
  return diberi === seharusnya;
}

/* ---------- menerima hasil ---------- */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return gagal('Tidak ada isi kiriman.');

    var data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (galatUrai) {
      return gagal('Isi kiriman bukan JSON yang sah.');
    }

    for (var i = 0; i < WAJIB.length; i++) {
      var k = WAJIB[i];
      if (data[k] === undefined || data[k] === null || data[k] === '') {
        return gagal('Field wajib "' + k + '" kosong.');
      }
    }

    /* Memeriksa idKirim lalu menambah baris adalah dua langkah terpisah.
       Satu kelas menekan Kumpulkan dalam menit yang sama persis adalah
       jendela balapannya: tanpa kunci, dua kiriman bisa sama-sama lolos
       pemeriksaan, atau appendRow saling menimpa. */
    var kunci = LockService.getScriptLock();
    try {
      kunci.waitLock(20000);
    } catch (galatKunci) {
      return gagal('Server sedang sibuk. Coba kirim lagi sebentar lagi.');
    }

    try {
      var sheet = sheetHasil();
      if (data.idKirim && sudahAda(sheet, data.idKirim)) {
        return sukses({ pesan: 'Sudah pernah diterima.', ganda: true });
      }

      var baris = KOLOM.map(function (kolom) {
        var nilai = data[kolom];
        if (nilai === undefined || nilai === null) return '';
        if (Object.prototype.toString.call(nilai) === '[object Array]') return JSON.stringify(nilai);
        return amanTeks(nilai);
      });
      sheet.appendRow(baris);
    } finally {
      kunci.releaseLock();
    }

    return sukses({ pesan: 'Diterima.' });
  } catch (galat) {
    return gagal('Kesalahan server: ' + galat.message);
  }
}

/* Nama siswa adalah teks bebas yang diketik sendiri, dan appendRow menulis
   apa adanya. Sel yang diawali "=", "+", "-", atau "@" ditafsirkan
   Spreadsheet sebagai rumus, sehingga nama seperti =HYPERLINK(...) menjadi
   rumus hidup di lembar guru. Kutip tunggal di depan memaksanya jadi teks
   dan tidak ikut terbaca saat dibaca kembali lewat getValues. */
function amanTeks(nilai) {
  if (typeof nilai !== 'string') return nilai;
  return /^[=+\-@]/.test(nilai) ? "'" + nilai : nilai;
}

function sudahAda(sheet, idKirim) {
  var baris = sheet.getLastRow();
  if (baris < 2) return false;
  var kolomId = KOLOM.indexOf('idKirim') + 1;
  var nilai = sheet.getRange(2, kolomId, baris - 1, 1).getValues();
  for (var i = 0; i < nilai.length; i++) {
    if (String(nilai[i][0]) === String(idKirim)) return true;
  }
  return false;
}

/* ---------- melayani dashboard ---------- */

function doGet(e) {
  try {
    if (!tokenSah(e)) return gagal('Token tidak cocok. Periksa kode guru.');
    var aksi = (e.parameter.aksi || 'cek');

    if (aksi === 'cek') return sukses({ pesan: 'Token cocok.' });

    var baris = semuaBaris();

    if (aksi === 'sesi') return sukses(ringkasSesi(baris));
    if (aksi === 'butir') return sukses(analisisButir(baris, e.parameter.kodeSesi));
    if (aksi === 'siswa') return sukses(perSiswa(baris, e.parameter.kelas, e.parameter.nama));
    if (aksi === 'sesiNama') return sukses(namaDalamSesi(baris, e.parameter.kodeSesi));

    return gagal('Aksi "' + aksi + '" tidak dikenal.');
  } catch (galat) {
    return gagal('Kesalahan server: ' + galat.message);
  }
}

/* Seluruh isi sheet dibaca sekali lalu diubah menjadi objek. Untuk ukuran
   beberapa kelas paralel, ini jauh lebih sederhana daripada query rumit. */
function semuaBaris() {
  var sheet = sheetHasil();
  if (sheet.getLastRow() < 2) return [];
  var nilai = sheet.getRange(2, 1, sheet.getLastRow() - 1, KOLOM.length).getValues();
  return nilai.map(function (r) {
    var o = {};
    for (var i = 0; i < KOLOM.length; i++) o[KOLOM[i]] = r[i];
    o.waktu = keIsoAman(o.waktu);
    o.nilai = Number(o.nilai) || 0;
    return o;
  }).filter(function (o) { return o.nama && o.kodeSesi; });
}

/* Spreadsheet kadang mengubah teks tanggal menjadi objek Date. Keduanya
   dikembalikan ke bentuk ISO supaya sisi peramban tidak perlu menebak. */
function keIsoAman(nilai) {
  if (nilai instanceof Date) return nilai.toISOString();
  return String(nilai || '');
}

function uraiSenarai(teks) {
  if (Object.prototype.toString.call(teks) === '[object Array]') return teks;
  try {
    var d = JSON.parse(teks);
    return Object.prototype.toString.call(d) === '[object Array]' ? d : [];
  } catch (galat) {
    return [];
  }
}

function ringkasSesi(baris) {
  var peta = {};
  baris.forEach(function (r) {
    var kunci = String(r.kodeSesi);
    if (!peta[kunci]) {
      peta[kunci] = {
        kodeSesi: kunci, kelas: r.kelas, bab: r.bab, tingkat: r.tingkat,
        mode: r.mode, jumlah: 0, jumlahNilai: 0, terakhir: r.waktu
      };
    }
    var s = peta[kunci];
    s.jumlah++;
    s.jumlahNilai += r.nilai;
    if (r.waktu > s.terakhir) s.terakhir = r.waktu;
  });

  var daftar = [];
  for (var k in peta) {
    if (!peta.hasOwnProperty(k)) continue;
    var s = peta[k];
    s.rerata = s.jumlah ? Math.round(s.jumlahNilai / s.jumlah) : 0;
    delete s.jumlahNilai;
    daftar.push(s);
  }
  daftar.sort(function (a, b) { return a.terakhir < b.terakhir ? 1 : -1; });
  return daftar;
}

function analisisButir(baris, kodeSesi) {
  var dipakai = baris.filter(function (r) { return String(r.kodeSesi) === String(kodeSesi); });
  var butir = {}, urutan = [];
  var jumlahNilai = 0;

  dipakai.forEach(function (r) {
    jumlahNilai += r.nilai;
    var id = uraiSenarai(r.idSoal);
    var jawab = uraiSenarai(r.jawaban);
    var benar = uraiSenarai(r.benar);

    for (var i = 0; i < id.length; i++) {
      var kunci = String(id[i]);
      if (!butir[kunci]) {
        butir[kunci] = { id: kunci, jumlah: 0, benar: 0, sebaran: {} };
        urutan.push(kunci);
      }
      var b = butir[kunci];
      b.jumlah++;
      if (benar[i] === true || benar[i] === 'TRUE' || benar[i] === 'true') b.benar++;

      /* Sebaran hanya berguna untuk jawaban pendek seperti huruf opsi.
         Jawaban panjang diabaikan supaya tabelnya tidak melebar. */
      var j = String(jawab[i] === undefined ? '' : jawab[i]);
      if (j && j.length <= 12) b.sebaran[j] = (b.sebaran[j] || 0) + 1;
    }
  });

  var contoh = dipakai[0] || {};
  return {
    kodeSesi: kodeSesi,
    kelas: contoh.kelas || '',
    bab: contoh.bab || '',
    tingkat: contoh.tingkat || '',
    jumlahPengerjaan: dipakai.length,
    rerata: dipakai.length ? Math.round(jumlahNilai / dipakai.length) : 0,
    butir: urutan.map(function (k) { return butir[k]; })
  };
}

function perSiswa(baris, kelas, nama) {
  var dipakai = baris.filter(function (r) {
    if (kelas && String(r.kelas) !== String(kelas)) return false;
    if (nama && String(r.nama) !== String(nama)) return false;
    return true;
  });

  var peta = {}, urutan = [];
  dipakai.forEach(function (r) {
    var kunci = String(r.nama);
    if (!peta[kunci]) {
      peta[kunci] = { nama: kunci, adaDiDaftar: r.adaDiDaftar !== false, pengerjaan: [] };
      urutan.push(kunci);
    }
    if (r.adaDiDaftar === false) peta[kunci].adaDiDaftar = false;
    peta[kunci].pengerjaan.push({
      waktu: r.waktu, bab: r.bab, kodeSesi: r.kodeSesi, mode: r.mode, nilai: r.nilai
    });
  });

  return urutan.map(function (k) {
    peta[k].pengerjaan.sort(function (a, b) { return a.waktu < b.waktu ? -1 : 1; });
    return peta[k];
  });
}

function namaDalamSesi(baris, kodeSesi) {
  var dipakai = baris.filter(function (r) { return String(r.kodeSesi) === String(kodeSesi); });
  var lihat = {}, nama = [];
  dipakai.forEach(function (r) {
    var k = String(r.nama);
    if (!lihat[k]) { lihat[k] = true; nama.push(k); }
  });
  return { kodeSesi: kodeSesi, nama: nama, jumlahPengerjaan: dipakai.length };
}
