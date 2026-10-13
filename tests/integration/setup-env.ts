import "dotenv/config";

const testUrl = process.env.TEST_DATABASE_URL;

if (!testUrl) {
  throw new Error(
    "TEST_DATABASE_URL is missing. Check your .env file.",
  );
}

const parsedUrl = new URL(testUrl);

if (!parsedUrl.pathname.endsWith("/slotline_test")) {
  throw new Error(
    "Safety check failed: integration tests must use the slotline_test database.",
  );
}

process.env.DATABASE_URL = testUrl;