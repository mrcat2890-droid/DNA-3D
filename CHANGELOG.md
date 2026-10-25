# Changelog

Semua perubahan, peningkatan fitur, dan pembaruan arsitektur penting pada proyek **Model DNA 3D Ultra-Realistis (GEN-OS 3D BIO-CORE)** didokumentasikan dalam berkas ini.

Format dokumentasi ini mengacu pada standar [Keep a Changelog](https://keepachangelog.com/id/1.1.0/) dan prinsip [Semantic Versioning](https://semver.org/lang/id/).

---

## [1.6.0] - 2026-10-27

### Ditambahkan (Added)
- **Integrasi WebXR Hand Input API — Pelacakan Tangan 25 Sendi & Gestur Molekuler Langsung (`DnaCanvas`, `App`, `types/dna.ts`)**:
  - **Kerangka Tangan 3D Bio-Holografik (*25-Joint Articulated Hand Skeleton*)**: Merender 25 sendi anatomi tangan standar W3C (`wrist`, `thumb`, `index`, `middle`, `ring`, dan `little finger` dari metakarpal hingga ujung jari) beserta 24 tulang silinder penghubung secara *real-time* menggunakan `xrFrame.getJointPose(jointSpace, refSpace)` dengan *fallback* otomatis ke `renderer.xr.getHand(i).joints`.
  - **Indikator *Pinch Energy Orb* & *Reticle* Presisi**: Menampilkan bola energi *cyan* bercahaya dan cincin bidik (*reticle*) tepat di titik tengah antara ujung ibu jari (`thumb-tip`) dan ujung jari telunjuk (`index-finger-tip`) yang berubah warna secara dinamis saat jarak cubitan mendekati ambang aktivasi.
  - **Gestur *Pinch-to-Select* & *Direct Fingertip Touch***: Memungkinkan pengguna memilih komponen nukleotida atau memperbaiki lesi mutasi DNA hanya dengan mencubitkan ibu jari dan telunjuk (`≤ 24 mm` ambang aktif, `< 35 mm` histeresis pelepas) maupun menyentuhkan ujung jari telunjuk langsung ke molekul di ruang 3D (`≤ 11.5 cm`).
  - **Manipulasi Struktur Molekuler Langsung dengan Tangan (*Direct Hand Gestures*)**:
    - ***Pinch-Hold & Drag-to-Rotate / Elevate* (`pinch_drag`)**: Mencubit dan menahan di ruang kosong lalu menggerakkan tangan secara horizontal untuk memutar heliks DNA dengan momentum inersia mulus, atau menggerakkan tangan secara vertikal untuk mengatur ketinggian struktur molekul.
    - ***Bimanual Two-Hand Pinch Scale & Twist* (`bimanual_scale`)**: Mencubit dengan **kedua tangan secara bersamaan** untuk memperbesar/memperkecil skala heliks DNA (`0.45x` – `2.80x`) dengan merentangkan atau merapatkan kedua tangan, sekaligus memutar orientasi heliks mengikuti sudut kemiringan garis antar-tangan.
    - ***Whole-Hand Fist Grab* (`fist_grab`)**: Mengepalkan keempat jari ke arah telapak tangan di dekat molekul untuk mencengkeram dan memutar struktur DNA secara langsung.
  - **Telemetri Pelacakan Tangan & Gestur pada VR HUD**: Menambahkan lencana status `WEBXR HAND API (25 SENDI)`, indikator pemicu `HAND PINCH` / `HAND SENTUH`, serta pembacaan gestur aktif dan jarak cubitan (`mm` & persentase kekuatan cubitan) secara *real-time* di panel VR HUD.

- **Standarisasi WebXR InputSource API Multi-Headset & Haptik Universal (`DnaCanvas`)**:
  - **Deteksi & Normalisasi Profil Kontroler Lintas Platform**: Mengenali secara otomatis dan menormalisasi pemetaan sumbu/tombol untuk **Meta Quest (Touch / Quest 2 / 3 / 3S / Pro)**, **Pico XR (Pico 4 / Neo 3)**, **Valve Index Knuckles**, **HTC Vive Wand**, **Windows Mixed Reality (WMR)**, **Apple Vision Pro (`transient-pointer` Eye + Hand Pinch)**, serta **HTML5 Gamepad API**.
  - **Kalibrasi Sudut Ergonomi Sinar Laser (*Wrist-Pitch Offset*) & *3D Magnetic Aim-Assist***: Menyesuaikan kemiringan sinar laser berdasarkan geometri perangkat keras dan menambahkan kerucut bantuan bidik magnetik 3D (`≤ 0.42 m`) agar pemilihan molekul tetap akurat meskipun tangan bergetar di dalam VR.
  - **Umpan Balik Getaran *Dual-Path WebXR Haptics***: Mendukung getaran kontroler lintas *runtime* melalui jalur ganda `gamepad.hapticActuators` dan `gamepad.vibrationActuator.playEffect('dual-rumble')` saat menyorot basa, mengunci target, atau memperbaiki mutasi DNA.

### Dioptimalkan (Optimized)
- **Sinkronisasi *Depth Buffer* Stereoskopik & Pencegahan *Clipping* WebXR (`DnaCanvas`)**:
  - Mengonfigurasi fungsi kedalaman WebGL (`gl.depthFunc(gl.LEQUAL)`), `logarithmicDepthBuffer`, pengurutan render objek transparan berbasis jarak kamera gabungan (`ArrayCamera` mata kiri & kanan), serta sinkronisasi bidang klip `depthNear = 0.05m` dan `depthFar = 180.0m` melalui `XRSession.updateRenderState()` untuk menghilangkan kedipan tekstur (*Z-fighting*) dan pemotongan geometri saat pengguna mengamati molekul dari jarak sangat dekat di VR.

---

## [1.5.0] - 2026-10-26

### Ditambahkan (Added)
- **Mode Misi Game VR: Perbaikan Mutasi DNA (*CRISPR Repair Mode*) & Audio Spasial (`DnaCanvas`, `vrAudio.ts`, `TopNav`)**:
  - Mode permainan interaktif berdurasi 60 detik di dalam VR maupun desktop di mana pengguna memindai dan memperbaiki lesi/mismatch pasangan basa DNA menggunakan sinar laser kontroler VR, cubitan tangan (*Hand Pinch*), klik kursor, atau tatapan mata (*Gaze-Dwell*).
  - Dilengkapi indikator kristal oktahedral merah berdenyut pada lokus mutasi, efek ledakan partikel penyembuhan 3D, sistem skor dan kombo beruntun (*streak multiplier*), serta **Synthesizer Audio Spasial Web Audio API (`VrSpatialSoundEngine`)** tanpa ketergantungan berkas audio eksternal.
- **Kartu Inspektor Holografik 3D di Ruang Virtual & *Gaze-Dwell Selection* (`DnaCanvas`)**:
  - Panel informasi molekuler berbasis tekstur kanvas resolusi tinggi yang melayang langsung di samping komponen DNA di dalam ruang VR, dilengkapi cincin pengisian waktu tatapan (*Gaze-Dwell Reticle* 1,2 detik) untuk memilih molekul tanpa kontroler.
- **Pencahayaan PBR *RoomEnvironment* & Efek *Macro Depth of Field (BokehPass)* (`DnaCanvas`, `ControlsPanel`)**:
  - Integrasi refleksi lingkungan mikroskopis berbasis fisik (`PMREMGenerator` + `RoomEnvironment`) dengan penggeser intensitas refleksi PBR untuk memberikan kilau permukaan atom CPK dan cincin purin/pirimidin yang realistis.
  - Efek kedalaman ruang fotografi makro (`BokehPass`) yang secara otomatis mengunci jarak fokus pada nukleotida yang sedang diinspeksi saat fitur *Auto-Focus* aktif.
- **Studio Ekspor Bioinformatika (`.PDB` & `.FASTA`) dan Snapshot 3D Resolusi Tinggi (`DnaCanvas`, `BottomBar`, `ControlsPanel`)**:
  - Fitur unduhan instan untuk berkas sekuens standar **FASTA (`.fasta`)**, berkas koordinat struktur atomik 3D **Protein Data Bank (`.pdb`)** lengkap dengan rekaman `ATOM` dan `CONECT`, tabel metrik termodinamika (`.csv` / `.json`), serta tangkapan layar kanvas 3D **PNG Resolusi Tinggi** tanpa elemen UI.

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
