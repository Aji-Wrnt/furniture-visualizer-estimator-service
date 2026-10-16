import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Connection Pool: Mengelola antrean koneksi ke database secara efisien
// tanpa harus membuat dan menutup koneksi baru di setiap request user
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
});

pool.on('connect', () => {
  console.log('Terhubung ke database PostgreSQL (custom_furniture_db)');
});

pool.on('error', (err) => {
  console.error('Error tak terduga pada koneksi PostgreSQL client:', err);
  process.exit(-1);
});

export default pool;