import bcrypt from "bcrypt";
import { prisma } from "../../lib/prisma";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";

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
export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password");
    this.name = "InvalidCredentialsError";
  }
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  const DUMMY_HASH = bcrypt.hashSync("dummy-password", 12);

  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH);
    throw new InvalidCredentialsError();
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new InvalidCredentialsError();
  }

  const token = jwt.sign(
    { sub: user.id, role: user.role },
    env.JWT_SECRET,
    { expiresIn: "15m" }
  );

  return { token, user: { id: user.id, email: user.email, role: user.role } };
}