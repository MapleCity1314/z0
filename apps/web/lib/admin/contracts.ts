import {
  type AdminChatDetail,
  type AdminChatListItem,
  type DashboardStats,
  type Paginated,
  type RecentAdminChat,
  type RecentAdminFeedback,
  type RecentAdminUser,
  type AdminFeedbackDetail,
  type AdminProjectDetail,
  type AdminProjectListItem,
  type AdminUserDetail,
  type AdminUserListItem,
  type FeedbackStats,
} from "@z0/backend/modules/admin";
import { type FeedbackRecord } from "@z0/backend/modules/feedback";
import {
  createVersionInputSchema,
  type VersionRecord,
} from "@z0/backend/modules/versions";
import { z } from "zod";

export type FeedbackStatus = FeedbackRecord["status"];
export type VersionStatus = VersionRecord["status"];
export type VersionType = VersionRecord["type"];

export type CreateAdminVersionInput = Omit<
  z.infer<typeof createVersionInputSchema>,
  "actorUserId"
>;

type SerializeDates<T> = T extends Date
  ? string
  : T extends Array<infer Item>
    ? Array<SerializeDates<Item>>
    : T extends object
      ? { [K in keyof T]: SerializeDates<T[K]> }
      : T;

export type AdminDashboardResponse = DashboardStats;
export type AdminDashboardActivityResponse = {
  recentUsers: Array<SerializeDates<RecentAdminUser>>;
  recentChats: Array<SerializeDates<RecentAdminChat>>;
  recentFeedback: Array<SerializeDates<RecentAdminFeedback>>;
};

export type AdminUsersPageResponse = SerializeDates<
  Paginated<AdminUserListItem>
>;
export type AdminUserDetailResponse = SerializeDates<AdminUserDetail>;

export type AdminProjectsPageResponse = SerializeDates<
  Paginated<AdminProjectListItem>
>;
export type AdminProjectDetailResponse = SerializeDates<AdminProjectDetail>;

export type AdminChatsPageResponse = SerializeDates<
  Paginated<AdminChatListItem>
>;
export type AdminChatDetailResponse = SerializeDates<AdminChatDetail>;

export type AdminFeedbackListItemResponse = SerializeDates<FeedbackRecord>;
export type AdminFeedbackDetailResponse = SerializeDates<AdminFeedbackDetail>;
export type AdminFeedbackStatsResponse = FeedbackStats;

export type AdminVersionsListResponse = Array<SerializeDates<VersionRecord>>;
export type AdminVersionDetailResponse = SerializeDates<VersionRecord>;
