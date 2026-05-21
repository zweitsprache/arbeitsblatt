import { auth } from "@/lib/auth/server";
import { isAdmin } from "@/lib/auth/is-admin";
import { prisma } from "@/lib/prisma";
import {
  APP_ROLES,
  AppRole,
  AppUserRecord,
  CurrentUserAccessPayload,
  DEFAULT_NEW_USER_ROLE,
  RoleAccessRecord,
  RoleAccessSettings,
  buildEffectiveUserAccess,
  getDefaultRoleSettings,
  normalizeAppRole,
  normalizeRoleAccessSettings,
} from "@/types/user-access";

type SessionUser = {
  id: string;
  email?: string | null;
  name?: string | null;
};

function mapUserRecord(record: {
  id: string;
  userId: string;
  email: string | null;
  name: string | null;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}): AppUserRecord {
  return {
    id: record.id,
    userId: record.userId,
    email: record.email,
    name: record.name,
    role: normalizeAppRole(record.role),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function mapRoleRecord(record: {
  role: string;
  settings: unknown;
  updatedAt: Date;
}): RoleAccessRecord {
  const role = normalizeAppRole(record.role);
  return {
    role,
    settings: normalizeRoleAccessSettings(role, record.settings),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function getSessionUser(session: unknown): SessionUser | null {
  if (!session || typeof session !== "object") {
    return null;
  }

  const maybeUser = (session as { user?: unknown }).user;
  if (!maybeUser || typeof maybeUser !== "object") {
    return null;
  }

  const user = maybeUser as { id?: unknown; email?: unknown; name?: unknown };
  if (typeof user.id !== "string" || !user.id.trim()) {
    return null;
  }

  return {
    id: user.id,
    email: typeof user.email === "string" ? user.email : null,
    name: typeof user.name === "string" ? user.name : null,
  };
}

export async function requireSessionUser(): Promise<SessionUser | null> {
  try {
    const result = await auth.getSession();
    return getSessionUser(result.data);
  } catch {
    return null;
  }
}

export async function syncUserAccess(user: SessionUser): Promise<AppUserRecord> {
  const record = await prisma.appUserAccess.upsert({
    where: { userId: user.id },
    update: {
      email: user.email ?? undefined,
      name: user.name ?? undefined,
    },
    create: {
      userId: user.id,
      email: user.email ?? undefined,
      name: user.name ?? undefined,
      role: DEFAULT_NEW_USER_ROLE,
      settings: {},
    },
  });

  return mapUserRecord(record);
}

export async function getRoleTemplate(role: AppRole): Promise<RoleAccessRecord> {
  const existing = await prisma.roleAccess.findUnique({ where: { role } });
  if (existing) {
    return mapRoleRecord(existing);
  }

  const created = await prisma.roleAccess.create({
    data: { role, settings: {} },
  });
  return mapRoleRecord(created);
}

export async function listRoleTemplates(): Promise<RoleAccessRecord[]> {
  const existing = await prisma.roleAccess.findMany();
  const byRole = new Map(existing.map((row) => [row.role, mapRoleRecord(row)]));
  const result: RoleAccessRecord[] = [];

  for (const role of APP_ROLES) {
    const found = byRole.get(role);
    if (found) {
      result.push(found);
    } else {
      const created = await prisma.roleAccess.create({
        data: { role, settings: {} },
      });
      result.push(mapRoleRecord(created));
    }
  }

  return result;
}

export async function updateRoleTemplate(
  role: AppRole,
  settings: RoleAccessSettings,
): Promise<RoleAccessRecord> {
  const normalized = normalizeRoleAccessSettings(role, settings);
  const record = await prisma.roleAccess.upsert({
    where: { role },
    update: { settings: normalized as unknown as object },
    create: { role, settings: normalized as unknown as object },
  });
  return mapRoleRecord(record);
}

export async function getCurrentUserAccess(): Promise<CurrentUserAccessPayload | null> {
  const user = await requireSessionUser();
  if (!user) {
    return null;
  }

  const record = await syncUserAccess(user);
  const userIsAdmin = isAdmin(user.id);
  const template = userIsAdmin
    ? getDefaultRoleSettings("platinum")
    : (await getRoleTemplate(record.role)).settings;

  return {
    user: record,
    effectiveAccess: buildEffectiveUserAccess(record.role, template, userIsAdmin),
  };
}

export async function listUserAccessRecords(): Promise<AppUserRecord[]> {
  const records = await prisma.appUserAccess.findMany({
    orderBy: [{ name: "asc" }, { email: "asc" }, { createdAt: "asc" }],
  });
  return records.map(mapUserRecord);
}

export async function updateUserRole(id: string, role: AppRole): Promise<AppUserRecord> {
  const record = await prisma.appUserAccess.update({
    where: { id },
    data: { role: normalizeAppRole(role) },
  });
  return mapUserRecord(record);
}

export async function deleteUserAccessRecord(id: string): Promise<void> {
  await prisma.appUserAccess.delete({ where: { id } });
}
