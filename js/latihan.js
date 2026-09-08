/* latihan.js - alur halaman latihan: mengaku nama, mengerjakan, mengumpulkan.
 *
 * Seluruh pengaturan sesi ada di dalam URL. Tidak ada sesi yang disimpan
 * di server, sehingga guru cukup membagikan tautan dan tidak ada apa pun
 * yang perlu dibereskan setelah pelajaran usai.
 */
(function () {
  'use strict';

  var MODE = ['mandiri', 'kelas', 'pr'];

  var P = new URLSearchParams(location.search);
  var sesi = {
    tingkat: P.get('kelas') || '',
    bab: P.get('bab') || '',
    mode: P.get('mode') || 'mandiri',
    kode: P.get('kode') || '',
    durasi: parseInt(P.get('durasi'), 10) || 0,
    tenggat: P.get('tenggat') || '',
    jumlah: parseInt(P.get('jumlah'), 10) || 0,
    acak: P.get('acak') === '1',
    level: (P.get('level') || '').split(',').map(function (n) { return parseInt(n, 10); })
             .filter(function (n) { return n === 1 || n === 2 || n === 3; }),
    bobotRata: P.get('bobot') === 'rata',
    bahas: P.get('bahas') === '1'
  };
  sesi.kodeSesi = sesi.kode || (sesi.mode + '-' + sesi.tingkat + '-' + sesi.bab);

  var el = {};
  ['layarPesan', 'layarIdentitas', 'layarSoal', 'layarHasil', 'kartuKonfirmasi',
   'kartuIsiNama', 'namaTersimpan', 'kelasTersimpan', 'tombolYaSaya', 'tombolBukanSaya',
   'pilihKelas', 'isiNama', 'saranNama', 'catatanNama', 'tombolMulai', 'judulBab',
   'labelSiswa', 'jam', 'daftarSoal', 'pemberitahuanSesi', 'bilah', 'palangKemajuan',
   'labelKemajuan', 'tombolKumpulkan', 'hasilNilai', 'hasilRincian', 'hasilJudul',
   'hasilStatusKirim', 'hasilDarurat', 'kodeHasil', 'tombolTinjau', 'tombolUlangi', 'salamJudul']
    .forEach(function (id) { el[id] = document.getElementById(id); });

  var daftarKelas = null, petaBab = null, babIni = null;
  var bank = null, daftar = [], jawaban = {}, bidang = {};
  var identitas = null, mulaiPada = 0, pewaktu = null, sudahKumpul = false;
  var hasilTerakhir = null;

  /* ---------- alat bantu ---------- */

  function tampil(bagian) {
    ['layarIdentitas', 'layarSoal', 'layarHasil'].forEach(function (n) {
      el[n].hidden = (n !== bagian);
    });
  }

  function pesan(jenis, isiHtml) {
    el.layarPesan.hidden = false;
    el.layarPesan.innerHTML = '<div class="pesan ' + jenis + '">' + isiHtml + '</div>';
  }

  function bersihkanPesan() {
    el.layarPesan.hidden = true;
    el.layarPesan.innerHTML = '';
  }

  function ambilJson(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('Gagal memuat ' + url + ' (' + r.status + ')');
      return r.json();
    });
  }

  function kunciSimpan(awalan) {
    return 'bimble.' + awalan + '.' + sesi.kodeSesi + '.' +
      (identitas ? Identitas.kunciNama(identitas.nama) : 'tanpa-nama');
  }

  function bacaSimpan(kunci) {
    try {
      var m = localStorage.getItem(kunci);
      return m ? JSON.parse(m) : null;
    } catch (e) { return null; }
  }

  function tulisSimpan(kunci, nilai) {
    try { localStorage.setItem(kunci, JSON.stringify(nilai)); } catch (e) { /* abaikan */ }
  }

  function sekaliKerjakan() { return sesi.mode === 'kelas' || sesi.mode === 'pr'; }

  function tenggatLewat() {
    if (!sesi.tenggat) return false;
    var t = Date.parse(sesi.tenggat);
    return isFinite(t) && Date.now() > t;
  }

  /* Pembahasan ditahan supaya bisa dibahas bersama di kelas, dan supaya
     jawaban PR tidak beredar sebelum tenggat. */
  function bolehBahas() {
    if (sesi.bahas) return true;
    if (sesi.mode === 'mandiri') return true;
    if (sesi.mode === 'pr') return tenggatLewat();
    return false;
  }

  function tulisWaktu(detik) {
    var m = Math.floor(detik / 60), d = detik % 60;
    return m + ':' + (d < 10 ? '0' : '') + d;
  }

  /* ---------- memulai halaman ---------- */

  function mulai() {
    if (!sesi.tingkat || !sesi.bab) {
      return pesan('gagal', 'Tautan ini belum lengkap. Mintalah tautan latihan yang baru kepada gurumu.');
    }
    /* Mode yang salah ketik dulu diterima diam-diam, dan hasilnya adalah
       gabungan paling merugikan: boleh diulang tanpa batas sekaligus tidak
       pernah memunculkan pembahasan. Lebih baik berhenti dengan terang. */
    if (MODE.indexOf(sesi.mode) < 0) {
      return pesan('gagal', 'Mode "' + Rumus.lolos(sesi.mode) + '" tidak dikenal. ' +
        'Mintalah tautan latihan yang baru kepada gurumu.');
    }
    Kirim.pasangPemantau();
    Kirim.prosesAntrean().then(function (h) {
      if (h.terkirim) console.log('Antrean lama terkirim: ' + h.terkirim);
    });

    Promise.all([ambilJson('data/daftar-bab.json'), ambilJson('data/kelas.json')])
      .then(function (h) {
        petaBab = h[0];
        daftarKelas = h[1];
        var tingkat = (petaBab.kelas || []).filter(function (k) {
          return String(k.tingkat) === String(sesi.tingkat);
        })[0];
        babIni = tingkat && (tingkat.bab || []).filter(function (b) { return b.kode === sesi.bab; })[0];
        if (!babIni) throw new Error('Bab "' + sesi.bab + '" tidak terdaftar untuk kelas ' + sesi.tingkat + '.');
        el.judulBab.textContent = babIni.judul;
        document.title = babIni.judul + ' - Latihan';
        siapkanIdentitas();
      })
      .catch(function (e) {
        pesan('gagal', 'Halaman tidak bisa dimulai. ' + Rumus.lolos(e.message));
      });
  }

  /* ---------- layar identitas ---------- */

  function kelasSetingkat() {
    return (daftarKelas.kelas || []).filter(function (k) {
      return String(k.tingkat) === String(sesi.tingkat);
    });
  }

  function siswaKelas(kode) {
    var k = (daftarKelas.kelas || []).filter(function (x) { return x.kode === kode; })[0];
    return k ? k.siswa : [];
  }

  function siapkanIdentitas() {
    tampil('layarIdentitas');

    var pilihan = kelasSetingkat();
    if (!pilihan.length) {
      return pesan('gagal', 'Belum ada kelas tingkat ' + Rumus.lolos(sesi.tingkat) + ' di data/kelas.json.');
    }
    el.pilihKelas.innerHTML = pilihan.map(function (k) {
      return '<option value="' + k.kode + '">' + k.kode + '</option>';
    }).join('');

    var tersimpan = Identitas.baca();
    var kodeKelasSah = pilihan.some(function (k) { return k.kode === (tersimpan && tersimpan.kelas); });
    if (tersimpan && kodeKelasSah) {
      el.kartuKonfirmasi.hidden = false;
      el.kartuIsiNama.hidden = true;
      el.namaTersimpan.textContent = tersimpan.nama;
      el.kelasTersimpan.textContent = tersimpan.kelas;
      el.pilihKelas.value = tersimpan.kelas;
      el.isiNama.value = tersimpan.nama;
    }

    el.tombolYaSaya.addEventListener('click', function () {
      terimaIdentitas(tersimpan.nama, tersimpan.kelas);
    });
    el.tombolBukanSaya.addEventListener('click', function () {
      Identitas.lupakan();
      el.kartuKonfirmasi.hidden = true;
      el.kartuIsiNama.hidden = false;
      el.isiNama.value = '';
      el.isiNama.focus();
    });
    el.tombolMulai.addEventListener('click', function () {
      var nama = Identitas.rapikanNama(el.isiNama.value);
      if (nama.length < 2) {
        el.catatanNama.textContent = 'Tulis namamu dulu ya.';
        return el.isiNama.focus();
      }
      terimaIdentitas(nama, el.pilihKelas.value);
    });
    el.isiNama.addEventListener('input', perbaruiSaran);
    el.isiNama.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); el.tombolMulai.click(); }
    });
    el.pilihKelas.addEventListener('change', perbaruiSaran);
  }

  function perbaruiSaran() {
    var daftarSiswa = siswaKelas(el.pilihKelas.value);
    var cocok = Identitas.saran(daftarSiswa, el.isiNama.value);
    var nama = Identitas.rapikanNama(el.isiNama.value);

    el.saranNama.innerHTML = '';
    el.saranNama.hidden = !cocok.length;
    cocok.forEach(function (n) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = n;
      b.addEventListener('click', function () {
        el.isiNama.value = n;
        el.saranNama.hidden = true;
        perbaruiSaran();
      });
      el.saranNama.appendChild(b);
    });

    /* Nama di luar daftar tetap diterima. Yang terjadi hanya penandaan,
       supaya guru bisa memeriksanya belakangan. */
    if (nama.length >= 2 && !Identitas.adaDiDaftar(daftarSiswa, nama)) {
      el.catatanNama.textContent = 'Namamu belum ada di daftar kelas ini. Kamu tetap boleh lanjut, ' +
        'nanti gurumu yang memeriksa.';
    } else {
      el.catatanNama.textContent = '';
    }
  }

  function terimaIdentitas(nama, kodeKelas) {
    var daftarSiswa = siswaKelas(kodeKelas);
    identitas = {
      nama: Identitas.samakanDenganDaftar(daftarSiswa, nama),
      kelas: kodeKelas,
      adaDiDaftar: Identitas.adaDiDaftar(daftarSiswa, nama)
    };
    Identitas.simpan({ nama: identitas.nama, kelas: identitas.kelas });
    el.labelSiswa.textContent = identitas.nama + ' - ' + identitas.kelas;
    bersihkanPesan();
    muatSoal();
  }

  /* ---------- memuat dan menyajikan soal ---------- */

  function muatSoal() {
    var sudah = sekaliKerjakan() ? bacaSimpan(kunciSimpan('selesai')) : null;
    Soal.muat(babIni.soal).then(function (b) {
      bank = b;
      daftar = Soal.siapkan(bank, {
        level: sesi.level,
        jumlah: sesi.jumlah,
        acak: sesi.acak || sesi.mode === 'mandiri',
        acakOpsi: true,
        /* Benih terikat pada sesi dan nama, sehingga membuka ulang tautan
           yang sama memberi soal yang sama persis. Untuk mode mandiri
           benih ikut berubah tiap percobaan supaya soalnya berganti. */
        benih: sesi.kodeSesi + '|' + identitas.nama +
               (sesi.mode === 'mandiri' ? '|' + percobaanKe() : '')
      });
      if (!daftar.length) throw new Error('Tidak ada soal yang cocok dengan pengaturan tautan ini.');

      if (sudah) return tampilkanSudahPernah(sudah);

      var draf = bacaSimpan(kunciSimpan('jawab'));
      if (draf && draf.jawaban) {
        jawaban = draf.jawaban;
        mulaiPada = draf.mulaiPada || Date.now();
      } else {
        jawaban = {};
        mulaiPada = Date.now();
      }

      /* Pewaktu terikat pada saat siswa menekan Mulai, dan jamnya terus
         berjalan meski tab ditutup. Siswa yang iseng membuka tautan tugas
         semalam sebelumnya karena itu bisa kembali ke kelas dengan waktu
         yang sudah habis, lalu dikumpulkan otomatis dalam keadaan kosong
         dan ditolak mencoba lagi. Draf kosong yang kedaluwarsa dihentikan
         di sini supaya nilai nol seperti itu tidak pernah terjadi. */
      if (waktuSudahHabis() && !adaJawabanTerisi()) {
        return tampilkanWaktuHabis();
      }

      gambarSoal();
    }).catch(function (e) {
      pesan('gagal', 'Soal tidak bisa dimuat. ' + Rumus.lolos(e.message) +
        '<br><span class="kecil">Bab lain tetap bisa dikerjakan dari beranda.</span>');
    });
  }

  function percobaanKe() {
    var d = bacaSimpan(kunciSimpan('percobaan'));
    return d ? d.n : 0;
  }

  function waktuSudahHabis() {
    if (!sesi.durasi || !mulaiPada) return false;
    return Date.now() >= mulaiPada + sesi.durasi * 60000;
  }

  function adaJawabanTerisi() { return daftar.some(sudahDijawab); }

  /* Sengaja tidak mengumpulkan apa pun: tidak ada yang bisa dinilai, dan
     mengirim lembar kosong justru mengunci siswa lewat "sekali kerjakan". */
  function tampilkanWaktuHabis() {
    tampil('');
    pesan('awas', '<strong>Waktu sesi ini sudah habis.</strong>' +
      '<br>Tautan ini pernah dibuka dan pewaktunya sudah berjalan sampai selesai, ' +
      'tetapi tidak ada jawaban yang tersimpan. Tidak ada yang dikumpulkan.' +
      '<br><span class="kecil">Mintalah tautan sesi yang baru kepada gurumu.</span>');
  }

  function tampilkanSudahPernah(sudah) {
    tampil('layarHasil');
    el.hasilJudul.textContent = 'Sudah pernah dikerjakan';
    el.hasilNilai.textContent = sudah.nilai;
    el.hasilRincian.textContent = 'Dikerjakan pada ' + new Date(sudah.waktu).toLocaleString('id-ID');
    el.hasilStatusKirim.textContent = sesi.mode === 'kelas'
      ? 'Latihan kelas hanya dikerjakan sekali.'
      : 'Pekerjaan rumah hanya dikumpulkan sekali.';
    hasilTerakhir = sudah.hasil || null;
    el.tombolTinjau.hidden = !hasilTerakhir;
  }

  function gambarSoal() {
    tampil('layarSoal');
    el.bilah.hidden = false;
    el.daftarSoal.innerHTML = '';
    daftar.forEach(function (s, i) { el.daftarSoal.appendChild(kartuSoal(s, i)); });
    perbaruiKemajuan();
    mulaiPewaktu();
    tulisPemberitahuan();
  }

  function tulisPemberitahuan() {
    var catatan = [];
    if (sesi.mode === 'kelas') catatan.push('Latihan kelas. Dikerjakan sekali, pembahasan dibuka bersama nanti.');
    if (sesi.mode === 'pr') {
      catatan.push('Pekerjaan rumah' + (sesi.tenggat
        ? ', tenggat ' + new Date(sesi.tenggat).toLocaleString('id-ID') : '') + '.');
    }
    if (sesi.mode === 'mandiri') catatan.push('Latihan mandiri. Boleh diulang sesukamu.');
    if (sesi.level.length) catatan.push('Level ' + sesi.level.join(' dan ') + ' saja.');
    el.pemberitahuanSesi.innerHTML = '<div class="pesan info">' +
      Rumus.lolos(catatan.join(' ')) + '</div>';
  }

  function kartuSoal(s, i) {
    var kartu = document.createElement('article');
    kartu.className = 'kartu soal';
    kartu.id = 'soal-' + s.id;

    var nomor = document.createElement('div');
    nomor.className = 'nomor';
    nomor.innerHTML = (s.induk ? 'Lanjutan soal ' + i : 'Soal ' + (i + 1)) +
      '<span class="level">Level ' + s.level + '</span>';
    kartu.appendChild(nomor);

    var tanya = document.createElement('div');
    tanya.className = 'pertanyaan';
    Rumus.isi(tanya, s.pertanyaan);
    kartu.appendChild(tanya);

    var jawab = document.createElement('div');
    jawab.className = 'jawab';
    kartu.appendChild(jawab);

    if (s.tipe === 'pg') isiPg(jawab, s);
    else if (s.tipe === 'isian') isiIsian(jawab, s);
    else if (s.tipe === 'benar-salah') isiBenarSalah(jawab, s);
    else if (s.tipe === 'koordinat') isiKoordinat(jawab, s);

    var bahas = document.createElement('div');
    bahas.className = 'pembahasan';
    bahas.hidden = true;
    kartu.appendChild(bahas);

    return kartu;
  }

  function catatJawaban(id, nilai) {
    jawaban[id] = nilai;
    tulisSimpan(kunciSimpan('jawab'), { jawaban: jawaban, mulaiPada: mulaiPada });
    perbaruiKemajuan();
  }

  function isiPg(wadah, s) {
    var kotak = document.createElement('div');
    kotak.className = 'opsi';
    (s.urutanOpsi || Object.keys(s.opsi)).forEach(function (huruf, urut) {
      var label = document.createElement('label');
      var radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'soal-' + s.id;
      radio.value = huruf;
      radio.checked = jawaban[s.id] === huruf;
      if (radio.checked) label.classList.add('terpilih');
      radio.addEventListener('change', function () {
        Array.prototype.forEach.call(kotak.children, function (l) { l.classList.remove('terpilih'); });
        label.classList.add('terpilih');
        catatJawaban(s.id, huruf);
      });
      var tandaUrut = document.createElement('span');
      tandaUrut.className = 'huruf';
      /* Huruf yang tampil mengikuti urutan tampilan, bukan huruf aslinya,
         supaya dua siswa yang urutan opsinya berbeda tidak bingung ketika
         menyebut "jawaban B". Yang dikirim tetap huruf aslinya. */
      tandaUrut.textContent = 'abcdefgh'.charAt(urut) + '.';
      var isi = document.createElement('span');
      Rumus.isi(isi, s.opsi[huruf]);
      label.appendChild(radio);
      label.appendChild(tandaUrut);
      label.appendChild(isi);
      kotak.appendChild(label);
    });
    wadah.appendChild(kotak);
  }

  function isiIsian(wadah, s) {
    var kotak = document.createElement('input');
    kotak.type = 'text';
    kotak.autocomplete = 'off';
    kotak.spellcheck = false;
    kotak.placeholder = 'Tulis jawabanmu';
    kotak.value = jawaban[s.id] || '';
    kotak.addEventListener('input', function () { catatJawaban(s.id, kotak.value); });
    wadah.appendChild(kotak);
    var petunjuk = document.createElement('p');
    petunjuk.className = 'kecil samar';
    petunjuk.style.margin = '.35rem 0 0';
    petunjuk.textContent = 'Boleh memakai koma atau titik untuk desimal. Satuan tidak wajib ditulis.';
    wadah.appendChild(petunjuk);
  }

  function isiBenarSalah(wadah, s) {
    var kotak = document.createElement('div');
    kotak.className = 'pernyataan';
    if (!Array.isArray(jawaban[s.id])) {
      jawaban[s.id] = s.pernyataan.map(function () { return null; });
    }
    s.pernyataan.forEach(function (p, i) {
      var baris = document.createElement('div');
      baris.className = 'baris-bs';
      var teks = document.createElement('div');
      teks.className = 'teks';
      Rumus.isi(teks, p.teks);
      var pilih = document.createElement('div');
      pilih.className = 'pilih';
      [['Benar', true], ['Salah', false]].forEach(function (pasang) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = pasang[0];
        b.setAttribute('aria-pressed', jawaban[s.id][i] === pasang[1] ? 'true' : 'false');
        b.addEventListener('click', function () {
          var arr = jawaban[s.id].slice();
          arr[i] = pasang[1];
          catatJawaban(s.id, arr);
          Array.prototype.forEach.call(pilih.children, function (x) {
            x.setAttribute('aria-pressed', 'false');
          });
          b.setAttribute('aria-pressed', 'true');
        });
        pilih.appendChild(b);
      });
      baris.appendChild(teks);
      baris.appendChild(pilih);
      kotak.appendChild(baris);
    });
    wadah.appendChild(kotak);
  }

  function isiKoordinat(wadah, s) {
    /* Soal transformasi menyertakan gambar acuan: bangun asal, garis
       cermin, dan pusat rotasi atau dilatasi. Semuanya hanya tergambar,
       tidak ikut dinilai. */
    var bantu = s.bantu || {};
    bidang[s.id] = BidangKoordinat.buat(wadah, {
      grid: s.grid,
      mode: s.varian,
      nilaiAwal: jawaban[s.id] || [],
      acuan: bantu.acuan,
      cermin: bantu.cermin,
      pusat: bantu.pusat,
      labelPusat: bantu.labelPusat,
      /* Untuk beberapa-titik dan bangun sengaja tidak ada batas: banyaknya
         titik adalah bagian dari yang diuji. */
      maks: s.varian === 'titik' ? 1 : (s.varian === 'garis' ? 2 : 0),
      onUbah: function (titik) { catatJawaban(s.id, titik); }
    });
  }

  /* ---------- kemajuan dan waktu ---------- */

  function sudahDijawab(s) {
    var j = jawaban[s.id];
    if (j === undefined || j === null || j === '') return false;
    if (Array.isArray(j)) {
      return j.length > 0 && j.some(function (x) { return x !== null && x !== undefined; });
    }
    return true;
  }

  function perbaruiKemajuan() {
    var terisi = daftar.filter(sudahDijawab).length;
    el.palangKemajuan.style.width = Math.round((terisi / daftar.length) * 100) + '%';
    el.labelKemajuan.textContent = terisi + ' dari ' + daftar.length + ' soal terisi';
  }

  function mulaiPewaktu() {
    if (!sesi.durasi) return;
    el.jam.hidden = false;
    var batas = mulaiPada + sesi.durasi * 60000;
    var henti = false;
    function detak() {
      if (henti) return;
      var sisa = Math.max(0, Math.round((batas - Date.now()) / 1000));
      el.jam.textContent = tulisWaktu(sisa);
      el.jam.classList.toggle('mepet', sisa <= 60);
      if (sisa <= 0) {
        /* Panggilan pertama berjalan sebelum setInterval sempat mengisi
           pewaktu, jadi jangan mengandalkan clearInterval saja untuk
           menghentikan detak berikutnya. */
        henti = true;
        clearInterval(pewaktu);
        if (!sudahKumpul) kumpulkan(true);
      }
    }
    detak();
    if (!henti) pewaktu = setInterval(detak, 1000);
  }

  /* ---------- mengumpulkan ---------- */

  function jawabanTerbaca(s) {
    var j = jawaban[s.id];
    if (j === undefined || j === null || j === '') return '';
    if (s.tipe === 'benar-salah') {
      return j.map(function (x) { return x === true ? 'B' : (x === false ? 'S' : '-'); }).join('');
    }
    if (s.tipe === 'koordinat') {
      return j.map(function (t) { return '(' + t[0] + ',' + t[1] + ')'; }).join(' ');
    }
    return String(j);
  }

  function kumpulkan(otomatis) {
    if (sudahKumpul) return;
    var kosong = daftar.filter(function (s) { return !sudahDijawab(s); }).length;
    if (!otomatis && kosong > 0) {
      if (!confirm('Masih ada ' + kosong + ' soal yang belum diisi. Kumpulkan sekarang?')) return;
    }
    sudahKumpul = true;
    if (pewaktu) clearInterval(pewaktu);
    el.tombolKumpulkan.disabled = true;
    el.tombolKumpulkan.textContent = 'Menghitung...';

    Nilai.nilaiSemua(daftar, jawaban, { bobotRata: sesi.bobotRata }).then(function (h) {
      hasilTerakhir = h;
      var muatan = {
        waktu: new Date().toISOString(),
        kodeSesi: sesi.kodeSesi,
        mode: sesi.mode,
        kelas: identitas.kelas,
        nama: identitas.nama,
        adaDiDaftar: identitas.adaDiDaftar,
        tingkat: Number(sesi.tingkat) || sesi.tingkat,
        bab: sesi.bab,
        versiSoal: (bank.meta && bank.meta.versi) || '',
        jumlahSoal: daftar.length,
        poinTotal: h.poinTotal,
        poinRaih: h.poinRaih,
        nilai: h.nilai,
        durasiDetik: Math.round((Date.now() - mulaiPada) / 1000),
        idSoal: daftar.map(function (s) { return s.id; }),
        jawaban: daftar.map(jawabanTerbaca),
        benar: h.butir.map(function (b) { return b.benar; })
      };

      /* Ditandai selesai lebih dulu, sebelum hasil pengiriman diketahui.
         Kalau internet mati, jawabannya sudah aman di antrean dan siswa
         tidak perlu mengulang dari awal. */
      if (sekaliKerjakan()) {
        tulisSimpan(kunciSimpan('selesai'), {
          nilai: h.nilai, waktu: Date.now(), hasil: h, jawaban: jawaban
        });
      }
      tulisSimpan(kunciSimpan('percobaan'), { n: percobaanKe() + 1 });
      try { localStorage.removeItem(kunciSimpan('jawab')); } catch (e) { /* abaikan */ }

      return Kirim.kirim(muatan).then(function (status) {
        tampilkanHasil(h, status, muatan);
      });
    }).catch(function (e) {
      pesan('gagal', 'Terjadi kesalahan saat menilai: ' + Rumus.lolos(e.message));
    });
  }

  function tampilkanHasil(h, status, muatan) {
    tampil('layarHasil');
    el.bilah.hidden = true;
    el.jam.hidden = true;
    el.hasilJudul.textContent = 'Selesai. Terima kasih, ' + identitas.nama.split(' ')[0] + '.';
    el.hasilNilai.textContent = h.nilai;
    el.hasilRincian.textContent = 'Poin ' + h.poinRaih + ' dari ' + h.poinTotal + ', ' +
      h.butir.filter(function (b) { return b.benar; }).length +
      ' soal benar dari ' + h.butir.length;

    if (status.status === 'terkirim') {
      el.hasilStatusKirim.textContent = 'Hasilmu sudah sampai ke guru.';
    } else {
      el.hasilStatusKirim.textContent = '';
      el.hasilDarurat.hidden = false;
      Kirim.kodeHasil(muatan).then(function (kode) { el.kodeHasil.textContent = kode; });
    }

    el.tombolUlangi.hidden = sesi.mode !== 'mandiri';
    window.scrollTo(0, 0);
  }

  /* ---------- meninjau jawaban ---------- */

  function tinjau() {
    if (!hasilTerakhir) return;
    var simpanan = bacaSimpan(kunciSimpan('selesai'));
    if (simpanan && simpanan.jawaban) jawaban = simpanan.jawaban;

    tampil('layarSoal');
    el.bilah.hidden = true;
    el.daftarSoal.innerHTML = '';
    daftar.forEach(function (s, i) { el.daftarSoal.appendChild(kartuSoal(s, i)); });

    var perId = {};
    hasilTerakhir.butir.forEach(function (b) { perId[b.id] = b; });

    daftar.forEach(function (s) {
      var kartu = document.getElementById('soal-' + s.id);
      var butir = perId[s.id];
      if (!kartu || !butir) return;

      Array.prototype.forEach.call(kartu.querySelectorAll('input, button, select'),
        function (x) { x.disabled = true; });
      if (bidang[s.id]) bidang[s.id].kunciInput();

      var kelas = butir.benar ? 'benar' : (butir.bagian > 0 ? 'sebagian' : 'salah');
      kartu.classList.add(kelas);
      var cap = document.createElement('span');
      cap.className = 'cap ' + kelas;
      cap.style.marginLeft = '.5rem';
      cap.textContent = butir.benar ? 'Benar'
        : (butir.bagian > 0 ? 'Sebagian benar'
        : (butir.dijawab ? 'Belum tepat' : 'Tidak dijawab'));
      kartu.querySelector('.nomor').appendChild(cap);

      if (bolehBahas()) {
        if (bidang[s.id] && s.kunciTampil) {
          try {
            bidang[s.id].tampilkanKunci(JSON.parse(Kunci.dariBase64(s.kunciTampil)));
          } catch (e) { /* tanpa tumpukan kunci pun halaman tetap terbaca */ }
        }
        var bahas = kartu.querySelector('.pembahasan');
        bahas.hidden = false;
        bahas.innerHTML = '<div class="kepala-bahas">Pembahasan</div>' +
          Rumus.keHTML(Kunci.dariBase64(s.pembahasan));
      }
    });

    el.pemberitahuanSesi.innerHTML = bolehBahas() ? ''
      : '<div class="pesan awas">Pembahasan belum dibuka. ' +
        (sesi.mode === 'pr'
          ? 'Pembahasan muncul setelah tenggat lewat.'
          : 'Gurumu akan membukanya saat dibahas bersama di kelas.') + '</div>';
    window.scrollTo(0, 0);
  }

  /* ---------- pemasangan ---------- */

  el.tombolKumpulkan.addEventListener('click', function () { kumpulkan(false); });
  el.tombolTinjau.addEventListener('click', tinjau);
  el.tombolUlangi.addEventListener('click', function () { location.reload(); });

  /* Menutup tab di tengah pengerjaan mudah terjadi. Jawaban sudah tersimpan
     di localStorage, tetapi peringatan ini mencegah kejadiannya sejak awal. */
  window.addEventListener('beforeunload', function (ev) {
    if (!sudahKumpul && daftar.length && Object.keys(jawaban).length) {
      ev.preventDefault();
      ev.returnValue = '';
    }
  });

  mulai();
})();
