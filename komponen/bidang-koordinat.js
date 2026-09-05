/* bidang-koordinat.js - bidang kartesius yang bisa diketuk.
 *
 * Satu komponen dipakai tiga tempat: soal tipe koordinat, materi
 * interaktif, dan transformasi geometri kelas 9. Karena itu ia hanya
 * menerima elemen wadah dan objek pengaturan, tidak tahu apa-apa
 * tentang halaman yang memuatnya.
 *
 * Selain jawaban siswa, bidang bisa memuat gambar acuan yang tidak
 * bisa diketuk: bangun asal, garis cermin, dan pusat rotasi atau
 * dilatasi. Acuan itulah yang membuat soal transformasi bisa dikerjakan
 * di layar sebagaimana dikerjakan di lembar kerja cetak.
 *
 * Semua jawaban dikunci ke titik grid bilangan bulat. Tidak ada
 * "hampir kena": penilaian tetap diskret dan pasti.
 */
(function (akar) {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  function el(nama, sifat) {
    var e = document.createElementNS(NS, nama);
    for (var k in sifat) if (Object.prototype.hasOwnProperty.call(sifat, k)) {
      e.setAttribute(k, sifat[k]);
    }
    return e;
  }

  function samaTitik(a, b) {
    return a && b && Math.round(a[0]) === Math.round(b[0]) && Math.round(a[1]) === Math.round(b[1]);
  }

  function buat(wadah, atur) {
    atur = atur || {};
    var grid = atur.grid || { xMin: -6, xMax: 6, yMin: -6, yMax: 6 };
    var mode = atur.mode || 'titik';
    var terkunci = !!atur.terkunci;
    var titik = (atur.nilaiAwal || []).map(function (t) { return [Math.round(t[0]), Math.round(t[1])]; });
    var kunciTampil = null;

    /* Gambar acuan: bangun asal (boleh lebih dari satu, misalnya hasil
       transformasi antara), garis cermin, dan pusat transformasi. */
    var acuan = atur.acuan || [];
    var cermin = atur.cermin || null;
    var pusat = atur.pusat || null;

    /* Rentang dibatasi 13 satuan supaya tetap terbaca di layar HP.
       Batas ini juga menjaga ukuran SVG tetap wajar. */
    var lebarSatuan = Math.min(grid.xMax - grid.xMin, 13);
    var tinggiSatuan = Math.min(grid.yMax - grid.yMin, 13);
    grid = {
      xMin: grid.xMin, xMax: grid.xMin + lebarSatuan,
      yMin: grid.yMin, yMax: grid.yMin + tinggiSatuan
    };

    var L = 34, M = 24;
    var W = lebarSatuan * L + 2 * M;
    var H = tinggiSatuan * L + 2 * M;
    var langkahLabel = lebarSatuan > 10 ? 2 : 1;

    function sx(x) { return M + (x - grid.xMin) * L; }
    function sy(y) { return M + (grid.yMax - y) * L; }
    function gx(px) { return Math.round((px - M) / L + grid.xMin); }
    function gy(py) { return Math.round(grid.yMax - (py - M) / L); }

    wadah.innerHTML = '';
    var bungkus = document.createElement('div');
    bungkus.className = 'bidang-bungkus';
    wadah.appendChild(bungkus);

    var svg = el('svg', {
      'class': 'bidang',
      viewBox: '0 0 ' + W + ' ' + H,
      width: W, height: H,
      role: 'img',
      'aria-label': 'Bidang koordinat'
    });
    bungkus.appendChild(svg);

    var lapisGrid = el('g', {});
    var lapisAcuan = el('g', {});
    var lapisKunci = el('g', {});
    var lapisJawab = el('g', {});
    svg.appendChild(lapisGrid);
    svg.appendChild(lapisAcuan);
    svg.appendChild(lapisKunci);
    svg.appendChild(lapisJawab);

    /* ---------- lapisan grid, digambar sekali ---------- */

    function gambarGrid() {
      var x, y;
      for (x = grid.xMin; x <= grid.xMax; x++) {
        lapisGrid.appendChild(el('line', {
          x1: sx(x), y1: sy(grid.yMax), x2: sx(x), y2: sy(grid.yMin),
          stroke: x === 0 ? 'var(--tinta)' : 'var(--garis)',
          'stroke-width': x === 0 ? 1.6 : 1
        }));
      }
      for (y = grid.yMin; y <= grid.yMax; y++) {
        lapisGrid.appendChild(el('line', {
          x1: sx(grid.xMin), y1: sy(y), x2: sx(grid.xMax), y2: sy(y),
          stroke: y === 0 ? 'var(--tinta)' : 'var(--garis)',
          'stroke-width': y === 0 ? 1.6 : 1
        }));
      }
      for (x = grid.xMin; x <= grid.xMax; x += langkahLabel) {
        if (x === 0) continue;
        lapisGrid.appendChild(teks(sx(x), sy(0) + 14, String(x)));
      }
      for (y = grid.yMin; y <= grid.yMax; y += langkahLabel) {
        if (y === 0) continue;
        lapisGrid.appendChild(teks(sx(0) - 12, sy(y) + 4, String(y)));
      }
      lapisGrid.appendChild(teks(sx(0) - 10, sy(0) + 14, 'O'));
      lapisGrid.appendChild(teks(sx(grid.xMax) + 10, sy(0) + 4, 'x'));
      lapisGrid.appendChild(teks(sx(0) + 2, sy(grid.yMax) - 10, 'y'));
    }

    function teks(x, y, isi, warna) {
      var t = el('text', {
        x: x, y: y,
        'font-size': 11,
        'text-anchor': 'middle',
        fill: warna || 'var(--tinta-lembut)',
        'font-family': 'system-ui, sans-serif'
      });
      t.textContent = isi;
      return t;
    }
    gambarGrid();

    /* ---------- lapisan acuan, juga digambar sekali ---------- */

    /* Acuan sengaja tidak bisa diketuk dan tidak ikut dinilai. Yang
       dinilai tetap hanya titik yang ditaruh siswa, persis seperti di
       lembar kerja: bangun asal sudah tercetak, bayangannya yang digambar.
       Warnanya mengikuti kesepakatan pada kunci jawaban cetak: abu-abu
       putus-putus untuk bangun asal, jingga untuk garis cermin, dan kotak
       hitam untuk pusat transformasi. */
    function gambarAcuan() {
      if (cermin && cermin.length === 2) {
        var u = ujungGaris(cermin[0], cermin[1]);
        lapisAcuan.appendChild(el('line', {
          x1: sx(u[0][0]), y1: sy(u[0][1]), x2: sx(u[1][0]), y2: sy(u[1][1]),
          stroke: 'var(--sorot)', 'stroke-width': 1.8, 'stroke-dasharray': '7 4'
        }));
      }

      acuan.forEach(function (bentuk) {
        var daftar = (bentuk.titik || []).map(function (t) {
          return [Math.round(t[0]), Math.round(t[1])];
        });
        if (!daftar.length) return;

        if (bentuk.tutup !== false && daftar.length >= 2) {
          lapisAcuan.appendChild(el('path', {
            d: daftar.map(function (t, i) {
              return (i ? 'L' : 'M') + sx(t[0]) + ' ' + sy(t[1]);
            }).join(' ') + (daftar.length >= 3 ? ' Z' : ''),
            fill: 'none', stroke: 'var(--tinta-lembut)', 'stroke-width': 1.8,
            'stroke-dasharray': '6 4', 'stroke-linejoin': 'round'
          }));
        }

        daftar.forEach(function (t, i) {
          lapisAcuan.appendChild(el('circle', {
            cx: sx(t[0]), cy: sy(t[1]), r: 3.5, fill: 'var(--tinta-lembut)'
          }));
          var nama = (bentuk.label || [])[i];
          if (nama) {
            lapisAcuan.appendChild(teks(sx(t[0]) - 11, sy(t[1]) - 8, nama, 'var(--tinta-lembut)'));
          }
        });
      });

      if (pusat) {
        lapisAcuan.appendChild(el('rect', {
          x: sx(pusat[0]) - 4, y: sy(pusat[1]) - 4, width: 8, height: 8,
          fill: 'var(--tinta)'
        }));
        if (atur.labelPusat) {
          lapisAcuan.appendChild(teks(sx(pusat[0]) + 13, sy(pusat[1]) - 7,
            atur.labelPusat, 'var(--tinta)'));
        }
      }
    }
    gambarAcuan();

    /* ---------- menggambar jawaban ---------- */

    /* Garis diperpanjang sampai tepi grid supaya siswa melihat garis
       sungguhan, bukan sekadar ruas antara dua titik yang ia ketuk. */
    function ujungGaris(p, q) {
      var dx = q[0] - p[0], dy = q[1] - p[1];
      var kandidat = [];
      var i;
      if (dx !== 0) {
        [grid.xMin, grid.xMax].forEach(function (bx) {
          var t = (bx - p[0]) / dx;
          kandidat.push([bx, p[1] + t * dy]);
        });
      }
      if (dy !== 0) {
        [grid.yMin, grid.yMax].forEach(function (by) {
          var t = (by - p[1]) / dy;
          kandidat.push([p[0] + t * dx, by]);
        });
      }
      var sah = kandidat.filter(function (c) {
        return c[0] >= grid.xMin - 1e-9 && c[0] <= grid.xMax + 1e-9 &&
               c[1] >= grid.yMin - 1e-9 && c[1] <= grid.yMax + 1e-9;
      });
      if (sah.length < 2) return [p, q];
      var jauhA = sah[0], jauhB = sah[0], maks = -1;
      for (i = 0; i < sah.length; i++) {
        for (var j = i + 1; j < sah.length; j++) {
          var d = Math.pow(sah[i][0] - sah[j][0], 2) + Math.pow(sah[i][1] - sah[j][1], 2);
          if (d > maks) { maks = d; jauhA = sah[i]; jauhB = sah[j]; }
        }
      }
      return [jauhA, jauhB];
    }

    function gambarSet(lapis, daftar, warna, isiBulat, berlabel) {
      lapis.innerHTML = '';
      if (!daftar || !daftar.length) return;

      if (mode === 'bangun' && daftar.length >= 2) {
        var d = daftar.map(function (t, i) {
          return (i ? 'L' : 'M') + sx(t[0]) + ' ' + sy(t[1]);
        }).join(' ') + (daftar.length >= 3 ? ' Z' : '');
        lapis.appendChild(el('path', {
          d: d, fill: daftar.length >= 3 ? warna : 'none',
          'fill-opacity': .12, stroke: warna, 'stroke-width': 2.2,
          'stroke-linejoin': 'round'
        }));
      }

      if (mode === 'garis' && daftar.length >= 2) {
        var u = ujungGaris(daftar[0], daftar[1]);
        lapis.appendChild(el('line', {
          x1: sx(u[0][0]), y1: sy(u[0][1]), x2: sx(u[1][0]), y2: sy(u[1][1]),
          stroke: warna, 'stroke-width': 2.2
        }));
      }

      daftar.forEach(function (t, i) {
        lapis.appendChild(el('circle', {
          cx: sx(t[0]), cy: sy(t[1]), r: 5.5,
          fill: isiBulat ? warna : 'var(--kartu)',
          stroke: warna, 'stroke-width': 2.2
        }));
        if (berlabel) {
          lapis.appendChild(teks(sx(t[0]) + 14, sy(t[1]) - 9,
            '(' + t[0] + ', ' + t[1] + ')', warna));
        }
        if (mode === 'bangun' && !kunciTampil) {
          lapis.appendChild(teks(sx(t[0]) - 12, sy(t[1]) - 9, String(i + 1), warna));
        }
      });
    }

    function gambar() {
      gambarSet(lapisJawab, titik, terkunci ? 'var(--aksen)' : 'var(--aksen)', true, titik.length <= 4);
      lapisJawab.setAttribute('opacity', kunciTampil ? '.75' : '1');
      perbaruiInfo();
    }

    /* ---------- interaksi ---------- */

    function tambahAtauBuang(t) {
      var adaDi = -1;
      titik.forEach(function (p, i) { if (samaTitik(p, t)) adaDi = i; });

      if (mode === 'titik') {
        titik = (adaDi >= 0) ? [] : [t];
      } else if (mode === 'garis') {
        if (adaDi >= 0) titik.splice(adaDi, 1);
        else if (titik.length >= 2) titik = [titik[1], t];
        else titik.push(t);
      } else {
        if (adaDi >= 0) titik.splice(adaDi, 1);
        else if (!atur.maks || titik.length < atur.maks) titik.push(t);
      }
      gambar();
      if (atur.onUbah) atur.onUbah(nilai());
    }

    function dariPeristiwa(ev) {
      var kotak = svg.getBoundingClientRect();
      var skalaX = W / kotak.width, skalaY = H / kotak.height;
      var px = (ev.clientX - kotak.left) * skalaX;
      var py = (ev.clientY - kotak.top) * skalaY;
      var x = gx(px), y = gy(py);
      if (x < grid.xMin || x > grid.xMax || y < grid.yMin || y > grid.yMax) return null;
      return [x, y];
    }

    svg.addEventListener('pointerdown', function (ev) {
      if (terkunci) return;
      var t = dariPeristiwa(ev);
      if (t) { ev.preventDefault(); tambahAtauBuang(t); }
    });

    /* ---------- panel bawah: teks terpilih, ketik manual, tombol ---------- */

    var info = document.createElement('div');
    info.className = 'bidang-info';
    bungkus.appendChild(info);

    var labelTerpilih = document.createElement('span');
    labelTerpilih.className = 'terpilih';
    info.appendChild(labelTerpilih);

    var alatManual = document.createElement('div');
    alatManual.className = 'deret';
    alatManual.style.marginLeft = 'auto';
    info.appendChild(alatManual);

    function tombol(teksTombol, aksi, kelas) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tombol mungil' + (kelas ? ' ' + kelas : '');
      b.textContent = teksTombol;
      b.addEventListener('click', aksi);
      alatManual.appendChild(b);
      return b;
    }

    /* Mengetik koordinat adalah cadangan bila mengetuk terasa sulit,
       misalnya pada layar kecil atau bagi siswa yang memakai papan ketik. */
    var barisKetik = document.createElement('div');
    barisKetik.className = 'deret';
    barisKetik.style.marginTop = '.5rem';
    barisKetik.hidden = true;
    barisKetik.innerHTML =
      '<label class="kecil" style="flex:none;align-self:center;margin:0">x</label>' +
      '<input type="number" inputmode="numeric" class="k-x" style="flex:0 0 4.5rem">' +
      '<label class="kecil" style="flex:none;align-self:center;margin:0">y</label>' +
      '<input type="number" inputmode="numeric" class="k-y" style="flex:0 0 4.5rem">' +
      '<button type="button" class="tombol mungil k-tambah">Tambahkan</button>';
    bungkus.appendChild(barisKetik);

    var isiX = barisKetik.querySelector('.k-x');
    var isiY = barisKetik.querySelector('.k-y');
    barisKetik.querySelector('.k-tambah').addEventListener('click', function () {
      var x = parseInt(isiX.value, 10), y = parseInt(isiY.value, 10);
      if (isNaN(x) || isNaN(y)) return;
      if (x < grid.xMin || x > grid.xMax || y < grid.yMin || y > grid.yMax) {
        labelTerpilih.textContent = 'Titik di luar bidang.';
        return;
      }
      tambahAtauBuang([x, y]);
      isiX.value = ''; isiY.value = ''; isiX.focus();
    });

    if (!terkunci) {
      tombol('Ketik koordinat', function () {
        barisKetik.hidden = !barisKetik.hidden;
        if (!barisKetik.hidden) isiX.focus();
      });
      tombol('Hapus terakhir', function () {
        titik.pop();
        gambar();
        if (atur.onUbah) atur.onUbah(nilai());
      });
      tombol('Kosongkan', function () {
        titik = [];
        gambar();
        if (atur.onUbah) atur.onUbah(nilai());
      }, 'bahaya');
    }

    /* Tanpa keterangan ini, garis putus-putus mudah dikira bagian dari
       jawaban yang sudah terlanjur terisi. */
    if (acuan.length || cermin || pusat) {
      var bagian = [];
      if (acuan.length) bagian.push('garis putus-putus abu-abu = bangun asal');
      if (cermin) bagian.push('garis putus-putus jingga = garis cermin');
      if (pusat) bagian.push('kotak hitam = pusat transformasi');
      var legenda = document.createElement('p');
      legenda.className = 'kecil samar';
      legenda.style.margin = '.4rem 0 0';
      legenda.textContent = bagian.join(', ') + '. Yang dinilai hanya titik yang kamu taruh.';
      bungkus.insertBefore(legenda, info);
    }

    function perbaruiInfo() {
      if (!titik.length) {
        labelTerpilih.textContent = terkunci ? 'Tidak dijawab' : 'Belum ada titik dipilih';
        return;
      }
      var daftar = titik.map(function (t) { return '(' + t[0] + ', ' + t[1] + ')'; }).join('  ');
      labelTerpilih.textContent = (titik.length === 1 ? 'Titik terpilih: ' : 'Titik terpilih: ') + daftar;
    }

    /* ---------- antarmuka umum ---------- */

    function nilai() {
      return titik.map(function (t) { return [t[0], t[1]]; });
    }

    function set(daftar) {
      titik = (daftar || []).map(function (t) { return [Math.round(t[0]), Math.round(t[1])]; });
      gambar();
    }

    function kunciInput() {
      terkunci = true;
      alatManual.innerHTML = '';
      barisKetik.hidden = true;
    }

    /* Jawaban siswa dan kunci ditumpuk di bidang yang sama dengan warna
       berbeda, supaya siswa langsung melihat di mana selisihnya. */
    function tampilkanKunci(daftarKunci) {
      kunciTampil = daftarKunci || [];
      lapisKunci.innerHTML = '';
      if (!kunciTampil.length) return;

      if (mode === 'bangun' && kunciTampil.length >= 2) {
        var d = kunciTampil.map(function (t, i) {
          return (i ? 'L' : 'M') + sx(t[0]) + ' ' + sy(t[1]);
        }).join(' ') + ' Z';
        lapisKunci.appendChild(el('path', {
          d: d, fill: 'none', stroke: 'var(--benar)',
          'stroke-width': 2.6, 'stroke-dasharray': '5 4', 'stroke-linejoin': 'round'
        }));
      }
      if (mode === 'garis' && kunciTampil.length >= 2) {
        var u = ujungGaris(kunciTampil[0], kunciTampil[1]);
        lapisKunci.appendChild(el('line', {
          x1: sx(u[0][0]), y1: sy(u[0][1]), x2: sx(u[1][0]), y2: sy(u[1][1]),
          stroke: 'var(--benar)', 'stroke-width': 2.6, 'stroke-dasharray': '5 4'
        }));
      }
      kunciTampil.forEach(function (t) {
        lapisKunci.appendChild(el('circle', {
          cx: sx(t[0]), cy: sy(t[1]), r: 8,
          fill: 'none', stroke: 'var(--benar)', 'stroke-width': 2.6
        }));
      });
      gambar();
    }

    gambar();

    return {
      nilai: nilai,
      set: set,
      kunciInput: kunciInput,
      tampilkanKunci: tampilkanKunci,
      grid: grid
    };
  }

  akar.BidangKoordinat = { buat: buat };
})(window);
