-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Sep 23, 2025 at 11:04 PM
-- Server version: 8.0.30
-- PHP Version: 8.3.25

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `sekolah_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `academic_calendar`
--

CREATE TABLE `academic_calendar` (
  `id` int NOT NULL,
  `judul_kegiatan` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `deskripsi` text COLLATE utf8mb4_unicode_ci,
  `tanggal_mulai` date NOT NULL,
  `tanggal_selesai` date DEFAULT NULL,
  `waktu_mulai` time DEFAULT NULL,
  `waktu_selesai` time DEFAULT NULL,
  `lokasi` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `jenis_kegiatan` enum('akademik','ekstrakurikuler','ujian','libur','acara_khusus') COLLATE utf8mb4_unicode_ci DEFAULT 'akademik',
  `tingkat` enum('sekolah','kelas','individu') COLLATE utf8mb4_unicode_ci DEFAULT 'sekolah',
  `status` enum('draft','published','completed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `tahun_ajaran` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `semester` enum('1','2') COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `academic_calendar`
--

INSERT INTO `academic_calendar` (`id`, `judul_kegiatan`, `deskripsi`, `tanggal_mulai`, `tanggal_selesai`, `waktu_mulai`, `waktu_selesai`, `lokasi`, `jenis_kegiatan`, `tingkat`, `status`, `tahun_ajaran`, `semester`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 'Ujian Tengah Semester', 'Pelaksanaan ujian tengah semester untuk semua tingkat', '2024-10-15', '2024-10-20', '08:00:00', '12:00:00', 'Seluruh Ruang Kelas', 'ujian', 'sekolah', 'published', '2024/2025', '1', NULL, '2025-09-23 12:46:20', '2025-09-23 12:46:20'),
(2, 'Libur Semester Ganjil', 'Libur semester ganjil tahun ajaran 2024/2025', '2024-12-20', '2025-01-15', NULL, NULL, 'Rumah Masing-masing', 'libur', 'sekolah', 'published', '2024/2025', '1', NULL, '2025-09-23 12:46:20', '2025-09-23 12:46:20'),
(3, 'Kegiatan Ekstrakurikuler Pramuka', 'Kegiatan rutin pramuka setiap hari Jumat', '2024-09-27', '2024-09-27', '14:00:00', '16:00:00', 'Lapangan Sekolah', 'ekstrakurikuler', 'sekolah', 'published', '2024/2025', '1', NULL, '2025-09-23 12:46:20', '2025-09-23 12:46:20'),
(4, 'Rapat Koordinasi Guru', 'Rapat koordinasi bulanan semua guru', '2024-10-05', '2024-10-05', '13:00:00', '15:00:00', 'Ruang Guru', 'akademik', 'sekolah', 'published', '2024/2025', '1', NULL, '2025-09-23 12:46:20', '2025-09-23 12:46:20');

-- --------------------------------------------------------

--
-- Table structure for table `admins`
--

CREATE TABLE `admins` (
  `id` int NOT NULL,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('super_admin','admin','operator') COLLATE utf8mb4_unicode_ci DEFAULT 'admin',
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `admins`
--

INSERT INTO `admins` (`id`, `username`, `email`, `password`, `full_name`, `role`, `status`, `last_login`, `created_at`, `updated_at`) VALUES
(1, 'admin', 'admin@sekolah.sch.id', '$2b$10$rX8kJZ0GZhvSrfXkON2z5uWZ8kFZKkVvX7VZn6LL5wv.3K2YdXoay', 'Administrator', 'super_admin', 'active', NULL, '2025-09-19 13:27:36', '2025-09-19 13:27:36');

-- --------------------------------------------------------

--
-- Table structure for table `admin_users`
--

CREATE TABLE `admin_users` (
  `id` int NOT NULL,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('admin','operator') COLLATE utf8mb4_unicode_ci DEFAULT 'admin',
  `can_manage_students` tinyint(1) DEFAULT '1',
  `can_manage_settings` tinyint(1) DEFAULT '1',
  `can_export_data` tinyint(1) DEFAULT '1',
  `can_manage_admins` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `admin_users`
--

INSERT INTO `admin_users` (`id`, `username`, `email`, `password_hash`, `full_name`, `role`, `can_manage_students`, `can_manage_settings`, `can_export_data`, `can_manage_admins`, `is_active`, `last_login`, `created_at`, `updated_at`) VALUES
(11, 'admin', 'admin3@smkteknologi.sch.id', '$2b$10$/Pren/1Ohlm2/NSAYODVYul5gyOrxSfZsFC7uvWFCrKrtDGd1RirC', 'Administrator New', 'admin', 1, 1, 1, 1, 1, '2025-09-22 23:01:45', '2025-09-19 07:06:00', '2025-09-22 23:01:45');

-- --------------------------------------------------------

--
-- Table structure for table `alumni`
--

CREATE TABLE `alumni` (
  `id` int NOT NULL,
  `nama_lengkap` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tahun_lulus` year NOT NULL,
  `pekerjaan_sekarang` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `deskripsi` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `foto_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `display_order` int DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `alumni`
--

INSERT INTO `alumni` (`id`, `nama_lengkap`, `tahun_lulus`, `pekerjaan_sekarang`, `deskripsi`, `foto_path`, `is_active`, `display_order`, `created_at`, `updated_at`) VALUES
(2, 'Alumni Test Updated', '2022', 'Senior Software Tester', 'Alumni yang sudah diupdate via Postman', NULL, 1, 1, '2025-09-22 00:34:03', '2025-09-22 00:59:36'),
(3, 'Alumni Test Postman 1', '2021', 'Software Tester', 'Alumni yang dibuat melalui testing Postman untuk memastikan endpoint berfungsi', NULL, 1, 1, '2025-09-22 00:44:14', '2025-09-22 00:47:19');

-- --------------------------------------------------------

--
-- Table structure for table `articles`
--

CREATE TABLE `articles` (
  `id` int NOT NULL,
  `judul` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `konten_singkat` text COLLATE utf8mb4_unicode_ci,
  `konten_lengkap` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `gambar_utama` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `kategori_id` int DEFAULT NULL,
  `penulis` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_published` tinyint(1) NOT NULL DEFAULT '0',
  `tanggal_publish` date DEFAULT NULL,
  `is_featured` tinyint(1) NOT NULL DEFAULT '0',
  `meta_description` text COLLATE utf8mb4_unicode_ci,
  `tags` text COLLATE utf8mb4_unicode_ci,
  `views` int NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `articles`
--

INSERT INTO `articles` (`id`, `judul`, `slug`, `konten_singkat`, `konten_lengkap`, `gambar_utama`, `kategori_id`, `penulis`, `is_published`, `tanggal_publish`, `is_featured`, `meta_description`, `tags`, `views`, `created_at`, `updated_at`) VALUES
(1, 'Selamat Datang di Website Sekolah Baru', 'selamat-datang-website-sekolah-baru', 'Website resmi sekolah telah diluncurkan dengan fitur-fitur modern untuk mendukung komunikasi antara sekolah, siswa, dan orang tua.', '<p>Kami dengan bangga mengumumkan peluncuran website resmi sekolah yang baru. Website ini dirancang dengan teknologi terkini untuk memberikan pengalaman terbaik bagi seluruh civitas akademika.</p><h3>Fitur-Fitur Unggulan:</h3><ul><li>Portal berita dan pengumuman terkini</li><li>Sistem informasi akademik</li><li>Galeri kegiatan sekolah</li><li>Kontak dan informasi sekolah</li></ul><p>Dengan website ini, kami berharap dapat meningkatkan transparansi dan komunikasi yang lebih baik dengan semua pihak.</p>', '/images/articles/website-launch.jpg', 1, 'Admin Sekolah', 1, '2024-01-15', 1, 'Peluncuran website resmi sekolah dengan fitur modern untuk komunikasi yang lebih baik', 'website, teknologi, komunikasi, sekolah', 156, '2025-09-23 13:13:21', '2025-09-23 13:13:21'),
(2, 'Prestasi Gemilang di Olimpiade Matematika Nasional', 'prestasi-olimpiade-matematika-nasional', 'Tim olimpiade matematika sekolah berhasil meraih medali emas dan perak dalam kompetisi tingkat nasional.', '<p>Siswa-siswi terbaik sekolah kembali mengharumkan nama sekolah dengan meraih prestasi gemilang di Olimpiade Matematika Nasional 2024.</p><h3>Pencapaian:</h3><ul><li>Medali Emas: Ahmad Rizki (Kelas XII IPA 1)</li><li>Medali Perak: Sari Indah (Kelas XI IPA 2)</li><li>Sertifikat Peserta Terbaik: 3 siswa lainnya</li></ul><p>Prestasi ini tidak lepas dari kerja keras siswa dan bimbingan intensif dari para guru pembimbing. Sekolah sangat bangga dengan pencapaian ini dan berkomitmen untuk terus mengembangkan potensi akademik siswa.</p>', '/images/articles/olimpiade-math.jpg', 4, 'Guru Matematika', 1, '2024-02-10', 1, 'Siswa sekolah meraih medali emas dan perak di Olimpiade Matematika Nasional 2024', 'olimpiade, matematika, prestasi, medali, nasional', 289, '2025-09-23 13:13:21', '2025-09-23 13:13:21'),
(3, 'Pelaksanaan Ujian Tengah Semester Gasal 2024', 'pelaksanaan-uts-gasal-2024', 'Informasi terkait jadwal dan tata tertib pelaksanaan Ujian Tengah Semester Gasal tahun ajaran 2024/2025.', '<p>Ujian Tengah Semester (UTS) Gasal tahun ajaran 2024/2025 akan dilaksanakan sesuai jadwal yang telah ditetapkan.</p><h3>Jadwal Pelaksanaan:</h3><ul><li>Tanggal: 15-19 Oktober 2024</li><li>Waktu: 07.30 - 10.00 WIB</li><li>Tempat: Ruang kelas masing-masing</li></ul><h3>Tata Tertib:</h3><ol><li>Siswa wajib hadir 15 menit sebelum ujian dimulai</li><li>Membawa alat tulis dan kartu peserta ujian</li><li>Tidak diperkenankan membawa HP atau alat komunikasi lainnya</li><li>Memakai seragam lengkap sesuai ketentuan</li></ol><p>Semoga seluruh siswa dapat mengikuti ujian dengan lancar dan meraih hasil yang memuaskan.</p>', '/images/articles/uts-schedule.jpg', 2, 'Wakasek Kurikulum', 1, '2024-10-01', 0, 'Jadwal dan tata tertib pelaksanaan Ujian Tengah Semester Gasal tahun ajaran 2024/2025', 'ujian, UTS, jadwal, tata tertib, semester', 432, '2025-09-23 13:13:21', '2025-09-23 13:13:21'),
(4, 'Festival Seni dan Budaya Sekolah 2024', 'festival-seni-budaya-2024', 'Perayaan kreativitas siswa melalui Festival Seni dan Budaya tahunan dengan berbagai pertunjukan menarik.', '<p>Festival Seni dan Budaya Sekolah 2024 telah sukses diselenggarakan dengan antusiasme tinggi dari seluruh siswa dan guru.</p><h3>Highlight Acara:</h3><ul><li>Pameran karya seni rupa siswa</li><li>Pertunjukan tari tradisional dan modern</li><li>Kompetisi musik dan vokal</li><li>Teater dan drama siswa</li><li>Fashion show dengan tema budaya nusantara</li></ul><p>Acara ini tidak hanya menjadi ajang showcasing talenta siswa, tetapi juga sarana untuk melestarikan budaya Indonesia di lingkungan sekolah. Para siswa menunjukkan kreativitas dan dedikasi yang luar biasa dalam setiap penampilan.</p><p>Terima kasih kepada seluruh panitia, peserta, dan penonton yang telah menyukseskan acara ini.</p>', '/images/articles/festival-seni.jpg', 6, 'Koordinator Seni Budaya', 1, '2024-03-20', 1, 'Festival Seni dan Budaya Sekolah 2024 menampilkan kreativitas dan bakat siswa dalam berbagai bidang seni', 'festival, seni, budaya, kreativitas, pertunjukan, siswa', 378, '2025-09-23 13:13:21', '2025-09-23 13:13:21'),
(5, 'Program Beasiswa Prestasi untuk Siswa Berprestasi', 'program-beasiswa-prestasi', 'Sekolah membuka program beasiswa prestasi untuk mendukung siswa berprestasi yang kurang mampu secara ekonomi.', '<p>Dalam rangka meningkatkan akses pendidikan berkualitas, sekolah dengan bangga mengumumkan Program Beasiswa Prestasi untuk tahun ajaran 2024/2025.</p><h3>Ketentuan Beasiswa:</h3><ul><li>Beasiswa penuh biaya pendidikan</li><li>Bantuan seragam dan perlengkapan sekolah</li><li>Bimbingan belajar tambahan</li></ul><h3>Syarat Pendaftar:</h3><ol><li>Siswa kelas X, XI, atau XII</li><li>Nilai rapor minimal 85</li><li>Prestasi di bidang akademik atau non-akademik</li><li>Kondisi ekonomi keluarga kurang mampu</li><li>Berkelakuan baik</li></ol><h3>Dokumen yang diperlukan:</h3><ul><li>Fotokopi rapor 2 semester terakhir</li><li>Surat keterangan tidak mampu dari kelurahan</li><li>Sertifikat prestasi (jika ada)</li><li>Surat rekomendasi dari wali kelas</li></ul><p>Pendaftaran dibuka hingga 30 November 2024. Informasi lebih lanjut dapat menghubungi bagian kesiswaan.</p>', '/images/articles/beasiswa.jpg', 5, 'Bagian Kesiswaan', 1, '2024-11-01', 0, 'Program beasiswa prestasi untuk mendukung siswa berprestasi yang kurang mampu secara ekonomi', 'beasiswa, prestasi, pendidikan, bantuan, ekonomi', 125, '2025-09-23 13:13:21', '2025-09-23 13:13:21');

-- --------------------------------------------------------

--
-- Table structure for table `blocked_ips`
--

CREATE TABLE `blocked_ips` (
  `id` int NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci,
  `blocked_until` timestamp NULL DEFAULT NULL,
  `permanent` tinyint(1) DEFAULT '0',
  `blocked_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'system',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` int NOT NULL,
  `nama_kategori` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `deskripsi` text COLLATE utf8mb4_unicode_ci,
  `warna` varchar(7) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '#3B82F6',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `nama_kategori`, `slug`, `deskripsi`, `warna`, `created_at`, `updated_at`) VALUES
(1, 'Berita Umum', 'berita-umum', 'Informasi umum seputar kegiatan sekolah', '#3B82F6', '2025-09-23 13:13:08', '2025-09-23 13:13:08'),
(2, 'Akademik', 'akademik', 'Berita terkait kegiatan akademik dan pembelajaran', '#10B981', '2025-09-23 13:13:08', '2025-09-23 13:13:08'),
(3, 'Ekstrakurikuler', 'ekstrakurikuler', 'Kegiatan ekstrakurikuler dan prestasi siswa', '#F59E0B', '2025-09-23 13:13:08', '2025-09-23 13:13:08'),
(4, 'Prestasi', 'prestasi', 'Pencapaian dan penghargaan sekolah', '#EF4444', '2025-09-23 13:13:08', '2025-09-23 13:13:08'),
(5, 'Pengumuman', 'pengumuman', 'Pengumuman resmi dari sekolah', '#8B5CF6', '2025-09-23 13:13:08', '2025-09-23 13:13:08'),
(6, 'Kegiatan', 'kegiatan', 'Berbagai kegiatan dan event sekolah', '#06B6D4', '2025-09-23 13:13:08', '2025-09-23 13:13:08');

-- --------------------------------------------------------

--
-- Table structure for table `contact_messages`
--

CREATE TABLE `contact_messages` (
  `id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subject` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` enum('general','admission','academic','technical') COLLATE utf8mb4_unicode_ci DEFAULT 'general',
  `status` enum('new','read','replied','resolved') COLLATE utf8mb4_unicode_ci DEFAULT 'new',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `contact_messages`
--

INSERT INTO `contact_messages` (`id`, `name`, `email`, `phone`, `subject`, `message`, `category`, `status`, `created_at`, `updated_at`) VALUES
(1, 'Budi Santoso', 'budi.santoso@email.com', '081234567890', 'Informasi Pendaftaran Siswa Baru', 'Selamat pagi. Saya ingin menanyakan informasi lengkap mengenai pendaftaran siswa baru tahun ajaran 2024/2025. Apakah masih ada kuota tersisa? Terima kasih.', 'admission', 'new', '2025-09-23 13:31:53', '2025-09-23 13:31:53'),
(2, 'Sari Dewi', 'sari.dewi@gmail.com', '087654321098', 'Pertanyaan tentang Kurikulum Merdeka', 'Halo, saya orang tua dari calon siswa kelas X. Saya ingin mengetahui lebih detail tentang implementasi Kurikulum Merdeka di sekolah ini. Bagaimana sistem pembelajaran dan penilaiannya?', 'academic', 'read', '2025-09-23 13:31:53', '2025-09-23 13:31:53'),
(3, 'Ahmad Rahman', 'ahmad.rahman@yahoo.com', NULL, 'Informasi Kegiatan Ekstrakurikuler', 'Saya ingin menanyakan kegiatan ekstrakurikuler apa saja yang tersedia di sekolah? Apakah ada ekstrakurikuler robotika atau programming? Mohon informasinya.', 'general', 'replied', '2025-09-23 13:31:53', '2025-09-23 13:31:53'),
(4, 'Ibu Ratna', 'ratna.wijaya@email.com', '085678901234', 'Beasiswa Prestasi untuk Siswa', 'Selamat siang. Anak saya berprestasi di bidang matematika dan sains. Apakah ada program beasiswa prestasi di sekolah ini? Bagaimana cara mendaftarnya?', 'admission', 'new', '2025-09-23 13:31:53', '2025-09-23 13:31:53'),
(5, 'Dian Purnama', 'dian.purnama@gmail.com', NULL, 'Error pada Website Sekolah', 'Saya mengalami kendala saat mengakses halaman pengumuman di website sekolah. Halaman tidak dapat dimuat dengan baik. Mohon perbaikannya.', 'technical', 'resolved', '2025-09-23 13:31:53', '2025-09-23 13:31:53');

-- --------------------------------------------------------

--
-- Table structure for table `document_categories`
--

CREATE TABLE `document_categories` (
  `id` int NOT NULL,
  `category_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_slug` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `icon` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Icon class for UI',
  `color` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Color theme for UI',
  `display_order` int DEFAULT '1',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `document_categories`
--

INSERT INTO `document_categories` (`id`, `category_name`, `category_slug`, `description`, `icon`, `color`, `display_order`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'Pengumuman', 'pengumuman', 'Pengumuman resmi dari sekolah', 'fa-bullhorn', '#3B82F6', 1, 1, '2025-09-20 15:47:31', '2025-09-20 15:47:31'),
(2, 'Kurikulum', 'kurikulum', 'Dokumen terkait kurikulum dan pembelajaran', 'fa-book', '#10B981', 2, 1, '2025-09-20 15:47:31', '2025-09-20 15:47:31'),
(3, 'Akademik', 'akademik', 'Dokumen akademik dan pedoman', 'fa-graduation-cap', '#8B5CF6', 3, 1, '2025-09-20 15:47:31', '2025-09-20 15:47:31'),
(4, 'Administrasi', 'administrasi', 'Formulir dan dokumen administrasi', 'fa-file-alt', '#F59E0B', 4, 1, '2025-09-20 15:47:31', '2025-09-20 15:47:31'),
(5, 'Keuangan', 'keuangan', 'Informasi biaya dan keuangan sekolah', 'fa-money-bill', '#EF4444', 5, 1, '2025-09-20 15:47:31', '2025-09-20 15:47:31'),
(6, 'Prestasi', 'prestasi', 'Dokumentasi prestasi siswa dan sekolah', 'fa-trophy', '#F97316', 6, 1, '2025-09-20 15:47:31', '2025-09-20 15:47:31'),
(7, 'Lainnya', 'lainnya', 'Dokumen lainnya', 'fa-folder', '#6B7280', 7, 1, '2025-09-20 15:47:31', '2025-09-20 15:47:31');

-- --------------------------------------------------------

--
-- Table structure for table `document_download_logs`
--

CREATE TABLE `document_download_logs` (
  `id` int NOT NULL,
  `document_id` int NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'IP address pengunduh',
  `user_agent` text COLLATE utf8mb4_unicode_ci COMMENT 'Browser/device info',
  `referrer` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Halaman asal',
  `download_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `document_download_logs`
--

INSERT INTO `document_download_logs` (`id`, `document_id`, `ip_address`, `user_agent`, `referrer`, `download_time`) VALUES
(2, 8, '::1', 'PostmanRuntime/7.46.1', '', '2025-09-20 21:59:55');

-- --------------------------------------------------------

--
-- Table structure for table `email_logs`
--

CREATE TABLE `email_logs` (
  `id` int NOT NULL,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `recipient` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subject` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('sent','failed','pending') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `message_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `error_message` text COLLATE utf8mb4_unicode_ci,
  `registration_id` int DEFAULT NULL,
  `template_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sent_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `email_logs`
--

INSERT INTO `email_logs` (`id`, `type`, `recipient`, `subject`, `status`, `message_id`, `error_message`, `registration_id`, `template_name`, `sent_at`, `created_at`, `updated_at`) VALUES
(1, 'test_email', 'your-test-email@gmail.com', 'Test Email - Konfigurasi Email Berhasil', 'sent', '<193731f6-07cb-749d-bb1b-d74de8d59346@gmail.com>', NULL, NULL, NULL, NULL, '2025-09-19 13:55:47', '2025-09-19 13:55:47');

-- --------------------------------------------------------

--
-- Table structure for table `email_templates`
--

CREATE TABLE `email_templates` (
  `id` int NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subject` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('spmb','announcement','reminder','custom') COLLATE utf8mb4_unicode_ci DEFAULT 'custom',
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `email_templates`
--

INSERT INTO `email_templates` (`id`, `name`, `subject`, `content`, `type`, `status`, `created_at`, `updated_at`) VALUES
(1, 'spmb_confirmation', 'Konfirmasi Pendaftaran SPMB - {{registration_number}}', 'Template akan diambil dari file .hbs', 'spmb', 'active', '2025-09-19 13:27:45', '2025-09-19 13:27:45'),
(2, 'spmb_verified', 'Pendaftaran Anda Telah Diverifikasi - {{registration_number}}', 'Template akan diambil dari file .hbs', 'spmb', 'active', '2025-09-19 13:27:45', '2025-09-19 13:27:45'),
(3, 'spmb_accepted', 'Selamat! Anda Diterima - {{registration_number}}', 'Template akan diambil dari file .hbs', 'spmb', 'active', '2025-09-19 13:27:45', '2025-09-19 13:27:45'),
(4, 'spmb_rejected', 'Informasi Status Pendaftaran - {{registration_number}}', 'Template akan diambil dari file .hbs', 'spmb', 'active', '2025-09-19 13:27:45', '2025-09-19 13:27:45');

-- --------------------------------------------------------

--
-- Table structure for table `guru_staff`
--

CREATE TABLE `guru_staff` (
  `id` int NOT NULL,
  `nip` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nama_lengkap` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `jenis_kelamin` enum('L','P') COLLATE utf8mb4_unicode_ci NOT NULL,
  `tempat_lahir` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tanggal_lahir` date DEFAULT NULL,
  `alamat` text COLLATE utf8mb4_unicode_ci,
  `no_hp` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `jabatan` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mata_pelajaran` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pendidikan_terakhir` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tahun_bergabung` year DEFAULT NULL,
  `status` enum('aktif','non-aktif','pensiun') COLLATE utf8mb4_unicode_ci DEFAULT 'aktif',
  `foto_profile` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deskripsi` text COLLATE utf8mb4_unicode_ci,
  `urutan_tampil` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `guru_staff`
--

INSERT INTO `guru_staff` (`id`, `nip`, `nama_lengkap`, `jenis_kelamin`, `tempat_lahir`, `tanggal_lahir`, `alamat`, `no_hp`, `email`, `jabatan`, `mata_pelajaran`, `pendidikan_terakhir`, `tahun_bergabung`, `status`, `foto_profile`, `deskripsi`, `urutan_tampil`, `created_at`, `updated_at`) VALUES
(1, '196801011992031001', 'Drs. Ahmad Hidayat, M.Pd', 'L', NULL, NULL, NULL, NULL, NULL, 'Kepala Sekolah', 'Manajemen', 'S2 Manajemen Pendidikan', '1992', 'aktif', NULL, NULL, 0, '2025-09-18 22:55:41', '2025-09-18 22:55:41'),
(2, '197505051998032001', 'Siti Nurhaliza, S.Kom', 'P', NULL, NULL, NULL, NULL, NULL, 'Guru', 'Pemrograman Dasar', 'S1 Teknik Informatika', '1998', 'aktif', NULL, NULL, 0, '2025-09-18 22:55:41', '2025-09-18 22:55:41'),
(3, '198203102005011002', 'Andi Pratama, S.T', 'L', NULL, NULL, NULL, NULL, NULL, 'Guru', 'Jaringan Komputer', 'S1 Teknik Elektro', '2005', 'aktif', NULL, NULL, 0, '2025-09-18 22:55:41', '2025-09-18 22:55:41');

-- --------------------------------------------------------

--
-- Table structure for table `jurusan`
--

CREATE TABLE `jurusan` (
  `id` int NOT NULL,
  `nama_jurusan` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `kode_jurusan` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `deskripsi` text COLLATE utf8mb4_unicode_ci,
  `kuota_siswa` int DEFAULT '36',
  `jenjang` enum('SMK','SMA','MA') COLLATE utf8mb4_unicode_ci DEFAULT 'SMK',
  `durasi_tahun` int DEFAULT '3',
  `is_active` tinyint(1) DEFAULT '1',
  `urutan_tampil` int DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `jurusan`
--

INSERT INTO `jurusan` (`id`, `nama_jurusan`, `kode_jurusan`, `deskripsi`, `kuota_siswa`, `jenjang`, `durasi_tahun`, `is_active`, `urutan_tampil`, `created_at`, `updated_at`) VALUES
(2, 'Rekayasa Perangkat Lunak', 'RPL', 'Program keahlian pengembangan aplikasi dan software', 36, 'SMK', 3, 1, 2, '2025-09-19 04:05:41', '2025-09-19 04:05:41'),
(3, 'Multimedia', 'MM', 'Program keahlian desain grafis dan multimedia', 24, 'SMK', 3, 1, 3, '2025-09-19 04:05:41', '2025-09-19 04:05:41'),
(4, 'Akuntansi dan Keuangan Lembaga', 'AKL', 'Program keahlian akuntansi dan keuangan', 30, 'SMK', 3, 1, 4, '2025-09-19 04:05:41', '2025-09-19 04:05:41'),
(5, 'Otomatisasi dan Tata Kelola Perkantoran', 'OTKP', 'Program keahlian administrasi perkantoran', 30, 'SMK', 3, 1, 5, '2025-09-19 04:05:41', '2025-09-19 04:05:41'),
(6, 'Teknik Elektronika Industri', 'TEI', 'Program keahlian bidang elektronika industri', 30, 'SMK', 3, 1, 6, '2025-09-19 04:33:14', '2025-09-19 04:33:14');

-- --------------------------------------------------------

--
-- Table structure for table `kalender_akademik`
--

CREATE TABLE `kalender_akademik` (
  `id` int NOT NULL,
  `judul_kegiatan` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `deskripsi` text COLLATE utf8mb4_unicode_ci,
  `tanggal_mulai` date NOT NULL,
  `tanggal_selesai` date NOT NULL,
  `jenis_kegiatan` enum('pembelajaran','ujian','libur','kegiatan','lainnya') COLLATE utf8mb4_unicode_ci NOT NULL,
  `warna_kalender` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT '#3B82F6',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `kalender_akademik`
--

INSERT INTO `kalender_akademik` (`id`, `judul_kegiatan`, `deskripsi`, `tanggal_mulai`, `tanggal_selesai`, `jenis_kegiatan`, `warna_kalender`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'Pendaftaran PPDB Gelombang 1', 'Pendaftaran peserta didik baru gelombang pertama', '2024-06-01', '2024-06-30', 'kegiatan', '#3B82F6', 1, '2025-09-18 22:55:41', '2025-09-18 22:55:41'),
(2, 'Ujian Tengah Semester Ganjil', 'Pelaksanaan UTS semester ganjil', '2024-10-01', '2024-10-15', 'ujian', '#3B82F6', 1, '2025-09-18 22:55:41', '2025-09-18 22:55:41'),
(3, 'Libur Semester Ganjil', 'Libur akhir semester ganjil', '2024-12-18', '2025-01-02', 'libur', '#3B82F6', 1, '2025-09-18 22:55:41', '2025-09-18 22:55:41');

-- --------------------------------------------------------

--
-- Table structure for table `kategori_artikel`
--

CREATE TABLE `kategori_artikel` (
  `id` int NOT NULL,
  `nama_kategori` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `deskripsi` text COLLATE utf8mb4_unicode_ci,
  `warna_kategori` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT '#3B82F6',
  `is_active` tinyint(1) DEFAULT '1',
  `urutan` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `kategori_artikel`
--

INSERT INTO `kategori_artikel` (`id`, `nama_kategori`, `slug`, `deskripsi`, `warna_kategori`, `is_active`, `urutan`, `created_at`, `updated_at`) VALUES
(1, 'Berita Sekolah', 'berita-sekolah', 'Berita terbaru dari kegiatan sekolah', '#3B82F6', 1, 0, '2025-09-18 22:55:41', '2025-09-18 22:55:41'),
(2, 'Pengumuman', 'pengumuman', 'Pengumuman resmi dari sekolah', '#EF4444', 1, 0, '2025-09-18 22:55:41', '2025-09-18 22:55:41'),
(3, 'Prestasi', 'prestasi', 'Prestasi siswa dan sekolah', '#10B981', 1, 0, '2025-09-18 22:55:41', '2025-09-18 22:55:41'),
(4, 'Kegiatan', 'kegiatan', 'Dokumentasi kegiatan sekolah', '#F59E0B', 1, 0, '2025-09-18 22:55:41', '2025-09-18 22:55:41'),
(5, 'PPDB', 'ppdb', 'Informasi Penerimaan Peserta Didik Baru', '#8B5CF6', 1, 0, '2025-09-18 22:55:41', '2025-09-18 22:55:41');

-- --------------------------------------------------------

--
-- Table structure for table `payment_options`
--

CREATE TABLE `payment_options` (
  `id` int NOT NULL,
  `nama_pembayaran` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `jumlah_pembayaran` decimal(15,2) NOT NULL DEFAULT '0.00',
  `uang_pendaftaran` decimal(15,2) DEFAULT '0.00',
  `total_pembayaran` decimal(15,2) NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `payment_terms` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `is_recommended` tinyint(1) DEFAULT '0',
  `urutan_tampil` int DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `payment_options`
--

INSERT INTO `payment_options` (`id`, `nama_pembayaran`, `jumlah_pembayaran`, `uang_pendaftaran`, `total_pembayaran`, `description`, `payment_terms`, `is_active`, `is_recommended`, `urutan_tampil`, `created_at`, `updated_at`) VALUES
(1, 'Pendaftaran', 0.00, 200000.00, 225000.00, 'Biaya pendaftaran yang sudah diperbarui', NULL, 1, 0, 1, '2025-09-19 04:05:41', '2025-09-19 04:38:46'),
(2, 'Pembayaran Minimal TBSM, TKJ, RPL, AP, AK, OTKP', 2575000.00, 200000.00, 2775000.00, 'Pembayaran minimal + uang pendaftaran', NULL, 1, 1, 2, '2025-09-19 04:05:41', '2025-09-19 04:05:41'),
(3, 'Pembayaran Minimal FARMASI & TATA BOGA', 2600000.00, 200000.00, 2800000.00, 'Pembayaran minimal + uang pendaftaran', NULL, 1, 0, 3, '2025-09-19 04:05:41', '2025-09-19 04:05:41'),
(4, 'Pembayaran Total (TBSM, TKJ, RPL, AP, AK, OTKP)', 4325000.00, 0.00, 4325000.00, 'Pembayaran satu tahun penuh (gratis biaya pendaftaran)', NULL, 1, 0, 4, '2025-09-19 04:05:41', '2025-09-19 04:05:41'),
(5, 'Pembayaran Total (FARMASI & TATA BOGA)', 4350000.00, 0.00, 4350000.00, 'Pembayaran satu tahun penuh (gratis biaya pendaftaran)', NULL, 1, 0, 5, '2025-09-19 04:05:41', '2025-09-19 04:05:41'),
(6, 'Cicilan 3 Bulan', 2000000.00, 250000.00, 2250000.00, 'Pembayaran dapat dicicil 3 bulan', 'Cicilan pertama saat pendaftaran', 1, 0, 6, '2025-09-19 04:37:34', '2025-09-19 04:37:34');

-- --------------------------------------------------------

--
-- Table structure for table `pendaftar_spmb`
--

CREATE TABLE `pendaftar_spmb` (
  `id` int NOT NULL,
  `no_pendaftaran` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pin_login` varchar(6) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nisn` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nama_lengkap` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nomor_whatsapp_aktif` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tempat_lahir` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tanggal_lahir` date DEFAULT NULL,
  `jenis_kelamin` enum('Laki-laki','Perempuan') COLLATE utf8mb4_unicode_ci NOT NULL,
  `golongan_darah` enum('O','A','B','AB','Tidak Tahu') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `agama` enum('Islam','Kristen','Katolik','Hindu','Buddha','Konghucu') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status_sekarang` enum('Ikut orang tua','Kost','Rumah sendiri','Ikut saudara') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `alamat_siswa` text COLLATE utf8mb4_unicode_ci,
  `asal_sekolah` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `alamat_sekolah` text COLLATE utf8mb4_unicode_ci,
  `tahun_lulus` year DEFAULT NULL,
  `nama_orang_tua` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nomor_whatsapp_ortu` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pendidikan_orang_tua` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pekerjaan_orang_tua` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `instansi_orang_tua` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `penghasilan_orang_tua` enum('0 S.D 1.000.000','1.000.000 S.D 2.000.000','2.000.000 S.D 5.000.000','5.000.000 ke atas') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `alamat_orang_tua` text COLLATE utf8mb4_unicode_ci,
  `pilihan_jurusan_id` int NOT NULL,
  `pilihan_pembayaran_id` int NOT NULL,
  `bukti_pembayaran` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ijazah` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `akta_kelahiran` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `kartu_keluarga` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pas_foto` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `surat_keterangan_lulus` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status_pendaftaran` enum('pending','diterima','ditolak','cadangan') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `catatan_admin` text COLLATE utf8mb4_unicode_ci,
  `submitted_ip` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `submitted_user_agent` text COLLATE utf8mb4_unicode_ci,
  `tanggal_daftar` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `bukti_pdf_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Path to generated PDF file'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `pendaftar_spmb`
--

INSERT INTO `pendaftar_spmb` (`id`, `no_pendaftaran`, `pin_login`, `nisn`, `nama_lengkap`, `nomor_whatsapp_aktif`, `tempat_lahir`, `tanggal_lahir`, `jenis_kelamin`, `golongan_darah`, `agama`, `status_sekarang`, `alamat_siswa`, `asal_sekolah`, `alamat_sekolah`, `tahun_lulus`, `nama_orang_tua`, `nomor_whatsapp_ortu`, `pendidikan_orang_tua`, `pekerjaan_orang_tua`, `instansi_orang_tua`, `penghasilan_orang_tua`, `alamat_orang_tua`, `pilihan_jurusan_id`, `pilihan_pembayaran_id`, `bukti_pembayaran`, `ijazah`, `akta_kelahiran`, `kartu_keluarga`, `pas_foto`, `surat_keterangan_lulus`, `status_pendaftaran`, `catatan_admin`, `submitted_ip`, `submitted_user_agent`, `tanggal_daftar`, `created_at`, `updated_at`, `bukti_pdf_path`) VALUES
(1, 'SMK202561765', '780259', '1234567890', 'John Doe Testing', '081234567890', 'Jakarta', '2005-01-15', 'Laki-laki', 'A', 'Islam', 'Ikut orang tua', 'Jl. Testing No. 123, Jakarta', 'SMP Negeri 1 Jakarta', 'Jl. Sekolah No. 456', '2024', 'John Senior', '081234567891', 'S1', 'Karyawan Swasta', 'PT ABC Indonesia', '2.000.000 S.D 5.000.000', 'Jl. Orang Tua No. 789', 2, 2, 'bukti_pembayaran-1758263917586-68507980.pdf', 'ijazah-1758263917589-983688751.pdf', 'akta_kelahiran-1758263917586-168866521.pdf', 'kartu_keluarga-1758263917587-504830209.pdf', 'pas_foto-1758263917588-161035956.jpg', 'surat_keterangan_lulus-1758263917589-308513833.pdf', 'diterima', 'Selamat! Anda diterima di SMK Teknologi Maju', '::1', 'PostmanRuntime/7.46.1', '2025-09-19 06:38:37', '2025-09-19 06:38:37', '2025-09-19 09:27:10', 'bukti-SMK202561765-1758274030111.pdf'),
(2, 'SMK202560766', '573952', '1234567890', 'John Doe Testing 2', '081234567890', 'Jakarta', '2005-01-15', 'Laki-laki', 'A', 'Islam', 'Ikut orang tua', 'Jl. Testing No. 123, Jakarta', 'SMP Negeri 1 Jakarta', 'Jl. Sekolah No. 456', '2024', 'John Senior', '081234567891', 'S1', 'Karyawan Swasta', 'PT ABC Indonesia', '2.000.000 S.D 5.000.000', 'Jl. Orang Tua No. 789', 3, 3, 'bukti_pembayaran-1758264312597-976227251.pdf', 'ijazah-1758264312600-315175527.pdf', 'akta_kelahiran-1758264312598-398179299.pdf', 'kartu_keluarga-1758264312598-713906427.pdf', 'pas_foto-1758264312599-79023692.jpg', 'surat_keterangan_lulus-1758264312600-200077828.pdf', 'pending', NULL, '::1', 'PostmanRuntime/7.46.1', '2025-09-19 06:45:12', '2025-09-19 06:45:12', '2025-09-19 06:45:12', NULL),
(3, 'SMK202533506', '392350', '1234567890', 'John Doe Testing 2', '081234567890', 'Jakarta', '2005-01-15', 'Laki-laki', 'A', 'Islam', 'Ikut orang tua', 'Jl. Testing No. 123, Jakarta', 'SMP Negeri 1 Jakarta', 'Jl. Sekolah No. 456', '2024', 'John Senior', '081234567891', 'S1', 'Karyawan Swasta', 'PT ABC Indonesia', '2.000.000 S.D 5.000.000', 'Jl. Orang Tua No. 789', 3, 3, 'bukti_pembayaran-1758264427632-206038491.pdf', 'ijazah-1758264427634-365828513.pdf', 'akta_kelahiran-1758264427632-677684322.pdf', 'kartu_keluarga-1758264427632-513765824.pdf', 'pas_foto-1758264427634-125550158.jpg', 'surat_keterangan_lulus-1758264427635-298917674.pdf', 'pending', NULL, '::1', 'PostmanRuntime/7.46.1', '2025-09-19 06:47:07', '2025-09-19 06:47:07', '2025-09-19 06:47:07', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `program_keahlian`
--

CREATE TABLE `program_keahlian` (
  `id` int NOT NULL,
  `kode_program` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama_program` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `deskripsi` text COLLATE utf8mb4_unicode_ci,
  `kuota_siswa` int DEFAULT '36',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `program_keahlian`
--

INSERT INTO `program_keahlian` (`id`, `kode_program`, `nama_program`, `deskripsi`, `kuota_siswa`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'RPL', 'Rekayasa Perangkat Lunak', 'Program keahlian yang fokus pada pengembangan software dan aplikasi', 36, 1, '2025-09-18 22:55:24', '2025-09-18 22:55:24'),
(2, 'TKJ', 'Teknik Komputer dan Jaringan', 'Program keahlian yang fokus pada hardware komputer dan jaringan', 36, 1, '2025-09-18 22:55:24', '2025-09-18 22:55:24'),
(3, 'MM', 'Multimedia', 'Program keahlian yang fokus pada desain grafis dan multimedia', 36, 1, '2025-09-18 22:55:24', '2025-09-18 22:55:24'),
(4, 'TBSM', 'Teknik Bisnis Sepeda Motor', 'Program keahlian yang fokus pada otomotif sepeda motor', 36, 1, '2025-09-18 22:55:24', '2025-09-18 22:55:24');

-- --------------------------------------------------------

--
-- Table structure for table `public_documents`
--

CREATE TABLE `public_documents` (
  `id` int NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Judul dokumen',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT 'Deskripsi dokumen',
  `category` enum('pengumuman','kurikulum','akademik','administrasi','keuangan','prestasi','lainnya') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'lainnya',
  `original_filename` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nama file asli',
  `stored_filename` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nama file di server',
  `file_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Path lengkap file',
  `file_size` int NOT NULL COMMENT 'Ukuran file dalam bytes',
  `file_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'MIME type file',
  `file_extension` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Ekstensi file',
  `is_active` tinyint(1) DEFAULT '1' COMMENT 'Status aktif/nonaktif',
  `is_featured` tinyint(1) DEFAULT '0' COMMENT 'Apakah ditampilkan di featured',
  `requires_login` tinyint(1) DEFAULT '0' COMMENT 'Apakah butuh login untuk download',
  `upload_date` date NOT NULL COMMENT 'Tanggal dokumen',
  `published_date` date DEFAULT NULL COMMENT 'Tanggal publikasi',
  `expiry_date` date DEFAULT NULL COMMENT 'Tanggal kedaluwarsa',
  `download_count` int DEFAULT '0' COMMENT 'Jumlah download',
  `last_downloaded_at` timestamp NULL DEFAULT NULL COMMENT 'Terakhir didownload',
  `uploaded_by` int NOT NULL COMMENT 'ID admin yang upload',
  `approved_by` int DEFAULT NULL COMMENT 'ID admin yang approve',
  `approved_at` timestamp NULL DEFAULT NULL COMMENT 'Waktu approval',
  `tags` text COLLATE utf8mb4_unicode_ci COMMENT 'Tags untuk pencarian (comma separated)',
  `keywords` text COLLATE utf8mb4_unicode_ci COMMENT 'Keywords untuk SEO',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `public_documents`
--

INSERT INTO `public_documents` (`id`, `title`, `description`, `category`, `original_filename`, `stored_filename`, `file_path`, `file_size`, `file_type`, `file_extension`, `is_active`, `is_featured`, `requires_login`, `upload_date`, `published_date`, `expiry_date`, `download_count`, `last_downloaded_at`, `uploaded_by`, `approved_by`, `approved_at`, `tags`, `keywords`, `created_at`, `updated_at`) VALUES
(4, 'Formulir Pendaftaran PPDB 2025', 'Formulir resmi untuk pendaftaran penerimaan peserta didik baru tahun ajaran 2025/2026', 'administrasi', 'formulir-ppdb-2025.pdf', 'doc-1758383419-formulir-ppdb.pdf', '/uploads/public-docs/doc-1758383419-formulir-ppdb.pdf', 2048000, 'application/pdf', 'pdf', 1, 0, 0, '2025-09-20', '2025-09-20', NULL, 0, NULL, 11, 11, '2025-09-20 15:50:19', 'ppdb, pendaftaran, formulir, 2025', 'formulir pendaftaran ppdb 2025 siswa baru', '2025-09-20 15:50:19', '2025-09-20 15:50:19'),
(5, 'Kalender Akademik 2024/2025', 'Kalender akademik lengkap untuk tahun ajaran 2024/2025 termasuk jadwal ujian dan libur', 'akademik', 'kalender-akademik-2024-2025.pdf', 'doc-1758383419-kalender-akademik.pdf', '/uploads/public-docs/doc-1758383419-kalender-akademik.pdf', 1536000, 'application/pdf', 'pdf', 1, 0, 0, '2025-09-20', '2025-09-20', NULL, 0, NULL, 11, 11, '2025-09-20 15:50:19', 'kalender, akademik, jadwal, ujian', 'kalender akademik 2024 2025 jadwal sekolah', '2025-09-20 15:50:19', '2025-09-20 15:50:19'),
(6, 'Struktur Kurikulum Merdeka', 'Struktur dan implementasi kurikulum merdeka di SMK Teknologi', 'kurikulum', 'struktur-kurikulum-merdeka.pdf', 'doc-1758383419-kurikulum-merdeka.pdf', '/uploads/public-docs/doc-1758383419-kurikulum-merdeka.pdf', 3072000, 'application/pdf', 'pdf', 1, 0, 0, '2025-09-20', '2025-09-20', NULL, 0, NULL, 11, 11, '2025-09-20 15:50:19', 'kurikulum, merdeka, struktur, pembelajaran', 'kurikulum merdeka SMK struktur pembelajaran', '2025-09-20 15:50:19', '2025-09-20 15:50:19'),
(8, 'Updated Document Title', 'Updated description', 'pengumuman', 'Irsyad Fata Al Aidi - Programmer - CV - Updated.pdf', 'doc-1758405251946-951564668-irsyad-fata-al-aidi-programmer-cv-updated.pdf', '/uploads/public-docs/doc-1758405251946-951564668-irsyad-fata-al-aidi-programmer-cv-updated.pdf', 78977, 'application/pdf', 'pdf', 1, 1, 0, '2025-09-20', NULL, NULL, 1, '2025-09-20 21:59:55', 11, 11, '2025-09-20 14:54:12', 'test, postman, upload', 'test document postman', '2025-09-20 21:54:11', '2025-09-20 22:17:13'),
(9, 'update document title 1', 'updated', 'pengumuman', 'ijazah.pdf', 'doc-1758406527131-504863992-ijazah.pdf', '/uploads/public-docs/doc-1758406527131-504863992-ijazah.pdf', 225908, 'application/pdf', 'pdf', 1, 0, 0, '2025-09-20', NULL, NULL, 0, NULL, 11, 11, '2025-09-20 22:17:38', 'test, update', NULL, '2025-09-20 22:15:27', '2025-09-20 22:17:38');

-- --------------------------------------------------------

--
-- Table structure for table `rate_limit_tracking`
--

CREATE TABLE `rate_limit_tracking` (
  `id` int NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL,
  `endpoint` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `request_count` int DEFAULT '1',
  `window_start` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `last_request` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `school_info`
--

CREATE TABLE `school_info` (
  `id` int NOT NULL,
  `school_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `school_address` text COLLATE utf8mb4_unicode_ci,
  `school_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `school_email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `school_website` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `school_logo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `primary_color` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT '#007bff',
  `secondary_color` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT '#6c757d',
  `background_color` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT '#ffffff',
  `registration_status` enum('open','closed','maintenance') COLLATE utf8mb4_unicode_ci DEFAULT 'open',
  `academic_year` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT '2025/2026',
  `registration_start_date` date DEFAULT NULL,
  `registration_end_date` date DEFAULT NULL,
  `max_students` int DEFAULT '1000',
  `contact_person` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_whatsapp` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `school_info`
--

INSERT INTO `school_info` (`id`, `school_name`, `school_address`, `school_phone`, `school_email`, `school_website`, `school_logo`, `primary_color`, `secondary_color`, `background_color`, `registration_status`, `academic_year`, `registration_start_date`, `registration_end_date`, `max_students`, `contact_person`, `contact_whatsapp`, `created_at`, `updated_at`) VALUES
(1, 'SMK Teknologi Maju', 'Jl. Teknologi No. 123, Jakarta', '021-1234567', 'admin@smkteknologi.sch.id', NULL, NULL, '#2563eb', '#64748b', '#ffffff', 'open', '2025/2026', NULL, NULL, 1000, 'Pak Admin', '081234567890', '2025-09-19 04:05:41', '2025-09-19 13:58:52');

-- --------------------------------------------------------

--
-- Table structure for table `school_personnel`
--

CREATE TABLE `school_personnel` (
  `id` int NOT NULL,
  `full_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nama lengkap dengan gelar',
  `photo_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Path foto profil 3x4cm',
  `position_category` enum('leadership','teacher','staff','support') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Kategori posisi',
  `position_title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Jabatan/posisi',
  `department` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Departemen/bidang',
  `subject_taught` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Mata pelajaran yang diajar',
  `teaching_since_year` year DEFAULT NULL COMMENT 'Mulai mengajar sejak tahun',
  `hierarchy_level` int DEFAULT '5' COMMENT '1=Kepala, 2=Wakil, 3=Koordinator, 4=Staff/Guru, 5=Support',
  `reports_to` int DEFAULT NULL COMMENT 'ID atasan langsung',
  `display_order` int DEFAULT '1' COMMENT 'Urutan tampilan dalam kategori',
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Email resmi',
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Nomor telepon',
  `is_active` tinyint(1) DEFAULT '1' COMMENT 'Status aktif/non-aktif',
  `education_background` text COLLATE utf8mb4_unicode_ci COMMENT 'Latar belakang pendidikan',
  `certifications` text COLLATE utf8mb4_unicode_ci COMMENT 'Sertifikat yang dimiliki',
  `bio` text COLLATE utf8mb4_unicode_ci COMMENT 'Biografi singkat',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `school_personnel`
--

INSERT INTO `school_personnel` (`id`, `full_name`, `photo_path`, `position_category`, `position_title`, `department`, `subject_taught`, `teaching_since_year`, `hierarchy_level`, `reports_to`, `display_order`, `email`, `phone`, `is_active`, `education_background`, `certifications`, `bio`, `created_at`, `updated_at`) VALUES
(1, 'Dr. Ahmad Susanto, S.Pd., M.Pd.', NULL, 'leadership', 'Kepala Sekolah', 'Pimpinan', NULL, '2010', 1, NULL, 1, 'kepala@sekolah.edu', '081234567890', 1, 'S3 Manajemen Pendidikan Universitas Negeri Jakarta', 'Sertifikat Kepala Sekolah, Sertifikat Manajemen Pendidikan', 'Kepala sekolah berpengalaman dengan dedikasi tinggi dalam pengembangan pendidikan berkualitas.', '2025-09-20 14:49:18', '2025-09-20 14:49:18'),
(2, 'Dra. Siti Nurhaliza, M.Pd.', NULL, 'leadership', 'Wakil Kepala Sekolah Bidang Kurikulum', 'Kurikulum', 'Bahasa Indonesia', '2012', 2, 1, 1, 'wakil.kurikulum@sekolah.edu', '081234567891', 1, 'S2 Pendidikan Bahasa Indonesia', 'Sertifikat Pendidik, Sertifikat Kurikulum 2013', 'Wakil kepala sekolah yang menangani pengembangan kurikulum dan pembelajaran.', '2025-09-20 14:49:18', '2025-09-20 14:49:30'),
(3, 'Drs. Bambang Hartono, M.Pd.', NULL, 'leadership', 'Wakil Kepala Sekolah Bidang Kesiswaan', 'Kesiswaan', 'Pendidikan Jasmani', '2008', 2, 1, 2, 'wakil.kesiswaan@sekolah.edu', '081234567892', 1, 'S2 Pendidikan Olahraga', 'Sertifikat Pendidik, Sertifikat Konselor', 'Wakil kepala sekolah yang membina pengembangan karakter dan kegiatan siswa.', '2025-09-20 14:49:18', '2025-09-20 14:49:30'),
(4, 'Ir. Dewi Sartika, S.Pd.', NULL, 'teacher', 'Guru Matematika', 'MIPA', 'Matematika', '2015', 4, 2, 1, 'dewi.matematika@sekolah.edu', '081234567893', 1, 'S1 Pendidikan Matematika', 'Sertifikat Pendidik, Sertifikat Profesi Guru', 'Guru matematika yang kreatif dalam mengembangkan metode pembelajaran inovatif.', '2025-09-20 14:49:18', '2025-09-20 14:49:31'),
(5, 'Dr. Agus Priyanto, S.Si., M.Pd.', NULL, 'teacher', 'Guru Fisika', 'MIPA', 'Fisika', '2013', 4, 2, 2, 'agus.fisika@sekolah.edu', '081234567894', 1, 'S2 Pendidikan Fisika', 'Sertifikat Pendidik, Sertifikat Laboratorium', 'Guru fisika dengan spesialisasi eksperimen dan praktikum laboratorium.', '2025-09-20 14:49:18', '2025-09-20 14:49:31'),
(6, 'Dra. Rina Wulandari, M.Pd.', NULL, 'teacher', 'Guru Bahasa Inggris', 'Bahasa', 'Bahasa Inggris', '2014', 4, 2, 1, 'rina.english@sekolah.edu', '081234567895', 1, 'S2 Pendidikan Bahasa Inggris', 'Sertifikat Pendidik, TOEFL Certificate', 'Guru bahasa Inggris yang aktif dalam program pertukaran internasional.', '2025-09-20 14:49:18', '2025-09-20 14:49:31'),
(7, 'S.Pd. Hendra Setiawan', NULL, 'teacher', 'Guru Sejarah', 'IPS', 'Sejarah', '2016', 4, 2, 1, 'hendra.sejarah@sekolah.edu', '081234567896', 1, 'S1 Pendidikan Sejarah', 'Sertifikat Pendidik', 'Guru sejarah yang gemar mengajak siswa belajar melalui wisata edukatif.', '2025-09-20 14:49:18', '2025-09-20 14:49:31'),
(8, 'Dra. Yuni Astuti', NULL, 'staff', 'Kepala Tata Usaha', 'Administrasi', NULL, '2011', 3, 1, 1, 'yuni.tu@sekolah.edu', '081234567897', 1, 'S1 Administrasi Negara', 'Sertifikat Administrasi Sekolah', 'Kepala tata usaha yang mengelola administrasi sekolah dengan tertib dan efisien.', '2025-09-20 14:49:18', '2025-09-20 14:49:30'),
(9, 'A.Md. Sari Indah', NULL, 'staff', 'Staff Keuangan', 'Keuangan', NULL, '2017', 4, 8, 1, 'sari.keuangan@sekolah.edu', '081234567898', 1, 'D3 Akuntansi', 'Sertifikat Akuntansi', 'Staff keuangan yang mengelola anggaran dan keuangan sekolah.', '2025-09-20 14:49:18', '2025-09-20 14:49:31'),
(10, 'SMA. Budi Santoso', NULL, 'staff', 'Staff Perpustakaan', 'Akademik', NULL, '2018', 4, 8, 2, 'budi.perpus@sekolah.edu', '081234567899', 1, 'SMA + Kursus Perpustakaan', 'Sertifikat Pengelolaan Perpustakaan', 'Staff perpustakaan yang rajin menata dan melayani peminjaman buku.', '2025-09-20 14:49:18', '2025-09-20 14:49:31'),
(11, 'SMP. Joko Susilo', NULL, 'support', 'Satpam', 'Keamanan', NULL, '2019', 5, 8, 1, NULL, '081234567800', 1, 'SMP', 'Sertifikat Keamanan', 'Satpam sekolah yang bertanggung jawab menjaga keamanan lingkungan sekolah.', '2025-09-20 14:49:18', '2025-09-20 14:49:31'),
(12, 'SD. Wati Sumber', NULL, 'support', 'Cleaning Service', 'Kebersihan', NULL, '2020', 5, 8, 1, NULL, '081234567801', 1, 'SD', NULL, 'Petugas kebersihan yang menjaga kebersihan lingkungan sekolah.', '2025-09-20 14:49:18', '2025-09-20 14:49:31'),
(13, 'test', NULL, 'teacher', 'test1', NULL, 'test subject', '2023', 5, NULL, 1, 'test@example.com', '12213124124', 1, NULL, NULL, NULL, '2025-09-20 15:15:04', '2025-09-20 15:15:04'),
(14, 'test ubah', '/uploads/personnel/personnel-1758381397456-186844918.jpg', 'teacher', 'test1', NULL, NULL, NULL, 5, NULL, 1, 'test@example.com', NULL, 0, NULL, NULL, NULL, '2025-09-20 15:15:48', '2025-09-20 15:16:52'),
(15, 'sss', '/uploads/personnel/personnel-1758409466003-458440058.jpg', 'teacher', 'Guru test', 'Matematika', 'Matematika', '2019', 3, NULL, 1, 'john.doe@sekolah.com', '08123456789', 1, 'S1 Pendidikan Matematika', NULL, NULL, '2025-09-20 23:03:25', '2025-09-20 23:04:35');

-- --------------------------------------------------------

--
-- Table structure for table `school_settings`
--

CREATE TABLE `school_settings` (
  `id` int NOT NULL,
  `setting_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `setting_value` text COLLATE utf8mb4_unicode_ci,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `school_settings`
--

INSERT INTO `school_settings` (`id`, `setting_key`, `setting_value`, `description`, `created_at`, `updated_at`) VALUES
(1, 'school_name', 'SMA Negeri 1 Jakarta', 'Nama sekolah', '2025-09-23 13:31:41', '2025-09-23 13:31:41'),
(2, 'school_address', 'Jl. Pendidikan No. 123, Jakarta Pusat, DKI Jakarta 10001', 'Alamat lengkap sekolah', '2025-09-23 13:31:41', '2025-09-23 13:31:41'),
(3, 'school_phone', '(021) 1234-5678', 'Nomor telepon sekolah', '2025-09-23 13:31:41', '2025-09-23 13:31:41'),
(4, 'school_email', 'info@sman1jakarta.sch.id', 'Email resmi sekolah', '2025-09-23 13:31:41', '2025-09-23 13:31:41'),
(5, 'school_website', 'www.sman1jakarta.sch.id', 'Website sekolah', '2025-09-23 13:31:41', '2025-09-23 13:31:41'),
(6, 'maps_latitude', '-6.2088', 'Latitude koordinat sekolah (Jakarta area)', '2025-09-23 13:31:41', '2025-09-23 13:31:41'),
(7, 'maps_longitude', '106.8456', 'Longitude koordinat sekolah (Jakarta area)', '2025-09-23 13:31:41', '2025-09-23 13:31:41'),
(8, 'maps_embed_url', '', 'URL embed Google Maps (kosong = gunakan koordinat)', '2025-09-23 13:31:41', '2025-09-23 13:31:41'),
(9, 'contact_email', 'admin@sman1jakarta.sch.id', 'Email untuk notifikasi kontak', '2025-09-23 13:31:41', '2025-09-23 13:31:41'),
(10, 'whatsapp_number', '+6281234567890', 'Nomor WhatsApp sekolah', '2025-09-23 13:31:41', '2025-09-23 13:31:41'),
(11, 'instagram_handle', '@sman1jakarta', 'Handle Instagram sekolah', '2025-09-23 13:31:41', '2025-09-23 13:31:41'),
(12, 'facebook_page', 'SMA Negeri 1 Jakarta', 'Nama halaman Facebook', '2025-09-23 13:31:41', '2025-09-23 13:31:41');

-- --------------------------------------------------------

--
-- Table structure for table `security_logs`
--

CREATE TABLE `security_logs` (
  `id` int NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `endpoint` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `method` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attempt_type` enum('login','registration','api_access','file_upload','suspicious') COLLATE utf8mb4_unicode_ci DEFAULT 'api_access',
  `status` enum('success','failed','blocked') COLLATE utf8mb4_unicode_ci DEFAULT 'success',
  `reason` text COLLATE utf8mb4_unicode_ci,
  `user_id` int DEFAULT NULL,
  `session_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `spmb_registrations`
--

CREATE TABLE `spmb_registrations` (
  `id` int NOT NULL,
  `nomor_pendaftaran` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pin` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama_lengkap` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama_panggilan` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tempat_lahir` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tanggal_lahir` date NOT NULL,
  `jenis_kelamin` enum('L','P') COLLATE utf8mb4_unicode_ci NOT NULL,
  `agama` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `golongan_darah` varchar(5) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tinggi_badan` int DEFAULT NULL,
  `berat_badan` int DEFAULT NULL,
  `alamat` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `rt` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rw` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `kelurahan` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `kecamatan` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `kabupaten` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `provinsi` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `kode_pos` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `no_telepon` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nama_ayah` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pekerjaan_ayah` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `penghasilan_ayah` int DEFAULT NULL,
  `nama_ibu` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pekerjaan_ibu` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `penghasilan_ibu` int DEFAULT NULL,
  `nama_wali` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `no_telepon_wali` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sekolah_asal` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `alamat_sekolah_asal` text COLLATE utf8mb4_unicode_ci,
  `tahun_lulus` year NOT NULL,
  `no_ijazah` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pilihan_jurusan` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `jenis_pembayaran_id` int DEFAULT NULL,
  `file_ijazah` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_akta_kelahiran` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_kartu_keluarga` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_pas_foto` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_surat_keterangan_lulus` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tanggal_pendaftaran` date NOT NULL,
  `status` enum('pending','verified','accepted','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `catatan` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `testimoni`
--

CREATE TABLE `testimoni` (
  `id` int NOT NULL,
  `nama_pemberi` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `deskripsi` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `foto_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `display_order` int DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `testimoni`
--

INSERT INTO `testimoni` (`id`, `nama_pemberi`, `status`, `deskripsi`, `foto_path`, `is_active`, `display_order`, `created_at`, `updated_at`) VALUES
(2, 'Sari Dewi', 'Orang Tua', 'Saya puas dengan pendidikan yang diberikan kepada anak saya.', NULL, 1, 1, '2025-09-22 00:34:03', '2025-09-22 00:34:03'),
(3, 'Test User Updated', 'Siswa Aktif', 'Testimoni yang sudah diupdate melalui Postman testing', NULL, 1, 1, '2025-09-22 00:43:01', '2025-09-22 00:50:28');

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_email_performance`
-- (See below for the actual view)
--
CREATE TABLE `v_email_performance` (
`avg_send_time` decimal(24,4)
,`count` bigint
,`date` date
,`status` enum('sent','failed','pending')
,`type` varchar(50)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_registration_stats`
-- (See below for the actual view)
--
CREATE TABLE `v_registration_stats` (
`avg_processing_hours` decimal(24,4)
,`count` bigint
,`date` date
,`nama_jurusan` varchar(100)
,`status_pendaftaran` enum('pending','diterima','ditolak','cadangan')
);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `academic_calendar`
--
ALTER TABLE `academic_calendar`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `admins`
--
ALTER TABLE `admins`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_username` (`username`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `admin_users`
--
ALTER TABLE `admin_users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `alumni`
--
ALTER TABLE `alumni`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `articles`
--
ALTER TABLE `articles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_slug` (`slug`),
  ADD KEY `idx_kategori` (`kategori_id`),
  ADD KEY `idx_published` (`is_published`),
  ADD KEY `idx_featured` (`is_featured`),
  ADD KEY `idx_tanggal_publish` (`tanggal_publish`),
  ADD KEY `idx_views` (`views`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_published_featured` (`is_published`,`is_featured`),
  ADD KEY `idx_kategori_published` (`kategori_id`,`is_published`),
  ADD KEY `idx_tanggal_published` (`tanggal_publish`,`is_published`);
ALTER TABLE `articles` ADD FULLTEXT KEY `judul` (`judul`,`konten_singkat`,`tags`);

--
-- Indexes for table `blocked_ips`
--
ALTER TABLE `blocked_ips`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ip_address` (`ip_address`),
  ADD KEY `idx_ip_address` (`ip_address`),
  ADD KEY `idx_blocked_until` (`blocked_until`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_slug` (`slug`),
  ADD UNIQUE KEY `unique_nama` (`nama_kategori`);

--
-- Indexes for table `contact_messages`
--
ALTER TABLE `contact_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_category` (`category`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_email` (`email`);

--
-- Indexes for table `document_categories`
--
ALTER TABLE `document_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `category_name` (`category_name`),
  ADD UNIQUE KEY `category_slug` (`category_slug`),
  ADD KEY `idx_active_order` (`is_active`,`display_order`);

--
-- Indexes for table `document_download_logs`
--
ALTER TABLE `document_download_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_document` (`document_id`),
  ADD KEY `idx_date` (`download_time`),
  ADD KEY `idx_ip` (`ip_address`);

--
-- Indexes for table `email_logs`
--
ALTER TABLE `email_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_recipient` (`recipient`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_type` (`type`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_registration_id` (`registration_id`),
  ADD KEY `idx_email_composite` (`status`,`type`,`created_at`) USING BTREE,
  ADD KEY `idx_email_registration` (`registration_id`,`status`) USING BTREE;

--
-- Indexes for table `email_templates`
--
ALTER TABLE `email_templates`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD KEY `idx_name` (`name`),
  ADD KEY `idx_type` (`type`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `guru_staff`
--
ALTER TABLE `guru_staff`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nip` (`nip`),
  ADD KEY `idx_guru_jabatan` (`jabatan`),
  ADD KEY `idx_guru_status` (`status`);

--
-- Indexes for table `jurusan`
--
ALTER TABLE `jurusan`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `kode_jurusan` (`kode_jurusan`);

--
-- Indexes for table `kalender_akademik`
--
ALTER TABLE `kalender_akademik`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `kategori_artikel`
--
ALTER TABLE `kategori_artikel`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nama_kategori` (`nama_kategori`),
  ADD UNIQUE KEY `slug` (`slug`);

--
-- Indexes for table `payment_options`
--
ALTER TABLE `payment_options`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `pendaftar_spmb`
--
ALTER TABLE `pendaftar_spmb`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `no_pendaftaran` (`no_pendaftaran`),
  ADD KEY `pilihan_jurusan_id` (`pilihan_jurusan_id`),
  ADD KEY `pilihan_pembayaran_id` (`pilihan_pembayaran_id`),
  ADD KEY `idx_status` (`status_pendaftaran`),
  ADD KEY `idx_tanggal_daftar` (`tanggal_daftar`),
  ADD KEY `idx_nama_lengkap` (`nama_lengkap`),
  ADD KEY `idx_bukti_pdf_path` (`bukti_pdf_path`),
  ADD KEY `idx_spmb_composite_search` (`status_pendaftaran`,`tanggal_daftar`,`pilihan_jurusan_id`) USING BTREE,
  ADD KEY `idx_spmb_no_pin` (`no_pendaftaran`,`pin_login`) USING BTREE,
  ADD KEY `idx_spmb_whatsapp` (`nomor_whatsapp_aktif`) USING BTREE;

--
-- Indexes for table `program_keahlian`
--
ALTER TABLE `program_keahlian`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `kode_program` (`kode_program`);

--
-- Indexes for table `public_documents`
--
ALTER TABLE `public_documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_category` (`category`),
  ADD KEY `idx_active` (`is_active`),
  ADD KEY `idx_featured` (`is_featured`),
  ADD KEY `idx_upload_date` (`upload_date`),
  ADD KEY `idx_published_date` (`published_date`),
  ADD KEY `idx_downloads` (`download_count`),
  ADD KEY `idx_search` (`title`,`description`(255)),
  ADD KEY `uploaded_by` (`uploaded_by`),
  ADD KEY `approved_by` (`approved_by`);

--
-- Indexes for table `rate_limit_tracking`
--
ALTER TABLE `rate_limit_tracking`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_ip_endpoint_window` (`ip_address`,`endpoint`,`window_start`),
  ADD KEY `idx_ip_endpoint` (`ip_address`,`endpoint`),
  ADD KEY `idx_window_start` (`window_start`);

--
-- Indexes for table `school_info`
--
ALTER TABLE `school_info`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `school_personnel`
--
ALTER TABLE `school_personnel`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_category` (`position_category`),
  ADD KEY `idx_hierarchy` (`hierarchy_level`,`display_order`),
  ADD KEY `idx_active` (`is_active`),
  ADD KEY `idx_department` (`department`),
  ADD KEY `idx_subject` (`subject_taught`),
  ADD KEY `reports_to` (`reports_to`);

--
-- Indexes for table `school_settings`
--
ALTER TABLE `school_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_setting_key` (`setting_key`);

--
-- Indexes for table `security_logs`
--
ALTER TABLE `security_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ip_address` (`ip_address`),
  ADD KEY `idx_attempt_type` (`attempt_type`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `spmb_registrations`
--
ALTER TABLE `spmb_registrations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nomor_pendaftaran` (`nomor_pendaftaran`),
  ADD KEY `idx_nomor_pendaftaran` (`nomor_pendaftaran`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_tanggal_pendaftaran` (`tanggal_pendaftaran`);

--
-- Indexes for table `testimoni`
--
ALTER TABLE `testimoni`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `academic_calendar`
--
ALTER TABLE `academic_calendar`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `admins`
--
ALTER TABLE `admins`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `admin_users`
--
ALTER TABLE `admin_users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `alumni`
--
ALTER TABLE `alumni`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `articles`
--
ALTER TABLE `articles`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `blocked_ips`
--
ALTER TABLE `blocked_ips`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `contact_messages`
--
ALTER TABLE `contact_messages`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `document_categories`
--
ALTER TABLE `document_categories`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `document_download_logs`
--
ALTER TABLE `document_download_logs`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `email_logs`
--
ALTER TABLE `email_logs`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `email_templates`
--
ALTER TABLE `email_templates`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `guru_staff`
--
ALTER TABLE `guru_staff`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `jurusan`
--
ALTER TABLE `jurusan`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `kalender_akademik`
--
ALTER TABLE `kalender_akademik`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `kategori_artikel`
--
ALTER TABLE `kategori_artikel`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `payment_options`
--
ALTER TABLE `payment_options`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `pendaftar_spmb`
--
ALTER TABLE `pendaftar_spmb`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `program_keahlian`
--
ALTER TABLE `program_keahlian`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `public_documents`
--
ALTER TABLE `public_documents`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `rate_limit_tracking`
--
ALTER TABLE `rate_limit_tracking`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `school_info`
--
ALTER TABLE `school_info`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `school_personnel`
--
ALTER TABLE `school_personnel`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `school_settings`
--
ALTER TABLE `school_settings`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `security_logs`
--
ALTER TABLE `security_logs`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `spmb_registrations`
--
ALTER TABLE `spmb_registrations`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `testimoni`
--
ALTER TABLE `testimoni`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

-- --------------------------------------------------------

--
-- Structure for view `v_email_performance`
--
DROP TABLE IF EXISTS `v_email_performance`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_email_performance`  AS SELECT cast(`email_logs`.`created_at` as date) AS `date`, `email_logs`.`type` AS `type`, `email_logs`.`status` AS `status`, count(0) AS `count`, avg(timestampdiff(SECOND,`email_logs`.`created_at`,coalesce(`email_logs`.`sent_at`,`email_logs`.`created_at`))) AS `avg_send_time` FROM `email_logs` GROUP BY cast(`email_logs`.`created_at` as date), `email_logs`.`type`, `email_logs`.`status` ;

-- --------------------------------------------------------

--
-- Structure for view `v_registration_stats`
--
DROP TABLE IF EXISTS `v_registration_stats`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_registration_stats`  AS SELECT cast(`p`.`tanggal_daftar` as date) AS `date`, `p`.`status_pendaftaran` AS `status_pendaftaran`, `j`.`nama_jurusan` AS `nama_jurusan`, count(0) AS `count`, avg(timestampdiff(HOUR,`p`.`tanggal_daftar`,`p`.`updated_at`)) AS `avg_processing_hours` FROM (`pendaftar_spmb` `p` left join `jurusan` `j` on((`p`.`pilihan_jurusan_id` = `j`.`id`))) GROUP BY cast(`p`.`tanggal_daftar` as date), `p`.`status_pendaftaran`, `j`.`nama_jurusan` ;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `articles`
--
ALTER TABLE `articles`
  ADD CONSTRAINT `fk_articles_kategori` FOREIGN KEY (`kategori_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `document_download_logs`
--
ALTER TABLE `document_download_logs`
  ADD CONSTRAINT `document_download_logs_ibfk_1` FOREIGN KEY (`document_id`) REFERENCES `public_documents` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `pendaftar_spmb`
--
ALTER TABLE `pendaftar_spmb`
  ADD CONSTRAINT `pendaftar_spmb_ibfk_1` FOREIGN KEY (`pilihan_jurusan_id`) REFERENCES `jurusan` (`id`),
  ADD CONSTRAINT `pendaftar_spmb_ibfk_2` FOREIGN KEY (`pilihan_pembayaran_id`) REFERENCES `payment_options` (`id`);

--
-- Constraints for table `public_documents`
--
ALTER TABLE `public_documents`
  ADD CONSTRAINT `public_documents_ibfk_1` FOREIGN KEY (`uploaded_by`) REFERENCES `admin_users` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `public_documents_ibfk_2` FOREIGN KEY (`approved_by`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `school_personnel`
--
ALTER TABLE `school_personnel`
  ADD CONSTRAINT `school_personnel_ibfk_1` FOREIGN KEY (`reports_to`) REFERENCES `school_personnel` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
