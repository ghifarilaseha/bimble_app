/* riwayat.js - siswa melihat riwayat pengerjaannya sendiri.
 *
 * Tidak ada login, jadi yang dipakai hanya pasangan kelas dan nama. Datanya
 * diambil dari Apps Script lewat aksi "riwayat", satu-satunya aksi doGet
 * yang tidak memerlukan token guru. Yang dikembalikan hanya nilai dan
 * jawaban milik nama itu, sama seperti yang tampak di layar saat
 * mengumpulkan.
 */
(function () {
  'use strict';

  var LAINNYA = '__lainnya';
  var P = new URLSearchParams(location.search);

  var el = {};
  ['layarPesan', 'layarCari', 'layarDaftar', 'layarRinci', 'pilihKelas', 'pilihNama',
   'kolomNamaLain', 'isiNama', 'tombolCari', 'daftarJudul', 'daftarRerata', 'daftarRincian',
   'daftarPengerjaan', 'tombolGanti', 'tombolKembali', 'rinciKepala', 'rinciSoal']
    .forEach(function (id) { el[id] = document.getElementById(id); });

  var daftarKelas = null, petaBab = null;
  var riwayat = null;
  var bankTersimpan = {};

  /* ---------- alat bantu ---------- */

  function tampil(bagian) {
    ['layarCari', 'layarDaftar', 'layarRinci'].forEach(function (n) {
      el[n].hidden = (n !== bagian);
    });
    window.scrollTo(0, 0);
  }

  function pesan(jenis, isiHtml) {
    el.layarPesan.hidden = !isiHtml;
    el.layarPesan.innerHTML = isiHtml ? '<div class="pesan ' + jenis + '">' + isiHtml + '</div>' : '';
  }

  function ambilJson(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('Gagal memuat ' + url + ' (' + r.status + ')');
      return r.json();
    });
  }

  function siswaKelas(kode) {
    var k = (daftarKelas.kelas || []).filter(function (x) { return x.kode === kode; })[0];
    return k ? k.siswa : [];
  }

  function judulBab(tingkat, bab) {
    var t = (petaBab.kelas || []).filter(function (x) { return String(x.tingkat) === String(tingkat); })[0];
    var b = t && (t.bab || []).filter(function (x) { return x.kode === bab; })[0];
    return b ? b.judul : bab;
  }

  function namaMode(mode) {
    return { kelas: 'Latihan kelas', pr: 'PR', mandiri: 'Latihan mandiri' }[mode] || mode;
  }

  /* ---------- memulai ---------- */

  function mulai() {
    if (!(window.KONFIG && KONFIG.ENDPOINT)) {
      return pesan('gagal', 'Riwayat belum bisa dibaca: ENDPOINT belum diisi di js/konfig.js.');
    }
    Promise.all([ambilJson('data/kelas.json'), ambilJson('data/daftar-bab.json')])
      .then(function (h) {
        daftarKelas = h[0];
        petaBab = h[1];
        siapkanPilihan();
      })
      .catch(function (e) {
        pesan('gagal', 'Halaman tidak bisa dimulai. ' + Rumus.lolos(e.message));
      });
  }

  function siapkanPilihan() {
    el.pilihKelas.innerHTML = '';
    (daftarKelas.kelas || []).forEach(function (k) {
      var o = document.createElement('option');
      o.value = k.kode;
      o.textContent = k.kode;
      el.pilihKelas.appendChild(o);
    });

    /* Dari tautan "Riwayatku" di halaman hasil, atau dari ingatan nama
       terakhir yang dipakai di halaman latihan. */
    var tersimpan = Identitas.baca();
    var kelasAwal = P.get('kelas') || (tersimpan && tersimpan.kelas) || '';
    var namaAwal = P.get('nama') || (tersimpan && tersimpan.nama) || '';
    if ((daftarKelas.kelas || []).some(function (k) { return k.kode === kelasAwal; })) {
      el.pilihKelas.value = kelasAwal;
    }
    isiPilihanNama(namaAwal);

    el.pilihKelas.addEventListener('change', function () { isiPilihanNama(''); });
    el.pilihNama.addEventListener('change', tanggapiPilihanNama);
    el.isiNama.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); el.tombolCari.click(); }
    });
    el.tombolCari.addEventListener('click', cari);
    el.tombolGanti.addEventListener('click', function () { tampil('layarCari'); });
    el.tombolKembali.addEventListener('click', function () { tampil('layarDaftar'); });

    if (P.get('nama') && P.get('kelas')) cari();
  }

  function isiPilihanNama(namaAwal) {
    var daftarSiswa = siswaKelas(el.pilihKelas.value);
    el.pilihNama.innerHTML = '';
    [['', '- pilih namamu -']].concat(daftarSiswa.map(function (n) { return [n, n]; }))
      .concat([[LAINNYA, 'Lainnya (namaku tidak ada di daftar)']])
      .forEach(function (p) {
        var o = document.createElement('option');
        o.value = p[0];
        o.textContent = p[1];
        el.pilihNama.appendChild(o);
      });
    el.isiNama.value = '';
    if (namaAwal && Identitas.adaDiDaftar(daftarSiswa, namaAwal)) {
      el.pilihNama.value = Identitas.samakanDenganDaftar(daftarSiswa, namaAwal);
    } else if (namaAwal) {
      el.pilihNama.value = LAINNYA;
      el.isiNama.value = namaAwal;
    } else {
      el.pilihNama.value = '';
    }
    tanggapiPilihanNama();
  }

  function tanggapiPilihanNama() {
    var lain = el.pilihNama.value === LAINNYA;
    el.kolomNamaLain.hidden = !lain;
    if (lain && document.activeElement === el.pilihNama) el.isiNama.focus();
  }

  function namaTerpilih() {
    var v = el.pilihNama.value;
    if (!v) return null;
    if (v === LAINNYA) return Identitas.rapikanNama(el.isiNama.value);
    return v;
  }

  /* ---------- mengambil riwayat ---------- */

  function cari() {
    var nama = namaTerpilih();
    if (nama === null) { el.pilihNama.focus(); return alert('Pilih namamu dulu ya.'); }
    if (nama.length < 2) { el.isiNama.focus(); return alert('Tulis namamu dulu ya.'); }
    var kelas = el.pilihKelas.value;

    pesan('info', 'Mengambil riwayat...');
    el.tombolCari.disabled = true;

    var u = new URL(KONFIG.ENDPOINT);
    u.searchParams.set('aksi', 'riwayat');
    u.searchParams.set('kelas', kelas);
    u.searchParams.set('nama', nama);
    fetch(u.toString(), { cache: 'no-cache', redirect: 'follow' })
      .then(function (r) { return r.text(); })
      .then(function (teks) {
        var d;
        try { d = JSON.parse(teks); }
        catch (e) { throw new Error('Jawaban server tidak terbaca.'); }
        if (d.status !== 'ok') throw new Error(d.pesan || 'Server menolak permintaan.');
        riwayat = d.data;
        pesan('', '');
        gambarDaftar();
      })
      .catch(function (e) {
        pesan('gagal', 'Riwayat tidak bisa diambil. ' + Rumus.lolos(e.message) +
          '<br><span class="kecil">Periksa sambungan internetmu, lalu coba lagi.</span>');
      })
      .then(function () { el.tombolCari.disabled = false; });
  }

  function gambarDaftar() {
    tampil('layarDaftar');
    var p = riwayat.pengerjaan || [];
    el.daftarJudul.textContent = riwayat.nama + ' - kelas ' + riwayat.kelas;

    if (!p.length) {
      el.daftarRerata.textContent = '-';
      el.daftarRincian.textContent = 'Belum ada latihan yang tercatat atas nama ini.';
      el.daftarPengerjaan.innerHTML = '<div class="pesan info">Kalau kamu yakin pernah mengumpulkan, ' +
        'mungkin waktu itu namamu diketik berbeda. Coba pilih "Lainnya" lalu tulis nama ' +
        'persis seperti saat mengerjakan.</div>';
      return;
    }

    var total = p.reduce(function (t, x) { return t + (Number(x.nilai) || 0); }, 0);
    el.daftarRerata.textContent = Math.round(total / p.length);
    el.daftarRincian.textContent = 'Rata-rata dari ' + p.length + ' latihan';

    el.daftarPengerjaan.innerHTML = '';
    p.forEach(function (x, i) {
      var kartu = document.createElement('div');
      kartu.className = 'kartu padat';
      var benar = x.benar.filter(Boolean).length;
      kartu.innerHTML = '<div class="nama">' + Rumus.lolos(judulBab(x.tingkat, x.bab)) +
        ' <span class="cap ' + (x.nilai >= 75 ? 'benar' : (x.nilai >= 50 ? 'sebagian' : 'salah')) +
        '">Nilai ' + Rumus.lolos(x.nilai) + '</span></div>' +
        '<div class="ket samar kecil">' + Rumus.lolos(new Date(x.waktu).toLocaleString('id-ID')) +
        ' &middot; ' + Rumus.lolos(namaMode(x.mode)) + ' &middot; ' + benar + ' benar dari ' +
        x.idSoal.length + ' soal</div>';
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tombol mungil';
      b.style.marginTop = '.5rem';
      b.textContent = 'Lihat jawabanku';
      b.addEventListener('click', function () { gambarRinci(i); });
      kartu.appendChild(b);
      el.daftarPengerjaan.appendChild(kartu);
    });
  }

  /* ---------- rincian satu pengerjaan ---------- */

  function muatBank(tingkat, bab) {
    var kunci = tingkat + '/' + bab;
    if (bankTersimpan[kunci]) return bankTersimpan[kunci];
    var t = (petaBab.kelas || []).filter(function (x) { return String(x.tingkat) === String(tingkat); })[0];
    var b = t && (t.bab || []).filter(function (x) { return x.kode === bab; })[0];
    var janji = (b && b.soal)
      ? ambilJson(b.soal).catch(function () { return null; })
      : Promise.resolve(null);
    bankTersimpan[kunci] = janji;
    return janji;
  }

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

  function jawabanKeHTML(soal, j) {
    var teks = String(j === undefined || j === null ? '' : j);
    if (!teks) return '<span class="samar">(tidak dijawab)</span>';
    if (soal && soal.tipe === 'pg' && soal.opsi && soal.opsi[teks] !== undefined) {
      return Rumus.keHTML(soal.opsi[teks]);
    }
    return Rumus.lolos(teks);
  }

  /* Pembahasan hanya dibuka untuk latihan mandiri. Untuk latihan kelas dan
     PR, kapan pembahasannya dibuka adalah keputusan guru lewat tautan, dan
     riwayat tidak tahu keputusan itu. */
  function bolehBahas(x) { return x.mode === 'mandiri'; }

  function bacaPembahasan(soal) {
    if (!soal || !soal.pembahasan) return '';
    try { return Rumus.keHTML(Kunci.dariBase64(soal.pembahasan)); }
    catch (e) { return ''; }
  }

  function gambarRinci(i) {
    var x = riwayat.pengerjaan[i];
    tampil('layarRinci');
    el.rinciKepala.innerHTML = '<div class="kartu tengah">' +
      '<p class="kecil samar rapat">' + Rumus.lolos(judulBab(x.tingkat, x.bab)) + ' &middot; ' +
      Rumus.lolos(namaMode(x.mode)) + '</p>' +
      '<p class="nilai-besar">' + Rumus.lolos(x.nilai) + '</p>' +
      '<p class="samar">' + Rumus.lolos(new Date(x.waktu).toLocaleString('id-ID')) + '<br>' +
      'Poin ' + x.poinRaih + ' dari ' + x.poinTotal + '</p></div>' +
      (bolehBahas(x) ? '' :
        '<div class="pesan awas">Pembahasan tidak ditampilkan di sini. Gurumu membukanya saat dibahas bersama di kelas.</div>');
    el.rinciSoal.innerHTML = '<p class="samar">Memuat soal...</p>';

    muatBank(x.tingkat, x.bab).then(function (bank) {
      var perId = petaSoal(bank);
      el.rinciSoal.innerHTML = x.idSoal.map(function (id, n) {
        var soal = perId[id];
        var benar = x.benar[n] === true;
        return '<article class="kartu soal ' + (benar ? 'benar' : 'salah') + '">' +
          '<div class="nomor">Soal ' + (n + 1) +
          (soal ? '<span class="level">Level ' + soal.level + '</span>' : '') +
          '<span class="cap ' + (benar ? 'benar' : 'salah') + '" style="margin-left:.5rem">' +
          (benar ? 'Benar' : 'Belum tepat') + '</span></div>' +
          '<div class="pertanyaan">' + (soal ? Rumus.keHTML(soal.pertanyaan)
            : '<em>(soal ' + Rumus.lolos(id) + ' sudah tidak ada di berkas)</em>') + '</div>' +
          '<div><span class="kecil samar">Jawabanmu:</span> ' + jawabanKeHTML(soal, x.jawaban[n]) + '</div>' +
          (bolehBahas(x) && bacaPembahasan(soal)
            ? '<div class="pembahasan"><div class="kepala-bahas">Pembahasan</div>' +
              bacaPembahasan(soal) + '</div>'
            : '') +
          '</article>';
      }).join('');
    });
  }

  mulai();
})();
