# Model DNA 3D Ultra-Realistis (GEN-OS 3D BIO-CORE)

Aplikasi eksplorasi interaktif molekuler heliks ganda DNA 360° yang dibangun dengan **React + TypeScript + Vite + Three.js**. Berdasarkan data kristalografi sinar-X PDB ID: 1BNA (Dickerson et al., 1982) dan model Watson-Crick (1953) & Rosalind Franklin.

## Fitur Utama

- **Konformasi Alotropik Kristalografi**:
  - **B-DNA**: Bentuk fisiologis alami (heliks kanan, 10.5 pb/putaran, diameter 2.0 nm, rise 0.34 nm, pitch 3.4 nm)
  - **A-DNA**: Bentuk terdehidrasi & hibrida RNA-DNA (heliks kanan kompak, kemiringan 19°, 11.0 pb/putaran)
  - **Z-DNA**: Heliks kidal (*left-handed*) ramping dengan kerangka dinukleotida zigzag (12.0 pb/putaran)

- **Standar Representasi Molekuler Ilmiah**:
  - **Bio-Illustrative**: Cincin planar purin (cincin 6 + 5) & pirimidin (cincin 6), nodus deoksiribosa, dan pita tulang punggung berkelanjutan
  - **CPK Space-Filling**: Permukaan atomik Van der Waals padat (C, N, O, P, H)
  - **Ball & Stick**: Kerangka ikatan kimia kovalen dan jembatan hidrogen 3D
  - **Coulombic Surface Map**: Peta potensial elektrostatik (-1e fosfat anionik vs netralitas inti aromatik hidrofobik)

- **Simulasi Fenomena & Lesi Molekuler**:
  - **Normal**: Heliks utuh pasangan basa Chargaff
  - **Metilasi Epigenetik (5-mC)**: Gugus -CH₃ di lekukan mayor (Major Groove)
  - **Dimer Timin (CPD)**: Fotolesi radiasi UV matahari penyebab tekukan/kink ~30°
  - **Interkalasi Obat Kanker**: Penyisipan molekul aromatik planar antarpasangan basa & *unwinding*

- **Sintesis Sekuens Nukleotida Dinamis**:
  - Input sekuens kustom hingga 24 pasang basa dengan komplementasi otomatis
  - Preset bioinformatika: Watson-Crick, CpG Island (GC tinggi), TATA Box (AT kaya), poly(dG-dC) Z
  - Metrik *real-time*: Panjang (pb), Kadar GC (%), Titik Leleh Denaturasi Termal (Tₘ), dan Total Ikatan Hidrogen

- **Biofisika & Lingkungan Seluler**:
  - Dinamika Termal (37°C Brownian motion breathing)
  - Solvasi & Ion Lawan pelindung (Mg²⁺) serta *Spine of Hydration* di lekukan minor
  - Skala Metrik Ilmiah 3D (Diameter, Rise, Pitch)

- **Inspeksi & Interaksi**:
  - Raycaster multi-platform (klik desktop & sentuhan mobile responsif)
  - Kartu inspektor molekul: rumus kimia, berat molekul, pasangan komplementer, energi ikatan, peran biologis & signifikansi genetik
  - Animasi pembelahan untai ganda (*Unzip*), dekonstruksi komponen (*Exploded View*), dan rekonsiliasi (*Reset Assembly*)
  - Panduan tutorial interaktif 5 langkah terpadu

## Pengembangan

```bash
npm install
npm run dev
```

Dev server akan berjalan pada port 3000 (`http://0.0.0.0:3000`).
