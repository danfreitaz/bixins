import "server-only";
import postgres from "postgres";
const globalDb = globalThis as unknown as {
  bixinsDb?: ReturnType<typeof postgres>;
};
export const db =
  globalDb.bixinsDb ??
  postgres(process.env.DATABASE_URL!, {
    max: 3,
    idle_timeout: 20,
    connect_timeout: 15,
    prepare: false,
    ssl: "require",
  });
if (process.env.NODE_ENV !== "production") globalDb.bixinsDb = db;
