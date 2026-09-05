/* kirim.js - mengirim hasil pengerjaan, dengan antrean untuk keadaan luring.
 *
 * Dikirim sebagai text/plain, bukan application/json. Ini disengaja:
 * text/plain termasuk permintaan sederhana sehingga peramban tidak
 * mengirim preflight OPTIONS, yang tidak dilayani Apps Script.
 */
(function (akar, pabrik) {
  akar.Kirim = pabrik(akar);
})(typeof self !== 'undefined' ? self : this, function (akar) {
  'use strict';

  var KUNCI_ANTREAN = 'bimble.antrean';

  function endpoint() {
    return (akar.KONFIG && akar.KONFIG.ENDPOINT) || '';
  }

  function bacaAntrean() {
    try {
      var m = localStorage.getItem(KUNCI_ANTREAN);
      var d = m ? JSON.parse(m) : [];
      return Array.isArray(d) ? d : [];
    } catch (e) { return []; }
  }

  function tulisAntrean(daftar) {
    try { localStorage.setItem(KUNCI_ANTREAN, JSON.stringify(daftar)); } catch (e) { /* abaikan */ }
  }

  function jumlahAntre() { return bacaAntrean().length; }

  function idAcak() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  /* Satu kali percobaan kirim. Menolak (reject) bila gagal. */
  function coba(data) {
    var url = endpoint();
    if (!url) return Promise.reject(new Error('ENDPOINT belum diisi di js/konfig.js'));
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(data),
      redirect: 'follow'
    }).then(function (r) {
      return r.text().then(function (teks) {
        var jwb = null;
        try { jwb = JSON.parse(teks); } catch (e) { /* biar null */ }
        if (!r.ok || !jwb || jwb.status !== 'ok') {
          throw new Error((jwb && jwb.pesan) || ('Server menolak (' + r.status + ')'));
        }
        return jwb;
      });
    });
  }

  /* Kirim satu hasil. Bila gagal, masuk antrean dan tetap dianggap selesai
     dari sudut pandang siswa - yang penting jawabannya tidak hilang. */
  function kirim(data) {
    if (!data.idKirim) data.idKirim = idAcak();
    return coba(data).then(function () {
      return { status: 'terkirim' };
    }).catch(function (e) {
      var antre = bacaAntrean();
      if (!antre.some(function (d) { return d.idKirim === data.idKirim; })) {
        antre.push(data);
        tulisAntrean(antre);
      }
      return { status: 'antre', pesan: e.message, jumlah: antre.length };
    });
  }

  /* Kirim ulang isi antrean. Dipanggil saat halaman dibuka dan saat
     peramban memberi tahu koneksi kembali tersedia. */
  function prosesAntrean() {
    var antre = bacaAntrean();
    if (!antre.length || !endpoint()) return Promise.resolve({ terkirim: 0, sisa: antre.length });
    if (akar.navigator && akar.navigator.onLine === false) {
      return Promise.resolve({ terkirim: 0, sisa: antre.length });
    }
    var terkirim = 0;
    /* Berurutan, bukan paralel: kalau server sedang bermasalah, tidak perlu
       menghantamnya dengan sepuluh permintaan sekaligus. */
    return antre.reduce(function (rantai, data) {
      return rantai.then(function (sisa) {
        return coba(data).then(function () {
          terkirim++;
          return sisa;
        }).catch(function () {
          return sisa.concat([data]);
        });
      });
    }, Promise.resolve([])).then(function (sisa) {
      tulisAntrean(sisa);
      return { terkirim: terkirim, sisa: sisa.length };
    });
  }

  /* Kode hasil untuk keadaan darurat: Apps Script mati atau kuota habis.
     Siswa memotret kode ini, guru memasukkannya manual. Enam digit
     terakhir adalah cap dari isi hasil, supaya angka nilai tidak bisa
     diubah diam-diam sebelum disetorkan. */
  function kodeHasil(data) {
    var inti = [data.nama, data.kelas, data.bab, data.nilai, data.poinRaih, data.poinTotal].join('|');
    return akar.Kunci.sha256(inti).then(function (h) {
      return [
        (data.kodeSesi || data.mode || 'sesi'),
        data.bab,
        data.nilai,
        h.slice(0, 6).toUpperCase()
      ].join('-');
    });
  }

  function pasangPemantau() {
    if (!akar.addEventListener) return;
    akar.addEventListener('online', function () { prosesAntrean(); });
  }

  return {
    kirim: kirim,
    prosesAntrean: prosesAntrean,
    jumlahAntre: jumlahAntre,
    kodeHasil: kodeHasil,
    pasangPemantau: pasangPemantau
  };
});
