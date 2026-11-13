import { Router } from "express";
import { z } from "zod";
import { generateSlots, listSlots } from "./slots.service";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/roles";

export const slotsRouter = Router();

const generateSchema = z.object({
  startsAt: z.coerce.date(),
  count: z.number().int().min(1).max(500),
  stepMinutes: z.number().int().min(5).max(480),
});

const listSchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

// POST /services/:id/slots/generate (ADMIN)
slotsRouter.post("/services/:id/slots/generate", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const body = generateSchema.parse(req.body);
    const result = await generateSlots(req.params.id as string, body.startsAt, body.count, body.stepMinutes);
    if (!result) {
      return res.status(404).json({ error: { code: "SERVICE_NOT_FOUND", message: "Service not found" } });
    }
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
});

// GET /services/:id/slots
slotsRouter.get("/services/:id/slots", async (req, res, next) => {
  try {
    const q = listSchema.parse(req.query);
    const slots = await listSlots(req.params.id, q.from, q.to, q.limit);
    return res.json({ slots });
  } catch (err) {
    return next(err);
  }
});