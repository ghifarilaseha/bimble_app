/* kartu-suku.js - kartu bentuk aljabar yang bisa ditaruh, dibalik, dan
 * dicoba digabungkan.
 *
 * Kotak berisi bola adalah x, tabung berisi bola adalah y, dan bola satuan
 * adalah konstanta. Isi kotak tidak diperlihatkan karena memang belum
 * diketahui -- itulah seluruh gagasan variabel.
 *
 * Yang diajarkan komponen ini satu: kotak hanya bisa ditumpuk dengan kotak.
 * Mencoba menumpuk kotak di atas tabung ditolak, dengan alasan yang
 * disebutkan, sebab isinya belum tentu sama. Di situlah "suku sejenis"
 * berhenti menjadi istilah hafalan, dan di situ pula terlihat kenapa
 * 2x + 3y tidak bisa disederhanakan menjadi 5xy.
 *
 * Kartu dipakai lagi oleh timbangan.js (PLSV) dan nanti SPLDV kelas 8,
 * jadi komponen ini tidak tahu apa-apa tentang persamaan: ia hanya
 * mengurus sekumpulan kartu pada satu area dan melaporkan bentuk
 * aljabarnya lewat onUbah.
 *
 * Pemakaian:
 *   var k = KartuSuku.buat(wadah, { awal: { x: 2, y: 1, n: 4 } });
 *   k.teks();                  // '2x + y + 4'
 *   k.evaluasi({ x: 10, y: 3 });
 */
(function (akar) {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  var JENIS_BAKU = [
    { kunci: 'x', nama: 'kotak', lambang: 'x', warna: 'var(--aksen)' },
    { kunci: 'y', nama: 'tabung', lambang: 'y', warna: 'var(--benar)' },
    { kunci: 'n', nama: 'bola', lambang: '', warna: 'var(--tinta-lembut)' }
  ];

  function svg(nama, sifat) {
    var e = document.createElementNS(NS, nama);
    for (var k in sifat) if (Object.prototype.hasOwnProperty.call(sifat, k)) {
      e.setAttribute(k, sifat[k]);
    }
    return e;
  }

  function buat(wadah, atur) {
    atur = atur || {};
    var jenis = atur.jenis || JENIS_BAKU;
    var maks = atur.maks || 15;
    var interaktif = atur.interaktif !== false;
    var pakaiBaki = atur.baki !== false;
    var disorot = atur.sorot || null;

    var kartu = [];
    var berikutId = 1;

    (function pasangAwal() {
      var awal = atur.awal || {};
      jenis.forEach(function (j) {
        var n = awal[j.kunci] || 0;
        for (var i = 0; i < Math.abs(n); i++) {
          kartu.push({ id: berikutId++, jenis: j.kunci, tanda: n < 0 ? -1 : 1 });
        }
      });
    })();

    function cariJenis(kunci) {
      return jenis.filter(function (j) { return j.kunci === kunci; })[0] || jenis[0];
    }

    /* ---------- keadaan sebagai bentuk aljabar ---------- */

    function koefisien() {
      var hasil = {};
      jenis.forEach(function (j) { hasil[j.kunci] = 0; });
      kartu.forEach(function (k) { hasil[k.jenis] += k.tanda; });
      return hasil;
    }

    /* Satu-satunya tempat bentuk aljabarnya dirakit. Aturan penulisannya
       mengikuti kebiasaan buku: koefisien 1 tidak ditulis, koefisien -1
       ditulis sebagai tanda minus saja, dan suku bernilai nol dibuang. */
    function rakit(pakaiKali) {
      var k = koefisien();
      var bagian = [];

      jenis.forEach(function (j) {
        var n = k[j.kunci];
        if (n === 0) return;
        var besar = Math.abs(n);
        var isi;
        if (!j.lambang) isi = String(besar);
        else if (besar === 1) isi = j.lambang;
        else isi = besar + (pakaiKali ? ' \\cdot ' : '') + j.lambang;
        bagian.push({ tanda: n < 0 ? -1 : 1, isi: isi });
      });

      if (!bagian.length) return '0';

      return bagian.map(function (b, i) {
        if (i === 0) return (b.tanda < 0 ? '-' : '') + b.isi;
        return (b.tanda < 0 ? ' - ' : ' + ') + b.isi;
      }).join('');
    }

    function evaluasi(nilai) {
      nilai = nilai || {};
      var k = koefisien();
      var jumlah = 0;
      jenis.forEach(function (j) {
        var satuan = j.lambang ? (nilai[j.kunci] === undefined ? 0 : nilai[j.kunci]) : 1;
        jumlah += k[j.kunci] * satuan;
      });
      return jumlah;
    }

    /* ---------- perubahan keadaan, semuanya lewat sini ---------- */

    var pesanTerakhir = '';

    function tambah(kunci, tanda) {
      if (kartu.length >= maks) {
        return tolak('Areanya sudah penuh. Kosongkan dulu sebagian kartunya.');
      }
      kartu.push({ id: berikutId++, jenis: kunci, tanda: tanda === -1 ? -1 : 1 });
      pesanTerakhir = '';
      gambar();
      return true;
    }

    function buang(id) {
      kartu = kartu.filter(function (k) { return k.id !== id; });
      pesanTerakhir = '';
      gambar();
      return true;
    }

    function balik(id) {
      kartu.forEach(function (k) { if (k.id === id) k.tanda = -k.tanda; });
      pesanTerakhir = '';
      gambar();
      return true;
    }

    /* Inti pelajarannya. Menggabungkan hanya boleh untuk jenis yang sama;
       kalau berbeda, penolakannya disertai alasan, bukan sekadar gagal. */
    function gabung(id, kunciTujuan) {
      var sumber = kartu.filter(function (k) { return k.id === id; })[0];
      if (!sumber) return false;
      var a = cariJenis(sumber.jenis), b = cariJenis(kunciTujuan);

      if (sumber.jenis === kunciTujuan) {
        pesanTerakhir = 'Bisa. ' + sebutJenis(a) + ' memang sejenis dengan ' +
          sebutJenis(a) + ', jadi boleh ditumpuk dan koefisiennya dijumlahkan.';
        gambar();
        if (atur.onGabung) atur.onGabung(true, a, b);
        return true;
      }

      pesanTerakhir = 'Tidak bisa. ' + sebutJenis(a) + ' tidak sejenis dengan ' +
        sebutJenis(b) + ' karena isinya belum tentu sama, jadi keduanya tidak ' +
        'boleh dijumlahkan menjadi satu suku.';
      gambar();
      if (atur.onGabung) atur.onGabung(false, a, b);
      return false;
    }

    function sebutJenis(j) {
      return j.lambang ? j.nama + ' (' + j.lambang + ')' : j.nama + ' (satuan)';
    }

    function kosongkan() {
      kartu = [];
      pesanTerakhir = '';
      gambar();
    }

    /* ---------- gambar kartu ---------- */

    function gambarKartu(j, tanda) {
      var el = svg('svg', {
        width: 46, height: 52, viewBox: '0 0 46 52',
        role: 'img', 'aria-label': sebutJenis(j) + (tanda < 0 ? ' negatif' : '')
      });
      var warna = j.warna;
      var isiLatar = tanda < 0 ? 'var(--kartu)' : warna;
      var opasitas = tanda < 0 ? 1 : 0.16;

      if (j.kunci === 'n' || !j.lambang) {
        el.appendChild(svg('circle', {
          cx: 23, cy: 26, r: 13,
          fill: tanda < 0 ? 'var(--kartu)' : warna, 'fill-opacity': tanda < 0 ? 1 : 0.85,
          stroke: warna, 'stroke-width': 2
        }));
      } else if (j.nama === 'tabung') {
        el.appendChild(svg('path', {
          d: 'M 10 14 a 13 5 0 0 1 26 0 v 24 a 13 5 0 0 1 -26 0 z',
          fill: isiLatar, 'fill-opacity': opasitas, stroke: warna, 'stroke-width': 2
        }));
        el.appendChild(svg('ellipse', {
          cx: 23, cy: 14, rx: 13, ry: 5,
          fill: 'var(--kartu)', stroke: warna, 'stroke-width': 2
        }));
        [22, 30].forEach(function (cy) {
          el.appendChild(svg('circle', { cx: 23, cy: cy, r: 3.4, fill: warna }));
        });
      } else {
        el.appendChild(svg('rect', {
          x: 8, y: 10, width: 30, height: 32, rx: 4,
          fill: isiLatar, 'fill-opacity': opasitas, stroke: warna, 'stroke-width': 2
        }));
        [[16, 20], [30, 20], [16, 33], [30, 33]].forEach(function (p) {
          el.appendChild(svg('circle', { cx: p[0], cy: p[1], r: 3.4, fill: warna }));
        });
      }

      if (j.lambang) {
        var t = svg('text', {
          x: 23, y: 50, 'font-size': 11, 'text-anchor': 'middle',
          fill: warna, 'font-weight': 650, 'font-family': 'system-ui, sans-serif'
        });
        t.textContent = (tanda < 0 ? '-' : '') + j.lambang;
        el.appendChild(t);
      } else if (tanda < 0) {
        var m = svg('text', {
          x: 23, y: 31, 'font-size': 18, 'text-anchor': 'middle',
          fill: warna, 'font-weight': 650, 'font-family': 'system-ui, sans-serif'
        });
        m.textContent = '−';
        el.appendChild(m);
      }
      return el;
    }

    /* ---------- rangka halaman ---------- */

    wadah.innerHTML = '';
    var bungkus = document.createElement('div');
    bungkus.className = 'kartu-suku';
    wadah.appendChild(bungkus);

    var bakiEl = null;
    if (pakaiBaki && interaktif) {
      bakiEl = document.createElement('div');
      bakiEl.className = 'ks-baki';
      bungkus.appendChild(bakiEl);
    }

    var areaEl = document.createElement('div');
    areaEl.className = 'ks-area';
    bungkus.appendChild(areaEl);

    var pesanEl = document.createElement('div');
    pesanEl.className = 'ks-pesan';
    bungkus.appendChild(pesanEl);

    function gambarBaki() {
      if (!bakiEl) return;
      bakiEl.innerHTML = '';
      var ket = document.createElement('span');
      ket.className = 'kecil samar';
      ket.textContent = 'Ambil kartu:';
      bakiEl.appendChild(ket);

      jenis.forEach(function (j) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'ks-sumber';
        b.title = 'Tambah ' + sebutJenis(j);
        b.appendChild(gambarKartu(j, 1));
        b.addEventListener('click', function () { tambah(j.kunci, 1); });
        pasangSeretSumber(b, j);
        bakiEl.appendChild(b);
      });
    }

    function gambarArea() {
      areaEl.innerHTML = '';
      var adaIsi = false;

      jenis.forEach(function (j) {
        var milik = kartu.filter(function (k) { return k.jenis === j.kunci; });
        if (!milik.length) return;
        adaIsi = true;

        var tumpuk = document.createElement('div');
        tumpuk.className = 'ks-tumpuk' + (disorot === j.kunci ? ' disorot' : '');
        tumpuk.dataset.jenis = j.kunci;

        milik.forEach(function (k) {
          var el = document.createElement('button');
          el.type = 'button';
          el.className = 'ks-kartu';
          el.dataset.id = String(k.id);
          el.dataset.jenis = k.jenis;
          el.title = 'Ketuk untuk membalik tandanya';
          el.appendChild(gambarKartu(j, k.tanda));
          el.addEventListener('click', function () { balik(k.id); });
          pasangSeretKartu(el, k);
          tumpuk.appendChild(el);
        });

        var nama = document.createElement('div');
        nama.className = 'kecil samar ks-nama';
        nama.textContent = sebutJenis(j);
        tumpuk.appendChild(nama);

        areaEl.appendChild(tumpuk);
      });

      if (!adaIsi) {
        var kosong = document.createElement('p');
        kosong.className = 'kecil samar';
        kosong.style.margin = '.5rem';
        kosong.textContent = pakaiBaki
          ? 'Areanya masih kosong. Ambil kartu dari baki di atas.'
          : 'Belum ada kartu.';
        areaEl.appendChild(kosong);
      }
    }

    function gambar() {
      gambarBaki();
      gambarArea();
      pesanEl.innerHTML = pesanTerakhir
        ? '<div class="pesan ' + (/^Tidak bisa/.test(pesanTerakhir) ? 'awas' : 'sip') + '">' +
          lolos(pesanTerakhir) + '</div>'
        : '';
      if (atur.onUbah) {
        atur.onUbah({
          suku: koefisien(), teks: rakit(false), rumus: rakit(false),
          banyak: kartu.length
        });
      }
    }

    function lolos(t) {
      return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function tolak(pesan) {
      pesanTerakhir = 'Tidak bisa. ' + pesan;
      gambar();
      return false;
    }

    /* ---------- seret ---------- */

    /* Seret dipasang dengan pointer event, bukan drag-and-drop HTML, sebab
       drag-and-drop tidak berjalan di layar sentuh -- dan siswa membuka ini
       dari HP. Ketukan tetap dibedakan dari seretan lewat ambang jarak,
       sehingga satu kartu bisa diketuk untuk membalik tanda sekaligus
       diseret untuk digabungkan. */
    var AMBANG = 7;

    function pasangSeretSumber(el, j) {
      if (!interaktif) return;
      pasangSeret(el, function (tujuan) {
        if (tujuan && tujuan.area) tambah(j.kunci, 1);
      });
    }

    function pasangSeretKartu(el, k) {
      if (!interaktif) return;
      pasangSeret(el, function (tujuan) {
        if (!tujuan) return;
        if (tujuan.baki) return buang(k.id);
        if (tujuan.jenis && tujuan.jenis !== k.jenis) return gabung(k.id, tujuan.jenis);
        if (tujuan.jenis === k.jenis) return gabung(k.id, tujuan.jenis);
      });
    }

    function pasangSeret(el, selesai) {
      el.addEventListener('pointerdown', function (ev) {
        if (ev.button !== undefined && ev.button !== 0) return;
        var mulaiX = ev.clientX, mulaiY = ev.clientY;
        var menyeret = false, bayangan = null;

        function gerak(e) {
          var jauh = Math.abs(e.clientX - mulaiX) + Math.abs(e.clientY - mulaiY);
          if (!menyeret && jauh < AMBANG) return;
          if (!menyeret) {
            menyeret = true;
            bayangan = el.cloneNode(true);
            bayangan.className = 'ks-bayangan';
            document.body.appendChild(bayangan);
          }
          e.preventDefault();
          bayangan.style.left = e.clientX + 'px';
          bayangan.style.top = e.clientY + 'px';
        }

        function lepas(e) {
          document.removeEventListener('pointermove', gerak);
          document.removeEventListener('pointerup', lepas);
          document.removeEventListener('pointercancel', lepas);
          if (bayangan && bayangan.parentNode) bayangan.parentNode.removeChild(bayangan);
          if (!menyeret) return;              /* ketukan biasa, biar click yang urus */
          e.preventDefault();
          selesai(tujuanDi(e.clientX, e.clientY));
        }

        document.addEventListener('pointermove', gerak);
        document.addEventListener('pointerup', lepas);
        document.addEventListener('pointercancel', lepas);
      });
    }

    function tujuanDi(x, y) {
      if (typeof document.elementFromPoint !== 'function') return null;
      var bawah = document.elementFromPoint(x, y);
      var hasil = null;
      while (bawah && bawah !== document.body) {
        if (bawah.classList && bawah.classList.contains('ks-tumpuk')) {
          return { jenis: bawah.dataset.jenis, area: true };
        }
        if (bawah.classList && bawah.classList.contains('ks-baki')) return { baki: true };
        if (bawah.classList && bawah.classList.contains('ks-area')) hasil = { area: true };
        bawah = bawah.parentNode;
      }
      return hasil;
    }

    gambar();

    return {
      nilai: function () { return { suku: koefisien(), teks: rakit(false) }; },
      teks: function () { return rakit(false); },
      rumus: function () { return rakit(false); },
      koefisien: koefisien,
      evaluasi: evaluasi,
      tambah: tambah,
      buang: buang,
      balik: balik,
      gabung: gabung,
      kosongkan: kosongkan,
      set: function (suku) {
        kartu = [];
        jenis.forEach(function (j) {
          var n = (suku || {})[j.kunci] || 0;
          for (var i = 0; i < Math.abs(n); i++) {
            kartu.push({ id: berikutId++, jenis: j.kunci, tanda: n < 0 ? -1 : 1 });
          }
        });
        gambar();
      },
      sorot: function (kunci) { disorot = kunci; gambar(); },
      pesan: function () { return pesanTerakhir; },
      daftarKartu: function () {
        return kartu.map(function (k) { return { id: k.id, jenis: k.jenis, tanda: k.tanda }; });
      }
    };
  }

  akar.KartuSuku = { buat: buat, JENIS_BAKU: JENIS_BAKU };
})(window);
