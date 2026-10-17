import React, { useEffect, useState } from 'react';

export default function Dashboard({ onSelectConfig, onBack }) {
  const [configs, setConfigs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const apiBase = '/api/furniture';
        const res = await fetch(`${apiBase}/configurations`);
        const json = await res.json();
        if (json.status === 'success') {
          setConfigs(json.data);
        } else {
          setErrorMsg(json.message || 'Gagal memuat data');
        }
      } catch (err) {
        console.error('Gagal memuat dashboard:', err);
        setErrorMsg('Tidak dapat terhubung ke server backend');
      } finally {
        setIsLoading(false);
      }
    };
    fetchConfigs();
  }, []);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Daftar Pesanan & Desain Tersimpan</h2>
          <p style={styles.subtitle}>
            Koleksi mebel custom yang siap dilihat ulang di visualizer 3D atau diteruskan ke pesanan tukang.
          </p>
        </div>
        <button onClick={onBack} style={styles.btnBack}>
          ← Kembali ke Studio 3D
        </button>
      </div>

      {/* Konten Utama */}
      {isLoading ? (
        <div style={styles.centerBox}>
          <p style={{ color: '#94a3b8' }}>Memuat daftar konfigurasi mebel...</p>
        </div>
      ) : errorMsg ? (
        <div style={styles.centerBox}>
          <p style={{ color: '#ef4444' }}>⚠️ {errorMsg}</p>
          <button onClick={onBack} style={styles.btnBack}>
            Kembali ke 3D
          </button>
        </div>
      ) : configs.length === 0 ? (
        <div style={styles.centerBox}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📦</div>
          <p style={{ color: '#cbd5e1', fontSize: '1.1rem', marginBottom: '8px' }}>
            Belum ada konfigurasi mebel yang tersimpan.
          </p>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '16px' }}>
            Sesuaikan ukuran dan bahan di Studio 3D, lalu klik "Simpan Konfigurasi Custom".
          </p>
          <button onClick={onBack} style={styles.btnLoad}>
            + Buka Studio 3D Sekarang
          </button>
        </div>
      ) : (
        <div style={styles.grid}>
          {configs.map((item) => {
            const specs = typeof item.parametric_specs === 'string'
              ? JSON.parse(item.parametric_specs)
              : (item.parametric_specs || {});

            const hasDoor = specs.hasDoor;
            const doorLabel = hasDoor
              ? (specs.doorType === 'SINGLE' ? '1 Pintu' : '2 Pintu Ganda')
              : 'Tanpa Pintu';

            const formattedPrice = Number(item.estimated_total_price || 0).toLocaleString('id-ID');
            const createdDate = item.created_at
              ? new Date(item.created_at).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : null;

            return (
              <div key={item.id} style={styles.card}>
                {/* Snapshot Image Preview */}
                <div style={styles.imgWrapper}>
                  {item.ar_snapshot_url ? (
                    <img
                      src={item.ar_snapshot_url}
                      alt={item.furniture_name || 'Preview Mebel'}
                      style={styles.img}
                    />
                  ) : (
                    <div style={styles.noImg}>
                      <span>📐</span>
                      <span>Tidak Ada Foto Snapshot</span>
                    </div>
                  )}
                  {createdDate && (
                    <span style={styles.dateBadge}>{createdDate}</span>
                  )}
                </div>

                {/* Card Body */}
                <div style={styles.cardBody}>
                  <h3 style={styles.cardTitle}>{item.furniture_name || 'Custom Mebel'}</h3>

                  {/* Spesifikasi Dimensi & Detail */}
                  <div style={styles.specList}>
                    <div style={styles.specRow}>
                      <span style={styles.specLabel}>Dimensi (PxTxL):</span>
                      <span style={styles.specValue}>
                        {item.real_width_cm} × {item.real_height_cm} × {item.real_depth_cm} cm
                      </span>
                    </div>

                    <div style={styles.specRow}>
                      <span style={styles.specLabel}>Rak & Pintu:</span>
                      <span style={styles.specValue}>
                        {specs.shelvesCount || 0} Rak • {doorLabel}
                      </span>
                    </div>

                    {item.base_material_name && (
                      <div style={styles.specRow}>
                        <span style={styles.specLabel}>Bahan Kayu:</span>
                        <span style={styles.specValue}>{item.base_material_name}</span>
                      </div>
                    )}

                    <div style={styles.specRow}>
                      <span style={styles.specLabel}>Warna Finishing:</span>
                      <span style={styles.colorWrapper}>
                        <span
                          style={{
                            ...styles.colorDot,
                            backgroundColor: specs.finishColorHex || '#8B5A2B',
                          }}
                        />
                        <span style={styles.specValue}>{specs.finishColorHex || '#8B5A2B'}</span>
                      </span>
                    </div>
                  </div>

                  <hr style={styles.divider} />

                  {/* Harga */}
                  <div style={styles.priceRow}>
                    <span style={styles.priceLabel}>Estimasi RAB:</span>
                    <span style={styles.priceValue}>Rp {formattedPrice}</span>
                  </div>

                  {/* Tombol Load ke 3D */}
                  <button
                    style={styles.btnLoad}
                    onClick={() => onSelectConfig(item)}
                  >
                    Buka di Studio 3D ➔
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Gaya Tampilan Modern, Elegan & Mobile-Friendly
const styles = {
  container: {
    padding: '24px 20px',
    maxWidth: '1280px',
    margin: '0 auto',
    minHeight: '100vh',
    boxSizing: 'border-box',
    color: '#f8fafc',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '16px',
    marginBottom: '28px',
    borderBottom: '1px solid #334155',
    paddingBottom: '20px',
  },
  title: {
    margin: '0 0 6px 0',
    fontSize: '1.6rem',
    fontWeight: '700',
    color: '#f1f5f9',
  },
  subtitle: {
    margin: 0,
    fontSize: '0.9rem',
    color: '#94a3b8',
    maxWidth: '600px',
  },
  centerBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 20px',
    textAlign: 'center',
    backgroundColor: '#1e293b',
    borderRadius: '16px',
    border: '1px dashed #475569',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
    gap: '24px',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: '14px',
    overflow: 'hidden',
    border: '1px solid #334155',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.2s ease, border-color 0.2s ease',
  },
  imgWrapper: {
    position: 'relative',
    width: '100%',
    height: '210px',
    backgroundColor: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottom: '1px solid #334155',
  },
  img: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    display: 'block',
  },
  noImg: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    color: '#64748b',
    fontSize: '0.9rem',
  },
  dateBadge: {
    position: 'absolute',
    bottom: '10px',
    right: '10px',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '0.75rem',
    color: '#cbd5e1',
    backdropFilter: 'blur(4px)',
  },
  cardBody: {
    padding: '18px',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  cardTitle: {
    margin: '0 0 14px 0',
    fontSize: '1.15rem',
    fontWeight: '600',
    color: '#f8fafc',
  },
  specList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '16px',
  },
  specRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.85rem',
  },
  specLabel: {
    color: '#94a3b8',
  },
  specValue: {
    color: '#e2e8f0',
    fontWeight: '500',
  },
  colorWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  colorDot: {
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    border: '1px solid rgba(255,255,255,0.3)',
    display: 'inline-block',
  },
  divider: {
    borderColor: '#334155',
    margin: '0 0 14px 0',
    borderTop: 'none',
  },
  priceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: '16px',
  },
  priceLabel: {
    fontSize: '0.85rem',
    color: '#94a3b8',
  },
  priceValue: {
    fontSize: '1.2rem',
    fontWeight: '700',
    color: '#38bdf8',
  },
  btnLoad: {
    width: '100%',
    padding: '10px 14px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  btnBack: {
    padding: '10px 18px',
    backgroundColor: '#334155',
    color: '#f1f5f9',
    border: '1px solid #475569',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.9rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  },
};
