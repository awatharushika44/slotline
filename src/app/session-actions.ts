"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { DEMO_USER_COOKIE } from "@/lib/auth/current-user";
import { isUuid } from "@/lib/validation/ids";

export async function switchDemoUserAction(formData: FormData): Promise<void> {
  const id = String(formData.get("userId") ?? "");
  if (!isUuid(id)) return;
  (await cookies()).set(DEMO_USER_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/" });
  revalidatePath("/", "layout");
}