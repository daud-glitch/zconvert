import { z } from "zod";

export const VALID_ROLES = ["admin", "user"] as const;

export const adminUserCreateSchema = z.object({
  email: z.string().email("Invalid email format"),
  name: z.string().optional(),
  role: z.enum(VALID_ROLES).optional().default("user"),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
});

export const adminUserUpdateSchema = z.object({
  id: z.string().min(1, "User ID is required"),
  email: z.string().email("Invalid email format").optional(),
  name: z.string().optional(),
  role: z.enum(VALID_ROLES).optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  isActive: z.boolean().optional(),
});

export const VALID_LINK_GROUPS = ["header_nav", "footer_product", "footer_company", "footer_legal", "social"] as const;

export const adminLinkSchema = z.object({
  label: z.string().min(1, "Label is required"),
  url: z.string().min(1, "URL is required"),
  group: z.enum(VALID_LINK_GROUPS),
  enabled: z.boolean().optional(),
  order: z.number().int().optional(),
  icon: z.string().optional(),
});

export const adminPageSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content cannot be empty"),
  enabled: z.boolean().optional(),
  seoTitle: z.string().optional(),
  seoDesc: z.string().optional(),
});

export const VALID_AD_LOCATIONS = ["homepage_top", "homepage_side", "converter_top", "converter_side", "footer"] as const;
export const VALID_AD_TYPES = ["banner", "code", "google"] as const;

export const adminAdSchema = z.object({
  title: z.string().min(1, "Title is required"),
  location: z.enum(VALID_AD_LOCATIONS),
  type: z.enum(VALID_AD_TYPES),
  content: z.string().optional(),
  code: z.string().optional(),
  enabled: z.boolean().optional(),
  order: z.number().int().optional(),
});

export const adminCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  label: z.string().min(1, "Label is required").max(100, "Label too long"),
  color: z.string().optional(),
  bgColor: z.string().optional(),
  icon: z.string().optional(),
  enabled: z.boolean().optional(),
  order: z.number().int().optional(),
});

export function formatZodError(error: z.ZodError): string {
  return error.issues.map((i) => i.message).join(", ");
}

