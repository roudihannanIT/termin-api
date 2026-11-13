import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";

export class SlotNotFoundError extends Error {
  constructor() {
    super("Slot not found");
    this.name = "SlotNotFoundError";
  }
}

export class SlotAlreadyBookedError extends Error {
  constructor() {
    super("Slot is already booked");
    this.name = "SlotAlreadyBookedError";
  }
}

export async function createBooking(slotId: string, userId: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Slot" WHERE id = ${slotId} FOR UPDATE
      `;
      if (rows.length === 0) {
        throw new SlotNotFoundError();
      }

      const existing = await tx.booking.findFirst({
        where: { slotId, status: "CONFIRMED" },
        select: { id: true },
      });
      if (existing) {
        throw new SlotAlreadyBookedError();
      }

      return tx.booking.create({
        data: { slotId, userId },
        select: { id: true, slotId: true, userId: true, status: true, createdAt: true },
      });
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new SlotAlreadyBookedError();
    }
    throw err;
  }
}

export async function cancelBooking(bookingId: string, userId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.userId !== userId) {
    return null;
  }
  if (booking.status === "CANCELLED") {
    return booking;
  }
  return prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED", cancelledAt: new Date() },
    select: { id: true, slotId: true, userId: true, status: true, cancelledAt: true },
  });
}