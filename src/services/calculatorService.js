// Service kalkulasi kebutuhan bahan (Bill of Materials) dan estimasi biaya RAB
 

export const calculateFurnitureBOM = ({
  widthCm,
  heightCm,
  depthCm,
  shelvesCount = 0,
  hasDoor = false,
  doorType = 'DOUBLE',
  baseWoodPricePerM2,
  finishingPricePerM2,
  baseLaborCost,
  withInstallationService = false,
}) => {
  // 1. Konversi satuan centimeter ke meter
  const w = Number(widthCm) / 100;
  const h = Number(heightCm) / 100;
  const d = Number(depthCm) / 100;
  const nShelves = Number(shelvesCount);
  const withDoor = Boolean(hasDoor);
  const withInstall = Boolean(withInstallationService);

  // 2. Kalkulasi luas penampang lemari (dalam meter persegi / m2)
  // Sisi samping: kiri dan kanan (2 panel)
  const sidePanelsArea = 2 * (h * d);

  // Sisi atas dan bawah: (2 panel)
  const topBottomPanelsArea = 2 * (w * d);

  // Sisi belakang: penutup dinding belakang (1 panel)
  const backPanelArea = w * h;

  // Sekat pembatas horizontal: jika ada N slot, maka ada (N - 1) sekat
  const internalShelvesArea = nShelves * (w * d);

  // Luas pintu depan jika opsi pintu aktif (1 muka penutup)
  const doorArea = withDoor ? (w * h) : 0;

  // 3. Luas total kayu mentah
  const rawAreaM2 = sidePanelsArea + topBottomPanelsArea + backPanelArea + internalShelvesArea + doorArea;

  // 4. Faktor buangan (wastage factor) 15% untuk sisa potongan kayu/triplek
  const WASTAGE_FACTOR = 1.15;
  const totalWoodNeededM2 = Number((rawAreaM2 * WASTAGE_FACTOR).toFixed(2));

  // 5. Kalkulasi komponen biaya
  const materialWoodCost = Math.round(totalWoodNeededM2 * Number(baseWoodPricePerM2));
  const finishingCost = Math.round(totalWoodNeededM2 * Number(finishingPricePerM2));

  // Biaya hardware aksesoris (engsel sendok + handle logam, estimasi Rp 75.000 jika berpintu)
  const hardwareCost = withDoor ? 75000 : 0;
  
  // Ongkos tukang produksi (dihitung dari tarif dasar dikali luas muka lemari)
  const frontalAreaM2 = w * h;
  const laborCost = Math.round(Number(baseLaborCost) * Math.max(1, frontalAreaM2));

  // Jasa pemasangan / instalasi di lokasi klien (opsional)
  // Standar kontraktor: Rp 150.000 / m2 muka lemari (minimal Rp 200.000)
  let installationCost = 0;
  if (withInstall) {
    const rawInstall = frontalAreaM2 * 150000;
    installationCost = Math.round(Math.max(rawInstall, 200000));
  }

  const totalEstimatedPrice = materialWoodCost + finishingCost + hardwareCost + laborCost + installationCost;

  return {
    dimensions: {
      widthCm: Number(widthCm),
      heightCm: Number(heightCm),
      depthCm: Number(depthCm),
      shelvesCount: nShelves,
      hasDoor: withDoor,
      doorType: withDoor ? doorType : 'NONE',
      withInstallationService: withInstall,
    },
    materialsBreakdown: {
      rawAreaM2: Number(rawAreaM2.toFixed(2)),
      doorAreaM2: Number(doorArea.toFixed(2)),
      totalWoodNeededM2,
      wastagePercentage: 15,
    },
    costBreakdown: {
      materialWoodCost,
      finishingCost,
      hardwareCost,
      laborCost,
      installationCost,
      totalEstimatedPrice,
    },
  };
};