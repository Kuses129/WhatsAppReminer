import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(process.cwd(), '.env') });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

export const config = {
  // WAHA (WhatsApp HTTP API) settings
  waha: {
    apiUrl: optionalEnv('WAHA_API_URL', 'http://localhost:3001'),
    apiKey: optionalEnv('WAHA_API_KEY', ''),
    session: optionalEnv('WAHA_SESSION', 'default'),
  },

  // Server configuration
  server: {
    port: parseInt(optionalEnv('PORT', '3000'), 10),
    host: optionalEnv('HOST', '0.0.0.0'),
  },

  // Database
  database: {
    path: optionalEnv('DATABASE_PATH', path.join(process.cwd(), 'reminders.db')),
  },
};

export type Config = typeof config;
