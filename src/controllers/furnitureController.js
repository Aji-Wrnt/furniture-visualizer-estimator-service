import pool from '../config/db.js';
import { calculateFurnitureBOM } from '../services/calculatorService.js';

// 1. Ambil katalog dasar dan daftar material
export const getCatalog = async (req, res) => {
  try {
    const furnitureQuery = 'SELECT * FROM catalog_furniture ORDER BY created_at ASC';
    const materialsQuery = 'SELECT * FROM materials ORDER BY category, material_name ASC';

    const [furnitureResult, materialsResult] = await Promise.all([
      pool.query(furnitureQuery),
      pool.query(materialsQuery),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        catalog: furnitureResult.rows,
        materials: materialsResult.rows,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Gagal mengambil data katalog',
      error: error.message,
    });
  }
};

// 2. Kalkulasi estimasi biaya berdasarkan parameter input
export const estimateCost = async (req, res) => {
  try {
    const {
      furnitureId,
      baseMaterialId,
      finishingMaterialId,
      widthCm,
      heightCm,
      depthCm,
      shelvesCount,
      hasDoor,
      doorType,
      withInstallationService,
    } = req.body;

    // Validasi kelengkapan parameter
    if (!furnitureId || !baseMaterialId || !finishingMaterialId || !widthCm || !heightCm || !depthCm) {
      return res.status(400).json({
        status: 'fail',
        message: 'Parameter dimensi dan ID material wajib diisi',
      });
    }

    // Ambil data acuan dari database
    const furnitureRes = await pool.query('SELECT * FROM catalog_furniture WHERE id = $1', [furnitureId]);
    const baseWoodRes = await pool.query('SELECT * FROM materials WHERE id = $1', [baseMaterialId]);
    const finishingRes = await pool.query('SELECT * FROM materials WHERE id = $1', [finishingMaterialId]);

    if (furnitureRes.rows.length === 0 || baseWoodRes.rows.length === 0 || finishingRes.rows.length === 0) {
      return res.status(404).json({
        status: 'fail',
        message: 'Data furniture atau material tidak ditemukan',
      });
    }

    const furniture = furnitureRes.rows[0];
    const baseWood = baseWoodRes.rows[0];
    const finishing = finishingRes.rows[0];

    // Validasi batas ukuran fisik aman mebel
    if (
      widthCm < furniture.min_width_cm || widthCm > furniture.max_width_cm ||
      heightCm < furniture.min_height_cm || heightCm > furniture.max_height_cm ||
      depthCm < furniture.min_depth_cm || depthCm > furniture.max_depth_cm
    ) {
      return res.status(400).json({
        status: 'fail',
        message: `Dimensi melampaui batas aman. Lebar: ${furniture.min_width_cm}-${furniture.max_width_cm}cm, Tinggi: ${furniture.min_height_cm}-${furniture.max_height_cm}cm, Kedalaman: ${furniture.min_depth_cm}-${furniture.max_depth_cm}cm`,
      });
    }

    // Jalankan kalkulator BOM
    const calculation = calculateFurnitureBOM({
      widthCm,
      heightCm,
      depthCm,
      shelvesCount: Number(shelvesCount) || 0,
      hasDoor: Boolean(hasDoor),
      doorType: doorType || 'DOUBLE',
      baseWoodPricePerM2: baseWood.price_per_unit,
      finishingPricePerM2: finishing.price_per_unit,
      baseLaborCost: furniture.base_labor_cost,
      withInstallationService: Boolean(withInstallationService),
    });

    res.status(200).json({
      status: 'success',
      data: calculation,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan saat menghitung estimasi',
      error: error.message,
    });
  }
};

// 3. Simpan konfigurasi final ke PostgreSQL (dengan JSONB)
export const saveConfiguration = async (req, res) => {
  // Ambil 1 client khusus dari connection pool
  const client = await pool.connect();

  try {
    const {
      furnitureId,
      baseMaterialId,
      finishingMaterialId,
      widthCm,
      heightCm,
      depthCm,
      parametricSpecs,
      arSnapshotUrl,
      estimatedMaterialCost,
      estimatedLaborCost,
      estimatedTotalPrice,
    } = req.body;

    // 1. Mulai transaksi
    await client.query('BEGIN');

    const insertQuery = `
      INSERT INTO custom_configurations (
        furniture_id,
        base_material_id,
        finishing_material_id,
        real_width_cm,
        real_height_cm,
        real_depth_cm,
        parametric_specs,
        ar_snapshot_url,
        estimated_material_cost,
        estimated_labor_cost,
        estimated_total_price
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `;

    const values = [
      furnitureId,
      baseMaterialId,
      finishingMaterialId,
      widthCm,
      heightCm,
      depthCm,
      JSON.stringify(parametricSpecs || {}),
      arSnapshotUrl || null,
      estimatedMaterialCost,
      estimatedLaborCost,
      estimatedTotalPrice,
    ];

    const result = await client.query(insertQuery, values);

    // 2. Jika semua query sukses, commit perubahan ke database
    await client.query('COMMIT');

    res.status(201).json({
      status: 'success',
      message: 'Konfigurasi custom mebel berhasil disimpan',
      data: result.rows[0],
    });
  } catch (error) {
    // 3. Jika terjadi kesalahan, batalkan seluruh transaksi
    await client.query('ROLLBACK');

    res.status(500).json({
      status: 'error',
      message: 'Gagal menyimpan konfigurasi mebel',
      error: error.message,
    });
  } finally {
    // 4. Wajib lepaskan client kembali ke pool agar tidak terjadi memory/connection leak
    client.release();
  }
};

export const getSavedConfigurations = async (req, res) => {
  try {
    // Mengambil 20 konfigurasi terbaru beserta nama mebel & materialnya
    const query = `
      SELECT 
        c.*, 
        f.name as furniture_name,
        bm.material_name as base_material_name,
        fm.material_name as finishing_material_name
      FROM custom_configurations c
      LEFT JOIN catalog_furniture f ON c.furniture_id = f.id
      LEFT JOIN materials bm ON c.base_material_id = bm.id
      LEFT JOIN materials fm ON c.finishing_material_id = fm.id
      ORDER BY c.created_at DESC 
      LIMIT 20
    `;
    const result = await pool.query(query);
    
    return res.status(200).json({
      status: 'success',
      data: result.rows,
    });
  } catch (error) {
    console.error('Error mengambil data konfigurasi:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mengambil data konfigurasi',
      error: error.message,
    });
  }
};

// 5. Kontrak Inter-Service API: Payload standar pesanan untuk platform utama ("Tukang Online")
export const getOrderPayload = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        c.*, 
        f.name as furniture_name,
        bm.material_name as base_material_name,
        fm.material_name as finishing_material_name
      FROM custom_configurations c
      LEFT JOIN catalog_furniture f ON c.furniture_id = f.id
      LEFT JOIN materials bm ON c.base_material_id = bm.id
      LEFT JOIN materials fm ON c.finishing_material_id = fm.id
      WHERE c.id = $1
    `;

    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'fail',
        message: 'Konfigurasi mebel tidak ditemukan',
      });
    }

    const row = result.rows[0];
    const specs = typeof row.parametric_specs === 'string'
      ? JSON.parse(row.parametric_specs)
      : (row.parametric_specs || {});

    const orderPayload = {
      itemType: 'CUSTOM_FURNITURE',
      configurationId: row.id,
      title: row.furniture_name || 'Custom Furniture',
      productName: row.furniture_name || 'Custom Furniture',
      dimensions: {
        widthCm: Number(row.real_width_cm),
        heightCm: Number(row.real_height_cm),
        depthCm: Number(row.real_depth_cm),
      },
      realDimensions: {
        widthCm: Number(row.real_width_cm),
        heightCm: Number(row.real_height_cm),
        depthCm: Number(row.real_depth_cm),
      },
      specifications: {
        baseMaterial: row.base_material_name || '-',
        finishing: row.finishing_material_name || '-',
        shelves: Number(specs.shelvesCount) || 0,
        door: specs.hasDoor ? (specs.doorType || 'DOUBLE') : 'NONE',
        finishColorHex: specs.finishColorHex || '#8B5A2B',
        requiresInstallation: Boolean(specs.withInstallationService),
      },
      specsSummary: {
        wood: row.base_material_name || '-',
        finishing: row.finishing_material_name || '-',
        shelves: Number(specs.shelvesCount) || 0,
        door: specs.hasDoor ? (specs.doorType || 'DOUBLE') : 'NONE',
        finishColorHex: specs.finishColorHex || '#8B5A2B',
        requiresTukangInstallation: Boolean(specs.withInstallationService),
      },
      previewImageUrl: row.ar_snapshot_url,
      referenceSnapshotUrl: row.ar_snapshot_url,
      pricing: {
        materialCost: Number(row.estimated_material_cost),
        laborCost: Number(row.estimated_labor_cost),
        totalPrice: Number(row.estimated_total_price),
      },
      priceBreakdown: {
        materialsCost: Number(row.estimated_material_cost),
        laborCost: Number(row.estimated_labor_cost),
        totalOrderPrice: Number(row.estimated_total_price),
      },
      createdAt: row.created_at,
    };

    return res.status(200).json({
      status: 'success',
      data: orderPayload,
    });
  } catch (error) {
    console.error('Error saat membuat order-payload:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mengambil data order payload',
      error: error.message,
    });
  }
};
