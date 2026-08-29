import type { Prisma, PrismaClient } from "@prisma/client";

/** Conversions from guests or signed-in non-admin users (exclude admin testing). */
export const nonAdminConversionWhere: Prisma.ConversionWhereInput = {
  OR: [{ userId: null }, { user: { role: { not: "admin" } } }],
};

export async function isAdminUserId(
  prisma: PrismaClient,
  userId: string | null | undefined,
): Promise<boolean> {
  if (!userId) return false;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role === "admin";
}

export async function getAdminUserIds(
  prisma: PrismaClient,
): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: { role: "admin" },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/** Page views from guests or non-admin accounts (when userId is set). */
export function nonAdminPageViewWhere(
  adminUserIds: string[],
): Prisma.PageViewWhereInput {
  if (adminUserIds.length === 0) return {};
  return {
    OR: [{ userId: null }, { userId: { notIn: adminUserIds } }],
  };
}
