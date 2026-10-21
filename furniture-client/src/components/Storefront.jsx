import React from 'react';

export default function Storefront({ catalog, onSelectProduct }) {
  const formatRupiah = (val) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(Number(val) || 0);

  return (
    <div style={styles.container}>
      {/* Hero Banner */}
      <div style={styles.banner}>
        <div style={styles.bannerBadge}>Katalog Resmi Bengkel Mebel</div>
        <h2 style={styles.bannerTitle}>Custom Mebel Presisi Ruangan</h2>
        <p style={styles.bannerDesc}>
          Pilih model mebel dasar karya bengkel ayah, sesuaikan ukuran riil ke sudut ruanganmu,
          dan lihat langsung dalam visualisasi 3D/AR sebelum diproduksi oleh tukang.
        </p>
      </div>

      {/* Grid Katalog Produk */}
      {catalog.length === 0 ? (
        <div style={styles.emptyBox}>
          <p style={{ color: '#94a3b8' }}>Memuat katalog produk mebel...</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {catalog.map((item) => (
            <div key={item.id} style={styles.card}>
              {/* Media Preview Box */}
              <div style={styles.cardMedia}>
                {item.model_3d_url ? (
                  <span style={styles.badgeGlb}>Asset 3D (.glb)</span>
                ) : (
                  <span style={styles.badgeParametric}>3D Parametrik</span>
                )}
                <div style={styles.mediaIconWrapper}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                </div>
              </div>

              {/* Info Produk */}
              <div style={styles.cardInfo}>
                <h3 style={styles.productName}>{item.name}</h3>

                <div style={styles.specsWrapper}>
                  <div style={styles.specItem}>
                    <span style={styles.specLabel}>Lebar Aman:</span>
                    <span style={styles.specValue}>{item.min_width_cm || 60} – {item.max_width_cm || 240} cm</span>
                  </div>
                  <div style={styles.specItem}>
                    <span style={styles.specLabel}>Tinggi Aman:</span>
                    <span style={styles.specValue}>{item.min_height_cm || 100} – {item.max_height_cm || 260} cm</span>
                  </div>
                  <div style={styles.specItem}>
                    <span style={styles.specLabel}>Kedalaman:</span>
                    <span style={styles.specValue}>{item.min_depth_cm || 40} – {item.max_depth_cm || 70} cm</span>
                  </div>
                </div>

                <div style={styles.priceSection}>
                  <span style={styles.priceLabel}>Dasar Ongkos Tukang:</span>
                  <span style={styles.priceValue}>{formatRupiah(item.base_labor_cost)} / m²</span>
                </div>

                <button
                  style={styles.btnLaunch}
                  onClick={() => onSelectProduct(item)}
                >
                  Kustomisasi 3D / AR
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '20px 16px 100px 16px',
    maxWidth: '1200px',
    margin: '0 auto',
    boxSizing: 'border-box',
    color: '#f8fafc',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  banner: {
    backgroundColor: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    border: '1px solid #334155',
    borderRadius: '16px',
    padding: '24px 20px',
    marginBottom: '28px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
  },
  bannerBadge: {
    display: 'inline-block',
    fontSize: '0.75rem',
    fontWeight: '700',
    color: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    padding: '4px 10px',
    borderRadius: '999px',
    marginBottom: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  bannerTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#f8fafc',
    margin: '0 0 8px 0',
  },
  bannerDesc: {
    fontSize: '0.9rem',
    color: '#94a3b8',
    lineHeight: '1.5',
    margin: 0,
    maxWidth: '650px',
  },
  emptyBox: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: '#1e293b',
    borderRadius: '16px',
    border: '1px dashed #475569',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
    gap: '20px',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: '14px',
    overflow: 'hidden',
    border: '1px solid #334155',
    boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.2s ease, border-color 0.2s ease',
  },
  cardMedia: {
    position: 'relative',
    height: '180px',
    backgroundColor: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottom: '1px solid #334155',
  },
  badgeGlb: {
    position: 'absolute',
    top: '12px',
    left: '12px',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    color: '#34d399',
    border: '1px solid rgba(52, 211, 153, 0.3)',
    fontSize: '0.72rem',
    fontWeight: '600',
    padding: '3px 8px',
    borderRadius: '6px',
  },
  badgeParametric: {
    position: 'absolute',
    top: '12px',
    left: '12px',
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    color: '#38bdf8',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    fontSize: '0.72rem',
    fontWeight: '600',
    padding: '3px 8px',
    borderRadius: '6px',
  },
  mediaIconWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    padding: '18px',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  productName: {
    fontSize: '1.15rem',
    fontWeight: '600',
    color: '#f8fafc',
    margin: '0 0 12px 0',
  },
  specsWrapper: {
    backgroundColor: '#0f172a',
    borderRadius: '8px',
    padding: '10px 12px',
    marginBottom: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  specItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.8rem',
  },
  specLabel: {
    color: '#94a3b8',
  },
  specValue: {
    color: '#e2e8f0',
    fontWeight: '500',
  },
  priceSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: '16px',
  },
  priceLabel: {
    fontSize: '0.8rem',
    color: '#94a3b8',
  },
  priceValue: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: '#38bdf8',
  },
  btnLaunch: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
};
