import React, { useState } from 'react';

interface TutorialModalProps {
    isOpen: boolean;
    onClose: () => void;
}

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
        <div id="tutorial-modal" className="tutorial-modal-overlay">
            <div className="tutorial-card glass-panel">
                <div className="tutorial-header">
                    <div className="tutorial-badge-row">
                        <span className="pulse-dot"></span>
                        <span className="tutorial-badge">PANDUAN EKSPLORASI DNA 3D // WATSON-CRICK</span>
                    </div>
                    <button id="btn-close-tutorial" className="btn-icon-close" title="Tutup Tutorial" onClick={onClose}>
                        &times;
                    </button>
                </div>

                <div className="tutorial-body">
                    {/* Slide 1 */}
                    {currentSlide === 1 && (
                        <div className="tutorial-slide active" data-slide="1">
                            <div className="tut-icon-banner">🧬</div>
                            <h3 className="tut-slide-title">1. Arsitektur Heliks Ganda B-DNA Asli</h3>
                            <p className="tut-slide-lead">Struktur materi genetik utama dirumuskan oleh James Watson dan Francis Crick (1953) berdasarkan data kristalografi sinar-X Foto 51 karya Rosalind Franklin &amp; Raymond Gosling.</p>
                            <div className="tut-grid">
                                <div className="tut-box">
                                    <span className="tut-box-icon">📐</span>
                                    <b>Dimensi Metrik Presisi:</b>
                                    <p>Diameter heliks <b>2.0 nm (20 Å)</b>, jarak antar pasang basa (rise) <b>0.34 nm (3.4 Å)</b>, dan satu putaran (pitch) <b>3.4 nm (~10.5 pb)</b>.</p>
                                </div>
                                <div className="tut-box">
                                    <span className="tut-box-icon">🌀</span>
                                    <b>Lekukan Mayor &amp; Minor:</b>
                                    <p>Asimetri sudut heliks menciptakan <b>Major Groove (~2.2 nm)</b> yang kaya kode kimiawi faktor transkripsi dan <b>Minor Groove (~1.2 nm)</b>.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Slide 2 */}
                    {currentSlide === 2 && (
                        <div className="tutorial-slide active" data-slide="2">
                            <div className="tut-icon-banner">🌀</div>
                            <h3 className="tut-slide-title">2. Tiga Bentuk Alotropik: B-DNA, A-DNA &amp; Z-DNA</h3>
                            <p className="tut-slide-lead">Kristalografi membuktikan DNA dapat bertransisi konformasi bergantung pada tingkat hidrasi dan sekuens basa (Dickerson et al., 1982; Saenger, 1984).</p>
                            <div className="tut-grid">
                                <div className="tut-box">
                                    <span className="tut-box-icon">💧</span>
                                    <b>B-DNA (Fisiologis):</b>
                                    <p>Bentuk alami dalam larutan berair sel. Heliks kanan, 10.5 pb/putaran, pasangan basa tegak lurus sumbu.</p>
                                </div>
                                <div className="tut-box">
                                    <span className="tut-box-icon">🏜️</span>
                                    <b>A-DNA (Terdehidrasi / RNA-DNA):</b>
                                    <p>Bentuk lebih pendek dan lebar (⌀2.3 nm, 11 pb/putaran) dengan pasangan basa <b>miring 19°</b> dan rongga aksial tengah.</p>
                                </div>
                                <div className="tut-box tut-box-wide">
                                    <span className="tut-box-icon">⚡</span>
                                    <b>Z-DNA (Heliks Kidal Zigzag):</b>
                                    <p>Terbentuk pada pengulangan purin-pirimidin (d(CG)ₙ). Berputar <b>ke arah kiri (*left-handed*)</b>, diameter ramping 1.8 nm, 12 pb/putaran, dengan tulang punggung zigzag!</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Slide 3 */}
                    {currentSlide === 3 && (
                        <div className="tutorial-slide active" data-slide="3">
                            <div className="tut-icon-banner">🧪</div>
                            <h3 className="tut-slide-title">3. Basa Nitrogen, Komplementer Chargaff &amp; Tₘ</h3>
                            <p className="tut-slide-lead">Kestabilan dan kerapian diameter DNA dijaga oleh penggabungan purin (A, G) dan pirimidin (T, C) sesuai Hukum Chargaff.</p>
                            <div className="tut-grid">
                                <div className="tut-box">
                                    <span className="tut-box-icon">💎</span>
                                    <b>Purin (A, G) vs Pirimidin (T, C):</b>
                                    <p><b>Adenin &amp; Guanin</b> memiliki 2 cincin terpadu (cincin 6 + 5), sedangkan <b>Timin &amp; Sitosin</b> memiliki 1 cincin heksagonal tunggal.</p>
                                </div>
                                <div className="tut-box">
                                    <span className="tut-box-icon">🔗</span>
                                    <b>2 Ikatan (A=T) vs 3 Ikatan (G≡C):</b>
                                    <p>Pasangan G≡C memiliki 3 ikatan hidrogen, memberikan kekuatan termodinamika lebih tinggi dan menaikkan titik leleh (T<sub>m</sub>).</p>
                                </div>
                                <div className="tut-box tut-box-wide">
                                    <span className="tut-box-icon">⌨️</span>
                                    <b>Sintesis Sekuens Kustom:</b>
                                    <p>Gunakan bar input untuk mengetik urutan basa sendiri atau memilih preset (Watson-Crick, CpG Island, TATA Box) untuk melihat metriknya secara langsung.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Slide 4 */}
                    {currentSlide === 4 && (
                        <div className="tutorial-slide active" data-slide="4">
                            <div className="tut-icon-banner">✨</div>
                            <h3 className="tut-slide-title">4. Fenomena Molekuler: Epigenetika, UV &amp; Obat</h3>
                            <p className="tut-slide-lead">Simulasi ini memungkinkan pengamatan modifikasi kimiawi riil yang memengaruhi ekspresi gen dan kesehatan selular:</p>
                            <div className="tut-grid">
                                <div className="tut-box">
                                    <span className="tut-box-icon">🧬</span>
                                    <b>Metilasi DNA (5-mC):</b>
                                    <p>Penambahan gugus metil (<b>-CH₃</b>) pada C5 Sitosin menonjol di lekukan mayor, membungkam ekspresi gen (*epigenetic silencing*).</p>
                                </div>
                                <div className="tut-box">
                                    <span className="tut-box-icon">☀️</span>
                                    <b>Dimer Timin (Radiasi UV):</b>
                                    <p>Foton ultraviolet membentuk cincin siklobutana kovalen antara dua timin, memicu <b>tekukan/kink ~30°</b> penyebab kanker kulit.</p>
                                </div>
                                <div className="tut-box tut-box-wide">
                                    <span className="tut-box-icon">💊</span>
                                    <b>Interkalasi Obat Kanker (Kemoterapi):</b>
                                    <p>Molekul planar menyisip di antara tumpukan basa (*pi-pi stacking*), merenggangkan heliks hingga 2x lipat dan melumpuhkan replikasi sel kanker.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Slide 5 */}
                    {currentSlide === 5 && (
                        <div className="tutorial-slide active" data-slide="5">
                            <div className="tut-icon-banner">🔬</div>
                            <h3 className="tut-slide-title">5. Visualisasi Riset, Potensial Coulomb &amp; Solvasi</h3>
                            <p className="tut-slide-lead">Standar visualisasi perangkat lunak kristalografi dan dinamika molekuler riset (PyMOL, ChimeraX, GROMACS):</p>
                            <div className="tut-grid">
                                <div className="tut-box">
                                    <span className="tut-box-icon">⚡</span>
                                    <b>Peta Potensial Coulomb:</b>
                                    <p>Warna merah pekat pada tulang punggung fosfat (muatan negatif kuat -1e), dan netral di inti basa hidrofobik.</p>
                                </div>
                                <div className="tut-box">
                                    <span className="tut-box-icon">💧</span>
                                    <b>Solvasi &amp; Ion Lawan (Mg²⁺):</b>
                                    <p>Kation magnesium pelindung mengelilingi gugus fosfat dan pita air (*spine of hydration*) di lekukan minor menjaga heliks agar tidak kolaps.</p>
                                </div>
                                <div className="tut-box tut-box-wide">
                                    <span className="tut-box-icon">🎮</span>
                                    <b>Kontrol Interaktif:</b>
                                    <p>Ketuk komponen apa pun untuk menginspeksi rumus kimia dan fungsinya. Gunakan <b>Unzip</b> untuk membelah untai dan <b>Dinamika Termal (37°C)</b> untuk vibrasi Brownian.</p>
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
                            ></span>
                        ))}
                    </div>
                    <div className="tutorial-nav-btns">
                        <button
                            id="tutorial-btn-prev"
                            className="tut-nav-btn secondary"
                            disabled={currentSlide === 1}
                            onClick={handlePrev}
                        >
                            Sebelumnya
                        </button>
                        <button
                            id="tutorial-btn-next"
                            className="tut-nav-btn primary"
                            onClick={handleNext}
                        >
                            {currentSlide === 5 ? 'Mulai Eksplorasi 🚀' : 'Lanjut →'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
