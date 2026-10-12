import { createApp } from './app.js';
import { config } from './config.js';
import { connectDB, disconnectDB } from './db.js';

async function main() {
  await connectDB(config.mongoUri);

  const server = createApp().listen(config.port, () => {
    console.log(`[api] listening on http://localhost:${config.port}`);
    console.log(`[api] demo site at  http://localhost:${config.port}/demo/`);
  });

  const shutdown = async () => {
    server.close();
    await disconnectDB();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[api] failed to start', err);
  process.exit(1);
});
