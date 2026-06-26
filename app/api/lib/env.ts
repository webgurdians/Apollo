import "dotenv/config";

export const env = {
  appId: process.env.APP_ID || "demo-app",
  appSecret: process.env.APP_SECRET || "apollo_clinic_dev_secret_change_in_prod",
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: process.env.DATABASE_URL || "sqlite.db",
  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map(url => {
        let trimmed = url.trim().replace(/\/$/, "");
        if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
          trimmed = `https://${trimmed}`;
        }
        return trimmed;
      })
    : ["https://apollo-mald.vercel.app", "https://capollo.co.in", "https://www.capollo.co.in"],
  razorpayKeyId: process.env.VITE_RAZORPAY_KEY_ID || "",
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || "",
  s3Bucket: process.env.S3_BUCKET || "",
  s3PublicUrl: process.env.S3_PUBLIC_URL || "",
  s3Region: process.env.S3_REGION || "auto",
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID || "",
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
};
