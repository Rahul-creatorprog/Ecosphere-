import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import router from './routes.js';
import { initDb } from './db.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Mount routes
app.use('/api', router);

// Root health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'EcoSphere ESG MySQL API Server is running' });
});

// Initialize DB and start server
initDb()
  .then(() => {
    console.log('MySQL Database connected and initialized.');
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
