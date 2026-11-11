import bcrypt from "bcrypt";
import { prisma } from "../../lib/prisma";

export class EmailAlreadyExistsError extends Error {
  constructor() {
    super("Email already registered");
    this.name = "EmailAlreadyExistsError";
  }
}

export async function registerUser(email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new EmailAlreadyExistsError();
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { email, passwordHash },
    select: { id: true, email: true, role: true, createdAt: true },
  });

  return user;
}