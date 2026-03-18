"use client";

import { useEffect, useMemo, useState } from "react";
import { Bolt, PencilLine, Plus, Server, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { shouldShowErrorToast } from "@/lib/auth-errors";
import {
  addUserMcpServerAction,
  addUserSkillAction,
  getUserIntegrationSettingsAction,
  setUserMcpDefaultAction,
  setUserSkillDefaultAction,
} from "@/app/(chat)/api/integrations/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useUserStore } from "@/store/user";

type UserMcpItem = {
  userMcpServerId: string;
  systemServerId: string;
  systemServerName: string;
  endpoint: string;
  sourceType: string;
  useByDefault: boolean;
};

type UserSkillItem = {
  userSkillId: string;
  systemSkillId: string;
  systemSkillName: string;
  directory: string;
  sourceType: string;
  useByDefault: boolean;
};

export default function IntegrationSettingsPage() {
  const user = useUserStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [mcpServers, setMcpServers] = useState<UserMcpItem[]>([]);
  const [skills, setSkills] = useState<UserSkillItem[]>([]);

  const [mcpName, setMcpName] = useState("");
  const [mcpEndpoint, setMcpEndpoint] = useState("");
  const [skillName, setSkillName] = useState("");
  const [skillDirectory, setSkillDirectory] = useState("");

  const [savingMcpDefaultId, setSavingMcpDefaultId] = useState<string | null>(
    null,
  );
  const [savingSkillDefaultId, setSavingSkillDefaultId] = useState<
    string | null
  >(null);

  const showActionError = (message: string) => {
    if (shouldShowErrorToast(message)) {
      toast.error(message);
    }
  };

  const refreshSettings = async () => {
    if (!user) {
      setMcpServers([]);
      setSkills([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const result = await getUserIntegrationSettingsAction();
    setLoading(false);

    if (!result.success || !result.data) {
      showActionError(result.message);
      return;
    }

    setMcpServers(
      result.data.mcpServers.map((item) => ({
        userMcpServerId: item.userMcpServerId,
        systemServerId: item.systemServerId,
        systemServerName: item.systemServerName,
        endpoint: item.endpoint,
        sourceType: item.sourceType,
        useByDefault: item.useByDefault,
      })),
    );
    setSkills(
      result.data.skills.map((item) => ({
        userSkillId: item.userSkillId,
        systemSkillId: item.systemSkillId,
        systemSkillName: item.systemSkillName,
        directory: item.directory,
        sourceType: item.sourceType,
        useByDefault: item.useByDefault,
      })),
    );
  };

  useEffect(() => {
    void refreshSettings();
  }, [user]);

  const mcpDefaultCount = useMemo(
    () => mcpServers.filter((item) => item.useByDefault).length,
    [mcpServers],
  );
  const skillDefaultCount = useMemo(
    () => skills.filter((item) => item.useByDefault).length,
    [skills],
  );

  const addMcpServer = async () => {
    const name = mcpName.trim();
    const endpoint = mcpEndpoint.trim();
    if (!name || !endpoint) return;

    const result = await addUserMcpServerAction({ name, endpoint });
    if (!result.success) {
      showActionError(result.message);
      return;
    }

    setMcpName("");
    setMcpEndpoint("");
    toast.success("MCP server added to your settings");
    await refreshSettings();
  };

  const addSkill = async () => {
    const name = skillName.trim();
    const directory = skillDirectory.trim();
    if (!name || !directory) return;

    const result = await addUserSkillAction({ name, directory });
    if (!result.success) {
      showActionError(result.message);
      return;
    }

    setSkillName("");
    setSkillDirectory("");
    toast.success("Skill added to your settings");
    await refreshSettings();
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-4 p-4 md:p-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-2">
          <Bolt className="size-4 text-amber-500" />
          <h1 className="font-semibold text-lg">Integrations Settings</h1>
        </div>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          z0 flow: system registry (with system ID), then your settings, then
          per-chat link. This page controls your user-level defaults for future
          chats.
        </p>
      </section>

      <section className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
        <h2 className="font-medium text-sm">Application-level MCP and Skills</h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          MCP servers configured here are stored at the account level. When a
          chat enables one of them from the composer, its remote tools are
          loaded into the Agent runtime for that conversation.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-medium text-sm">
              <Server className="size-4" />
              MCP Servers
            </h2>
            <span className="text-xs text-zinc-500">
              {mcpDefaultCount} default
            </span>
          </div>

          <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Input
              value={mcpName}
              onChange={(event) => setMcpName(event.target.value)}
              placeholder="Server name"
            />
            <Input
              value={mcpEndpoint}
              onChange={(event) => setMcpEndpoint(event.target.value)}
              placeholder="https://example.com/mcp"
            />
            <Button type="button" onClick={() => void addMcpServer()}>
              <Plus className="mr-1 size-4" />
              Add
            </Button>
          </div>

          <div className="space-y-2">
            {loading ? (
              <p className="text-sm text-zinc-500">Loading MCP servers...</p>
            ) : mcpServers.length === 0 ? (
              <p className="text-sm text-zinc-500">No MCP servers yet.</p>
            ) : (
              mcpServers.map((server) => (
                <div
                  key={server.userMcpServerId}
                  className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-sm">
                        {server.systemServerName}
                      </p>
                      <p className="truncate text-xs text-zinc-500">
                        {server.endpoint}
                      </p>
                      <p className="mt-1 truncate font-mono text-[10px] text-zinc-500">
                        {server.systemServerId} · {server.sourceType}
                      </p>
                    </div>
                    <label className="flex shrink-0 items-center gap-2 text-xs">
                      <Switch
                        checked={server.useByDefault}
                        disabled={savingMcpDefaultId === server.userMcpServerId}
                        onCheckedChange={(checked) => {
                          setSavingMcpDefaultId(server.userMcpServerId);
                          void (async () => {
                            const result = await setUserMcpDefaultAction({
                              userMcpServerId: server.userMcpServerId,
                              useByDefault: checked,
                            });
                            setSavingMcpDefaultId(null);
                            if (!result.success) {
                              showActionError(result.message);
                              return;
                            }
                            setMcpServers((prev) =>
                              prev.map((item) =>
                                item.userMcpServerId === server.userMcpServerId
                                  ? { ...item, useByDefault: checked }
                                  : item,
                              ),
                            );
                          })();
                        }}
                      />
                      Default
                    </label>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-medium text-sm">
              <Sparkles className="size-4" />
              Agent Skills
            </h2>
            <span className="text-xs text-zinc-500">
              {skillDefaultCount} default
            </span>
          </div>

          <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Input
              value={skillName}
              onChange={(event) => setSkillName(event.target.value)}
              placeholder="Skill name"
            />
            <Input
              value={skillDirectory}
              onChange={(event) => setSkillDirectory(event.target.value)}
              placeholder=".agents/skills/my-skill"
            />
            <Button type="button" onClick={() => void addSkill()}>
              <Plus className="mr-1 size-4" />
              Add
            </Button>
          </div>

          <div className="space-y-2">
            {loading ? (
              <p className="text-sm text-zinc-500">Loading skills...</p>
            ) : skills.length === 0 ? (
              <p className="text-sm text-zinc-500">No skills yet.</p>
            ) : (
              skills.map((item) => (
                <div
                  key={item.userSkillId}
                  className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-sm">
                        {item.systemSkillName}
                      </p>
                      <p className="truncate text-xs text-zinc-500">
                        {item.directory}
                      </p>
                      <p className="mt-1 truncate font-mono text-[10px] text-zinc-500">
                        {item.systemSkillId} · {item.sourceType}
                      </p>
                    </div>
                    <label className="flex shrink-0 items-center gap-2 text-xs">
                      <Switch
                        checked={item.useByDefault}
                        disabled={savingSkillDefaultId === item.userSkillId}
                        onCheckedChange={(checked) => {
                          setSavingSkillDefaultId(item.userSkillId);
                          void (async () => {
                            const result = await setUserSkillDefaultAction({
                              userSkillId: item.userSkillId,
                              useByDefault: checked,
                            });
                            setSavingSkillDefaultId(null);
                            if (!result.success) {
                              showActionError(result.message);
                              return;
                            }
                            setSkills((prev) =>
                              prev.map((entry) =>
                                entry.userSkillId === item.userSkillId
                                  ? { ...entry, useByDefault: checked }
                                  : entry,
                              ),
                            );
                          })();
                        }}
                      />
                      Default
                    </label>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-2 flex items-center gap-2 font-medium text-sm">
          <PencilLine className="size-4" />
          Notes
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Chat input dialogs control per-chat activation. This page controls
          your persistent defaults for new chats. Both paths write to the same
          MCP and Skill registry.
        </p>
      </section>
    </div>
  );
}
