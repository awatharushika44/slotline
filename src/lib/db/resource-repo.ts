import { asc, eq } from "drizzle-orm";
import { db } from "./client";
import { resources } from "./schema";

export type Resource = typeof resources.$inferSelect;
export type NewResource = typeof resources.$inferInsert;

export type ResourceChanges = Partial<
  Pick<
    NewResource,
    "name" | "category" | "capacity" | "location" | "description" | "isActive"
  >
>;

export async function getResourceById(
  id: string,
): Promise<Resource | undefined> {
  const [row] = await db
    .select()
    .from(resources)
    .where(eq(resources.id, id))
    .limit(1);

  return row;
}

export async function listResources(options: {
  includeArchived: boolean;
}): Promise<Resource[]> {
  const query = db.select().from(resources);

  if (options.includeArchived) {
    return query.orderBy(asc(resources.category), asc(resources.name));
  }

  return query
    .where(eq(resources.isActive, true))
    .orderBy(asc(resources.category), asc(resources.name));
}

export const listActiveResources = () =>
  listResources({ includeArchived: false });

export async function insertResource(
  values: NewResource,
): Promise<Resource> {
  const [row] = await db.insert(resources).values(values).returning();

  if (!row) {
    throw new Error("Insert returned no row.");
  }

  return row;
}

export async function updateResourceRow(
  id: string,
  changes: ResourceChanges,
): Promise<Resource | undefined> {
  const [row] = await db
    .update(resources)
    .set({ ...changes, updatedAt: new Date() })
    .where(eq(resources.id, id))
    .returning();

  return row;
}