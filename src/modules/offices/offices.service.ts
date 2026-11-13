import { prisma } from "../../lib/prisma";

export function listOffices() {
  return prisma.office.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, city: true, timezone: true },
  });
}

export function createOffice(data: { name: string; city: string; timezone?: string }) {
  return prisma.office.create({
    data,
    select: { id: true, name: true, city: true, timezone: true },
  });
}

export async function createService(
  officeId: string,
  data: { name: string; durationMinutes?: number }
) {
  const office = await prisma.office.findUnique({ where: { id: officeId } });
  if (!office) {
    return null;
  }
  return prisma.service.create({
    data: { officeId, ...data },
    select: { id: true, officeId: true, name: true, durationMinutes: true },
  });
}