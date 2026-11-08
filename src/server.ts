import { createApp } from "./app";
import { env } from "./config/env";

const PORT = env.PORT;

const app = createApp();

const server = app.listen(PORT, () => {
  console.log(`Termin API listening on port ${PORT}`);
});

function shutdown(signal: string) {
  console.log(`${signal} received, shutting down...`);
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));