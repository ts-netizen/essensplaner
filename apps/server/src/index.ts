import { createApp } from './app.js';

const app = createApp();

const PORT = Number(process.env.PORT) || 8080;
const HOST = '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`[Essensplaner Server] Node.js BFF running on http://${HOST}:${PORT}`);
  console.log(`[Essensplaner Server] Health check available at http://${HOST}:${PORT}/health`);
});

// Graceful shutdown handling
function handleShutdown(signal: string) {
  console.log(`[Essensplaner Server] Received ${signal}. Gracefully shutting down...`);
  server.close(() => {
    console.log('[Essensplaner Server] Closed out remaining connections.');
    process.exit(0);
  });

  // Force close after 10s if hanging
  setTimeout(() => {
    console.error('[Essensplaner Server] Forcefully shutting down.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

export default app;
