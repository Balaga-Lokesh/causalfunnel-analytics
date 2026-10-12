import mongoose from 'mongoose';
// Register models so syncIndexes() knows about them even before any route uses them.
import './models/Event.js';

export async function connectDB(uri: string): Promise<void> {
  mongoose.connection.on('disconnected', () => console.warn('[db] disconnected'));
  mongoose.connection.on('error', (err) => console.error('[db] error', err));

  await mongoose.connect(uri);
  console.log(`[db] connected to "${mongoose.connection.name}"`);

  // Make sure the indexes declared on the models exist before serving traffic.
  await mongoose.connection.syncIndexes();
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
