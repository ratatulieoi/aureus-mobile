import React from 'react';
import { ExternalLink, Github, Instagram, ShieldCheck } from 'lucide-react';
import BrandMark from '@/components/BrandMark';

const AboutSection: React.FC = () => (
  <section className="utility-screen about-screen" aria-labelledby="about-title">
    <header className="utility-screen-header">
      <h2 id="about-title">Tentang Aureus</h2>
      <p>Informasi aplikasi, penyimpanan data, dan tautan proyek.</p>
    </header>

    <section className="about-identity" aria-labelledby="about-app-name">
      <span className="about-brand-mark"><BrandMark /></span>
      <div>
        <h3 id="about-app-name">Aureus</h3>
        <p>Pencatat pemasukan, pengeluaran, dan langganan untuk penggunaan sehari-hari.</p>
      </div>
    </section>

    <dl className="about-details">
      <div><dt>Versi</dt><dd>2.5.0</dd></div>
      <div><dt>Penyimpanan</dt><dd>Lokal di perangkat</dd></div>
      <div><dt>Proyek</dt><dd>Open-source</dd></div>
    </dl>

    <aside className="about-privacy-note">
      <ShieldCheck aria-hidden="true" />
      <div><strong>Data tetap di perangkat</strong><p>Aureus tidak mengirim data keuangan ke server. Gunakan Backup & pulihkan untuk menyimpan salinan data.</p></div>
    </aside>

    <section className="about-links" aria-labelledby="about-links-title">
      <div className="utility-section-heading">
        <h3 id="about-links-title">Proyek & pembuat</h3>
        <p>Buka kode sumber, laporkan masalah, atau temukan pembuat aplikasi.</p>
      </div>
      <div className="about-link-list">
        <a href="https://github.com/ratatulieoi/aureus-mobile" target="_blank" rel="noopener noreferrer" aria-label="Buka repositori Aureus di GitHub pada tab baru">
          <span className="about-link-icon"><Github aria-hidden="true" /></span>
          <span><strong>Repositori Aureus</strong><small>Kode sumber dan laporan masalah</small></span>
          <ExternalLink aria-hidden="true" />
        </a>
        <a href="https://instagram.com/rmeydani_" target="_blank" rel="noopener noreferrer" aria-label="Buka Instagram @rmeydani_ di tab baru">
          <span className="about-link-icon"><Instagram aria-hidden="true" /></span>
          <span><strong>Instagram</strong><small>@rmeydani_</small></span>
          <ExternalLink aria-hidden="true" />
        </a>
      </div>
    </section>
  </section>
);

export default AboutSection;
