/* guru.js - pembuat sesi dan dashboard.
 *
 * Pembuat sesi bekerja tanpa server sama sekali: seluruh pengaturan ada
 * di dalam tautan. Dashboard baru memerlukan Apps Script, karena datanya
 * ada di Spreadsheet. Karena itu halaman ini tetap berguna walau endpoint
 * belum dipasang.
 */
(function () {
  'use strict';

  var KUNCI_KODE = 'bimble.kodeGuru';
  var token = '';
  var daftarKelas = null, petaBab = null;

  var el = {};
  ['gerbang', 'ruang', 'isiKode', 'tombolMasuk', 'pesanGerbang', 'tombolKeluar',
   'tabUtama', 'sesiKelas', 'sesiBab', 'sesiMode', 'sesiKode', 'sesiDurasi',
   'sesiTenggat', 'sesiJumlah', 'sesiLevel', 'sesiBobot', 'sesiAcak',
   'kolomKode', 'kolomDurasi', 'kolomTenggat', 'tautanSesi', 'tombolSalin',
   'tombolBuka', 'tombolBahas', 'tombolCetak', 'catatanTautan', 'wadahQr',
   'jawabanSesi', 'jawabanTampilan', 'tombolMuatJawaban', 'hasilJawaban',
   'butirSesi', 'tombolMuatButir', 'hasilButir',
   'perhatianKelas', 'perhatianAmbang', 'tombolMuatPerhatian', 'hasilPerhatian',
   'kembangKelas', 'kembangSiswa', 'hasilPerkembangan',
   'belumSesi', 'belumKelas', 'tombolMuatBelum', 'hasilBelum']
    .forEach(function (id) { el[id] = document.getElementById(id); });

  function lolos(t) {
    return String(t == null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function adaEndpoint() { return !!(window.KONFIG && KONFIG.ENDPOINT); }

  /* Semua permintaan ke Apps Script lewat satu pintu, supaya penanganan
     galatnya seragam dan tokennya tidak tercecer di banyak tempat. */
  function panggil(aksi, param) {
    if (!adaEndpoint()) {
      return Promise.reject(new Error('ENDPOINT belum diisi di js/konfig.js.'));
    }
    var u = new URL(KONFIG.ENDPOINT);
    u.searchParams.set('token', token);
    u.searchParams.set('aksi', aksi);
    Object.keys(param || {}).forEach(function (k) {
      if (param[k] !== '' && param[k] !== undefined && param[k] !== null) {
        u.searchParams.set(k, param[k]);
      }
    });
    return fetch(u.toString(), { cache: 'no-cache', redirect: 'follow' })
      .then(function (r) { return r.text(); })
      .then(function (teks) {
        var d;
        try { d = JSON.parse(teks); }
        catch (e) { throw new Error('Jawaban server tidak terbaca. Periksa URL Web App.'); }
        if (d.status !== 'ok') throw new Error(d.pesan || 'Server menolak permintaan.');
        return d.data;
      });
  }

  function tulisGalat(wadah, e) {
    wadah.innerHTML = '<div class="pesan gagal">' + lolos(e.message) + '</div>';
  }

  function memuat(wadah) {
    wadah.innerHTML = '<p class="samar">Memuat...</p>';
  }

  /* ---------- gerbang kode guru ---------- */

  function buka() {
    el.gerbang.hidden = true;
    el.ruang.hidden = false;
    el.tombolKeluar.hidden = false;
    muatDataDasar();
  }

  function coba(kode) {
    token = kode;
    if (!adaEndpoint()) {
      /* Tanpa endpoint, pembuat sesi tetap dibuka. Dashboard yang butuh data
         akan memberi tahu sendiri kalau ditekan. */
      buka();
      el.tautanSesi.parentNode.insertBefore(kotakPesan('awas',
        'ENDPOINT belum diisi di js/konfig.js, jadi dashboard belum bisa membaca data. ' +
        'Pembuat sesi di bawah tetap berfungsi.'), el.tautanSesi);
      return;
    }
    el.pesanGerbang.textContent = 'Memeriksa...';
    panggil('cek').then(function () {
      try { localStorage.setItem(KUNCI_KODE, kode); } catch (e) { /* abaikan */ }
      el.pesanGerbang.textContent = '';
      buka();
    }).catch(function (e) {
      el.pesanGerbang.innerHTML = '<span class="pesan gagal" style="display:block">' +
        lolos(e.message) + '</span>';
    });
  }

  function kotakPesan(jenis, teks) {
    var d = document.createElement('div');
    d.className = 'pesan ' + jenis;
    d.textContent = teks;
    return d;
  }

  el.tombolMasuk.addEventListener('click', function () { coba(el.isiKode.value.trim()); });
  el.isiKode.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter') el.tombolMasuk.click();
  });
  el.tombolKeluar.addEventListener('click', function () {
    try { localStorage.removeItem(KUNCI_KODE); } catch (e) { /* abaikan */ }
    location.reload();
  });

  (function pulihkan() {
    var tersimpan = null;
    try { tersimpan = localStorage.getItem(KUNCI_KODE); } catch (e) { /* abaikan */ }
    if (tersimpan) { el.isiKode.value = tersimpan; coba(tersimpan); }
    else if (!adaEndpoint()) { el.isiKode.value = '-'; coba('-'); }
  })();

  /* ---------- tab ---------- */

  Array.prototype.forEach.call(el.tabUtama.children, function (b) {
    b.addEventListener('click', function () {
      Array.prototype.forEach.call(el.tabUtama.children, function (x) {
        x.setAttribute('aria-selected', 'false');
        document.getElementById(x.dataset.panel).hidden = true;
      });
      b.setAttribute('aria-selected', 'true');
      document.getElementById(b.dataset.panel).hidden = false;
    });
  });

  /* ---------- data dasar ---------- */

  function muatDataDasar() {
    Promise.all([
      fetch('data/kelas.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }),
      fetch('data/daftar-bab.json', { cache: 'no-cache' }).then(function (r) { return r.json(); })
    ]).then(function (h) {
      daftarKelas = h[0];
      petaBab = h[1];
      isiPilihanKelas();
      isiPilihanBab();
      el.perhatianAmbang.value = (window.KONFIG && KONFIG.AMBANG_PERHATIAN) || 60;
      perbaruiTautan();
      if (adaEndpoint()) muatDaftarSesi();
    }).catch(function (e) {
      el.ruang.insertBefore(kotakPesan('gagal',
        'Data kelas atau daftar bab tidak bisa dimuat: ' + e.message), el.ruang.firstChild);
    });
  }

  function semuaKelas() { return (daftarKelas && daftarKelas.kelas) || []; }

  function isiPilihanKelas() {
    var pilihan = semuaKelas().map(function (k) {
      return '<option value="' + lolos(k.kode) + '" data-tingkat="' + k.tingkat + '">' +
        lolos(k.kode) + '</option>';
    }).join('');
    [el.sesiKelas, el.perhatianKelas, el.kembangKelas, el.belumKelas].forEach(function (s) {
      s.innerHTML = pilihan;
    });
    isiPilihanSiswa();
  }

  function kelasTerpilih(sel) {
    return semuaKelas().filter(function (k) { return k.kode === sel.value; })[0];
  }

  function isiPilihanSiswa() {
    var k = kelasTerpilih(el.kembangKelas);
    el.kembangSiswa.innerHTML = ((k && k.siswa) || []).map(function (n) {
      return '<option value="' + lolos(n) + '">' + lolos(n) + '</option>';
    }).join('');
  }

  /* Bab yang ditawarkan mengikuti tingkat kelas yang sedang dipilih. */
  function isiPilihanBab() {
    var k = kelasTerpilih(el.sesiKelas);
    var tingkat = (petaBab.kelas || []).filter(function (t) {
      return k && String(t.tingkat) === String(k.tingkat);
    })[0];
    var bab = (tingkat && tingkat.bab || []).filter(function (b) { return b.aktif !== false; });
    el.sesiBab.innerHTML = bab.map(function (b) {
      return '<option value="' + lolos(b.kode) + '">' + lolos(b.judul) + '</option>';
    }).join('');
    if (!bab.length) el.sesiBab.innerHTML = '<option value="">(belum ada bab)</option>';
  }

  /* ---------- pembuat sesi ---------- */

  function tautan(denganBahas) {
    var k = kelasTerpilih(el.sesiKelas);
    if (!k || !el.sesiBab.value) return '';
    var p = new URLSearchParams();
    p.set('kelas', k.tingkat);
    p.set('bab', el.sesiBab.value);
    p.set('mode', el.sesiMode.value);
    if (el.sesiMode.value === 'kelas') {
      if (el.sesiKode.value.trim()) p.set('kode', el.sesiKode.value.trim());
      if (Number(el.sesiDurasi.value) > 0) p.set('durasi', el.sesiDurasi.value);
    }
    if (el.sesiMode.value === 'pr') {
      if (el.sesiKode.value.trim()) p.set('kode', el.sesiKode.value.trim());
      if (el.sesiTenggat.value) p.set('tenggat', el.sesiTenggat.value);
    }
    if (Number(el.sesiJumlah.value) > 0) p.set('jumlah', el.sesiJumlah.value);
    if (el.sesiAcak.value === '1') p.set('acak', '1');
    if (el.sesiLevel.value) p.set('level', el.sesiLevel.value);
    if (el.sesiBobot.value) p.set('bobot', el.sesiBobot.value);
    if (denganBahas) p.set('bahas', '1');

    /* Netlify boleh menyajikan halaman ini sebagai /guru tanpa akhiran
       .html. Menambal nama berkas lewat penggantian teks jadi meleset di
       situ dan menghasilkan ".../gurulatihan.html". URL relatif menyelesaikan
       keduanya. */
    return new URL('latihan.html?' + p.toString(), location.href).href;
  }

  /* Kode sesi adalah kunci pengelompokan seluruh tampilan dashboard. Bila
     dibiarkan kosong, latihan.js memakai "<mode>-<tingkat>-<bab>", sehingga
     sesi minggu ini dan minggu depan untuk bab yang sama melebur jadi satu
     rekap tanpa ada tanda apa pun. Karena itu kodenya diisikan otomatis
     dengan tanggal, dan guru tinggal menimpanya bila mau. */
  var kodeTerisiOtomatis = '';

  function kodeOtomatis() {
    var k = kelasTerpilih(el.sesiKelas);
    if (!k || !el.sesiBab.value) return '';
    var d = new Date();
    var tanggal = d.getFullYear() +
      ('0' + (d.getMonth() + 1)).slice(-2) +
      ('0' + d.getDate()).slice(-2);
    return el.sesiMode.value + '-' + k.tingkat + '-' + el.sesiBab.value + '-' + tanggal;
  }

  function segarkanKodeOtomatis() {
    if (el.sesiMode.value === 'mandiri') return;
    var sekarang = el.sesiKode.value.trim();
    /* Hanya menimpa kolom yang kosong atau yang isinya memang buatan kita
       sendiri, supaya kode yang diketik guru tidak pernah hilang. */
    if (sekarang && sekarang !== kodeTerisiOtomatis) return;
    var baru = kodeOtomatis();
    if (!baru) return;
    el.sesiKode.value = baru;
    kodeTerisiOtomatis = baru;
  }

  function perbaruiTautan() {
    var mode = el.sesiMode.value;
    el.kolomKode.hidden = mode === 'mandiri';
    el.kolomDurasi.hidden = mode !== 'kelas';
    el.kolomTenggat.hidden = mode !== 'pr';

    segarkanKodeOtomatis();

    var dasarSiap = !!(kelasTerpilih(el.sesiKelas) && el.sesiBab.value);
    var kodeKosong = dasarSiap && mode !== 'mandiri' && !el.sesiKode.value.trim();
    var u = kodeKosong ? '' : tautan(false);

    el.tautanSesi.textContent = u ||
      (kodeKosong ? 'Isi kode sesi dulu.' : 'Pilih kelas dan bab dulu.');
    el.tombolBuka.href = u || '#';

    var catatan = [];
    if (mode === 'kelas') {
      catatan.push('Pembahasan ditahan. Bila sudah dibahas bersama, bagikan tautan pembahasan.');
    }
    if (mode === 'pr') catatan.push('Pembahasan muncul sendiri setelah tenggat lewat.');
    if (mode === 'mandiri') catatan.push('Tautan permanen, boleh dikerjakan berulang kali.');
    if (kodeKosong) {
      catatan.push('Kode sesi tidak boleh kosong: tanpa itu rekap sesi ini ' +
        'tercampur dengan sesi lain pada bab yang sama.');
    }
    el.catatanTautan.textContent = catatan.join(' ');

    gambarQr(u);
  }

  function gambarQr(u) {
    el.wadahQr.innerHTML = '';
    if (!u) return;
    try {
      el.wadahQr.appendChild(QR.keSvg(QR.matriks(u), { ukuran: 240 }));
    } catch (e) {
      el.wadahQr.appendChild(kotakPesan('awas', 'QR tidak dibuat: ' + e.message));
    }
  }

  [el.sesiKelas, el.sesiBab, el.sesiMode, el.sesiKode, el.sesiDurasi, el.sesiTenggat,
   el.sesiJumlah, el.sesiLevel, el.sesiBobot, el.sesiAcak].forEach(function (x) {
    x.addEventListener('input', perbaruiTautan);
    x.addEventListener('change', perbaruiTautan);
  });
  el.sesiKelas.addEventListener('change', function () { isiPilihanBab(); perbaruiTautan(); });
  el.kembangKelas.addEventListener('change', function () { isiPilihanSiswa(); muatPerkembangan(); });
  el.kembangSiswa.addEventListener('change', muatPerkembangan);

  function salin(teks, tombol) {
    var semula = tombol.textContent;
    function selesai(pesan) {
      tombol.textContent = pesan;
      setTimeout(function () { tombol.textContent = semula; }, 1600);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(teks).then(function () { selesai('Tersalin'); },
        function () { selesai('Gagal menyalin'); });
    } else {
      /* Peramban lama di komputer sekolah kadang belum punya clipboard API. */
      var kotak = document.createElement('textarea');
      kotak.value = teks;
      document.body.appendChild(kotak);
      kotak.select();
      try { document.execCommand('copy'); selesai('Tersalin'); }
      catch (e) { selesai('Gagal menyalin'); }
      document.body.removeChild(kotak);
    }
  }

  el.tombolSalin.addEventListener('click', function () { salin(tautan(false), el.tombolSalin); });
  el.tombolBahas.addEventListener('click', function () { salin(tautan(true), el.tombolBahas); });
  el.tombolCetak.addEventListener('click', function () { window.print(); });

  /* ---------- daftar sesi ---------- */

  var sesiTersedia = [];

  function muatDaftarSesi() {
    panggil('sesi').then(function (daftar) {
      sesiTersedia = daftar;
      var pilihan = daftar.map(function (s) {
        return '<option value="' + lolos(s.kodeSesi) + '">' + lolos(s.kodeSesi) +
          ' - ' + lolos(s.kelas) + ' ' + lolos(s.bab) + ' (' + s.jumlah + ' pengerjaan)</option>';
      }).join('');
      [el.butirSesi, el.belumSesi, el.jawabanSesi].forEach(function (sel) {
        sel.innerHTML = pilihan || '<option value="">(belum ada data)</option>';
      });
    }).catch(function (e) {
      [el.butirSesi, el.belumSesi, el.jawabanSesi].forEach(function (sel) {
        sel.innerHTML = '<option value="">(gagal memuat)</option>';
      });
      console.warn(e.message);
    });
  }

  function sesiDenganKode(kode) {
    return sesiTersedia.filter(function (s) { return s.kodeSesi === kode; })[0];
  }

  /* Berkas soal dimuat untuk menampilkan bunyi soal dan teks opsinya.
     Kuncinya tetap berupa hash, jadi tidak ada yang bocor dari sini. */
  function muatBankBab(tingkat, bab) {
    var t = (petaBab.kelas || []).filter(function (x) { return String(x.tingkat) === String(tingkat); })[0];
    var b = t && (t.bab || []).filter(function (x) { return x.kode === bab; })[0];
    if (!b || !b.soal) return Promise.resolve(null);
    return fetch(b.soal, { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  /* Soal lanjutan (id "<induk>-l") ikut diratakan supaya idnya bisa
     dicocokkan dengan yang tercatat di sheet. */
  function petaSoal(bank) {
    var perId = {};
    if (bank) {
      bank.soal.forEach(function (s) {
        perId[s.id] = s;
        if (s.lanjutan) perId[s.lanjutan.id] = s.lanjutan;
      });
    }
    return perId;
  }

  /* Jawaban di sheet tersimpan dalam bentuk ringkas: huruf opsi untuk PG,
     "BS-" untuk benar-salah, "(x,y)" untuk koordinat. Untuk PG, teks
     opsinya ditampilkan supaya tidak perlu membuka berkas soal. */
  function jawabanKeHTML(soal, j) {
    var teks = String(j === undefined || j === null ? '' : j);
    if (!teks) return '<span class="samar">(kosong)</span>';
    if (soal && soal.tipe === 'pg' && soal.opsi && soal.opsi[teks] !== undefined) {
      return '<strong>' + lolos(teks) + '.</strong> ' + Rumus.keHTML(soal.opsi[teks]);
    }
    return lolos(teks);
  }

  function capBenar(benar) {
    return benar
      ? '<span class="cap benar">Benar</span>'
      : '<span class="cap salah">Salah</span>';
  }

  function bacaPembahasan(soal) {
    if (!soal || !soal.pembahasan) return '';
    try { return Rumus.keHTML(Kunci.dariBase64(soal.pembahasan)); }
    catch (e) { return ''; }
  }

  /* ---------- jawaban siswa ---------- */

  var jawabanTerakhir = null;

  el.tombolMuatJawaban.addEventListener('click', function () {
    var kode = el.jawabanSesi.value;
    if (!kode) return;
    memuat(el.hasilJawaban);
    var info = sesiDenganKode(kode);
    Promise.all([
      panggil('jawaban', { kodeSesi: kode }),
      info ? muatBankBab(info.tingkat, info.bab) : Promise.resolve(null)
    ]).then(function (h) {
      jawabanTerakhir = { data: h[0], perId: petaSoal(h[1]) };
      gambarJawaban();
    }).catch(function (e) { tulisGalat(el.hasilJawaban, e); });
  });

  el.jawabanTampilan.addEventListener('change', function () {
    if (jawabanTerakhir) gambarJawaban();
  });

  function gambarJawaban() {
    var data = jawabanTerakhir.data, perId = jawabanTerakhir.perId;
    var isi = '<div class="kartu"><h2 class="rapat">' + lolos(data.kodeSesi) + '</h2>' +
      '<p class="kecil samar">' + lolos(data.kelas) + ' &middot; ' + lolos(data.bab) +
      ' &middot; ' + lolos(data.mode) + ' &middot; ' + data.jumlahPengerjaan +
      ' pengerjaan &middot; rata-rata nilai ' + data.rerata + '</p>';

    if (!data.pengerjaan.length) {
      el.hasilJawaban.innerHTML = isi + '</div><div class="pesan info">Belum ada jawaban masuk.</div>';
      return;
    }

    /* Ringkasan nilai selalu di atas, apa pun tampilannya. */
    isi += '<div class="tabel-gulir"><table><thead><tr><th>Nama</th><th>Waktu</th>' +
      '<th class="angka">Benar</th><th class="angka">Nilai</th></tr></thead><tbody>' +
      data.pengerjaan.map(function (p) {
        var benar = p.benar.filter(Boolean).length;
        return '<tr><td>' + lolos(p.nama) +
          (p.adaDiDaftar === false ? ' <span class="cap sebagian">di luar daftar</span>' : '') +
          '</td><td>' + lolos(new Date(p.waktu).toLocaleString('id-ID')) + '</td>' +
          '<td class="angka">' + benar + '/' + p.idSoal.length + '</td>' +
          '<td class="angka">' + p.nilai + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';

    isi += el.jawabanTampilan.value === 'siswa'
      ? jawabanPerSiswa(data.pengerjaan, perId)
      : jawabanPerSoal(data.pengerjaan, perId);
    el.hasilJawaban.innerHTML = isi;
  }

  /* Satu kartu per soal, berisi jawaban semua siswa. Cocok ditayangkan di
     layar kelas saat membahas bersama. Pada sesi mandiri tiap siswa bisa
     mendapat soal berbeda, jadi jumlah barisnya tidak selalu sama. */
  function jawabanPerSoal(pengerjaan, perId) {
    var urutan = [], perSoal = {};
    pengerjaan.forEach(function (p) {
      p.idSoal.forEach(function (id, i) {
        if (!perSoal[id]) { perSoal[id] = []; urutan.push(id); }
        perSoal[id].push({ nama: p.nama, jawaban: p.jawaban[i], benar: p.benar[i] === true });
      });
    });

    return urutan.map(function (id, n) {
      var soal = perId[id];
      var baris = perSoal[id];
      var benar = baris.filter(function (b) { return b.benar; }).length;
      return '<div class="kartu soal">' +
        '<div class="nomor">Soal ' + (n + 1) + ' &middot; ' + lolos(id) +
        (soal ? '<span class="level">Level ' + soal.level + '</span>' : '') +
        '<span class="cap ' + (benar === baris.length ? 'benar' : (benar ? 'sebagian' : 'salah')) +
        '" style="margin-left:.5rem">' + benar + ' dari ' + baris.length + ' benar</span></div>' +
        '<div class="pertanyaan">' + (soal ? Rumus.keHTML(soal.pertanyaan)
          : '<em>(soal tidak ditemukan di berkas)</em>') + '</div>' +
        '<div class="tabel-gulir"><table><thead><tr><th>Nama</th><th>Jawaban</th><th></th></tr></thead><tbody>' +
        baris.map(function (b) {
          return '<tr><td>' + lolos(b.nama) + '</td><td class="bebas">' +
            jawabanKeHTML(soal, b.jawaban) + '</td><td>' + capBenar(b.benar) + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        (soal ? '<div class="pembahasan"><div class="kepala-bahas">Pembahasan</div>' +
          bacaPembahasan(soal) + '</div>' : '') +
        '</div>';
    }).join('');
  }

  function jawabanPerSiswa(pengerjaan, perId) {
    return pengerjaan.map(function (p) {
      return '<div class="kartu soal">' +
        '<div class="nomor">' + lolos(p.nama) +
        '<span class="cap ' + (p.nilai >= 75 ? 'benar' : (p.nilai >= 50 ? 'sebagian' : 'salah')) +
        '" style="margin-left:.5rem">Nilai ' + p.nilai + '</span></div>' +
        '<p class="kecil samar" style="margin:0 0 .5rem">' +
        lolos(new Date(p.waktu).toLocaleString('id-ID')) + ' &middot; poin ' + p.poinRaih +
        ' dari ' + p.poinTotal + ' &middot; ' + Math.round(p.durasiDetik / 60) + ' menit</p>' +
        '<div class="tabel-gulir"><table><thead><tr><th>No</th><th>Soal</th><th>Jawaban</th><th></th></tr></thead><tbody>' +
        p.idSoal.map(function (id, i) {
          var soal = perId[id];
          return '<tr><td>' + (i + 1) + '</td><td class="bebas">' +
            (soal ? Rumus.keHTML(soal.pertanyaan) : '<em>' + lolos(id) + '</em>') +
            '</td><td class="bebas">' + jawabanKeHTML(soal, p.jawaban[i]) + '</td>' +
            '<td>' + capBenar(p.benar[i] === true) + '</td></tr>';
        }).join('') + '</tbody></table></div></div>';
    }).join('');
  }

  /* ---------- analisis butir ---------- */

  el.tombolMuatButir.addEventListener('click', function () {
    var kode = el.butirSesi.value;
    if (!kode) return;
    memuat(el.hasilButir);
    var info = sesiDenganKode(kode);
    Promise.all([
      panggil('butir', { kodeSesi: kode }),
      info ? muatBankBab(info.tingkat, info.bab) : Promise.resolve(null)
    ]).then(function (h) {
      gambarButir(h[0], h[1]);
    }).catch(function (e) { tulisGalat(el.hasilButir, e); });
  });

  function gambarButir(data, bank) {
    var perId = petaSoal(bank);

    var butir = data.butir.slice().sort(function (a, b) {
      return (b.jumlah - b.benar) / (b.jumlah || 1) - (a.jumlah - a.benar) / (a.jumlah || 1);
    });

    var kepala = '<div class="kartu"><h2 class="rapat">' + lolos(data.kodeSesi) + '</h2>' +
      '<p class="kecil samar">' + lolos(data.kelas) + ' &middot; ' + lolos(data.bab) +
      ' &middot; ' + data.jumlahPengerjaan + ' pengerjaan &middot; rata-rata nilai ' +
      data.rerata + '</p></div>';

    var isi = butir.map(function (b) {
      var salah = b.jumlah ? Math.round(((b.jumlah - b.benar) / b.jumlah) * 100) : 0;
      var soal = perId[b.id];
      var teksSoal = soal ? Rumus.keHTML(soal.pertanyaan) : '<em>(soal tidak ditemukan di berkas)</em>';

      var sebaran = '';
      if (soal && soal.tipe === 'pg' && soal.opsi) {
        sebaran = '<table style="margin-top:.5rem"><tbody>' +
          Object.keys(soal.opsi).map(function (huruf) {
            var n = (b.sebaran && b.sebaran[huruf]) || 0;
            var persen = b.jumlah ? Math.round((n / b.jumlah) * 100) : 0;
            return '<tr><td style="width:1.5rem"><strong>' + lolos(huruf) + '</strong></td>' +
              '<td class="bebas">' + Rumus.keHTML(soal.opsi[huruf]) + '</td>' +
              '<td class="angka" style="width:4rem">' + n + ' (' + persen + '%)</td>' +
              '<td style="width:6rem"><span class="palang"><i style="width:' + persen + '%"></i></span></td>' +
              '</tr>';
          }).join('') + '</tbody></table>';
      }

      return '<div class="kartu">' +
        '<div class="nomor">' + lolos(b.id) +
        '<span class="cap ' + (salah >= 50 ? 'salah' : (salah >= 25 ? 'sebagian' : 'benar')) +
        '" style="margin-left:.5rem">' + salah + '% salah</span></div>' +
        '<div class="pertanyaan">' + teksSoal + '</div>' +
        '<p class="kecil samar" style="margin:0">' + b.benar + ' benar dari ' + b.jumlah +
        ' yang mengerjakan</p>' + sebaran +
        '</div>';
    }).join('');

    el.hasilButir.innerHTML = kepala + (isi || '<div class="pesan info">Belum ada butir tercatat.</div>');
  }

  /* ---------- siswa perlu perhatian ---------- */

  function rerata(arr) {
    if (!arr.length) return 0;
    return Math.round(arr.reduce(function (a, b) { return a + b; }, 0) / arr.length);
  }

  el.tombolMuatPerhatian.addEventListener('click', function () {
    memuat(el.hasilPerhatian);
    panggil('siswa', { kelas: el.perhatianKelas.value }).then(function (daftar) {
      gambarPerhatian(daftar, Number(el.perhatianAmbang.value) || 60);
    }).catch(function (e) { tulisGalat(el.hasilPerhatian, e); });
  });

  function gambarPerhatian(daftar, ambang) {
    var tandai = [];
    daftar.forEach(function (s) {
      var nilai = s.pengerjaan.map(function (p) { return p.nilai; });
      if (!nilai.length) return;
      var tigaTerakhir = nilai.slice(-3);
      var rata3 = rerata(tigaTerakhir);
      var alasan = [];

      if (rata3 < ambang) {
        alasan.push('rata-rata ' + tigaTerakhir.length + ' pengerjaan terakhir ' + rata3 +
          ', di bawah ambang ' + ambang);
      }
      /* Penurunan tajam kadang lebih perlu ditengok daripada nilai rendah
         yang memang sudah lama begitu. */
      if (nilai.length >= 3) {
        var sebelum = rerata(nilai.slice(0, -1));
        var turun = sebelum - nilai[nilai.length - 1];
        if (turun > 25) {
          alasan.push('nilai terakhir ' + nilai[nilai.length - 1] + ', turun ' + turun +
            ' poin dari rata-rata sebelumnya (' + sebelum + ')');
        }
      }
      if (alasan.length) tandai.push({ siswa: s, rata3: rata3, alasan: alasan });
    });

    tandai.sort(function (a, b) { return a.rata3 - b.rata3; });
    var tanpaData = daftar.filter(function (s) { return !s.pengerjaan.length; });

    var isi = '<div class="kartu"><h2 class="rapat">' + tandai.length + ' siswa perlu perhatian</h2>' +
      '<p class="kecil samar">Dari ' + daftar.length + ' siswa yang pernah mengumpulkan.</p></div>';

    isi += tandai.map(function (t) {
      return '<div class="kartu padat">' +
        '<strong>' + lolos(t.siswa.nama) + '</strong>' +
        (t.siswa.adaDiDaftar === false
          ? ' <span class="cap sebagian">di luar daftar kelas</span>' : '') +
        '<ul class="kecil" style="margin:.4rem 0 0;padding-left:1.1rem">' +
        t.alasan.map(function (a) { return '<li>' + lolos(a) + '</li>'; }).join('') +
        '</ul></div>';
    }).join('');

    if (!tandai.length) isi += '<div class="pesan sip">Tidak ada yang melewati ambang saat ini.</div>';
    if (tanpaData.length) {
      isi += '<div class="pesan info">' + tanpaData.length +
        ' siswa belum pernah mengumpulkan apa pun.</div>';
    }
    el.hasilPerhatian.innerHTML = isi;
  }

  /* ---------- perkembangan per siswa ---------- */

  function muatPerkembangan() {
    if (!adaEndpoint() || !el.kembangSiswa.value) return;
    memuat(el.hasilPerkembangan);
    panggil('siswa', { kelas: el.kembangKelas.value, nama: el.kembangSiswa.value })
      .then(function (daftar) {
        var s = daftar[0];
        if (!s || !s.pengerjaan.length) {
          el.hasilPerkembangan.innerHTML =
            '<div class="pesan info">Belum ada pengerjaan tercatat untuk siswa ini.</div>';
          return;
        }
        el.hasilPerkembangan.innerHTML = '';
        var kartu = document.createElement('div');
        kartu.className = 'kartu';
        kartu.innerHTML = '<h2 class="rapat">' + lolos(s.nama) + '</h2>' +
          '<p class="kecil samar">' + s.pengerjaan.length + ' pengerjaan, rata-rata ' +
          rerata(s.pengerjaan.map(function (p) { return p.nilai; })) + '</p>';
        kartu.appendChild(grafikNilai(s.pengerjaan));
        kartu.appendChild(tabelPengerjaan(s.pengerjaan));
        el.hasilPerkembangan.appendChild(kartu);
      }).catch(function (e) { tulisGalat(el.hasilPerkembangan, e); });
  }

  /* Grafik digambar dengan SVG biasa. Tidak ada pustaka chart: yang
     dibutuhkan hanya garis, titik, dan beberapa label. */
  function grafikNilai(pengerjaan) {
    var NS = 'http://www.w3.org/2000/svg';
    var W = 680, H = 250, kiri = 34, kanan = 14, atas = 16, bawah = 54;
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('width', '100%');
    svg.setAttribute('style', 'max-width:100%;height:auto;display:block');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Grafik nilai terhadap waktu');

    function bikin(nama, sifat, isi) {
      var e = document.createElementNS(NS, nama);
      for (var k in sifat) if (Object.prototype.hasOwnProperty.call(sifat, k)) {
        e.setAttribute(k, sifat[k]);
      }
      if (isi !== undefined) e.textContent = isi;
      return e;
    }

    var waktu = pengerjaan.map(function (p) { return Date.parse(p.waktu) || 0; });
    var wMin = Math.min.apply(null, waktu), wMaks = Math.max.apply(null, waktu);
    var rentang = wMaks - wMin;

    function sx(i) {
      if (pengerjaan.length === 1) return kiri + (W - kiri - kanan) / 2;
      /* Bila semua pengerjaan terjadi pada saat yang hampir sama, jarak
         waktu tidak lagi bermakna, jadi titiknya disebar rata. */
      var bagian = rentang > 60000
        ? (waktu[i] - wMin) / rentang
        : i / (pengerjaan.length - 1);
      return kiri + bagian * (W - kiri - kanan);
    }
    function sy(n) { return atas + (1 - n / 100) * (H - atas - bawah); }

    [0, 25, 50, 75, 100].forEach(function (n) {
      svg.appendChild(bikin('line', {
        x1: kiri, y1: sy(n), x2: W - kanan, y2: sy(n),
        stroke: 'var(--garis)', 'stroke-width': 1
      }));
      svg.appendChild(bikin('text', {
        x: kiri - 6, y: sy(n) + 4, 'font-size': 10, 'text-anchor': 'end',
        fill: 'var(--tinta-lembut)', 'font-family': 'system-ui, sans-serif'
      }, String(n)));
    });

    svg.appendChild(bikin('path', {
      d: pengerjaan.map(function (p, i) {
        return (i ? 'L' : 'M') + sx(i).toFixed(1) + ' ' + sy(p.nilai).toFixed(1);
      }).join(' '),
      fill: 'none', stroke: 'var(--aksen)', 'stroke-width': 2
    }));

    pengerjaan.forEach(function (p, i) {
      svg.appendChild(bikin('circle', { cx: sx(i), cy: sy(p.nilai), r: 4.5, fill: 'var(--aksen)' }));
      svg.appendChild(bikin('text', {
        x: sx(i), y: sy(p.nilai) - 10, 'font-size': 10, 'text-anchor': 'middle',
        fill: 'var(--tinta)', 'font-family': 'system-ui, sans-serif'
      }, String(p.nilai)));
      /* Penanda bab dimiringkan supaya nama bab yang panjang tetap muat. */
      svg.appendChild(bikin('text', {
        x: sx(i), y: H - bawah + 18, 'font-size': 10, 'text-anchor': 'end',
        fill: 'var(--tinta-lembut)', 'font-family': 'system-ui, sans-serif',
        transform: 'rotate(-35 ' + sx(i).toFixed(1) + ' ' + (H - bawah + 18) + ')'
      }, p.bab));
    });

    return svg;
  }

  function tabelPengerjaan(pengerjaan) {
    var bungkus = document.createElement('div');
    bungkus.className = 'tabel-gulir';
    bungkus.style.marginTop = '1rem';
    bungkus.innerHTML = '<table><thead><tr><th>Waktu</th><th>Bab</th><th>Sesi</th>' +
      '<th class="angka">Nilai</th></tr></thead><tbody>' +
      pengerjaan.slice().reverse().map(function (p) {
        return '<tr><td>' + lolos(new Date(p.waktu).toLocaleString('id-ID')) + '</td>' +
          '<td>' + lolos(p.bab) + '</td><td>' + lolos(p.kodeSesi) + '</td>' +
          '<td class="angka">' + p.nilai + '</td></tr>';
      }).join('') + '</tbody></table>';
    return bungkus;
  }

  /* ---------- belum mengerjakan ---------- */

  el.tombolMuatBelum.addEventListener('click', function () {
    var kode = el.belumSesi.value;
    if (!kode) return;
    memuat(el.hasilBelum);
    panggil('sesiNama', { kodeSesi: kode }).then(function (data) {
      gambarBelum(data);
    }).catch(function (e) { tulisGalat(el.hasilBelum, e); });
  });

  function gambarBelum(data) {
    var kelas = kelasTerpilih(el.belumKelas);
    var daftarSiswa = (kelas && kelas.siswa) || [];
    var sudah = data.nama || [];

    function kunci(n) { return String(n).toLowerCase().replace(/\s+/g, ' ').trim(); }
    var sudahKunci = sudah.map(kunci);

    var belum = daftarSiswa.filter(function (n) { return sudahKunci.indexOf(kunci(n)) < 0; });
    /* Nama yang masuk tetapi tidak ada di daftar kelas ditampilkan terpisah:
       bisa jadi salah pilih kelas, bisa jadi siswa baru. */
    var daftarKunci = daftarSiswa.map(kunci);
    var asing = sudah.filter(function (n) { return daftarKunci.indexOf(kunci(n)) < 0; });

    var isi = '<div class="kartu"><h2 class="rapat">' + lolos(data.kodeSesi) + '</h2>' +
      '<p class="kecil samar">' + sudah.length + ' sudah mengumpulkan, ' +
      belum.length + ' belum, dari ' + daftarSiswa.length + ' siswa di ' +
      lolos(el.belumKelas.value) + '.</p></div>';

    isi += '<div class="kartu"><h3 class="rapat">Belum mengerjakan</h3>' +
      (belum.length
        ? '<ol style="margin:.5rem 0 0;padding-left:1.3rem">' +
          belum.map(function (n) { return '<li>' + lolos(n) + '</li>'; }).join('') + '</ol>'
        : '<div class="pesan sip">Semua sudah mengumpulkan.</div>') + '</div>';

    if (asing.length) {
      isi += '<div class="kartu"><h3 class="rapat">Nama di luar daftar kelas ini</h3>' +
        '<ul style="margin:.5rem 0 0;padding-left:1.3rem">' +
        asing.map(function (n) { return '<li>' + lolos(n) + '</li>'; }).join('') + '</ul>' +
        '<p class="kecil samar">Mungkin salah memilih kelas, mungkin siswa baru yang ' +
        'belum masuk data/kelas.json.</p></div>';
    }

    el.hasilBelum.innerHTML = isi;
  }
})();
