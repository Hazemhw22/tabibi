import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.warn("⚠️ DATABASE_URL is not set — Prisma is disabled.");
    return new Proxy({} as PrismaClient, {
      get(_target, prop) {
        if (prop === "$disconnect" || prop === "$connect") {
          return () => Promise.resolve();
        }
        return new Proxy(
          {},
          {
            get() {
              return () =>
                Promise.reject(
                  new Error("DATABASE_URL is not set. Prisma is disabled.")
                );
            },
          }
        );
      },
    });
  }

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
