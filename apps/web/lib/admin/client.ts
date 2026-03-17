import { apiFetch } from "@/lib/api";
import type {
  CreateAdminVersionInput,
  FeedbackStatus,
} from "@/lib/admin/contracts";

export function updateFeedbackStatus(
  feedbackId: string,
  status: FeedbackStatus,
) {
  return apiFetch(`/v1/admin/feedback/${feedbackId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function addFeedbackResponse(feedbackId: string, response: string) {
  return apiFetch(`/v1/admin/feedback/${feedbackId}/respond`, {
    method: "POST",
    body: JSON.stringify({ response }),
  });
}

export function createVersion(data: CreateAdminVersionInput) {
  return apiFetch("/v1/admin/versions", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function publishVersion(versionId: string) {
  return apiFetch(`/v1/admin/versions/${versionId}/publish`, {
    method: "POST",
  });
}

export function archiveVersion(versionId: string) {
  return apiFetch(`/v1/admin/versions/${versionId}/archive`, {
    method: "POST",
  });
}

export function deleteVersion(versionId: string) {
  return apiFetch(`/v1/admin/versions/${versionId}`, {
    method: "DELETE",
  });
}
