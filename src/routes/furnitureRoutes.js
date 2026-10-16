import { Router } from 'express';
import {
  getCatalog,
  estimateCost,
  saveConfiguration,
  getSavedConfigurations,
} from '../controllers/furnitureController.js';

const router = Router();

// Endpoint untuk mengambil katalog mebel dan opsi material
router.get('/catalog', getCatalog);

// Endpoint kalkulasi estimasi harga riil (RAB) berdasarkan dimensi & slot
router.post('/estimate', estimateCost);

// Endpoint menyimpan konfigurasi kustomisasi user ke database
router.post('/configurations', saveConfiguration);

// Endpoint mengambil riwayat konfigurasi tersimpan
router.get('/configurations', getSavedConfigurations);

export default router;