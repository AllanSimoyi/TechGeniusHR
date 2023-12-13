import type { User } from '@prisma/client';

import bcrypt, { hash } from 'bcryptjs';

import { prisma } from '~/db.server';

export type { User } from '@prisma/client';

export async function getUserById(id: User['id']) {
  return prisma.user.findUnique({ where: { id } });
}

export async function checkIfValidLogin(username: string, password: string) {
  const user = await prisma.user.findFirst({
    where: { username },
  });
  if (!user) {
    return new Error('Invalid credentials');
  }

  const isValid = bcrypt.compare(password, user.password);
  if (!isValid) {
    return new Error('Invalid credentials');
  }

  const { password: fetchedPassword, ...userWithoutPassword } = user;
  console.log(fetchedPassword.length, 'character long hash');
  return userWithoutPassword;
}

export function createHashedPassowrd(password: string) {
  return hash(password, 10);
}
