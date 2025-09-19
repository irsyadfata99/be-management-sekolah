-- ==========================================
-- SAMPLE DATA UNTUK TESTING
-- ==========================================

USE sekolah_db;

-- Insert School Settings
INSERT INTO school_settings (
    nama_sekolah, alamat_lengkap, telepon, email, website, 
    nis_sekolah, npsn_sekolah, kepala_sekolah
) VALUES (
    'SMK Teknologi Nusantara',
    'Jl. Pendidikan No. 123, Bandung, Jawa Barat 40123',
    '022-1234567',
    'info@smkteknologi.sch.id',
    'https://smkteknologi.sch.id',
    '12345678',
    '20123456',
    'Drs. Budi Santoso, M.Pd'
);

-- Insert Program Keahlian
INSERT INTO program_keahlian (kode_program, nama_program, deskripsi, kuota_siswa) VALUES
('RPL', 'Rekayasa Perangkat Lunak', 'Program keahlian yang fokus pada pengembangan software dan aplikasi', 36),
('TKJ', 'Teknik Komputer dan Jaringan', 'Program keahlian yang fokus pada hardware komputer dan jaringan', 36),
('MM', 'Multimedia', 'Program keahlian yang fokus pada desain grafis dan multimedia', 36),
('TBSM', 'Teknik Bisnis Sepeda Motor', 'Program keahlian yang fokus pada otomotif sepeda motor', 36);

-- Insert Kategori Artikel
INSERT INTO kategori_artikel (nama_kategori, slug, deskripsi, warna_kategori) VALUES
('Berita Sekolah', 'berita-sekolah', 'Berita terbaru dari kegiatan sekolah', '#3B82F6'),
('Pengumuman', 'pengumuman', 'Pengumuman resmi dari sekolah', '#EF4444'),
('Prestasi', 'prestasi', 'Prestasi siswa dan sekolah', '#10B981'),
('Kegiatan', 'kegiatan', 'Dokumentasi kegiatan sekolah', '#F59E0B'),
('PPDB', 'ppdb', 'Informasi Penerimaan Peserta Didik Baru', '#8B5CF6');

-- Insert Sample Admin User (password: admin123)
INSERT INTO admin_users (username, email, password_hash, full_name) VALUES
('admin', 'admin@smkteknologi.sch.id', '$2b$10$rQZ5QZ5QZ5QZ5QZ5QZ5QZu', 'Administrator Sistem');

-- Insert Sample Guru/Staff
INSERT INTO guru_staff (nip, nama_lengkap, jenis_kelamin, jabatan, mata_pelajaran, pendidikan_terakhir, tahun_bergabung, status) VALUES
('196801011992031001', 'Drs. Ahmad Hidayat, M.Pd', 'L', 'Kepala Sekolah', 'Manajemen', 'S2 Manajemen Pendidikan', 1992, 'aktif'),
('197505051998032001', 'Siti Nurhaliza, S.Kom', 'P', 'Guru', 'Pemrograman Dasar', 'S1 Teknik Informatika', 1998, 'aktif'),
('198203102005011002', 'Andi Pratama, S.T', 'L', 'Guru', 'Jaringan Komputer', 'S1 Teknik Elektro', 2005, 'aktif');

-- Insert Sample Artikel
INSERT INTO artikel (judul, slug, konten_singkat, konten_lengkap, kategori_id, penulis, is_published, tanggal_publish) VALUES
('Selamat Datang Siswa Baru Tahun Ajaran 2024/2025', 
 'selamat-datang-siswa-baru-2024-2025',
 'SMK Teknologi Nusantara menyambut siswa baru dengan berbagai kegiatan orientasi.',
 '<p>SMK Teknologi Nusantara dengan bangga menyambut 144 siswa baru untuk tahun ajaran 2024/2025...</p>',
 1, 'Tim Humas', TRUE, '2024-07-15');

-- Insert Sample Kalender Akademik
INSERT INTO kalender_akademik (judul_kegiatan, deskripsi, tanggal_mulai, tanggal_selesai, jenis_kegiatan) VALUES
('Pendaftaran PPDB Gelombang 1', 'Pendaftaran peserta didik baru gelombang pertama', '2024-06-01', '2024-06-30', 'kegiatan'),
('Ujian Tengah Semester Ganjil', 'Pelaksanaan UTS semester ganjil', '2024-10-01', '2024-10-15', 'ujian'),
('Libur Semester Ganjil', 'Libur akhir semester ganjil', '2024-12-18', '2025-01-02', 'libur');