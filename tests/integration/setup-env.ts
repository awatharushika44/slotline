import "dotenv/config";

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) {
  throw new Error("TEST_DATABASE_URL is not set. See .env.example.");
}
process.env.DATABASE_URL = testUrl;