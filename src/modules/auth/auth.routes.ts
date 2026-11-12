import { Router } from "express";
import { z } from "zod";
import { registerUser, loginUser, EmailAlreadyExistsError, InvalidCredentialsError } from "./auth.service";

export const authRouter = Router();

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
});

authRouter.post("/register", async (req, res, next) => {
  try {
    const body = credentialsSchema.parse(req.body);
    const user = await registerUser(body.email, body.password);
    res.status(201).json(user);
  } catch (err) {
    if (err instanceof EmailAlreadyExistsError) {
      res.status(409).json({ error: { code: "EMAIL_EXISTS", message: err.message } });
      return;
    }
    next(err);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const body = credentialsSchema.parse(req.body);
    const result = await loginUser(body.email, body.password);
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof InvalidCredentialsError) {
      res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: err.message } });
      return;
    }
    next(err);
  }
});