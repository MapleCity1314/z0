import {
  createVersionInputSchema,
  type FeedbackRecord,
  type VersionRecord,
} from "@z0/backend";
import { z } from "zod";

export type FeedbackStatus = FeedbackRecord["status"];
export type VersionStatus = VersionRecord["status"];
export type VersionType = VersionRecord["type"];

export type CreateAdminVersionInput = Omit<
  z.infer<typeof createVersionInputSchema>,
  "actorUserId"
>;
