import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import router from './routes';
import { provisionAdminAccounts } from './firebase';
import { initDeviceSyncService } from './services/deviceSync.service';

// Trigger reload after Firestore activation by user
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable Cross-Origin Resource Sharing
app.use(cors({
  origin: '*', // Allow all origins for local testing and dev
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json());

// Request Logger Middleware
app.use((req, res, next) => {
  res.on('finish', () => {
    console.log(`[HTTP] ${req.method} ${req.originalUrl} - Status: ${res.statusCode}`);
  });
  next();
});

// API route middleware mounting
app.use('/api', router);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'alpha-zone-os-api', timestamp: new Date().toISOString() });
});

// Boot the server
app.listen(PORT, async () => {
  console.log(`===================================================`);
  console.log(`  ALPHA ZONE OS Backend API running on port ${PORT}`);
  console.log(`  Access routes: http://localhost:${PORT}/api`);
  console.log(`===================================================`);

  try {
    await provisionAdminAccounts();
  } catch (err) {
    console.error('Failed to provision admin accounts on boot:', err);
  }

  try {
    initDeviceSyncService();
  } catch (err) {
    console.error('Failed to initialize Device Sync service on boot:', err);
  }
});
