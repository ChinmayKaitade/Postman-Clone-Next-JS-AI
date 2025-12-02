import { defineConfig } from "prisma/config";

// The CLI tools will read the DATABASE_URL from your environment
const DATABASE_URL = process.env.DATABASE_URL;

export default defineConfig({
  datasources: [
    {
      name: "db", // Must match the name of your datasource block in schema.prisma
      url: DATABASE_URL,
    },
  ],
});
