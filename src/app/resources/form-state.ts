export interface ResourceFormState {
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: { name: string; category: string; capacity: string; location: string; description: string };
}