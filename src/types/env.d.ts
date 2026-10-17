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
    // Property custom domains (see DEPLOYMENT.md)
    NEXT_PUBLIC_SITE_URL?: string
    APP_HOSTNAMES?: string
    INTERNAL_APP_URL?: string
    CUSTOM_DOMAIN_CNAME_TARGET?: string
    CUSTOM_DOMAIN_A_RECORD?: string
    RENDER_API_KEY?: string
    RENDER_SERVICE_ID?: string
  }
}
