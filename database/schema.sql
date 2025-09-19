-- ==========================================
-- SEKOLAH DATABASE SCHEMA
-- ==========================================

USE sekolah_db;

-- Tabel Admin Users
CREATE TABLE admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabel School Settings
CREATE TABLE school_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama_sekolah VARCHAR(200) NOT NULL,
    alamat_lengkap TEXT NOT NULL,
    telepon VARCHAR(20),
    email VARCHAR(100),
    website VARCHAR(100),
    logo_path VARCHAR(255),
    nis_sekolah VARCHAR(50),
    npsn_sekolah VARCHAR(50),
    kepala_sekolah VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabel Program Keahlian/Jurusan
CREATE TABLE program_keahlian (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kode_program VARCHAR(10) UNIQUE NOT NULL,
    nama_program VARCHAR(100) NOT NULL,
    deskripsi TEXT,
    kuota_siswa INT DEFAULT 36,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabel Pendaftar SPMB
CREATE TABLE pendaftar_spmb (
    id INT AUTO_INCREMENT PRIMARY KEY,
    no_pendaftaran VARCHAR(20) UNIQUE NOT NULL,
    pin_login VARCHAR(6) NOT NULL,
    
    -- Biodata Siswa
    nama_lengkap VARCHAR(100) NOT NULL,
    nik VARCHAR(16) UNIQUE NOT NULL,
    nisn VARCHAR(10),
    jenis_kelamin ENUM('L', 'P') NOT NULL,
    tempat_lahir VARCHAR(50) NOT NULL,
    tanggal_lahir DATE NOT NULL,
    agama ENUM('Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu') NOT NULL,
    alamat_lengkap TEXT NOT NULL,
    rt_rw VARCHAR(10),
    desa_kelurahan VARCHAR(50) NOT NULL,
    kecamatan VARCHAR(50) NOT NULL,
    kabupaten_kota VARCHAR(50) NOT NULL,
    provinsi VARCHAR(50) NOT NULL,
    kode_pos VARCHAR(10),
    no_hp VARCHAR(15) NOT NULL,
    email VARCHAR(100),
    anak_ke INT NOT NULL,
    jumlah_saudara INT NOT NULL,
    hobi VARCHAR(100),
    cita_cita VARCHAR(100),
    
    -- Data Ayah
    nama_ayah VARCHAR(100) NOT NULL,
    nik_ayah VARCHAR(16) NOT NULL,
    tempat_lahir_ayah VARCHAR(50),
    tanggal_lahir_ayah DATE,
    pendidikan_ayah VARCHAR(50),
    pekerjaan_ayah VARCHAR(50) NOT NULL,
    penghasilan_ayah DECIMAL(12,2),
    no_hp_ayah VARCHAR(15),
    
    -- Data Ibu
    nama_ibu VARCHAR(100) NOT NULL,
    nik_ibu VARCHAR(16) NOT NULL,
    tempat_lahir_ibu VARCHAR(50),
    tanggal_lahir_ibu DATE,
    pendidikan_ibu VARCHAR(50),
    pekerjaan_ibu VARCHAR(50) NOT NULL,
    penghasilan_ibu DECIMAL(12,2),
    no_hp_ibu VARCHAR(15),
    
    -- Data Wali (Optional)
    nama_wali VARCHAR(100),
    nik_wali VARCHAR(16),
    tempat_lahir_wali VARCHAR(50),
    tanggal_lahir_wali DATE,
    pendidikan_wali VARCHAR(50),
    pekerjaan_wali VARCHAR(50),
    penghasilan_wali DECIMAL(12,2),
    no_hp_wali VARCHAR(15),
    hubungan_wali VARCHAR(50),
    
    -- Data Sekolah Asal
    sekolah_asal VARCHAR(100) NOT NULL,
    npsn_sekolah_asal VARCHAR(20),
    alamat_sekolah_asal TEXT,
    no_peserta_un VARCHAR(50),
    no_ijazah VARCHAR(50),
    no_skhun VARCHAR(50),
    nilai_rata_rata DECIMAL(4,2),
    
    -- Pilihan Program
    pilihan_program_1 INT NOT NULL,
    pilihan_program_2 INT,
    
    -- File Uploads (PDF paths)
    file_akta_kelahiran VARCHAR(255),
    file_kartu_keluarga VARCHAR(255),
    file_ijazah VARCHAR(255),
    file_skhun VARCHAR(255),
    file_foto VARCHAR(255),
    
    -- Status dan Metadata
    status_pendaftaran ENUM('pending', 'diterima', 'ditolak') DEFAULT 'pending',
    catatan_admin TEXT,
    tanggal_daftar TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (pilihan_program_1) REFERENCES program_keahlian(id),
    FOREIGN KEY (pilihan_program_2) REFERENCES program_keahlian(id)
);

-- Tabel Kategori Artikel
CREATE TABLE kategori_artikel (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama_kategori VARCHAR(50) UNIQUE NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    deskripsi TEXT,
    warna_kategori VARCHAR(7) DEFAULT '#3B82F6', -- Hex color
    is_active BOOLEAN DEFAULT TRUE,
    urutan INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabel Artikel
CREATE TABLE artikel (
    id INT AUTO_INCREMENT PRIMARY KEY,
    judul VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    konten_singkat TEXT,
    konten_lengkap LONGTEXT NOT NULL,
    gambar_utama VARCHAR(255),
    kategori_id INT NOT NULL,
    penulis VARCHAR(100),
    is_published BOOLEAN DEFAULT FALSE,
    tanggal_publish DATE,
    views INT DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    meta_description TEXT,
    tags TEXT, -- JSON array untuk tags
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (kategori_id) REFERENCES kategori_artikel(id) ON DELETE RESTRICT
);

-- Tabel Guru dan Staff
CREATE TABLE guru_staff (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nip VARCHAR(20) UNIQUE,
    nama_lengkap VARCHAR(100) NOT NULL,
    jenis_kelamin ENUM('L', 'P') NOT NULL,
    tempat_lahir VARCHAR(50),
    tanggal_lahir DATE,
    alamat TEXT,
    no_hp VARCHAR(15),
    email VARCHAR(100),
    jabatan VARCHAR(50) NOT NULL,
    mata_pelajaran VARCHAR(100), -- untuk guru
    pendidikan_terakhir VARCHAR(50),
    tahun_bergabung YEAR,
    status ENUM('aktif', 'non-aktif', 'pensiun') DEFAULT 'aktif',
    foto_profile VARCHAR(255),
    deskripsi TEXT,
    urutan_tampil INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabel Kalender Akademik
CREATE TABLE kalender_akademik (
    id INT AUTO_INCREMENT PRIMARY KEY,
    judul_kegiatan VARCHAR(150) NOT NULL,
    deskripsi TEXT,
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE NOT NULL,
    jenis_kegiatan ENUM('pembelajaran', 'ujian', 'libur', 'kegiatan', 'lainnya') NOT NULL,
    warna_kalender VARCHAR(7) DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ==========================================
-- INDEXES untuk Performance
-- ==========================================

-- Index untuk pencarian cepat
CREATE INDEX idx_pendaftar_no_pendaftaran ON pendaftar_spmb(no_pendaftaran);
CREATE INDEX idx_pendaftar_nama ON pendaftar_spmb(nama_lengkap);
CREATE INDEX idx_pendaftar_status ON pendaftar_spmb(status_pendaftaran);
CREATE INDEX idx_pendaftar_tanggal ON pendaftar_spmb(tanggal_daftar);

CREATE INDEX idx_artikel_kategori ON artikel(kategori_id);
CREATE INDEX idx_artikel_published ON artikel(is_published);
CREATE INDEX idx_artikel_slug ON artikel(slug);

CREATE INDEX idx_guru_jabatan ON guru_staff(jabatan);
CREATE INDEX idx_guru_status ON guru_staff(status);