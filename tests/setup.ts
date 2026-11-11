const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL is not set. Set it to termin_test before running tests.");
}

const dbName = new URL(url).pathname.replace(/^\//, "");

if (dbName !== "termin_test") {
  throw new Error(
    `Refusing to run tests against database "${dbName}". Tests must use "termin_test".`
  );
}