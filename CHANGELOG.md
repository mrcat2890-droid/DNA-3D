# Changelog

Semua perubahan, peningkatan fitur, dan pembaruan arsitektur penting pada proyek **Model DNA 3D Ultra-Realistis (GEN-OS 3D BIO-CORE)** didokumentasikan dalam berkas ini.

Format dokumentasi ini mengacu pada standar [Keep a Changelog](https://keepachangelog.com/id/1.1.0/) dan prinsip [Semantic Versioning](https://semver.org/lang/id/).

---

## [1.4.0] - 2026-10-25

### Ditambahkan (Added)
- **Auto-Focus Kamera 3D pada Komponen Molekuler (`DnaCanvas` & `InspectorPanel`)**:
  - Pemusatan kamera otomatis secara mulus ke koordinat dunia 3D (*world-space centroid* via `THREE.Box3`) saat pengguna memilih komponen molekuler (`A`, `T`, `G`, `C`, `backbone`, `hbond`, `methylation`, `thymine_dimer`, `intercalator`, `ion_mg`, `water_hydration`) melalui direktori chip akses cepat di Panel Inspektor maupun klik *raycasting* langsung pada objek 3D.
  - Kalkulasi sudut pandang radial keluar (*outward radial vector*) dari sumbu tengah heliks DNA serta penyesuaian jarak fokus makro otomatis (`radius ≈ 17.5–22.0`) agar struktur molekul terlihat jelas tanpa terhalang untai di depannya.
  - **Pelacakan Target *Real-Time* (*Continuous Target Tracking*)**: Kamera secara dinamis mengikuti pergerakan komponen yang sedang diinspeksi selama rotasi otomatis heliks maupun fluktuasi termal Brownian (37°C).
  - **Siklus & Pemusatan Ulang Residu**: Menekan kembali chip komponen yang aktif atau mengklik tombol **"Pusatkan Ulang"** / **"Pusatkan Kamera"** pada `InspectorPanel` akan memindahkan fokus kamera ke residu representatif berikutnya di sekitar pusat heliks disertai efek denyut skala (*scale pulse*) dan sorotan cahaya *bloom*.
  - **Aktivasi Lapisan Otomatis**: Memilih komponen spesifik kondisi (`methylation`, `thymine_dimer`, `intercalator`) atau lingkungan seluler (`ion_mg`, `water_hydration`) dari `InspectorPanel` secara otomatis mengaktifkan mode kondisi atau lapisan solvasi terkait agar model 3D langsung tersedia dan terfokus di kanvas.
  - **Pelepasan Fokus Adaptif**: Menggeser kamera secara manual (*screen-space pan*), menekan tombol koordinat `0,0`, atau mereset kamera secara otomatis melepaskan penguncian fokus agar navigasi bebas tidak terganggu.

- **Telemetri Baterai & Indikator Latensi Headset XR pada VR HUD (`DnaCanvas` & `App`)**:
  - **Indikator Latensi & Performa Frame (`#vr-hud-latency`)**: Pengukuran waktu eksekusi frame dan latensi *motion-to-photon* (`ms`) serta laju penyegaran (`FPS`) secara *real-time* menggunakan *exponential moving average* di dalam siklus `setAnimationLoop` WebXR. Dilengkapi status diagnostik semantik: `OPTIMAL` (`≤ 14 ms`), `STABIL` (`15–22 ms`), dan `TINGGI` (`> 22 ms`).
  - **Pemantauan Baterai Perangkat/Headset XR (`#vr-hud-battery`)**: Integrasi **Web Battery Status API** (`navigator.getBattery()`) dengan pendengar peristiwa `levelchange` dan `chargingchange` secara langsung untuk menampilkan persentase daya (`BAT` / `CHG`), indikator visual bar SVG proporsional, serta peringatan warna adaptif (`optimal > 25%`, `low 13–25%`, `critical ≤ 12%`).

---

## [1.3.0] - 2026-10-25

### Ditambahkan (Added)
- **Pipeline Post-Processing *UnrealBloomPass* & Kalibrasi Anti-Silau**:
  - Integrasi `EffectComposer`, `RenderPass`, dan `UnrealBloomPass` pada `DnaCanvas` untuk memberikan pendaran cahaya neon pada sorotan molekuler, ikatan hidrogen, dan penanda lesi genetik.
  - Kontrol **Ambang Emisi (*Emission Threshold*)** (`0.00` – `1.00`) pada `ControlsPanel` untuk membatasi efek *bloom* hanya pada aksen berintensitas tinggi sehingga mencegah kebocoran cahaya (*light spill*) yang menyilaukan di seluruh adegan 3D.
  - **Dropdown Preset Cahaya Bloom**: Pilihan gaya pencahayaan instan tanpa penyesuaian manual:
    - **Subtle** (*Strength*: `0.22`, *Threshold*: `0.82`) — Pendaran lembut untuk observasi struktur kristalografi presisi tinggi.
    - **Cinematic** (*Strength*: `0.42`, *Threshold*: `0.68`) — Kontras dramatis dengan pendaran selektif yang seimbang.
    - **Extreme** (*Strength*: `0.85`, *Threshold*: `0.38`) — Sorotan pendaran neon maksimum untuk visualisasi presentasi.
    - **Custom** — Aktif otomatis saat pengguna menggeser *slider* intensitas atau ambang emisi secara manual.

### Diubah (Changed)
- **Kalibrasi Tone Mapping & Emisi Material**: Mengoptimalkan `ACESFilmicToneMapping` (`toneMappingExposure = 0.92`) dan menurunkan intensitas *emissive* dasar material agar warna CPK serta cincin basa tetap tajam, kaya kontras, dan nyaman di mata pada sesi penggunaan panjang.

---

## [1.2.0] - 2026-10-25

### Ditambahkan (Added)
- **Dukungan Realitas Virtual (WebXR 360° Immersive & Simulasi Stereoskopik)**:
  - Integrasi penuh sesi WebXR (`immersive-vr`) dengan ruang referensi `local-floor` untuk menjelajahi struktur heliks ganda DNA dalam skala ruang 360° menggunakan perangkat VR kompatibel.
  - Mode simulasi stereoskopik 360° interaktif (*fallback*) untuk perangkat desktop/mobile tanpa headset fisik, lengkap dengan *gaze reticle* tengah dan kontrol orientasi panorama.
  - Antarmuka **VR HUD Overlay** khusus sesi imersif untuk mengakses metrik telemetri dan keluar dari sesi VR dengan cepat.

### Diubah (Changed)
- **Penataan Ulang Modal Profesional, Tipografi Saintifik, & Ikonografi Vektor SVG**:
  - Merancang ulang tata letak modal panduan interaktif (`TutorialModal`), panel kontrol (`ControlsPanel`), panel inspektor (`InspectorPanel`), dan bilah navigasi agar rapi, proporsional, dan tidak menghalangi area pandang utama molekul 3D.
  - Menghapus seluruh penggunaan emotikon bergaya kasual dan menggantinya dengan sistem ikonografi vektor SVG teknis berpresisi tinggi.
  - Menstandarkan hierarki tipografi menggunakan keluarga font sans-serif modern untuk antarmuka pengguna dan font *monospace* (`tabular-nums`) untuk parameter biofisika, koordinat 3D, rumus kimia, serta sekuens nukleotida.

---

## [1.0.0] - 2026-10-24

### Ditambahkan (Added)
- **Mesin Visualisasi Kristalografi DNA 3D**:
  - Pemodelan 3D heliks ganda DNA berdasarkan koordinat kristalografi sinar-X PDB ID: 1BNA (Dickerson et al., 1982) dan model Watson-Crick.
  - Tiga konformasi alotropik: **B-DNA** (fisiologis kanan), **A-DNA** (terdehidrasi kompak), dan **Z-DNA** (heliks kidal zigzag).
  - Empat mode representasi ilmiah: **Bio-Illustrative**, **CPK Space-Filling**, **Ball & Stick**, dan **Coulombic Surface Map**.
  - Simulasi fenomena & lesi molekuler: **Normal**, **Metilasi Epigenetik (5-mC)**, **Dimer Timin (CPD)** akibat radiasi UV, dan **Interkalasi Obat Kanker**.
  - Editor sintesis sekuens nukleotida kustom (hingga 24 pb) dengan preset bioinformatika dan kalkulasi metrik termodinamika *real-time* (Kadar GC, titik leleh $T_m$, total ikatan hidrogen).
  - Simulasi biofisika dinamika termal 37°C (*Brownian motion*), lapisan solvasi air (*Spine of Hydration*), ion pelindung $\text{Mg}^{2+}$, serta animasi dekonstruksi untai (*Unzip* & *Exploded View*).
