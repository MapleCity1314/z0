"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  updateFeedbackStatusAction,
  addFeedbackResponseAction,
} from "@/lib/admin/actions";

interface FeedbackActionsProps {
  feedbackId: string;
  currentStatus: string;
}

const statuses = [
  { value: "pending", label: "Pending" },
  { value: "reviewing", label: "Reviewing" },
  { value: "planned", label: "Planned" },
  { value: "completed", label: "Completed" },
  { value: "rejected", label: "Rejected" },
];

export function FeedbackActions({
  feedbackId,
  currentStatus,
}: FeedbackActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState(currentStatus);
  const [response, setResponse] = useState("");

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    startTransition(async () => {
      await updateFeedbackStatusAction(
        feedbackId,
        newStatus as "pending" | "reviewing" | "planned" | "completed" | "rejected"
      );
    });
  };

  const handleSubmitResponse = () => {
    if (!response.trim()) return;

    startTransition(async () => {
      await addFeedbackResponseAction(feedbackId, response);
      setResponse("");
    });
  };

  return (
    <div className="rounded-xl border bg-card p-6 space-y-6">
      <h3 className="font-semibold">Actions</h3>

      {/* Status Update */}
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">Update Status</label>
        <Select
          value={status}
          onValueChange={handleStatusChange}
          disabled={isPending}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Response */}
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">Add Response</label>
        <Textarea
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          placeholder="Write a response to this feedback..."
          rows={4}
        />
        <Button
          onClick={handleSubmitResponse}
          disabled={isPending || !response.trim()}
          className="w-full"
        >
          {isPending ? "Submitting..." : "Submit Response"}
        </Button>
      </div>
    </div>
  );
}
