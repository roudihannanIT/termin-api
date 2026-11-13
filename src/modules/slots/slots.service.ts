import { prisma } from "../../lib/prisma";

export async function generateSlots(
  serviceId: string,
  startsAt: Date,
  count: number,
  stepMinutes: number
) {
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) {
    return null;
  }

  const rows = Array.from({ length: count }, (_, i) => {
    const start = new Date(startsAt.getTime() + i * stepMinutes * 60_000);
    const end = new Date(start.getTime() + service.durationMinutes * 60_000);
    return { serviceId, startsAt: start, endsAt: end };
  });

  const result = await prisma.slot.createMany({ data: rows, skipDuplicates: true });
  return { requested: count, created: result.count };
}

export function listSlots(serviceId: string, from: Date, to: Date, limit: number) {
  return prisma.slot.findMany({
    where: {
      serviceId,
      startsAt: { gte: from, lt: to },
      bookings: { none: { status: "CONFIRMED" } },
    },
    orderBy: { startsAt: "asc" },
    take: limit,
    select: { id: true, startsAt: true, endsAt: true },
  });
}