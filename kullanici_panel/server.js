// Production Server for V-RAG User Panel with API Proxy
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';
import helmet from 'helmet';
import compression from 'compression';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:4000';

// Security headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// Compression
app.use(compression());

// Proxy GraphQL requests to API Gateway
app.use('/api/graphql', createProxyMiddleware({
  target: API_GATEWAY_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/graphql': '/graphql',
  },
}));

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'dist'), {
  maxAge: '1d',
  etag: true,
}));

// The "catchall" handler
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

const server = app.listen(PORT, () => {
  console.log(`🚀 [PROD] V-RAG Kullanıcı Paneli ${PORT} portunda çalışıyor.`);
  console.log(`📡 API Gateway Proxy: ${API_GATEWAY_URL}/graphql → /api/graphql`);
});
