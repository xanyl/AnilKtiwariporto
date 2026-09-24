import { z } from "zod";

const str = z.string().max(2000);
const shortStr = z.string().max(200);
const url = z.string().max(2000).refine(
  (v) => {
    try {
      const scheme = new URL(v, "https://example.com").protocol;
      return ["http:", "https:", "mailto:", "tel:"].includes(scheme);
    } catch {
      return false;
    }
  },
  { message: "url must be http(s), mailto, or tel" }
);
const optionalUrl = url.optional();

export const profileSchema = z.object({
  name: shortStr,
  handle: shortStr,
  location: shortStr,
  email: z.string().email().max(200),
  phone: shortStr,
  phoneHref: shortStr,
  github: url,
  githubLabel: shortStr,
  linkedin: url,
  linkedinLabel: shortStr,
  resume: url,
  roles: z.array(shortStr).max(10),
});

export const summarySchema = str;

export const experienceSchema = z
  .array(
    z.object({
      org: shortStr,
      role: shortStr,
      start: shortStr,
      end: shortStr,
      bullets: z.array(str).max(20),
      stack: z.array(shortStr).max(30),
    })
  )
  .max(50);

export const projectsSchema = z
  .array(
    z.object({
      name: shortStr,
      blurb: str,
      repo: optionalUrl,
      bullets: z.array(str).max(20),
      metrics: z.array(z.object({ value: shortStr, label: shortStr })).max(10),
      stack: z.array(shortStr).max(30),
    })
  )
  .max(50);

export const skillGroupsSchema = z
  .array(z.object({ label: shortStr, items: z.array(shortStr).max(50) }))
  .max(30);

export const educationSchema = z
  .array(z.object({ school: shortStr, degree: shortStr, detail: shortStr }))
  .max(20);

export const certificatesSchema = z
  .array(
    z.object({
      title: shortStr,
      issuer: shortStr,
      issued: shortStr,
      file: optionalUrl,
      credentialId: shortStr.optional(),
      verificationUrl: optionalUrl,
    })
  )
  .max(100);

export const publicationsSchema = z
  .array(z.object({ title: str, venue: shortStr, url }))
  .max(50);

export const RESUME_FIELD_SCHEMAS = {
  profile: profileSchema,
  summary: summarySchema,
  experience: experienceSchema,
  projects: projectsSchema,
  skillGroups: skillGroupsSchema,
  education: educationSchema,
  certificates: certificatesSchema,
  publications: publicationsSchema,
} as const;

export type ResumeFieldName = keyof typeof RESUME_FIELD_SCHEMAS;

// Disallow non-printing/control characters (tabs and newlines excepted) and
// anything URL-shaped, so the guestbook can't carry hidden payloads or
// become a free link-spam board.
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;
const URL_LIKE = /https?:\/\/|www\./i;
const noControlChars = (v: string) => !CONTROL_CHARS.test(v);

export const guestbookPostSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .refine(noControlChars, "name has invalid characters"),
  message: z
    .string()
    .trim()
    .min(1)
    .max(300)
    .refine(noControlChars, "message has invalid characters")
    .refine((v) => !URL_LIKE.test(v), "links aren't allowed in the guestbook"),
});
