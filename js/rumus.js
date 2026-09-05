/* rumus.js - mengubah teks bertanda $...$ menjadi rumus tercetak.
 *
 * KaTeX disalin ke folder vendor, bukan diambil dari CDN, supaya halaman
 * tetap utuh bertahun-tahun ke depan meski CDN-nya berubah atau hilang.
 * Bila KaTeX gagal dimuat, rumus tetap tampil sebagai teks mentah,
 * tidak sampai membuat halaman kosong.
 */
(function (akar) {
  'use strict';

  function lolos(teks) {
    return String(teks)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function satuRumus(isi, blok) {
    if (akar.katex) {
      try {
        return akar.katex.renderToString(isi, {
          throwOnError: false,
          displayMode: !!blok,
          output: 'html'
        });
      } catch (e) { /* jatuh ke teks mentah di bawah */ }
    }
    return '<span class="rumus-mentah">' + lolos(isi) + '</span>';
  }

  /* Teks bercampur rumus menjadi HTML siap tempel. Bagian di luar $...$
     selalu dilolos-kan, jadi isi bank soal tidak bisa menyuntik markup. */
  function keHTML(teks) {
    var keluar = '';
    var sisa = String(teks == null ? '' : teks);
    var re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
    var pos = 0, m;
    while ((m = re.exec(sisa)) !== null) {
      keluar += lolos(sisa.slice(pos, m.index));
      keluar += (m[1] !== undefined) ? satuRumus(m[1], true) : satuRumus(m[2], false);
      pos = re.lastIndex;
    }
    keluar += lolos(sisa.slice(pos));
    return keluar;
  }

  /* Isi elemen dengan teks bercampur rumus. */
  function isi(el, teks) {
    if (el) el.innerHTML = keHTML(teks);
    return el;
  }

  akar.Rumus = { keHTML: keHTML, isi: isi, lolos: lolos };
})(window);
