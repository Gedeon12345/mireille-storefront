import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI est obligatoire"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET doit faire au moins 32 caractères"),
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/, 'JWT_EXPIRES_IN doit ressembler à "7d", "12h" ou "30m"')
    .default("7d"),
  // Frais de livraison fixes en centimes d'euro (0 = livraison offerte). Règle simple, à affiner plus tard.
  SHIPPING_FEE_CENTS: z.coerce.number().int().min(0).default(0),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:5173")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim().replace(/\/$/, ""))
        .filter(Boolean),
    ),
  TRUST_PROXY: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Configuration invalide (fichier .env) :");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")} : ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
