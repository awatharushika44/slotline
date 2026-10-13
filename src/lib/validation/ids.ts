import { z } from "zod";

export const isUuid = (value: string): boolean => z.uuid().safeParse(value).success;