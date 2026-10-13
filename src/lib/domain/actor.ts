export interface Actor {
  id: string;
  role: "member" | "admin";
}

export const isAdmin = (actor: Actor): boolean => actor.role === "admin";