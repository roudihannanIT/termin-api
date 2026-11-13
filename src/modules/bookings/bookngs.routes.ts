import { Router } from "express";
import { createBooking, cancelBooking, SlotNotFoundError, SlotAlreadyBookedError } from "./bookings.service";
import { requireAuth } from "../../middleware/auth";

export const bookingsRouter = Router();

bookingsRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const slotId = req.body?.slotId;
    if (typeof slotId !== "string") {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "slotId is required" } });
    }
    const booking = await createBooking(slotId, req.user!.id);
    return res.status(201).json(booking);
  } catch (err) {
    if (err instanceof SlotNotFoundError) {
      return res.status(404).json({ error: { code: "SLOT_NOT_FOUND", message: err.message } });
    }
    if (err instanceof SlotAlreadyBookedError) {
      return res.status(409).json({ error: { code: "SLOT_TAKEN", message: err.message } });
    }
    return next(err);
  }
});

bookingsRouter.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const bookingId = String(req.params.id);
    const booking = await cancelBooking(bookingId, req.user!.id);
    if (!booking) {
      return res.status(404).json({ error: { code: "BOOKING_NOT_FOUND", message: "Booking not found" } });
    }
    return res.json(booking);
  } catch (err) {
    return next(err);
  }
});