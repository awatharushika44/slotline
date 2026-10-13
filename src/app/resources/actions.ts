"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createResource, editResource, setResourceActive } from "@/lib/services/resource-service";
import { isUuid } from "@/lib/validation/ids";
import { resourceInputSchema } from "@/lib/validation/resource";
import type { ResourceFormState } from "./form-state";

const MESSAGES = {
  FORBIDDEN: "Only admins can manage resources.",
  NOT_FOUND: "That resource no longer exists.",
  DUPLICATE_NAME: "A resource with this name already exists.",
} as const;

const read = (data: FormData, key: string) => String(data.get(key) ?? "");

function revalidateResourcePages() {
  for (const path of ["/", "/resources", "/timeline"]) revalidatePath(path);
}

export async function saveResourceAction(
  _previous: ResourceFormState,
  formData: FormData,
): Promise<ResourceFormState> {
  const values = {
    name: read(formData, "name"),
    category: read(formData, "category"),
    capacity: read(formData, "capacity"),
    location: read(formData, "location"),
    description: read(formData, "description"),
  };

  const parsed = resourceInputSchema.safeParse(values);
  if (!parsed.success) {
    return { values, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const actor = await getCurrentUser();
  const id = read(formData, "id");
  if (id && !isUuid(id)) return { values, message: MESSAGES.NOT_FOUND };

  const result = id
    ? await editResource(id, parsed.data, actor)
    : await createResource(parsed.data, actor);

  if (!result.ok) {
    const code = result.error.code;
    return {
      values,
      message: MESSAGES[code],
      fieldErrors: code === "DUPLICATE_NAME" ? { name: [MESSAGES.DUPLICATE_NAME] } : undefined,
    };
  }

  revalidateResourcePages();
  redirect("/resources"); // must stay outside try/catch: redirect works by throwing
}

export async function setResourceActiveAction(formData: FormData): Promise<void> {
  const id = read(formData, "id");
  if (!isUuid(id)) throw new Error("Invalid resource id.");
  const result = await setResourceActive(id, formData.get("active") === "true", await getCurrentUser());
  if (!result.ok) throw new Error(MESSAGES[result.error.code]);
  revalidateResourcePages();
}