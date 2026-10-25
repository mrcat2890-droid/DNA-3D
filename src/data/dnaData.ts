import { ComponentDetails, ConformationConfig } from '../types/dna';

export const DNA_DATA: Record<string, ComponentDetails> = {
    A: {
        name: "Adenina (Adenine)",
        class: "Basa Nitrogen Purin (Cincin Ganda: Cincin 6 + Cincin 5)",
        formula: "C₅H₅N₅",
        weight: "135.13 g/mol",
        partner: "Timina (T) melalui 2 Ikatan Hidrogen",
        bonds: "2 Garis Titik Ikatan Hidrogen (A = T)",
        colorHex: "#1d63ff",
        colorNum: 0x1d63ff,
        desc: "Basa heterosiklik purin dengan dua cincin terpadu (cincin pirimidina 6-atom dan cincin imidazola 5-atom). Pada model realistis memiliki bentuk planar asimetris dengan sudut propeller twist ~12° untuk memaksimalkan tumpukan hidrofobik pi-pi.",
        func: "Menjaga stabilitas translasi informasi genetik dan membentuk pasangan stabil dengan energi disosiasi seimbang untuk replikasi DNA."
    },
    T: {
        name: "Timina (Thymine)",
        class: "Basa Nitrogen Pirimidina (Cincin Tunggal: Heksagon 6-Atom)",
        formula: "C₅H₆N₂O₂",
        weight: "126.11 g/mol",
        partner: "Adenina (A) melalui 2 Ikatan Hidrogen",
        bonds: "2 Garis Titik Ikatan Hidrogen (T = A)",
        colorHex: "#ffb703",
        colorNum: 0xffb703,
        desc: "Basa pirimidina berkarbon tunggal dengan gugus metil (-CH₃) pada posisi C5 dan gugus karbonil (=O). Berpasangan eksklusif dengan Adenina melalui dua jembatan hidrogen.",
        func: "Mencegah mutasi deaminasi spontan dalam sel dan memberikan tanda pengenal hidrofobik di lekukan mayor (Major Groove) bagi faktor transkripsi."
    },
    G: {
        name: "Guanina (Guanine)",
        class: "Basa Nitrogen Purin (Cincin Ganda: Cincin 6 + Cincin 5)",
        formula: "C₅H₅N₅O",
        weight: "151.13 g/mol",
        partner: "Sitosina (C) melalui 3 Ikatan Hidrogen",
        bonds: "3 Garis Titik Ikatan Hidrogen (G ≡ C)",
        colorHex: "#00d659",
        colorNum: 0x00d659,
        desc: "Basa purin beroksigen dengan gugus amino ekstrasiklik C2. Membentuk 3 jembatan ikatan hidrogen yang sangat kokoh dengan Sitosina.",
        func: "Memberikan kekuatan termodinamika tertinggi pada untai heliks ganda berkat 3 ikatan hidrogen yang sangat kuat dan resisten terhadap denaturasi termal."
    },
    C: {
        name: "Sitosina (Cytosine)",
        class: "Basa Nitrogen Pirimidina (Cincin Tunggal: Heksagon 6-Atom)",
        formula: "C₄H₅N₃O",
        weight: "111.10 g/mol",
        partner: "Guanina (G) melalui 3 Ikatan Hidrogen",
        bonds: "3 Garis Titik Ikatan Hidrogen (C ≡ G)",
        colorHex: "#ff2a4b",
        colorNum: 0xff2a4b,
        desc: "Basa pirimidina cincin tunggal dengan gugus amino C4 dan gugus keto C2. Selalu berpasangan secara komplementer dengan Guanina.",
        func: "Berpasangan erat dengan Guanina untuk menjamin kepadatan dan kerapian struktur heliks ganda DNA serta target utama modifikasi metilasi epigenetik (CpG islands)."
    },
    backbone: {
        name: "Sugar-Phosphate Backbone",
        class: "Pita Heliks Gula Deoksiribosa-Fosfat (5' → 3')",
        formula: "[PO₄ - C₅H₈O₃]ₙ",
        weight: "~330 Da per nukleotida",
        partner: "Untai Komplementer Antiparalel (3' ← 5')",
        bonds: "Ikatan Fosfodiester Kovalen",
        colorHex: "#5c6ae4",
        colorNum: 0x5c6ae4,
        desc: "Kerangka luar heliks yang tersusun atas pengulangan unit cincin furanosa pentosa (deoksiribosa) dan gugus fosfat bermuatan negatif (PO₄³⁻). Menyelubungi inti pasangan basa hidrofobik dari lingkungan akuatik sel.",
        func: "Membentuk kerangka luar yang kokoh sekaligus menciptakan Lekukan Mayor (Major Groove ~2.2 nm) dan Lekukan Minor (Minor Groove ~1.2 nm) tempat enzim polimerase menempel."
    },
    hbond: {
        name: "Hydrogen Bonds (Ikatan Hidrogen)",
        class: "Jembatan Elektrostatik Non-Kovalen",
        formula: "N-H···O / N-H···N",
        weight: "2 - 5 kkal/mol per ikatan",
        partner: "Penghubung Antar-Basa Komplementer",
        bonds: "2 Titik pada A-T | 3 Titik pada C-G",
        colorHex: "#ffffff",
        colorNum: 0xffffff,
        desc: "Jembatan elektrostatik antara atom hidrogen terpolarisasi positif dengan pasangan elektron bebas pada atom oksigen/nitrogen. A-T dihubungkan oleh 2 ikatan, sedangkan C-G dihubungkan oleh 3 ikatan.",
        func: "Memungkinkan pembukaan untai ganda secara reversibel saat replikasi dan transkripsi oleh enzim RNA polimerase tanpa merusak ikatan kovalen tulang punggung."
    },
    C_atom: {
        name: "Atom Karbon (C)",
        class: "Unsur Kerangka Organik CPK",
        formula: "¹²C (Nomor Atom: 6)",
        weight: "12.011 u",
        partner: "Membentuk 4 Ikatan Kovalen Tetrahidral/Planar",
        bonds: "Ikatan C-C, C-H, C-N, C-O",
        colorHex: "#3b4252",
        colorNum: 0x3b4252,
        desc: "Atom kerangka utama cincin purin, pirimidin, dan cincin pentosa deoksiribosa dalam heliks DNA.",
        func: "Membentuk tulang punggung karbon yang stabil dan tahan terhadap hidrolisis spontan dalam sel."
    },
    N_atom: {
        name: "Atom Nitrogen (N)",
        class: "Unsur Basa Heterosiklik CPK",
        formula: "¹⁴N (Nomor Atom: 7)",
        weight: "14.007 u",
        partner: "Akseptor / Donor Ikatan Hidrogen",
        bonds: "Ikatan C-N, N-H (Aromatik & Amino)",
        colorHex: "#1d4ed8",
        colorNum: 0x1d4ed8,
        desc: "Atom nitrogen dalam cincin purin dan pirimidin yang menyediakan pasangan elektron bebas untuk jembatan hidrogen komplementer.",
        func: "Kunci spesifisitas pengenalan kodon genetik dan ikatan glikosidik dengan gula deoksiribosa."
    },
    O_atom: {
        name: "Atom Oksigen (O)",
        class: "Unsur Elektronegatif Kuat CPK",
        formula: "¹⁶O (Nomor Atom: 8)",
        weight: "15.999 u",
        partner: "Gugus Fosfat & Karbonil Basa",
        bonds: "Ikatan P-O, C-O, C=O",
        colorHex: "#dc2626",
        colorNum: 0xdc2626,
        desc: "Atom oksigen pada gugus fosfat dan gugus karbonil basa nitrogen (Timin, Guanin, Sitosin) serta jembatan ester deoksiribosa.",
        func: "Memberikan muatan negatif seragam pada permukaan DNA dan berperan sebagai akseptor ikatan hidrogen kuat."
    },
    P_atom: {
        name: "Atom Fosfor (P)",
        class: "Pusat Gugus Fosfat CPK",
        formula: "³¹P (Nomor Atom: 15)",
        weight: "30.974 u",
        partner: "Terkoordinasi Tetrahidral dengan 4 Atom Oksigen",
        bonds: "Ikatan Fosfodiester (5'-O-P-O-3')",
        colorHex: "#d97706",
        colorNum: 0xd97706,
        desc: "Pusat gugus fosfat tetrahedral PO₄³⁻ yang menghubungkan posisi C3' deoksiribosa sebelumnya ke posisi C5' deoksiribosa berikutnya.",
        func: "Menyediakan muatan anionik untuk interaksi elektrostatis dengan protein histon dalam pemadatan kromatin."
    },
    methylation: {
        name: "5-Metilsitosina (5-mC) Epigenetik",
        class: "Modifikasi Kovalen Epigenetik Sitosina",
        formula: "C₅H₇N₃O (Gugus -CH₃ Tambahan)",
        weight: "125.13 g/mol",
        partner: "Kovalen pada Posisi C5 Cincin Sitosina",
        bonds: "Ikatan Kovalen C-C ke Lekukan Mayor",
        colorHex: "#c084fc",
        colorNum: 0xc084fc,
        desc: "Modifikasi epigenetik utama di mana enzim DNA metiltransferase (DNMT) mentransfer gugus metil (-CH₃) ke karbon ke-5 sitosina. Gugus hidrofobik ini menjorok langsung ke Lekukan Mayor (Major Groove) DNA.",
        func: "Membungkam ekspresi gen (gene silencing) dengan memblokir pengikatan faktor transkripsi dan menarik protein pengubah kromatin. Kunci dalam diferensiasi sel dan epigenetika kanker."
    },
    thymine_dimer: {
        name: "Dimer Timin (Siklobutana CPD)",
        class: "Lesi Mutagenik Fotoproduk Radiasi UV",
        formula: "[C₅H₆N₂O₂]₂ (Cincin Siklobutana)",
        weight: "252.22 g/mol",
        partner: "Ikatan Kovalen Antara 2 Timin Bertetangga",
        bonds: "2 Ikatan Kovalen Siklobutana C5-C5 & C6-C6",
        colorHex: "#fb923c",
        colorNum: 0xfb923c,
        desc: "Fotolesi kovalen antara dua residu pirimidina timin bersebelahan pada untai yang sama akibat radiasi ultraviolet matahari (UVB). Cincin siklobutana kaku mengunci kedua basa secara kovalen.",
        func: "Mendistorsi sumbu heliks ganda hingga melengkung ~30° (kink bend), menghalangi replikasi oleh DNA polimerase, dan merupakan penyebab utama mutasi karsinogenesis melanoma kulit."
    },
    intercalator: {
        name: "Agen Interkalasi (Etidium / Doxorubicin)",
        class: "Molekul Trisiklik Planar Antikanker",
        formula: "C₂₁H₂₀ClN₃ / Kromofor Aromatik Polisiklik",
        weight: "394.31 g/mol",
        partner: "Menyisip di Antara Pasangan Basa (Pi-Pi Stacking)",
        bonds: "Interaksi Hidrofobik Van der Waals & Pi-Pi",
        colorHex: "#f43f5e",
        colorNum: 0xf43f5e,
        desc: "Molekul aromatik pipih polisiklik yang mampu menyisip tegak lurus di antara tumpukan pasangan basa bersebelahan. Digunakan luas dalam deteksi DNA fluoresens serta obat kemoterapi kanker.",
        func: "Memperlebar jarak heliks (rise meningkat hingga 2x lipat) dan mendespiralisasi putaran heliks (-26° unwinding), memblokir enzim topoisomerase dan replikasi sel kanker."
    },
    ion_mg: {
        name: "Ion Magnesium Pelindung (Mg²⁺)",
        class: "Kation Divalen Penstabil Heliks (Manning Condensation)",
        formula: "Mg²⁺ (Lapisan Solvasi Sitoplasma)",
        weight: "24.305 u",
        partner: "Oksigen Anionik Gugus Fosfat (PO₄³⁻)",
        bonds: "Gaya Tarik Elektrostatik Ionik Kation-Anion",
        colorHex: "#2dd4bf",
        colorNum: 0x2dd4bf,
        desc: "Ion divalen terhidrasi yang mengelilingi permukaan luar tulang punggung DNA untuk menyaring muatan negatif fosfat (teori kondensasi ion lawan Gerald Manning).",
        func: "Menetralkan gaya tolak-menolak elektrostatik antar untai sehingga heliks ganda tidak tercerai-berai, serta kofaktor esensial enzim polimerase dan restriksi nuklease."
    },
    water_hydration: {
        name: "Pita Air Lekukan Minor (Spine of Hydration)",
        class: "Lapisan Solvasi Molekuler Teratur",
        formula: "H₂O (Kristalografi Sinar-X PDB 1BNA)",
        weight: "18.015 g/mol",
        partner: "Atom O2 Timin & N3 Adenin di Lekukan Minor",
        bonds: "Jejaring Jembatan Hidrogen Terkoordinasi",
        colorHex: "#67e8f9",
        colorNum: 0x67e8f9,
        desc: "Jejaring molekul air yang tersusun sangat rapi di sepanjang dasar lekukan minor B-DNA (Drew & Dickerson, 1981), menghubungkan atom akseptor H antarpasangan basa.",
        func: "Memberikan kontribusi entropi dan entalpi penting untuk mengunci konformasi B-DNA dalam larutan seluler dan mengatur afinitas pengikatan obat atau protein pengatur ekspresi gen."
    }
};

export const CONFORMATIONS: Record<string, ConformationConfig> = {
    B: {
        name: "B-DNA (Fisiologis)",
        radius: 4.6,
        heightStep: 1.35,
        angleStep: 0.355,
        majorMinorOffset: 2.40,
        tilt: 0.0,
        propeller: 0.12,
        zigzag: false,
        metrics: {
            dia: "2.0 nm (20 Å)",
            rise: "0.34 nm (3.4 Å)",
            pitch: "3.4 nm (10.5 pb)"
        }
    },
    A: {
        name: "A-DNA (Terdehidrasi)",
        radius: 5.3,
        heightStep: 1.02,
        angleStep: 0.327,
        majorMinorOffset: 1.85,
        tilt: 0.33,
        propeller: 0.18,
        zigzag: false,
        metrics: {
            dia: "2.3 nm (23 Å)",
            rise: "0.26 nm (2.6 Å)",
            pitch: "2.8 nm (11.0 pb)"
        }
    },
    Z: {
        name: "Z-DNA (Heliks Kidal)",
        radius: 4.1,
        heightStep: 1.50,
        angleStep: -0.30,
        majorMinorOffset: 3.10,
        tilt: -0.12,
        propeller: 0.08,
        zigzag: true,
        metrics: {
            dia: "1.8 nm (18 Å)",
            rise: "0.37 nm (3.7 Å)",
            pitch: "4.5 nm (12.0 pb)"
        }
    }
};

export function calculateSequenceStats(seqStr: string): { clean: string; stats: import('../types/dna').SequenceStats } {
    const clean = seqStr.toUpperCase().replace(/[^ATGC]/g, '') || 'ATGCGTACCTACGATC';
    const len = clean.length;
    let gcCount = 0;
    for (const c of clean) {
        if (c === 'G' || c === 'C') gcCount++;
    }
    const atCount = len - gcCount;
    const gcPercent = ((gcCount / len) * 100).toFixed(1);
    const tmNum = len < 14 ? (atCount * 2 + gcCount * 4) : (64.9 + 41 * (gcCount - 16.4) / len);
    const hBonds = atCount * 2 + gcCount * 3;

    return {
        clean,
        stats: {
            length: len,
            gcPercent: `${gcPercent}%`,
            tm: `${tmNum.toFixed(1)}°C`,
            hBonds
        }
    };
}
