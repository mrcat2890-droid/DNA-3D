# Model DNA 3D Ultra-Realistis (GEN-OS 3D BIO-CORE)

Aplikasi eksplorasi interaktif molekuler heliks ganda DNA 360° berstandar riset yang dibangun dengan **React + TypeScript + Vite + Three.js**. Berdasarkan data kristalografi sinar-X PDB ID: 1BNA (Dickerson et al., 1982) serta model struktur Watson-Crick (1953) & Rosalind Franklin.

---

## Fitur Utama

### 1. Konformasi Alotropik Kristalografi
- **B-DNA**: Bentuk fisiologis alami di dalam sel (heliks kanan, 10.5 pb/putaran, diameter 2.0 nm, *rise* 0.34 nm, *pitch* 3.4 nm).
- **A-DNA**: Bentuk terdehidrasi & dupleks hibrida RNA-DNA (heliks kanan kompak, kemiringan basa 19°, 11.0 pb/putaran, diameter 2.3 nm).
- **Z-DNA**: Heliks kidal (*left-handed*) ramping dengan tulang punggung dinukleotida purin-pirimidin bergantian berpola zigzag (12.0 pb/putaran, diameter 1.8 nm).

### 2. Standar Representasi Molekuler Ilmiah
- **Bio-Illustrative**: Cincin planar purin (cincin 6 + 5) & pirimidin (cincin 6), nodus gula deoksiribosa, dan pita tulang punggung gula-fosfat berkelanjutan.
- **CPK Space-Filling**: Permukaan atomik Van der Waals padat berdasarkan radius atom standar (C, N, O, P, H).
- **Ball & Stick**: Kerangka ikatan kimia kovalen eksplisit dan jembatan ikatan hidrogen 3D.
- **Coulombic Surface Map**: Peta potensial elektrostatik permukaan (-1e gugus fosfat anionik bermuatan negatif vs netralitas inti basa aromatik hidrofobik).

### 3. Simulasi Fenomena & Lesi Molekuler
- **Normal**: Heliks utuh dengan pemasangan basa komplementer aturan Chargaff (A=T dengan 2 ikatan H, G≡C dengan 3 ikatan H).
- **Metilasi Epigenetik (5-mC)**: Penambahan gugus metil ($-\text{CH}_3$) pada karbon-5 sitosin di lekukan mayor (*Major Groove*) untuk simulasi regulasi ekspresi gen.
- **Dimer Timin (CPD)**: Fotolesi *cyclobutane pyrimidine dimer* akibat radiasi UV matahari yang memicu distorsi/tekukan heliks lokal ~30°.
- **Interkalasi Obat Kanker**: Penyisipan senyawa aromatik planar (seperti Doksorubisin/Etidium) di antara tumpukan pasangan basa yang meregangkan *rise* vertikal dan mengurai pilinan heliks (*unwinding*).

### 4. Auto-Focus Kamera 3D & Inspektor Molekuler Pintar
- **Pemusatan Kamera Otomatis (*3D Camera Auto-Focus*)**: Memilih komponen molekuler (`A`, `T`, `G`, `C`, `backbone`, `hbond`, `methylation`, `thymine_dimer`, `intercalator`, `ion_mg`, `water_hydration`) melalui chip akses cepat di Panel Inspektor maupun klik *raycasting* pada objek 3D secara otomatis menghitung titik tengah geometri (*bounding box centroid* `THREE.Box3`) dan mengarahkan kamera tepat ke komponen tersebut.
- **Orientasi Radial & Pelacakan *Real-Time***: Kamera menyelaraskan sudut pandang sepanjang vektor radial keluar dari pusat sumbu DNA pada jarak makro optimal (`radius ≈ 17.5–22.0`) dan terus melacak posisi molekul secara *real-time* selama rotasi otomatis maupun getaran termal 37°C.
- **Siklus Residu & Aktivasi Lapisan Otomatis**: Tombol **"Pusatkan Ulang"** / **"Pusatkan Kamera"** memungkinkan pengguna berpindah antar-residu sejenis di sekitar pusat heliks dengan efek denyut skala & pendaran *bloom*. Memilih komponen lesi atau ion pelarut dari direktori akan otomatis mengaktifkan lapisan visual terkait di kanvas 3D.
- **Kartu Data Molekuler Lengkap**: Menampilkan rumus kimia, massa molekul (g/mol), pasangan komplementer, kekuatan ikatan hidrogen/kovalen, peran biologis, dan signifikansi genetik/klinis.

### 5. Mode Realitas Virtual (WebXR 360°), Pelacakan Tangan 25 Sendi & Game CRISPR
- **Pelacakan Tangan Langsung (*WebXR Hand Input API* — 25 Sendi Tanpa Kontroler)**:
  - Merender kerangka tangan 3D bio-holografik 25 sendi standar W3C secara *real-time* di dalam ruang virtual menggunakan `xrFrame.getJointPose()`.
  - **Gestur Manipulasi Molekuler Lengkap**:
    - ***Pinch-to-Select* & *Direct Fingertip Touch***: Mencubit ibu jari & telunjuk (`≤ 24 mm`) atau menyentuhkan ujung jari telunjuk langsung ke molekul (`≤ 11.5 cm`) untuk memilih nukleotida dan memperbaiki mutasi.
    - ***Pinch-Hold & Drag-to-Rotate / Elevate* (`pinch_drag`)**: Mencubit dan menahan di ruang kosong lalu menggeser tangan untuk memutar heliks DNA dengan inersia atau mengatur ketinggian molekul.
    - ***Bimanual Two-Hand Pinch Scale & Twist* (`bimanual_scale`)**: Mencubit dengan **kedua tangan secara bersamaan** untuk memperbesar/memperkecil skala heliks DNA (`0.45x` – `2.80x`) dan memutar kemiringan struktur.
    - ***Whole-Hand Fist Grab* (`fist_grab`)**: Mengepalkan tangan di dekat heliks untuk mencengkeram dan memutar molekul secara langsung.
- **Standarisasi Kontroler 6-DoF Multi-Headset & Haptik Universal**:
  - Kompatibel lintas *runtime* untuk **Meta Quest (Quest 2 / 3 / 3S / Pro)**, **Pico XR (Pico 4 / Neo 3)**, **Valve Index Knuckles**, **HTC Vive Wand**, **Windows Mixed Reality**, **Apple Vision Pro (`transient-pointer`)**, dan **HTML5 Gamepad** lengkap dengan kalibrasi sudut sinar laser, *3D Magnetic Aim-Assist*, serta getaran *Dual-Path WebXR Haptics*.
  - Optimasi *Stereoscopic Depth Buffer* (`LEQUAL`, `logarithmicDepthBuffer`, sinkronisasi `depthNear = 0.05m` / `depthFar = 180m`) untuk mencegah *Z-fighting* dan *clipping* pada setiap perangkat keras VR.
- **Mode Misi Game VR: Perbaikan Mutasi DNA (*CRISPR Repair Mode*) & Audio Spasial**:
  - Simulasi permainan interaktif 60 detik di dalam VR dengan efek suara spasial prosedural (*Web Audio API*) untuk memindai dan menyembuhkan lesi mutasi pasangan basa DNA, dilengkapi Kartu Inspektor Holografik 3D melayang di ruang virtual dan pemilihan tatapan mata (*Gaze-Dwell Reticle* 1,2 detik).
- **Indikator Baterai, Latensi & Telemetri Gestur pada VR HUD**:
  - **Telemetri Latensi & FPS (`#vr-hud-latency`)**: Memantau latensi frame *motion-to-photon* (`ms`) dan *refresh rate* (`FPS`) secara *real-time* lengkap dengan indikator status performa (`OPTIMAL`, `STABIL`, `TINGGI`).
  - **Indikator Daya Baterai (`#vr-hud-battery`)**: Terintegrasi dengan **Web Battery Status API** (`navigator.getBattery()`) untuk menampilkan persentase baterai headset (`BAT` / `CHG`) dan peringatan warna adaptif.
  - **Telemetri Hand Tracking**: Menampilkan status `WEBXR HAND API (25 SENDI)`, mode gestur aktif, dan jarak cubitan jari dalam satuan milimeter (`mm`).

### 6. Pencahayaan PBR *RoomEnvironment*, *Macro Depth-of-Field (Bokeh)* & *UnrealBloom*
- **Refleksi Lingkungan Mikroskopis PBR**: Integrasi `PMREMGenerator` + `RoomEnvironment` untuk memberikan kilau permukaan atom CPK dan cincin purin/pirimidin berstandar laboratorium.
- **Kedalaman Ruang Fotografi Makro (`BokehPass`)**: Efek buram latar belakang (*Depth of Field*) yang otomatis mengunci jarak fokus pada nukleotida target saat *Auto-Focus* aktif.
- **Pendaran Selektif Anti-Silau (`UnrealBloomPass`)**: Dilengkapi kontrol *Emission Threshold* (`0.00` – `1.00`), *Bloom Strength*, dan preset pencahayaan instan (**Subtle**, **Cinematic**, **Extreme**, **Custom**).

### 7. Sintesis Sekuens Nukleotida, Biofisika Seluler & Ekspor Bioinformatika (`.PDB` / `.FASTA`)
- **Editor Sekuens Dinamis & Metrik Termodinamika**: Input sekuens kustom hingga 24 pb dengan preset bioinformatika, kalkulasi kadar GC (%), estimasi titik leleh ($T_m$), dan total ikatan hidrogen secara *real-time*.
- **Studio Ekspor Standar Riset**: Unduh struktur DNA yang telah dirancang ke dalam berkas koordinat atomik 3D **Protein Data Bank (`.pdb`)**, format sekuens **FASTA (`.fasta`)**, tabel metrik termodinamika (`.csv` / `.json`), atau tangkapan layar kanvas 3D **PNG Resolusi Tinggi** tanpa panel UI.
- **Lingkungan Biofisika**: Simulasi dinamika termal 37°C (*Brownian motion*), lapisan solvasi molekul air (*Spine of Hydration*), ion pelindung $\text{Mg}^{2+}$, serta animasi *Unzip* dan *Exploded View*.

---

## Panduan Pemasangan & Penggunaan di Perangkat VR (Tutorial Lengkap)

Aplikasi ini dibangun di atas standar **WebXR Device API**, sehingga Anda **tidak perlu mengunduh atau menginstal berkas aplikasi (`.apk` / `.exe`) secara terpisah**. Namun, demi keamanan sensor kamera dan pelacakan ruang, spesifikasi WebXR mewajibkan aplikasi diakses melalui koneksi aman (**HTTPS**) atau **`localhost`**.

Berikut adalah panduan langkah demi langkah sesuai perangkat VR yang Anda gunakan:

### 1. Headset VR Mandiri (*Standalone*): Meta Quest (Quest 2 / 3 / 3S / Pro) & Pico XR (Pico 4 / Neo 3)

#### Cara A — Akses Langsung via Tautan Web HTTPS (Paling Praktis)
1. Nyalakan headset **Meta Quest** atau **Pico** Anda dan pastikan terhubung ke jaringan Wi-Fi.
2. Buka aplikasi peramban bawaan (**Meta Quest Browser** atau **Pico Browser**).
3. Masukkan alamat URL *deployment* HTTPS aplikasi ini.
4. Pada bilah navigasi kanan atas aplikasi, klik tombol **`VR 360°`** (atau aktifkan **`Mode Game CRISPR`** di dalam HUD VR).
5. Saat muncul dialog izin dari browser headset, klik **Allow / Izinkan** untuk memulai sesi imersif penuh.

#### Cara B — Menjalankan Server Lokal dari PC/Laptop ke Headset via Kabel USB (`adb reverse`)
Jika Anda menjalankan kode sumber secara lokal (`npm run dev`) di komputer dan ingin mengujinya langsung di headset dengan latensi nol:
1. Pastikan **Developer Mode** pada headset Meta Quest / Pico sudah aktif, lalu sambungkan headset ke komputer menggunakan kabel USB-C.
2. Buka terminal di komputer Anda dan jalankan perintah *port forwarding* ADB berikut agar port `3000` di komputer dipetakan sebagai `localhost:3000` di dalam headset:
   ```bash
   adb reverse tcp:3000 tcp:3000
   ```
3. Jalankan server pengembangan aplikasi:
   ```bash
   npm run dev
   ```
4. Di dalam **Meta Quest Browser / Pico Browser**, buka alamat:
   ```text
   http://localhost:3000
   ```
5. Karena diakses melalui `localhost`, fitur **WebXR Immersive VR**, **WebXR Hand Input API (25 Sendi)**, dan **Battery Status API** akan langsung aktif sepenuhnya.

#### Cara C — Akses melalui Jaringan Wi-Fi Lokal (LAN) Tanpa Kabel
Jika Anda membuka alamat IP lokal komputer (misalnya `http://192.168.1.15:3000`) melalui Wi-Fi dari dalam headset:
1. Buka tab baru di **Meta Quest Browser** dan ketikkan:
   ```text
   chrome://flags/#unsafely-treat-insecure-origin-as-secure
   ```
2. Pada kolom teks **`Insecure origins treated as secure`**, ketik alamat IP dan port komputer Anda (contoh: `http://192.168.1.15:3000`).
3. Ubah dropdown dari *Default* menjadi **Enabled**, lalu tekan tombol **Relaunch** di bagian bawah browser.
4. Buka kembali `http://192.168.1.15:3000` dan klik tombol **`VR 360°`**.

---

### 2. Cara Mengaktifkan & Menggunakan Pelacakan Tangan (*WebXR Hand Tracking 25 Sendi*)

Agar Anda dapat memanipulasi struktur DNA langsung menggunakan jari tangan kosong tanpa kontroler:
1. **Aktifkan di Pengaturan Headset**:
   - Pada Meta Quest: Buka **Settings → Movement Tracking → Hand and Body Tracking**, lalu aktifkan **Hand Tracking** dan **Auto-Switch between Controllers and Hands**.
   - Pada Meta Quest Browser (jika menggunakan versi lama): Pastikan flag `chrome://flags/#webxr-hands` berada dalam status **Enabled** (pada OS terbaru sudah aktif secara bawaan).
2. **Beralih ke Mode Tangan di Dalam VR**:
   - Setelah masuk ke mode **`VR 360°`**, letakkan kedua kontroler Anda di atas meja dan angkat kedua tangan di depan kamera headset.
   - Kerangka tangan 3D bio-holografik berwarna sian (**25 Sendi & 24 Segmen Tulang**) akan langsung muncul mengikuti gerakan jari Anda, dan indikator **`WEBXR HAND API (25 SENDI)`** akan menyala di VR HUD.
3. **Daftar Gestur Tangan di Dalam Ruang Virtual**:
   - **Cubit Singkat (*Pinch-to-Select*)**: Arahkan sinar tangan ke basa DNA lalu pertemukan ujung **Ibu Jari + Jari Telunjuk** (`≤ 24 mm`) untuk menginspeksi molekul atau menyembuhkan mutasi CRISPR.
   - **Sentuhan Ujung Jari (*Direct Fingertip Touch*)**: Dekatkan tangan Anda ke heliks DNA dan sentuhkan langsung ujung jari telunjuk ke bola atom/basa nitrogen.
   - **Cubit-Tahan & Geser (*Pinch-Hold & Drag*)**: Cubit dan tahan di area kosong, lalu gerakkan tangan ke kiri/kanan untuk **memutar heliks DNA** atau ke atas/bawah untuk **menaikkan/menurunkan molekul**.
   - **Cubit Dua Tangan (*Bimanual Scale & Twist*)**: Cubit dengan **tangan kiri dan kanan secara bersamaan**, lalu rentangkan atau rapatkan kedua tangan untuk **memperbesar/memperkecil ukuran DNA (`0.45x` – `2.80x`)**, atau putar kemiringan kedua tangan untuk memutar orientasi heliks.
   - **Kepalan Tangan (*Whole-Hand Fist Grab*)**: Kepalkan jari-jari Anda di dekat heliks DNA untuk mencengkeram dan memutar struktur secara langsung.

---

### 3. Apple Vision Pro (visionOS) & PC VR (SteamVR / HTC Vive / Valve Index / Quest Link)

- **Apple Vision Pro (Safari di visionOS)**:
  1. Buka aplikasi Safari di visionOS, lalu masuk ke **Settings → Apps → Safari → Advanced → Feature Flags** dan pastikan **WebXR Device API** serta **WebXR Hand Input Module** dalam keadaan aktif.
  2. Buka tautan aplikasi dan ketuk **`VR 360°`**. Sistem akan secara otomatis mendeteksi profil **`transient-pointer`** sehingga Anda cukup menatap nukleotida dengan mata dan mencubitkan jari untuk berinteraksi.
- **PC VR (SteamVR / Meta Quest Link / Virtual Desktop)**:
  1. Pastikan aplikasi **SteamVR** atau **Meta Quest Link** telah berjalan di PC dan ditetapkan sebagai *Active OpenXR Runtime*.
  2. Buka aplikasi menggunakan **Google Chrome** atau **Microsoft Edge** di PC, lalu klik **`VR 360°`**. Tampilan stereoskopik akan langsung dikirimkan ke headset PC VR Anda lengkap dengan dukungan kontroler 6-DoF dan getaran haptik.

---

### 4. Smartphone / Mobile VR (Headset Lensa Pasif & Mode Simulasi 360°)

Jika Anda menggunakan smartphone atau perangkat tanpa runtime WebXR bawaan:
1. Buka aplikasi di browser ponsel atau desktop, lalu klik tombol **`VR 360°`**.
2. Aplikasi akan otomatis mengaktifkan **Mode Simulasi Panorama 360° Interaktif** lengkap dengan **Cincin Tatapan Mata (*Gaze-Dwell Reticle* 1,2 detik)** di tengah layar.
3. Arahkan titik tengah pandangan tepat ke komponen DNA selama **1,2 detik** hingga cincin indikator penuh untuk memilih molekul atau memperbaiki mutasi tanpa perlu menekan tombol apa pun.

---

## Ringkasan Pembaruan Terbaru (Changelog)

Lihat berkas [`CHANGELOG.md`](./CHANGELOG.md) untuk rincian riwayat perubahan setiap versi:
- **v1.6.0**: Integrasi penuh **WebXR Hand Input API (Pelacakan Tangan 25 Sendi)** dengan gestur *Pinch-to-Select*, *Pinch-Drag Rotate*, *Bimanual Two-Hand Scale & Twist*, dan *Fist Grab*; standarisasi **WebXR InputSource API Multi-Headset** (Meta Quest, Pico, Vive, Index, Vision Pro) dengan *Dual-Path Haptics*; serta optimasi **Stereoscopic Depth Buffer** anti-*clipping*.
- **v1.5.0**: Penambahan **Mode Misi Game VR: Perbaikan Mutasi DNA (CRISPR Repair)** dengan synthesizer audio spasial Web Audio API, **Kartu Inspektor Holografik 3D** di ruang virtual, pencahayaan **PBR RoomEnvironment**, efek **Macro Depth of Field (BokehPass)**, serta studio ekspor **`.PDB` / `.FASTA` / Snapshot PNG**.
- **v1.4.0**: Sistem *Auto-Focus* kamera 3D pintar pada komponen molekuler dengan pelacakan *real-time*, serta indikator baterai (Web Battery API) dan telemetri latensi/FPS headset XR pada VR HUD.
- **v1.3.0**: Efek *post-processing* `UnrealBloomPass`, kalibrasi anti-silau, kontrol *Emission Threshold*, dan dropdown preset pencahayaan (*Subtle*, *Cinematic*, *Extreme*).
- **v1.2.0**: Dukungan mode *Virtual Reality* (WebXR 360° & simulasi stereoskopik), penataan ulang tata letak modal profesional, tipografi saintifik, dan penggantian seluruh emotikon dengan ikon SVG teknis.
- **v1.0.0**: Rilis awal mesin visualisasi kristalografi DNA 3D (B/A/Z-DNA, 4 mode representasi, simulasi lesi genetik, dan sintesis sekuens).

---

## Struktur Proyek Utama

```text
├── src/
│   ├── components/
│   │   ├── DnaCanvas.tsx          # Mesin render Three.js, WebXR Hand Input API (25 sendi), Multi-Headset Raycaster, BokehPass & Game CRISPR
│   │   ├── Header.tsx             # Bilah navigasi atas, pemicu WebXR VR, Mode Game CRISPR & kontrol audio/tampilan
│   │   ├── ControlsPanel.tsx      # Panel instrumen konformasi, sekuens, biofisika, PBR, DoF & ekspor bioinformatika
│   │   ├── InspectorPanel.tsx     # Direktori komponen, kontrol fokus kamera 3D & kartu detail kimia
│   │   ├── MobileDock.tsx         # Bilah kontrol cepat untuk navigasi & tampilan pada layar mobile
│   │   ├── AnnotationsOverlay.tsx # Label penanda anotasi dinamis 3D di atas heliks DNA
│   │   ├── InteractionHint.tsx    # Petunjuk interaksi navigasi & gestur
│   │   └── TutorialModal.tsx      # Modal panduan interaktif 5 langkah
│   ├── data/
│   │   └── dnaData.ts             # Data kristalografi, parameter konformasi & ensiklopedia molekul
│   ├── types/
│   │   └── dna.ts                 # Definisi tipe TypeScript (konformasi, telemetri VR & Hand Tracking, state aplikasi)
│   ├── utils/
│   │   ├── scienceExport.ts       # Generator & ekspor berkas PDB, FASTA, CSV, JSON, dan Snapshot PNG
│   │   └── vrAudio.ts             # Synthesizer audio spasial prosedural Web Audio API untuk interaksi & game VR
│   ├── App.tsx                    # Orkestrasi state utama, VR HUD overlay & integrasi Web Battery API
│   └── index.css                  # Sistem desain CSS, tata letak HUD & animasi antarmuka
├── CHANGELOG.md                   # Dokumentasi riwayat perubahan & peningkatan fitur
└── README.md                      # Dokumentasi utama proyek & tutorial pemasangan VR
```

---

## Pengembangan Lokal

Pastikan Anda memiliki Node.js atau Bun yang terpasang di sistem Anda, kemudian jalankan:

```bash
npm install
npm run dev
```

Server pengembangan akan berjalan secara otomatis pada port `3000` (`http://0.0.0.0:3000`). Untuk membangun bundel produksi:

```bash
npm run build
```


