import { Router } from "express";
import { z } from "zod";
import { listOffices, createOffice, createService } from "./offices.service";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/roles";

export const officesRouter = Router();

const officeSchema = z.object({
  name: z.string().min(1).max(100),
  city: z.string().min(1).max(100),
  timezone: z.string().optional(),
});

const serviceSchema = z.object({
  name: z.string().min(1).max(100),
  durationMinutes: z.number().int().min(5).max(480).optional(),
});

officesRouter.get("/", async (_req, res, next) => {
  try {
    res.json({ offices: await listOffices() });
  } catch (err) {
    next(err);
  }
});

officesRouter.post("/", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const office = await createOffice(officeSchema.parse(req.body));
    res.status(201).json(office);
  } catch (err) {
    next(err);
  }
});

officesRouter.post("/:id/services", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const service = await createService(req.params.id as string, serviceSchema.parse(req.body));
    if (!service) {
      return res.status(404).json({ error: { code: "OFFICE_NOT_FOUND", message: "Office not found" } });
    }
    return res.status(201).json(service);
  } catch (err) {
    return next(err);
  }
});