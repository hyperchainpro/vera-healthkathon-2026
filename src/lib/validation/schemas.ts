/**
 * VERA Input Validation Schemas
 * Zod schemas for request validation across all API endpoints
 */

import { z } from "zod";

/**
 * Login request validation
 */
export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

/**
 * Claim upload validation
 */
export const claimUploadSchema = z.object({
  caseId: z.string().min(1, "Case ID required"),
  diseaseCode: z.string().optional(),
  diseaseName: z.string().optional(),
  emrText: z.string().min(10, "EMR text must be at least 10 characters"),
  claimedDays: z.number().int().positive().optional(),
});

/**
 * Claim audit action validation (for POST /api/claims/[id]/audit)
 */
export const claimAuditSchema = z.object({
  action: z.enum([
    "viewed",
    "flagged",
    "overridden",
    "evidence_exported",
  ]),
  reason: z.string().optional(),
});

/**
 * Audit action validation
 */
export const auditActionSchema = z.object({
  action: z.enum([
    "viewed",
    "flagged",
    "overridden",
    "evidence_exported",
    "viewed_case",
    "login",
    "login_failed",
    "logout",
  ]),
  reason: z.string().optional(),
  reviewerEmail: z.string().email().optional(),
});

/**
 * Pagination validation for list endpoints
 */
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});
