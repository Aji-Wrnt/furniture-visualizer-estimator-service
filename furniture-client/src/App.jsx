import React, { useState, useEffect, useRef } from 'react';
import Storefront from './components/Storefront.jsx';
import FurnitureViewer from './components/FurnitureViewer.jsx';
import Dashboard from './components/Dashboard.jsx';
import './App.css';

const API_BASE_URL = '/api/furniture';

export default function App() {
  const viewerRef = useRef(null);

  // Navigasi 3 Tampilan Utama: 'storefront' | 'studio' | 'orders'
  const [currentView, setCurrentView] = useState('storefront');

  // State data referensi dari database PostgreSQL
  const [catalog, setCatalog] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // State pilihan itemk
  const [selectedFurnitureId, setSelectedFurnitureId] = useState('');
  const [selectedBaseWoodId, setSelectedBaseWoodId] = useState('');
  const [selectedFinishingId, setSelectedFinishingId] = useState('');

  // State parameter mebel
  const [widthCm, setWidthCm] = useState(100);
  const [heightCm, setHeightCm] = useState(200);
  const [depthCm, setDepthCm] = useState(50);
  const [shelvesCount, setShelvesCount] = useState(4);
  const [colorHex, setColorHex] = useState('#8B5A2B');
  const [hasDoor, setHasDoor] = useState(false);
  const [doorType, setDoorType] = useState('DOUBLE'); // 'SINGLE' atau 'DOUBLE'
  const [withInstallation, setWithInstallation] = useState(false); // Jasa Instalasi Tukang

  // State hasil kalkulasi RAB
  const [costBreakdown, setCostBreakdown] = useState(null);
  const [materialsBreakdown, setMaterialsBreakdown] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // 1. Ambil data katalog dan material saat awal buka aplikasi
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/catalog`);
        const json = await res.json();
        if (json.status === 'success') {
          const catList = json.data.catalog || [];
          const matList = json.data.materials || [];

          setCatalog(catList);
          setMaterials(matList);

          if (catList.length > 0) {
            setSelectedProduct(catList[0]);
            setSelectedFurnitureId(catList[0].id);
          }

          const wood = matList.find((m) => m.category === 'BASE_WOOD');
          if (wood) setSelectedBaseWoodId(wood.id);

          const finish = matList.find((m) => m.category === 'FINISHING');
          if (finish) setSelectedFinishingId(finish.id);
        }
      } catch (err) {
        console.error('Gagal mengambil data katalog awal:', err);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // 2. Handler saat user memilih produk dari Katalog Etalase
  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setSelectedFurnitureId(product.id);

    // Sesuaikan slider ke batas aman produk terpilih
    if (product.min_width_cm && widthCm < product.min_width_cm) setWidthCm(product.min_width_cm);
    if (product.max_width_cm && widthCm > product.max_width_cm) setWidthCm(product.max_width_cm);
    if (product.min_height_cm && heightCm < product.min_height_cm) setHeightCm(product.min_height_cm);
    if (product.max_height_cm && heightCm > product.max_height_cm) setHeightCm(product.max_height_cm);

    setCurrentView('studio');
  };

  // 3. Handler saat produk dipilih dari dropdown di dalam Studio 3D
  const handleFurnitureChange = (id) => {
    setSelectedFurnitureId(id);
    const prod = catalog.find((c) => c.id === id);
    if (prod) {
      setSelectedProduct(prod);
      if (prod.min_width_cm && widthCm < prod.min_width_cm) setWidthCm(prod.min_width_cm);
      if (prod.max_width_cm && widthCm > prod.max_width_cm) setWidthCm(prod.max_width_cm);
      if (prod.min_height_cm && heightCm < prod.min_height_cm) setHeightCm(prod.min_height_cm);
      if (prod.max_height_cm && heightCm > prod.max_height_cm) setHeightCm(prod.max_height_cm);
    }
  };

  // 4. Handler saat membuka kembali desain tersimpan dari Dashboard ke Studio 3D
  const handleLoadFromSaved = (configItem) => {
    const specs = typeof configItem.parametric_specs === 'string'
      ? JSON.parse(configItem.parametric_specs)
      : (configItem.parametric_specs || {});

    if (configItem.furniture_id) {
      setSelectedFurnitureId(configItem.furniture_id);
      const matched = catalog.find((p) => p.id === configItem.furniture_id);
      if (matched) setSelectedProduct(matched);
    }

    if (configItem.base_material_id) setSelectedBaseWoodId(configItem.base_material_id);
    if (configItem.finishing_material_id) setSelectedFinishingId(configItem.finishing_material_id);

    setWidthCm(Number(configItem.real_width_cm) || 100);
    setHeightCm(Number(configItem.real_height_cm) || 200);
    setDepthCm(Number(configItem.real_depth_cm) || 50);

    setShelvesCount(Number(specs.shelvesCount) || 1);
    setColorHex(specs.finishColorHex || '#8B5A2B');
    setHasDoor(Boolean(specs.hasDoor));
    setDoorType(specs.doorType || 'DOUBLE');
    setWithInstallation(Boolean(specs.withInstallationService));

    setCurrentView('studio');
  };

  // 5. Debounce estimasi harga saat parameter mebel berubah
  useEffect(() => {
    if (!selectedFurnitureId || !selectedBaseWoodId || !selectedFinishingId) return;

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/estimate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            furnitureId: selectedFurnitureId,
            baseMaterialId: selectedBaseWoodId,
            finishingMaterialId: selectedFinishingId,
            widthCm: Number(widthCm),
            heightCm: Number(heightCm),
            depthCm: Number(depthCm),
            shelvesCount: Number(shelvesCount),
            hasDoor: hasDoor,
            doorType: doorType,
            withInstallationService: withInstallation,
          }),
        });

        const json = await res.json();
        if (json.status === 'success') {
          setCostBreakdown(json.data.costBreakdown);
          setMaterialsBreakdown(json.data.materialsBreakdown);
        }
      } catch (err) {
        console.error('Gagal menghitung estimasi:', err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [
    selectedFurnitureId,
    selectedBaseWoodId,
    selectedFinishingId,
    widthCm,
    heightCm,
    depthCm,
    shelvesCount,
    hasDoor,
    doorType,
    withInstallation,
  ]);

  // 6. Simpan konfigurasi ke database PostgreSQL
  const handleSaveConfiguration = async () => {
    if (!costBreakdown) return;

    const snapshotDataUrl = viewerRef.current ? viewerRef.current.captureSnapshot() : null;

    try {
      const payload = {
        furnitureId: selectedFurnitureId,
        baseMaterialId: selectedBaseWoodId,
        finishingMaterialId: selectedFinishingId,
        widthCm: Number(widthCm),
        heightCm: Number(heightCm),
        depthCm: Number(depthCm),
        parametricSpecs: {
          shelvesCount: Number(shelvesCount),
          finishColorHex: colorHex,
          hasDoor: hasDoor,
          doorType: hasDoor ? doorType : 'NONE',
          withInstallationService: withInstallation,
        },
        arSnapshotUrl: snapshotDataUrl,
        estimatedMaterialCost: (costBreakdown.materialWoodCost + costBreakdown.finishingCost + (costBreakdown.hardwareCost || 0)),
        estimatedLaborCost: costBreakdown.laborCost + (costBreakdown.installationCost || 0),
        estimatedTotalPrice: costBreakdown.totalEstimatedPrice,
      };

      const res = await fetch(`${API_BASE_URL}/configurations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get('content-type');
      if (!res.ok) {
        const errorText = contentType && contentType.includes('application/json')
          ? (await res.json()).message
          : await res.text();
        throw new Error(errorText || `HTTP Error ${res.status}`);
      }

      const json = await res.json();
      if (json.status === 'success') {
        alert('Konfigurasi kustom berhasil disimpan! Membuka daftar pesanan tersimpan...');
        setCurrentView('orders');
      }
    } catch (err) {
      alert('Gagal menyimpan konfigurasi: ' + err.message);
    }
  };

  return (
    <div className="mobile-shell">
      {/* Top Header */}
      <header className="app-header">
        <div className="brand">
          <span className="brand-badge">BENGKEL MEBEL</span>
          <h1>Tukang Online Mebel</h1>
        </div>

        {/* Menu Navigasi Khusus Desktop / Laptop */}
        <nav className="desktop-nav-links">
          <button
            type="button"
            className={`nav-btn ${currentView === 'storefront' ? 'active' : ''}`}
            onClick={() => setCurrentView('storefront')}
          >
            🪑 Etalase
          </button>
          <button
            type="button"
            className={`nav-btn ${currentView === 'studio' ? 'active' : ''}`}
            onClick={() => setCurrentView('studio')}
          >
            📐 Studio 3D
          </button>
          <button
            type="button"
            className={`nav-btn ${currentView === 'orders' ? 'active' : ''}`}
            onClick={() => setCurrentView('orders')}
          >
            📋 Pesanan Saya
          </button>
        </nav>
      </header>

      {/* Main Body Content */}
      <main className="app-body">
        {initialLoading ? (
          <div className="center-loader">Memuat data produk mebel...</div>
        ) : (
          <>
            {/* VIEW 1: KATALOG ETALASE PRODUK DEPAN */}
            {currentView === 'storefront' && (
              <Storefront
                catalog={catalog}
                onSelectProduct={handleSelectProduct}
              />
            )}

            {/* VIEW 2: STUDIO 3D VISUALIZER & CUSTOMIZER */}
            {currentView === 'studio' && (
              <div className="studio-view">
                <button
                  type="button"
                  className="btn-back-float"
                  onClick={() => setCurrentView('storefront')}
                >
                  ← Kembali ke Etalase
                </button>

                {/* Kanvas 3D Three.js */}
                <div className="viewer-wrapper">
                  <FurnitureViewer
                    ref={viewerRef}
                    widthCm={widthCm}
                    heightCm={heightCm}
                    depthCm={depthCm}
                    shelvesCount={shelvesCount}
                    colorHex={colorHex}
                    hasDoor={hasDoor}
                    doorType={doorType}
                    model3dUrl={selectedProduct?.model_3d_url}
                  />
                </div>

                {/* Kontrol UI Panel */}
                <div className="control-panel">
                  <h2>Studio 3D: {selectedProduct?.name || 'Custom Mebel'}</h2>

                  <div className="form-group">
                    <label>Ganti Model Mebel:</label>
                    <select
                      value={selectedFurnitureId}
                      onChange={(e) => handleFurnitureChange(e.target.value)}
                    >
                      {catalog.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Bahan Kayu Mentah:</label>
                    <select
                      value={selectedBaseWoodId}
                      onChange={(e) => setSelectedBaseWoodId(e.target.value)}
                    >
                      {materials
                        .filter((m) => m.category === 'BASE_WOOD')
                        .map((mat) => (
                          <option key={mat.id} value={mat.id}>
                            {mat.material_name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Tipe Finishing / Pelapis:</label>
                    <select
                      value={selectedFinishingId}
                      onChange={(e) => setSelectedFinishingId(e.target.value)}
                    >
                      {materials
                        .filter((m) => m.category === 'FINISHING')
                        .map((mat) => (
                          <option key={mat.id} value={mat.id}>
                            {mat.material_name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <hr />

                  <div className="form-group">
                    <label>Lebar: {widthCm} cm</label>
                    <input
                      type="range"
                      min={selectedProduct?.min_width_cm || 60}
                      max={selectedProduct?.max_width_cm || 240}
                      value={widthCm}
                      onChange={(e) => setWidthCm(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Tinggi: {heightCm} cm</label>
                    <input
                      type="range"
                      min={selectedProduct?.min_height_cm || 100}
                      max={selectedProduct?.max_height_cm || 260}
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Kedalaman: {depthCm} cm</label>
                    <input
                      type="range"
                      min={selectedProduct?.min_depth_cm || 40}
                      max={selectedProduct?.max_depth_cm || 70}
                      value={depthCm}
                      onChange={(e) => setDepthCm(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Jumlah Sekat Slot: {shelvesCount} Ruang</label>
                    <input
                      type="range"
                      min="1"
                      max="8"
                      value={shelvesCount}
                      onChange={(e) => setShelvesCount(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Warna Representasi Finishing:</label>
                    <input
                      type="color"
                      className="color-input"
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value)}
                    />
                  </div>

                  {/* Checkbox Pintu Lemari */}
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                    <input
                      type="checkbox"
                      id="hasDoorCheck"
                      checked={hasDoor}
                      onChange={(e) => setHasDoor(e.target.checked)}
                    />
                    <label htmlFor="hasDoorCheck" style={{ margin: 0, cursor: 'pointer', color: '#fff' }}>
                      Pasang Pintu Lemari
                    </label>
                  </div>

                  {hasDoor && (
                    <div className="form-group" style={{ marginTop: '8px' }}>
                      <label>Model Pintu:</label>
                      <select value={doorType} onChange={(e) => setDoorType(e.target.value)}>
                        <option value="DOUBLE">2 Pintu Ganda (Double Door)</option>
                        <option value="SINGLE">1 Pintu Tunggal (Single Door)</option>
                      </select>
                    </div>
                  )}

                  {/* Checkbox Jasa Pemasangan & Instalasi Tukang */}
                  <label className="checkbox-card" style={{ marginTop: '14px' }}>
                    <input
                      type="checkbox"
                      checked={withInstallation}
                      onChange={(e) => setWithInstallation(e.target.checked)}
                    />
                    <div className="checkbox-text">
                      <strong>Tambah Jasa Instalasi & Pemasangan (+Tukang)</strong>
                      <p>Tukang kayu ayah akan datang langsung merakit dan mengunci lemari ke dinding ruangan Anda.</p>
                    </div>
                  </label>

                  <hr />

                  {/* Ringkasan RAB Realtime */}
                  <div className="cost-summary">
                    <h3>Estimasi RAB {isLoading ? '(Menghitung...)' : ''}</h3>
                    {costBreakdown && materialsBreakdown ? (
                      <>
                        <p>
                          <span>Kebutuhan Kayu:</span>
                          <span>{materialsBreakdown.totalWoodNeededM2} m²</span>
                        </p>
                        <p>
                          <span>Biaya Kayu:</span>
                          <span>Rp {costBreakdown.materialWoodCost.toLocaleString('id-ID')}</span>
                        </p>
                        <p>
                          <span>Biaya Finishing:</span>
                          <span>Rp {costBreakdown.finishingCost.toLocaleString('id-ID')}</span>
                        </p>
                        {costBreakdown.hardwareCost > 0 && (
                          <p>
                            <span>Biaya Aksesoris (Pintu & Gagang):</span>
                            <span>Rp {costBreakdown.hardwareCost.toLocaleString('id-ID')}</span>
                          </p>
                        )}
                        <p>
                          <span>Ongkos Tukang Produksi:</span>
                          <span>Rp {costBreakdown.laborCost.toLocaleString('id-ID')}</span>
                        </p>
                        {costBreakdown.installationCost > 0 && (
                          <p style={{ color: '#38bdf8', fontWeight: '600' }}>
                            <span>Jasa Pemasangan di Tempat:</span>
                            <span>Rp {costBreakdown.installationCost.toLocaleString('id-ID')}</span>
                          </p>
                        )}
                        <div className="total-price">
                          <span>Total Estimasi:</span>
                          <span>Rp {costBreakdown.totalEstimatedPrice.toLocaleString('id-ID')}</span>
                        </div>
                      </>
                    ) : (
                      <p>Memuat kalkulasi...</p>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn-submit"
                    onClick={handleSaveConfiguration}
                    disabled={isLoading || !costBreakdown}
                  >
                    Simpan Konfigurasi Custom
                  </button>
                </div>
              </div>
            )}

            {/* VIEW 3: DAFTAR PESANAN SAYA (DASHBOARD) */}
            {currentView === 'orders' && (
              <Dashboard
                onSelectConfig={handleLoadFromSaved}
                onBack={() => setCurrentView('storefront')}
              />
            )}
          </>
        )}
      </main>

      {/* Bottom Navigation Bar (Mobile Native Feel) */}
      <nav className="bottom-nav">
        <button
          type="button"
          className={`nav-item ${currentView === 'storefront' ? 'active' : ''}`}
          onClick={() => setCurrentView('storefront')}
        >
          <span className="icon">🪑</span>
          <span>Etalase</span>
        </button>
        <button
          type="button"
          className={`nav-item ${currentView === 'studio' ? 'active' : ''}`}
          onClick={() => setCurrentView('studio')}
        >
          <span className="icon">📐</span>
          <span>Studio 3D</span>
        </button>
        <button
          type="button"
          className={`nav-item ${currentView === 'orders' ? 'active' : ''}`}
          onClick={() => setCurrentView('orders')}
        >
          <span className="icon">📋</span>
          <span>Pesanan</span>
        </button>
      </nav>
    </div>
  );
}