import express from "express";
import { authRouter } from "./modules/auth/auth.routes";
import { ZodError } from "zod";

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use("/auth", authRouter);

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", details: err.issues } });
    }
    console.error(err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } });
  });

  return app;
}