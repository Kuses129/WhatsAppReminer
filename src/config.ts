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
  // Twilio credentials
  twilio: {
    accountSid: requireEnv('TWILIO_ACCOUNT_SID'),
    authToken: requireEnv('TWILIO_AUTH_TOKEN'),
    whatsappNumber: requireEnv('TWILIO_WHATSAPP_NUMBER'),
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
