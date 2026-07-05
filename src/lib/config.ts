/**
 * Centralized configuration with environment validation
 * All environment variables are validated at startup
 */

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function requiredEnvOptional(name: string): string | undefined {
  return process.env[name];
}

// Compute environment flags first
const isProduction = optionalEnv('NODE_ENV', 'development') === 'production';
const isDevelopment = optionalEnv('NODE_ENV', 'development') === 'development';

// Build config object
export const config = {
  // Environment
  env: optionalEnv('NODE_ENV', 'development'),
  isProduction,
  isDevelopment,

  // Database
  database: {
    url: optionalEnv('DATABASE_URL', './prisma/dev.db'),
    // For production PostgreSQL
    postgresqlUrl: requiredEnvOptional('POSTGRES_URL'),
  },

  // Authentication
  auth: {
    secret: isProduction ? requiredEnv('NEXTAUTH_SECRET') : optionalEnv('NEXTAUTH_SECRET', 'dev-secret-change-in-production'),
    baseUrl: optionalEnv('NEXTAUTH_URL', 'http://localhost:3000'),
    demoMode: optionalEnv('AUTH_DEMO_MODE', 'false') === 'true',
  },

  // AI Services
  ai: {
    openai: {
      apiKey: requiredEnvOptional('OPENAI_API_KEY'),
      model: optionalEnv('OPENAI_MODEL', 'gpt-4o'),
    },
    anthropic: {
      apiKey: requiredEnvOptional('ANTHROPIC_API_KEY'),
      model: optionalEnv('CLAUDE_MODEL', 'claude-3-5-sonnet-latest'),
    },
  },

  // Redis (for rate limiting and caching in production)
  redis: {
    url: requiredEnvOptional('REDIS_URL'),
  },

  // Email
  email: {
    host: requiredEnvOptional('SMTP_HOST'),
    port: parseInt(optionalEnv('SMTP_PORT', '587'), 10),
    user: requiredEnvOptional('SMTP_USER'),
    pass: requiredEnvOptional('SMTP_PASS'),
    from: requiredEnvOptional('EMAIL_FROM'),
  },

  // Calendar
  calendar: {
    googleClientId: requiredEnvOptional('GOOGLE_CLIENT_ID'),
    googleClientSecret: requiredEnvOptional('GOOGLE_CLIENT_SECRET'),
    googleRefreshToken: requiredEnvOptional('GOOGLE_REFRESH_TOKEN'),
  },

  // Feature flags
  features: {
    demoMode: optionalEnv('DEMO_MODE', 'false') === 'true',
    rateLimiting: optionalEnv('ENABLE_RATE_LIMITING', 'true') === 'true',
  },

  // Rate limiting
  rateLimit: {
    windowMs: parseInt(optionalEnv('RATE_LIMIT_WINDOW_MS', '60000'), 10),
    maxRequests: parseInt(optionalEnv('RATE_LIMIT_MAX_REQUESTS', '100'), 10),
  },
} as const;

// Development warnings (computed after config)
export const developmentWarnings = config.env === 'development' && !process.env.NEXTAUTH_SECRET
  ? ['NEXTAUTH_SECRET not set, using insecure default']
  : [];

// Type for config
export type Config = typeof config;

// Log warnings in development
if (developmentWarnings.length > 0 && config.isDevelopment) {
  console.warn('⚠️  Development warnings:', developmentWarnings);
}