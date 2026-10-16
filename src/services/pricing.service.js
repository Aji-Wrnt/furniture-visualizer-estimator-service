export const calculateFurnitureEstimate = ({
  furniture,
  baseMaterial,
  finishingMaterial,
  widthCm,
  heightCm,
  depthCm,
  shelvesCount = 0,
  hasDoor = false,
}) => {
  const w = Number(widthCm) / 100;
  const h = Number(heightCm) / 100;
  const d = Number(depthCm) / 100;
  const shelves = Number(shelvesCount);

  // 1. Luas rangka utama (m2)
  const sidesArea = 2 * (h * d);
  const topBottomArea = 2 * (w * d);
  const backArea = w * h;
  const shelvesArea = shelves * (w * d);

  // Luas pintu depan jika opsi pintu aktif
  const doorArea = hasDoor ? (w * h) : 0;

  const rawSurfaceArea = sidesArea + topBottomArea + backArea + shelvesArea + doorArea;

  // 2. Faktor pemborosan kayu 15%
  const totalWoodNeededM2 = Number((rawSurfaceArea * 1.15).toFixed(2));

  // 3. Biaya Bahan
  const baseWoodCost = Math.round(totalWoodNeededM2 * Number(baseMaterial.price_per_m2));
  const finishingCost = Math.round(totalWoodNeededM2 * Number(finishingMaterial.price_per_m2));

  // Biaya hardware engsel + handle (flat Rp 75.000 jika ada pintu)
  const hardwareCost = hasDoor ? 75000 : 0;

  // 4. Ongkos Tukang (berdasarkan luas muka frontal)
  const frontalArea = w * h;
  const laborCost = Math.round(frontalArea * Number(furniture.base_labor_cost));

  // 5. Total Estimasi RAB
  const totalEstimatedPrice = baseWoodCost + finishingCost + hardwareCost + laborCost;

  return {
    materialsBreakdown: {
      rawSurfaceAreaM2: Number(rawSurfaceArea.toFixed(2)),
      totalWoodNeededM2,
      doorAreaM2: Number(doorArea.toFixed(2)),
    },
    costBreakdown: {
      materialWoodCost: baseWoodCost,
      finishingCost,
      hardwareCost,
      laborCost,
      totalEstimatedPrice,
    },
  };
};