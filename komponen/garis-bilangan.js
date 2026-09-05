/* garis-bilangan.js - garis bilangan yang bisa diketuk, dengan busur loncatan.
 *
 * Dipakai untuk bilangan bulat dan operasinya. Penjumlahan digambar
 * sebagai loncatan ke kanan, pengurangan ke kiri, sehingga "5 + (-8)"
 * terlihat sebagai gerakan, bukan aturan tanda yang harus dihafal.
 *
 * Pemakaian:
 *   var gb = GarisBilangan.buat(wadah, { min: -10, max: 10, awal: 5, langkah: [-8] });
 *   gb.setLangkah([3, -4]);  gb.hasil();  // 4
 */
(function (akar) {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  function el(nama, sifat) {
    var e = document.createElementNS(NS, nama);
    for (var k in sifat) if (Object.prototype.hasOwnProperty.call(sifat, k)) e.setAttribute(k, sifat[k]);
    return e;
  }

  function buat(wadah, atur) {
    atur = atur || {};
    var min = atur.min === undefined ? -10 : atur.min;
    var max = atur.max === undefined ? 10 : atur.max;
    var awal = atur.awal === undefined ? 0 : atur.awal;
    var langkah = (atur.langkah || []).slice();
    var interaktif = atur.interaktif !== false;

    var L = 34, M = 30;
    var tinggiBusur = 46;
    var W = (max - min) * L + 2 * M;
    var H = tinggiBusur + 76;
    var yGaris = H - 42;

    function sx(x) { return M + (x - min) * L; }
    function gx(px) { return Math.round((px - M) / L + min); }

    wadah.innerHTML = '';
    var svg = el('svg', {
      'class': 'garis-bilangan',
      viewBox: '0 0 ' + W + ' ' + H,
      width: W, height: H,
      role: 'img', 'aria-label': 'Garis bilangan dari ' + min + ' sampai ' + max
    });
    wadah.appendChild(svg);

    var lapisGaris = el('g', {});
    var lapisBusur = el('g', {});
    svg.appendChild(lapisGaris);
    svg.appendChild(lapisBusur);

    function teks(x, y, isi, warna, tebal) {
      var t = el('text', {
        x: x, y: y, 'font-size': 12, 'text-anchor': 'middle',
        fill: warna || 'var(--tinta-lembut)',
        'font-weight': tebal ? 650 : 400,
        'font-family': 'system-ui, sans-serif'
      });
      t.textContent = isi;
      return t;
    }

    function gambarGaris() {
      lapisGaris.innerHTML = '';
      lapisGaris.appendChild(el('line', {
        x1: M - 14, y1: yGaris, x2: W - M + 14, y2: yGaris,
        stroke: 'var(--tinta)', 'stroke-width': 1.6
      }));
      var langkahLabel = (max - min) > 20 ? 5 : ((max - min) > 12 ? 2 : 1);
      for (var x = min; x <= max; x++) {
        var utama = (x % langkahLabel === 0) || x === min || x === max;
        lapisGaris.appendChild(el('line', {
          x1: sx(x), y1: yGaris - (utama ? 7 : 4), x2: sx(x), y2: yGaris + (utama ? 7 : 4),
          stroke: x === 0 ? 'var(--tinta)' : 'var(--tinta-lembut)',
          'stroke-width': x === 0 ? 1.8 : 1
        }));
        if (utama) lapisGaris.appendChild(teks(sx(x), yGaris + 24, String(x), x === 0 ? 'var(--tinta)' : null, x === 0));
      }
    }

    /* Busur setengah lingkaran dari satu bilangan ke bilangan berikutnya. */
    function busur(dari, ke, warna, label) {
      var g = el('g', {});
      var x1 = sx(dari), x2 = sx(ke);
      var lebar = Math.abs(x2 - x1);
      var tinggi = Math.min(tinggiBusur, 16 + lebar * 0.35);
      var d = 'M ' + x1 + ' ' + yGaris +
              ' C ' + x1 + ' ' + (yGaris - tinggi) + ' ' + x2 + ' ' + (yGaris - tinggi) + ' ' + x2 + ' ' + yGaris;
      g.appendChild(el('path', {
        d: d, fill: 'none', stroke: warna, 'stroke-width': 2.2, 'marker-end': 'url(#panah-' + cap + ')'
      }));
      g.appendChild(teks((x1 + x2) / 2, yGaris - tinggi * 0.72, label, warna, true));
      return g;
    }

    var cap = 'gb' + Math.random().toString(36).slice(2, 7);
    var defs = el('defs', {});
    ['var(--aksen)'].forEach(function () {
      var mk = el('marker', {
        id: 'panah-' + cap, viewBox: '0 0 10 10', refX: 8, refY: 5,
        markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse'
      });
      mk.appendChild(el('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: 'var(--aksen)' }));
      defs.appendChild(mk);
    });
    svg.appendChild(defs);

    function hasil() {
      return langkah.reduce(function (a, b) { return a + b; }, awal);
    }

    function gambarBusur() {
      lapisBusur.innerHTML = '';
      var posisi = awal;
      lapisBusur.appendChild(el('circle', {
        cx: sx(posisi), cy: yGaris, r: 5.5, fill: 'var(--tinta-lembut)'
      }));
      langkah.forEach(function (n) {
        if (n === 0) return;
        var tujuan = posisi + n;
        lapisBusur.appendChild(busur(posisi, tujuan, 'var(--aksen)', (n > 0 ? '+' : '') + n));
        posisi = tujuan;
      });
      lapisBusur.appendChild(el('circle', {
        cx: sx(posisi), cy: yGaris, r: 6.5,
        fill: 'var(--aksen)', stroke: 'var(--kartu)', 'stroke-width': 2
      }));
      lapisBusur.appendChild(teks(sx(posisi), yGaris + 40, String(posisi), 'var(--aksen)', true));
    }

    function gambar() {
      gambarGaris();
      gambarBusur();
      if (atur.onUbah) atur.onUbah({ awal: awal, langkah: langkah.slice(), hasil: hasil() });
    }

    if (interaktif) {
      svg.style.touchAction = 'none';
      svg.addEventListener('pointerdown', function (ev) {
        var kotak = svg.getBoundingClientRect();
        var px = (ev.clientX - kotak.left) * (W / kotak.width);
        var x = gx(px);
        if (x < min || x > max) return;
        ev.preventDefault();
        awal = x;
        gambar();
      });
    }

    gambar();

    return {
      hasil: hasil,
      setAwal: function (x) { awal = x; gambar(); },
      setLangkah: function (arr) { langkah = (arr || []).slice(); gambar(); },
      nilai: function () { return { awal: awal, langkah: langkah.slice(), hasil: hasil() }; }
    };
  }

  akar.GarisBilangan = { buat: buat };
})(window);
