import * as z from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

export const createShareSchema = z.object({
  resourceType: z.enum(["file", "directory"]),
  resourceId: objectId,
});

export const updateShareSchema = z
  .object({
    accessType: z.enum(["public", "restricted"]).optional(),
    allowedEmails: z
      .array(z.email("Invalid email address"))
      .max(50, "A share can have at most 50 email addresses")
      .optional(),
    // null clears the expiry; otherwise a future ISO datetime.
    expiresAt: z.union([z.null(), z.iso.datetime()]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Nothing to update",
  })
  .refine(
    (data) =>
      data.expiresAt == null ||
      new Date(data.expiresAt).getTime() > Date.now(),
    {
      message: "Expiry must be in the future",
      path: ["expiresAt"],
    },
  )
  .transform((data) => ({
    ...data,
    ...(data.allowedEmails && {
      allowedEmails: [
        ...new Set(data.allowedEmails.map((email) => email.trim().toLowerCase())),
      ],
    }),
  }));
