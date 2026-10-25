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

### 5. Mode Realitas Virtual (WebXR 360°) & Telemetri HUD Headset
- **Integrasi WebXR Imersif**: Mendukung sesi `immersive-vr` (`local-floor`) untuk menjelajahi arsitektur molekul DNA dalam lingkungan 360° stereoskopik menggunakan headset VR yang kompatibel, dilengkapi mode simulasi panorama 360° untuk layar desktop/mobile.
- **Indikator Baterai & Latensi Headset XR pada VR HUD**:
  - **Telemetri Latensi & FPS (`#vr-hud-latency`)**: Memantau latensi frame *motion-to-photon* (`ms`) dan *refresh rate* (`FPS`) secara *real-time* menggunakan *exponential moving average* di dalam siklus render WebXR, lengkap dengan indikator status performa (`OPTIMAL`, `STABIL`, `TINGGI`).
  - **Indikator Daya Baterai (`#vr-hud-battery`)**: Terintegrasi dengan **Web Battery Status API** (`navigator.getBattery()`) untuk menampilkan persentase baterai perangkat/headset (`BAT` / `CHG`), meteran bar SVG proporsional, serta peringatan warna adaptif (`optimal > 25%`, `low 13–25%`, `critical ≤ 12%`).

### 6. Pipeline Post-Processing *UnrealBloom* & Preset Pencahayaan
- **Pendaran Selektif Anti-Silau**: Menggunakan `EffectComposer` + `UnrealBloomPass` dengan kalibrasi `ACESFilmicToneMapping` agar aksen neon dan sorotan molekul tampak hidup tanpa menyilaukan mata.
- **Kontrol *Emission Threshold* & *Bloom Strength***: Pengaturan ambang batas emisi (`0.00` – `1.00`) memastikan hanya elemen berintensitas tinggi yang berpendar, menjaga ketajaman detail geometri struktur utama.
- **Preset Visual Instan**: Tersedia pilihan preset **Subtle** (observasi ilmiah presisi), **Cinematic** (kontras dramatis seimbang), **Extreme** (pendaran neon maksimal), serta mode **Custom**.

### 7. Sintesis Sekuens Nukleotida & Biofisika Seluler
- **Editor Sekuens Dinamis**: Input sekuens kustom hingga 24 pasang basa dengan komplementasi untai otomatis serta preset bioinformatika (*Watson-Crick*, *CpG Island*, *TATA Box*, *poly(dG-dC) Z*).
- **Metrik Termodinamika *Real-Time***: Kalkulasi panjang sekuens (pb), persentase kadar GC (%), estimasi titik leleh denaturasi termal ($T_m$), dan total ikatan hidrogen.
- **Lingkungan Biofisika**: Simulasi dinamika termal 37°C (*Brownian motion breathing*), lapisan solvasi molekul air (*Spine of Hydration* di lekukan minor), ion pelindung $\text{Mg}^{2+}$ di sekitar tulang punggung fosfat, skala metrik ilmiah 3D, serta animasi *Unzip* (replikasi) dan *Exploded View*.
- **Antarmuka Saintifik Presisi**: Tata letak modal dan panel instrumen yang rapi, menggunakan ikonografi vektor SVG teknis (tanpa emotikon kasual) serta tipografi *monospace tabular* untuk keterbacaan data numerik.

---

## Ringkasan Pembaruan Terbaru (Changelog)

Lihat berkas [`CHANGELOG.md`](./CHANGELOG.md) untuk rincian riwayat perubahan setiap versi:
- **v1.4.0**: Sistem *Auto-Focus* kamera 3D pintar pada komponen molekuler dengan pelacakan *real-time*, serta indikator baterai (Web Battery API) dan telemetri latensi/FPS headset XR pada VR HUD.
- **v1.3.0**: Efek *post-processing* `UnrealBloomPass`, kalibrasi anti-silau, kontrol *Emission Threshold*, dan dropdown preset pencahayaan (*Subtle*, *Cinematic*, *Extreme*).
- **v1.2.0**: Dukungan mode *Virtual Reality* (WebXR 360° & simulasi stereoskopik), penataan ulang tata letak modal profesional, tipografi saintifik, dan penggantian seluruh emotikon dengan ikon SVG teknis.
- **v1.0.0**: Rilis awal mesin visualisasi kristalografi DNA 3D (B/A/Z-DNA, 4 mode representasi, simulasi lesi genetik, dan sintesis sekuens).

---

## Struktur Proyek Utama

```text
├── src/
│   ├── components/
│   │   ├── DnaCanvas.tsx       # Mesin render Three.js, WebXR, UnrealBloom, Raycaster & Auto-Focus 3D
│   │   ├── ControlsPanel.tsx   # Panel instrumen konformasi, sekuens, biofisika & preset Bloom
│   │   ├── InspectorPanel.tsx  # Direktori komponen, kontrol fokus kamera 3D & kartu detail kimia
│   │   ├── TopNav.tsx          # Bilah navigasi atas, pemicu WebXR VR & kontrol tampilan
│   │   ├── BottomBar.tsx       # Kontrol pemutaran rotasi, zoom, dekonstruksi & kamera
│   │   └── TutorialModal.tsx   # Modal panduan interaktif 5 langkah
│   ├── constants/
│   │   └── dnaData.ts          # Data kristalografi, parameter konformasi & ensiklopedia molekul
│   ├── types/
│   │   └── dna.ts              # Definisi tipe TypeScript (konformasi, telemetri VR, state aplikasi)
│   ├── App.tsx                 # Orkestrasi state utama, VR HUD overlay & integrasi Web Battery API
│   └── index.css               # Sistem desain CSS, tata letak HUD & animasi antarmuka
├── CHANGELOG.md                # Dokumentasi riwayat perubahan & peningkatan fitur
└── README.md                   # Dokumentasi utama proyek
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

