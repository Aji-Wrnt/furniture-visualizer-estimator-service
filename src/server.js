import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/db.js';
import furnitureRoutes from './routes/furnitureRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.status(200).json({
      status: 'OK',
      service: 'custom-furniture-estimator-service',
      db_time: result.rows[0].now,
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Gagal terhubung ke database',
      error: error.message,
    });
  }
});

// Daftarkan route API mebel dengan prefix /api/furniture
app.use('/api/furniture', furnitureRoutes);

app.listen(PORT, () => {
  console.log(`Server on -> http://localhost:${PORT}`);
});