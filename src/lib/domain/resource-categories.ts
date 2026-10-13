export const RESOURCE_CATEGORIES = ["room", "equipment", "vehicle", "other"] as const;
export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<ResourceCategory, string> = {
  room: "Room",
  equipment: "Equipment",
  vehicle: "Vehicle",
  other: "Other",
};