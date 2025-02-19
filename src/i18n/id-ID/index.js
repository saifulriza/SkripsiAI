export default {
  failed: 'Aksi gagal',
  success: 'Aksi berhasil',
  loading: 'Memuat...',
  app: {
    title: 'Sistem Manajemen Skripsi',
  },
  nav: {
    title: 'Navigasi',
    myThesis: 'Skripsi Saya',
    reviewTheses: 'Review Skripsi',
  },
  auth: {
    login: 'Masuk',
    register: 'Daftar',
    logout: 'Keluar',
    email: 'Email',
    password: 'Kata Sandi',
    fullName: 'Nama Lengkap',
    role: 'Peran',
    student: 'Mahasiswa',
    lecturer: 'Dosen',
    loginSuccess: 'Berhasil masuk',
    registerSuccess: 'Berhasil mendaftar',
    logoutSuccess: 'Berhasil keluar',
    logoutError: 'Gagal keluar: {error}',
  },
  thesis: {
    title: 'Judul Skripsi',
    newThesis: 'Buat Skripsi Baru',
    createThesis: 'Buat Skripsi',
    status: {
      draft: 'Draf',
      submitted: 'Diajukan',
      reviewed: 'Direview',
      approved: 'Disetujui',
    },
    chapter: 'Bab',
    chapters: {
      1: 'Bab 1 - Pendahuluan',
      2: 'Bab 2 - Tinjauan Pustaka',
      3: 'Bab 3 - Metodologi',
      4: 'Bab 4 - Hasil dan Pembahasan',
      5: 'Bab 5 - Kesimpulan',
    },
    content: 'Konten',
    save: 'Simpan',
    analyze: 'Analisis dengan AI',
    submit: 'Ajukan untuk Review',
    feedback: {
      title: 'Riwayat Umpan Balik AI',
      noHistory: 'Belum ada riwayat umpan balik',
      inWriteTab: 'di tab Tulis untuk mendapatkan umpan balik AI',
      latestFirst: 'Umpan balik terbaru ditampilkan lebih dulu',
    },
    tabs: {
      write: 'Tulis',
      history: 'Riwayat Umpan Balik AI',
    },
    warnings: {
      incomplete: 'Harap lengkapi semua bab sebelum mengajukan untuk review.',
      missingChapters: 'Bab yang belum lengkap: {chapters}',
    },
    ai: {
      analyzing: 'Sedang menganalisis...',
      generating: 'Sedang menghasilkan konten...',
      generatingHint:
        'Mohon tunggu sebentar sementara AI menghasilkan konten. Konten akan dihasilkan bagian demi bagian untuk memastikan kualitas dan kedalaman yang baik.',
      generatingIteration: 'Menghasilkan bagian ke-{n}...',
      generateSuggestions: 'Hasilkan Saran',
      suggestions: 'Saran AI',
      success: 'Saran AI berhasil dihasilkan dan disimpan',
      write: 'Asisten Penulisan AI',
      contentType: 'Jenis Konten',
      instructions: 'Instruksi Penulisan',
      instructionsHint: 'Berikan instruksi spesifik untuk bagian yang ingin ditulis',
      contextNote: 'Konten akan disesuaikan dengan judul dan konteks penelitian Anda',
      contentGenerated: 'Konten berhasil dibuat',
      contentContinued: 'Konten lanjutan berhasil dibuat',
      selectTypeAndPrompt: 'Pilih jenis konten dan berikan instruksi',
      wordCount: {
        current: 'Kata dalam bagian ini: {n}',
        total: 'Total kata: {n}',
        progress: 'Bagian {current} | Total {total} kata',
      },
      error: {
        analysis: 'Gagal menganalisis konten',
        suggestions: 'Gagal menghasilkan saran',
        selectChapter: 'Silakan pilih bab terlebih dahulu',
        noContent: 'Silakan masukkan konten terlebih dahulu',
        generation: 'Gagal membuat konten',
        continuation: 'Gagal melanjutkan konten',
        save: 'Gagal menyimpan konten',
        apiKey: 'API key tidak valid. Silakan periksa konfigurasi OpenAI API key Anda',
        invalidChapter: 'Bab yang dipilih tidak valid',
      },
      continueGeneration: {
        title: 'Lanjutkan Penulisan',
        message: 'Apakah Anda ingin melanjutkan penulisan untuk bagian ini?',
        continue: 'Lanjutkan',
        stop: 'Cukup',
        confirmMessage: 'Lanjutkan iterasi?',
        iterationProgress: 'Iterasi ke-{n}',
      },
      prompts: {
        introduction: `Bab ini harus mencakup:
- Latar belakang masalah
- Rumusan masalah
- Tujuan penelitian
- Manfaat penelitian
- Batasan masalah`,
        literature: `Bab ini harus mencakup:
- Penelitian terdahulu yang relevan
- Teori-teori yang mendukung
- Kerangka pemikiran
- Hipotesis penelitian (jika ada)`,
        methodology: `Bab ini harus mencakup:
- Jenis penelitian
- Populasi dan sampel
- Teknik pengumpulan data
- Metode analisis data`,
        results: `Bab ini harus mencakup:
- Hasil pengumpulan data
- Analisis data
- Interpretasi hasil
- Diskusi temuan`,
        conclusion: `Bab ini harus mencakup:
- Kesimpulan penelitian
- Saran untuk penelitian selanjutnya
- Implikasi penelitian`,
      },
      pagination: {
        continue: 'Lanjut ke bagian berikutnya',
        stop: 'Selesai di sini',
        progress: 'Bagian {current} dari {total}',
      },
      iteration: {
        current: 'Sedang menulis bagian {n}',
        next: 'Melanjutkan ke bagian {n}',
        complete: 'Penulisan selesai',
      },
    },
  },
  common: {
    cancel: 'Batal',
    save: 'Simpan',
    create: 'Buat',
    edit: 'Ubah',
    delete: 'Hapus',
    loading: 'Memuat...',
    required: 'Wajib diisi',
  },
}
