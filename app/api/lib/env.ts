import "dotenv/config";

function secret(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  appId: process.env.APP_ID || "demo-app",
  appSecret: secret("APP_SECRET"),
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: process.env.DATABASE_URL || "sqlite.db",
};
