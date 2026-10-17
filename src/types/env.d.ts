// This file defines the environment variable types for TypeScript
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test'
    DATABASE_URL: string
    NEXTAUTH_URL: string
    NEXTAUTH_URL_INTERNAL?: string
    NEXTAUTH_SECRET: string
    AUTH_TRUST_HOST?: string
    CLOUDINARY_CLOUD_NAME?: string
    CLOUDINARY_API_KEY?: string
    CLOUDINARY_API_SECRET?: string
    // Channel manager (see CHANNEL_MANAGER.md)
    ANTHROPIC_API_KEY?: string
    CRON_SECRET?: string
    ENCRYPTION_KEY?: string
    EXPEDIA_EQC_BASE_URL?: string
    EXPEDIA_API_BASE_URL?: string
    BOOKING_COM_SUPPLY_URL?: string
    BOOKING_COM_SECURE_URL?: string
  }
}
