/* konfig.js - satu-satunya berkas yang perlu disunting setelah deploy.
 *
 * Isi ENDPOINT dengan URL Web App dari Apps Script (lihat README bagian
 * "Memasang penerima data"). URL-nya berakhiran /exec.
 *
 * URL ini tidak rahasia: siapa pun yang membuka situs bisa membacanya.
 * Yang menjaga dashboard bukan URL-nya, melainkan token pada Script
 * Properties yang hanya diketahui guru.
 */
window.KONFIG = {
  ENDPOINT: 'https://script.google.com/macros/s/AKfycbzN8Q0awEpkUyPR6bBDix4fTXC21S9U67MOvHjRt-rg-teT3IbaWSh73aZubJ_og7ZTqw/exec',

  /* Nama sekolah/kelas yang tampil di beranda. */
  JUDUL: 'Bimbel Matematika SMP',

  /* Ambang awal untuk penanda "siswa perlu perhatian" di dashboard.
     Masih tebakan; setel ulang setelah dipakai sebulan. */
  AMBANG_PERHATIAN: 60
};
