import { isUniqueViolation } from "@/lib/db/errors";
import {
  getResourceById,
  insertResource,
  listResources as listResourceRows,
  updateResourceRow,
  type Resource,
} from "@/lib/db/resource-repo";
import { isAdmin, type Actor } from "@/lib/domain/actor";
import type { ResourceInput } from "@/lib/validation/resource";

export type ResourceError =
  | { code: "FORBIDDEN" }
  | { code: "NOT_FOUND" }
  | { code: "DUPLICATE_NAME" };

export type ResourceResult =
  | { ok: true; resource: Resource }
  | { ok: false; error: ResourceError };

const fail = (code: ResourceError["code"]): ResourceResult => ({ ok: false, error: { code } });

/** Every write goes through here: admin check first, then translate DB errors. */
async function adminWrite(
  actor: Actor,
  write: () => Promise<Resource | undefined>,
): Promise<ResourceResult> {
  if (!isAdmin(actor)) return fail("FORBIDDEN");
  try {
    const resource = await write();
    return resource ? { ok: true, resource } : fail("NOT_FOUND");
  } catch (error) {
    if (isUniqueViolation(error)) return fail("DUPLICATE_NAME");
    throw error;
  }
}

export const createResource = (input: ResourceInput, actor: Actor) =>
  adminWrite(actor, () => insertResource(input));

export const editResource = (id: string, input: ResourceInput, actor: Actor) =>
  adminWrite(actor, () => updateResourceRow(id, input));

/** Archive (false) or restore (true). Resources are never deleted (BR7). */
export const setResourceActive = (id: string, isActive: boolean, actor: Actor) =>
  adminWrite(actor, () => updateResourceRow(id, { isActive }));

export const listResources = (options: { includeArchived: boolean }) => listResourceRows(options);
export const getResource = (id: string) => getResourceById(id);