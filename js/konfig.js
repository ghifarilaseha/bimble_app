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
  ENDPOINT: 'https://script.google.com/macros/s/AKfycbxrebMsRIe38di7SQfAZVihNDcDdE-U2ZHidJ1KjluJBqPXubi2W9ysu2Fy5s-rnsh5rg/exec',

  /* Nama sekolah/kelas yang tampil di beranda. */
  JUDUL: 'Bimbel Matematika SMP',

  /* Ambang awal untuk penanda "siswa perlu perhatian" di dashboard.
     Masih tebakan; setel ulang setelah dipakai sebulan. */
  AMBANG_PERHATIAN: 60
};
