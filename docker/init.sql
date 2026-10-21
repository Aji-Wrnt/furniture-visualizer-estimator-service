-- Aktifkan ekstensi UUID generator
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabel Katalog Mebel Dasar
CREATE TABLE IF NOT EXISTS catalog_furniture (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  model_3d_url TEXT,
  min_width_cm INTEGER NOT NULL DEFAULT 40,
  max_width_cm INTEGER NOT NULL DEFAULT 300,
  min_height_cm INTEGER NOT NULL DEFAULT 60,
  max_height_cm INTEGER NOT NULL DEFAULT 300,
  min_depth_cm INTEGER NOT NULL DEFAULT 30,
  max_depth_cm INTEGER NOT NULL DEFAULT 100,
  base_labor_cost NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Master Material Kayu & Finishing
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  price_per_unit NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Riwayat Konfigurasi & Pesanan Custom
CREATE TABLE IF NOT EXISTS custom_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  furniture_id UUID REFERENCES catalog_furniture(id) ON DELETE SET NULL,
  base_material_id UUID REFERENCES materials(id) ON DELETE SET NULL,
  finishing_material_id UUID REFERENCES materials(id) ON DELETE SET NULL,
  real_width_cm NUMERIC(8, 2) NOT NULL,
  real_height_cm NUMERIC(8, 2) NOT NULL,
  real_depth_cm NUMERIC(8, 2) NOT NULL,
  parametric_specs JSONB NOT NULL,
  ar_snapshot_url TEXT,
  estimated_material_cost NUMERIC(14, 2) NOT NULL,
  estimated_labor_cost NUMERIC(14, 2) NOT NULL,
  estimated_total_price NUMERIC(14, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SEED DATA AWAL (Idempotent: ON CONFLICT DO NOTHING)

-- Seed Data Katalog Mebel
INSERT INTO catalog_furniture (
  id, name, category, model_3d_url, min_width_cm, max_width_cm, min_height_cm, max_height_cm, min_depth_cm, max_depth_cm, base_labor_cost
) VALUES 
  ('35b964ee-4b73-45b6-b3dd-ef1e3943d7e4', 'Lemari Pakaian Minimalis Modern', 'LEMARI', 'https://assets.tukangonline.com/3d/wardrobe_base.glb', 60, 240, 120, 260, 45, 70, 450000.00),
  ('6be48fca-7416-4ac4-a7c8-f7359607d091', 'Rak Buku / Display Sekat Modular', 'RAK_BUKU', 'https://assets.tukangonline.com/3d/bookshelf_base.glb', 40, 200, 80, 240, 30, 50, 300000.00),
  ('b59ae5c7-6c71-4729-8ba3-cc422245125f', 'Credenza TV / Meja Konsol Rendah', 'MEJA', NULL, 120, 220, 45, 80, 40, 50, 300000.00)
ON CONFLICT (id) DO NOTHING;

-- Seed Data Master Material
INSERT INTO materials (
  id, material_name, category, unit, price_per_unit
) VALUES
  ('f9991722-4ad1-48c0-96a0-ad33192a3fe8', 'Plywood / Multiplek 18mm (Grade A)', 'BASE_WOOD', 'M2', 175000.00),
  ('c3375a0e-bb98-4bac-8ea5-6020d6b1596b', 'Blockboard 18mm', 'BASE_WOOD', 'M2', 145000.00),
  ('b7968d51-5416-4a9b-b95b-9d4da9b4bf8b', 'Kayu Jati Belanda Solid', 'BASE_WOOD', 'M2', 260000.00),
  ('faf5f757-2bbb-48cf-91da-14caa0af0ef0', 'HPL Doff Standard (Taco/Carta)', 'FINISHING', 'M2', 95000.00),
  ('8a80fbd9-f7ed-41fa-aa54-853e2072ca88', 'HPL Woodgrain Premium Tekstur Kayu', 'FINISHING', 'M2', 135000.00),
  ('685690cf-7b79-424c-8a94-fc6c4c208247', 'Finishing Cat Duco Semprot', 'FINISHING', 'M2', 220000.00)
ON CONFLICT (id) DO NOTHING;
