import React, { useState } from 'react';

interface TutorialModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SLIDE_TABS = [
    { id: 1, num: '01', label: 'Geometri Heliks' },
    { id: 2, num: '02', label: 'Alotropi B/A/Z' },
    { id: 3, num: '03', label: 'Pasangan Chargaff' },
    { id: 4, num: '04', label: 'Epigenetika & Lesi' },
    { id: 5, num: '05', label: 'Instrumen & Optik' }
];

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
    const [currentSlide, setCurrentSlide] = useState(1);

    if (!isOpen) return null;

    const handlePrev = () => {
        if (currentSlide > 1) setCurrentSlide(currentSlide - 1);
    };

    const handleNext = () => {
        if (currentSlide < 5) setCurrentSlide(currentSlide + 1);
        else onClose();
    };

    return (
        <div
            id="tutorial-modal"
            className="tutorial-modal-overlay"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="tutorial-card glass-panel" role="dialog" aria-modal="true" aria-labelledby="tutorial-modal-title">
                <div className="tutorial-header">
                    <div className="tutorial-badge-row">
                        <span className="tutorial-step-counter">MODUL 0{currentSlide} / 05</span>
                        <span className="tutorial-badge" id="tutorial-modal-title">
                            Referensi Kristalografi &amp; Panduan Eksplorasi 3D
                        </span>
                    </div>
                    <button id="btn-close-tutorial" className="btn-icon-close" title="Tutup Panduan" onClick={onClose}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Step Navigation Bar */}
                <div className="tutorial-step-tabs" role="tablist">
                    {SLIDE_TABS.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={currentSlide === tab.id}
                            className={`tut-step-tab ${currentSlide === tab.id ? 'active' : ''}`}
                            onClick={() => setCurrentSlide(tab.id)}
                        >
                            <span className="tut-step-num">{tab.num}</span>
                            <span className="tut-step-name">{tab.label}</span>
                        </button>
                    ))}
                </div>

                <div className="tutorial-body">
                    {/* Slide 1 */}
                    {currentSlide === 1 && (
                        <div className="tutorial-slide active" data-slide="1">
                            <div className="tut-slide-header">
                                <span className="tut-slide-kicker">01 · ARSITEKTUR STRUKTURAL</span>
                                <h3 className="tut-slide-title">Geometri Heliks Ganda B-DNA Kanonik</h3>
                                <p className="tut-slide-lead">
                                    Struktur materi genetik utama dirumuskan oleh James Watson dan Francis Crick (1953) berdasarkan difraksi sinar-X Foto 51 karya Rosalind Franklin dan Raymond Gosling.
                                </p>
                            </div>
                            <div className="tut-grid">
                                <div className="tut-box">
                                    <span className="tut-box-tag">DIMENSI METRIK</span>
                                    <b>Parameter Aksial &amp; Radial</b>
                                    <p>
                                        Diameter heliks terkalibrasi pada <b>2.0 nm (20 Å)</b>, jarak vertikal antar pasangan basa (<i>rise</i>) <b>0.34 nm (3.4 Å)</b>, dan satu putaran penuh (<i>pitch</i>) <b>3.4 nm (~10.5 pb)</b>.
                                    </p>
                                </div>
                                <div className="tut-box">
                                    <span className="tut-box-tag">TOPOLOGI ALUR</span>
                                    <b>Major Groove &amp; Minor Groove</b>
                                    <p>
                                        Asimetri ikatan glikosidik menciptakan <b>Lekukan Mayor (~2.2 nm)</b> yang kaya kode pengenalan faktor transkripsi serta <b>Lekukan Minor (~1.2 nm)</b>.
                                    </p>
                                </div>
                                <div className="tut-box tut-box-wide">
                                    <span className="tut-box-tag">ORIENTASI ANTIPARALEL</span>
                                    <b>Polaritas Fosfodiester 5&prime; &rarr; 3&prime;</b>
                                    <p>
                                        Dua untai polinukleotida berjalan berlawanan arah: satu untai berorientasi dari ujung <b>5&prime;-Fosfat ke 3&prime;-Hidroksil</b>, sedangkan untai pasangannya berjalan dari <b>3&prime; ke 5&prime;</b>.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Slide 2 */}
                    {currentSlide === 2 && (
                        <div className="tutorial-slide active" data-slide="2">
                            <div className="tut-slide-header">
                                <span className="tut-slide-kicker">02 · POLIMORFISME KRISTALOGRAFI</span>
                                <h3 className="tut-slide-title">Tiga Konformasi Alotropik: B-DNA, A-DNA, dan Z-DNA</h3>
                                <p className="tut-slide-lead">
                                    Studi kristalografi membuktikan heliks DNA bertransisi konformasi secara dinamis bergantung pada kelembapan relatif, kekuatan ionik, dan sekuens basa (Dickerson et al., 1982).
                                </p>
                            </div>
                            <div className="tut-grid">
                                <div className="tut-box">
                                    <span className="tut-box-tag">B-DNA · FISIOLOGIS</span>
                                    <b>Konformasi Seluler Alami</b>
                                    <p>
                                        Stabil dalam larutan fisiologis seluler. Heliks putar kanan, <b>10.5 pb/putaran</b>, pasangan basa hampir tegak lurus terhadap sumbu utama heliks.
                                    </p>
                                </div>
                                <div className="tut-box">
                                    <span className="tut-box-tag">A-DNA · DEHIDRASI</span>
                                    <b>Geometri Kompak &amp; Dupleks RNA</b>
                                    <p>
                                        Lebih lebar dan pendek (<b>diameter 2.3 nm, 11 pb/putaran</b>) dengan pasangan basa <b>miring 19°</b> terhadap sumbu dan membentuk kanal aksial di tengah.
                                    </p>
                                </div>
                                <div className="tut-box tut-box-wide">
                                    <span className="tut-box-tag">Z-DNA · HELIKS KIDAL</span>
                                    <b>Konformasi Zigzag Putar Kiri</b>
                                    <p>
                                        Terbentuk pada sekuens purin-pirimidin bergantian seperti <b>poly(dG-dC)</b>. Berputar ke arah kiri (<i>left-handed</i>), diameter ramping <b>1.8 nm</b>, <b>12 pb/putaran</b>, dengan jalur fosfat berpola zigzag.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Slide 3 */}
                    {currentSlide === 3 && (
                        <div className="tutorial-slide active" data-slide="3">
                            <div className="tut-slide-header">
                                <span className="tut-slide-kicker">03 · TERMODINAMIKA SEKUENS</span>
                                <h3 className="tut-slide-title">Pasangan Basa Chargaff &amp; Titik Leleh (Tₘ)</h3>
                                <p className="tut-slide-lead">
                                    Kestabilan diameter heliks dijaga oleh spesifisitas ikatan hidrogen antara basa Purin bercincin ganda (A, G) dan Pirimidin bercincin tunggal (T, C).
                                </p>
                            </div>
                            <div className="tut-grid">
                                <div className="tut-box">
                                    <span className="tut-box-tag">GEOMETRI CINCIN</span>
                                    <b>Purin (A, G) vs Pirimidin (T, C)</b>
                                    <p>
                                        <b>Adenina &amp; Guanina</b> tersusun atas 2 cincin heterosiklik terpadu (imidazol + pirimidin), sedangkan <b>Timina &amp; Sitosina</b> memiliki 1 cincin heksagonal tunggal.
                                    </p>
                                </div>
                                <div className="tut-box">
                                    <span className="tut-box-tag">IKATAN HIDROGEN</span>
                                    <b>Pasangan A=T (2) vs G&equiv;C (3)</b>
                                    <p>
                                        Pasangan <b>G&equiv;C</b> dihubungkan oleh 3 jembatan hidrogen (dibandingkan 2 pada <b>A=T</b>), menghasilkan stabilitas termal lebih tinggi dan menaikkan suhu denaturasi (<b>T<sub>m</sub></b>).
                                    </p>
                                </div>
                                <div className="tut-box tut-box-wide">
                                    <span className="tut-box-tag">BIOINFORMATIKA</span>
                                    <b>Sintesis Sekuens Kustom Waktu Nyata</b>
                                    <p>
                                        Gunakan modul <b>Sintesis Sekuens Nukleotida</b> pada panel kiri untuk memasukkan urutan basa sendiri atau memilih preset (Watson-Crick, CpG Island, TATA Box) dan mengamati perubahan metrik secara instan.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Slide 4 */}
                    {currentSlide === 4 && (
                        <div className="tutorial-slide active" data-slide="4">
                            <div className="tut-slide-header">
                                <span className="tut-slide-kicker">04 · PATOLOGI &amp; REGULASI GEN</span>
                                <h3 className="tut-slide-title">Modifikasi Epigenetik, Fotolesi UV &amp; Interkalasi</h3>
                                <p className="tut-slide-lead">
                                    Simulasi struktur tiga dimensi ini memperlihatkan dampak fisik dari modifikasi kimiawi pada topologi heliks ganda:
                                </p>
                            </div>
                            <div className="tut-grid">
                                <div className="tut-box">
                                    <span className="tut-box-tag">5-MC · EPIGENETIKA</span>
                                    <b>Metilasi Sitosin (5-mC)</b>
                                    <p>
                                        Penambahan gugus metil (<b>-CH₃</b>) pada atom C5 Sitosina menonjol ke Lekukan Mayor dan berperan dalam pembungkaman ekspresi gen (<i>epigenetic silencing</i>).
                                    </p>
                                </div>
                                <div className="tut-box">
                                    <span className="tut-box-tag">CPD · FOTOLESI UV</span>
                                    <b>Dimer Pirimidin Siklobutana</b>
                                    <p>
                                        Radiasi ultraviolet memicu ikatan kovalen silang antara dua Timin bersebelahan, menginduksi <b>tekukan aksial ~30°</b> yang menghambat enzim polimerase.
                                    </p>
                                </div>
                                <div className="tut-box tut-box-wide">
                                    <span className="tut-box-tag">KEMOTERAPI</span>
                                    <b>Interkalasi Molekul Planar (Doxorubicin / Etidium)</b>
                                    <p>
                                        Senyawa aromatik polisiklik menyisip di antara tumpukan pasangan basa (<i>pi-pi stacking</i>), merenggangkan jarak aksial heliks dan menghentikan pembelahan sel kanker.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Slide 5 */}
                    {currentSlide === 5 && (
                        <div className="tutorial-slide active" data-slide="5">
                            <div className="tut-slide-header">
                                <span className="tut-slide-kicker">05 · INSTRUMEN VISUALISASI</span>
                                <h3 className="tut-slide-title">Standar Representasi, Optik HDR &amp; Kontrol Kamera</h3>
                                <p className="tut-slide-lead">
                                    Dilengkapi mode representasi standar perangkat lunak biologi struktural (PyMOL, ChimeraX) dan kontrol optik presisi:
                                </p>
                            </div>
                            <div className="tut-grid">
                                <div className="tut-box">
                                    <span className="tut-box-tag">ESP &amp; SOLVASI</span>
                                    <b>Peta Potensial Coulomb &amp; Ion Mg²⁺</b>
                                    <p>
                                        Visualisasikan gradien muatan elektrostatik negatif pada tulang punggung fosfat (<b>-1e</b>) serta distribusi kation pelindung <b>Mg²⁺</b> dan molekul air di lekukan minor.
                                    </p>
                                </div>
                                <div className="tut-box">
                                    <span className="tut-box-tag">POST-PROCESSING</span>
                                    <b>Kalibrasi Optik Bloom &amp; Preset</b>
                                    <p>
                                        Pilih preset <b>Subtle</b>, <b>Cinematic</b>, atau <b>Extreme</b>, atau sesuaikan <i>Emission Threshold</i> agar pendaran terkonsentrasi pada jembatan hidrogen tanpa silau.
                                    </p>
                                </div>
                                <div className="tut-box tut-box-wide">
                                    <span className="tut-box-tag">NAVIGASI 6-DOF</span>
                                    <b>Inspeksi Komponen &amp; Eksplorasi Kamera Independen</b>
                                    <p>
                                        Klik komponen molekul apa pun pada kanvas 3D untuk membuka lembar spesifikasi kimianya di panel kanan. Gunakan mode <b>Rotasi Orbit</b>, <b>Geser (Pan)</b>, atau <b>VR 360°</b> untuk observasi menyeluruh.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="tutorial-footer">
                    <div className="tutorial-dots">
                        {[1, 2, 3, 4, 5].map((idx) => (
                            <span
                                key={idx}
                                className={`dot ${currentSlide === idx ? 'active' : ''}`}
                                onClick={() => setCurrentSlide(idx)}
                                title={`Buka Modul 0${idx}`}
                            ></span>
                        ))}
                    </div>
                    <div className="tutorial-nav-btns">
                        <button
                            id="tutorial-btn-prev"
                            type="button"
                            className="tut-nav-btn secondary"
                            disabled={currentSlide === 1}
                            onClick={handlePrev}
                        >
                            Sebelumnya
                        </button>
                        <button
                            id="tutorial-btn-next"
                            type="button"
                            className="tut-nav-btn primary"
                            onClick={handleNext}
                        >
                            {currentSlide === 5 ? 'Mulai Eksplorasi' : 'Selanjutnya'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
