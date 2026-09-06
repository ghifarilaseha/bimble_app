/* cek-paham.js - soal cek pemahaman di dalam halaman materi.
 *
 * Bentuk soalnya sengaja sama dengan bank soal latihan, tetapi hasilnya
 * tidak dikirim ke mana pun dan tidak ikut nilai apa pun. Ini alat belajar,
 * bukan ujian, jadi kuncinya cukup ditulis apa adanya di dalam halaman;
 * tidak perlu digembok seperti berkas di data/soal/.
 *
 * Yang membedakannya dari mesin latihan cuma satu, tetapi itu yang paling
 * penting: jawaban keliru tidak dibalas "Salah", melainkan dibalas menurut
 * kekeliruan yang memang sedang diperkirakan. Karena itu isi utama tiap
 * soal di sini bukan kuncinya, melainkan senarai "salahUmum".
 *
 * Pemakaian:
 *   CekPaham.buat(wadah, { soal: [
 *     { level: 1, tipe: 'isian', pertanyaan: '...', jawaban: ['2'],
 *       salahUmum: [{ jawaban: ['-10'], umpan: '...' }], bahas: '...' },
 *     { level: 2, tipe: 'pg', pertanyaan: '...', opsi: { a: '...', b: '...' },
 *       kunci: 'b', umpan: { a: '...' }, bahas: '...' }
 *   ]});
 */
(function (akar) {
  'use strict';

  var TINGKAT = { 1: 'Mudah', 2: 'Sedang', 3: 'Sulit' };

  /* Normalisasi jawaban memakai fungsi yang sama dengan mesin penilaian,
     supaya "12,5" dan "12.5" diperlakukan sama di halaman materi persis
     seperti di halaman latihan. Kalau nilai.js kebetulan tidak dimuat,
     halaman tetap berjalan dengan perbandingan yang lebih sederhana. */
  function kanonik(x) {
    if (akar.Nilai && akar.Nilai.kanonik) return akar.Nilai.kanonik(x);
    return String(x == null ? '' : x).toLowerCase().replace(/\s+/g, '');
  }

  function isiRumus(el, teks) {
    if (akar.Rumus) akar.Rumus.isi(el, teks);
    else el.textContent = String(teks == null ? '' : teks);
    return el;
  }

  function buatEl(tag, kelas) {
    var e = document.createElement(tag);
    if (kelas) e.className = kelas;
    return e;
  }

  function cocok(jawaban, daftar) {
    var j = kanonik(jawaban);
    if (!j) return false;
    return (daftar || []).some(function (k) { return kanonik(k) === j; });
  }

  function buat(wadah, atur) {
    atur = atur || {};
    var daftar = (atur.soal || []).filter(Boolean);

    wadah.innerHTML = '';
    daftar.forEach(function (s, i) { wadah.appendChild(kartu(s, i, atur)); });

    return { jumlah: daftar.length };
  }

  function kartu(s, i, atur) {
    var kotak = buatEl('article', 'kartu soal');

    var nomor = buatEl('div', 'nomor');
    nomor.textContent = 'Soal ' + (i + 1);
    if (TINGKAT[s.level]) {
      var cap = buatEl('span', 'level');
      cap.textContent = TINGKAT[s.level];
      nomor.appendChild(cap);
    }
    kotak.appendChild(nomor);

    var tanya = buatEl('div', 'pertanyaan');
    isiRumus(tanya, s.pertanyaan);
    kotak.appendChild(tanya);

    var jawab = buatEl('div', 'jawab');
    kotak.appendChild(jawab);

    var balasan = buatEl('div');
    balasan.style.marginTop = '.6rem';
    kotak.appendChild(balasan);

    var bahas = buatEl('div', 'pembahasan');
    bahas.hidden = true;
    kotak.appendChild(bahas);

    var ambilJawaban = (s.tipe === 'pg')
      ? isiPg(jawab, s, periksa)
      : isiIsian(jawab, s, periksa);

    var deret = buatEl('div', 'deret');
    deret.style.marginTop = '.7rem';
    jawab.appendChild(deret);

    var tombolPeriksa = buatEl('button', 'tombol mungil utama');
    tombolPeriksa.type = 'button';
    tombolPeriksa.textContent = 'Periksa';
    tombolPeriksa.addEventListener('click', periksa);
    deret.appendChild(tombolPeriksa);

    /* Tombol pembahasan sengaja baru muncul setelah dua kali salah.
       Kalau tersedia sejak awal, sebagian siswa membukanya lebih dulu dan
       kehilangan bagian yang justru mengajari, yaitu mencoba. */
    var tombolBahas = buatEl('button', 'tombol mungil');
    tombolBahas.type = 'button';
    tombolBahas.textContent = 'Lihat pembahasan';
    tombolBahas.hidden = true;
    tombolBahas.addEventListener('click', function () { bukaBahas(); });
    deret.appendChild(tombolBahas);

    var percobaan = 0, sudahBenar = false;

    function pesan(jenis, teks) {
      balasan.innerHTML = '';
      var p = buatEl('div', 'pesan ' + jenis);
      isiRumus(p, teks);
      balasan.appendChild(p);
    }

    function bukaBahas() {
      if (!s.bahas) return;
      bahas.hidden = false;
      bahas.innerHTML = '';
      var kepala = buatEl('div', 'kepala-bahas');
      kepala.textContent = 'Pembahasan';
      bahas.appendChild(kepala);
      var isi = buatEl('div');
      isiRumus(isi, s.bahas);
      bahas.appendChild(isi);
      tombolBahas.hidden = true;
    }

    function periksa() {
      if (sudahBenar) return;
      var jw = ambilJawaban();
      if (jw === null || jw === '') {
        return pesan('info', 'Isi dulu jawabanmu, lalu tekan Periksa.');
      }

      percobaan++;

      if (benar(s, jw)) {
        sudahBenar = true;
        kotak.classList.add('benar');
        pesan('sip', s.pujian || 'Benar.');
        bukaBahas();
        tombolPeriksa.disabled = true;
        if (atur.onBenar) atur.onBenar(s, percobaan);
        return;
      }

      /* Inilah alasan modul ini ada: balasan yang menyebut kekeliruannya,
         bukan sekadar menyatakan jawabannya salah. */
      var khusus = umpanKhusus(s, jw);
      pesan('awas', khusus || 'Belum tepat. Coba periksa lagi langkahmu.');
      if (percobaan >= 2 && s.bahas) tombolBahas.hidden = false;
      if (atur.onSalah) atur.onSalah(s, jw, percobaan);
    }

    return kotak;
  }

  function benar(s, jw) {
    if (s.tipe === 'pg') return jw === s.kunci;
    return cocok(jw, s.jawaban);
  }

  function umpanKhusus(s, jw) {
    if (s.tipe === 'pg') return (s.umpan || {})[jw] || '';
    var ketemu = (s.salahUmum || []).filter(function (u) {
      return cocok(jw, u.jawaban);
    })[0];
    return ketemu ? ketemu.umpan : '';
  }

  function isiIsian(wadah, s, periksa) {
    var kotak = buatEl('input');
    kotak.type = 'text';
    kotak.autocomplete = 'off';
    kotak.spellcheck = false;
    kotak.placeholder = s.petunjuk || 'Tulis jawabanmu';
    kotak.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); periksa(); }
    });
    wadah.appendChild(kotak);
    return function () { return kotak.value; };
  }

  function isiPg(wadah, s, periksa) {
    var terpilih = null;
    var kotak = buatEl('div', 'opsi');
    var huruf = Object.keys(s.opsi || {});
    huruf.forEach(function (h, urut) {
      var label = buatEl('label');
      var radio = buatEl('input');
      radio.type = 'radio';
      radio.name = 'cek-' + (s.id || Math.random().toString(36).slice(2, 8));
      radio.value = h;
      radio.addEventListener('change', function () {
        terpilih = h;
        Array.prototype.forEach.call(kotak.children, function (l) {
          l.classList.remove('terpilih');
        });
        label.classList.add('terpilih');
      });
      var tanda = buatEl('span', 'huruf');
      tanda.textContent = 'abcdefgh'.charAt(urut) + '.';
      var isi = buatEl('span');
      isiRumus(isi, s.opsi[h]);
      label.appendChild(radio);
      label.appendChild(tanda);
      label.appendChild(isi);
      kotak.appendChild(label);
    });
    wadah.appendChild(kotak);
    return function () { return terpilih; };
  }

  akar.CekPaham = { buat: buat };
})(window);
