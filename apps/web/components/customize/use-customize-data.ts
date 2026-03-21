"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  addUserMcpServerAction,
  addUserSkillAction,
  disconnectUserMcpServerAction,
  getSystemIntegrationMarketAction,
  getUserIntegrationSettingsAction,
  setUserMcpDefaultAction,
  setUserSkillDefaultAction,
} from "@/app/(chat)/api/integrations/actions";
import { shouldShowErrorToast } from "@/lib/auth-errors";
import type { SystemPluginMarketItem } from "@/lib/chat";
import { useUserStore } from "@/store/user";
import type {
  ConnectorFormState,
  CustomizeSection,
  MarketConnectorItem,
  MarketSkillItem,
  SkillFormState,
  SubagentRoleItem,
  UserMcpItem,
  UserSkillItem,
} from "./types";

export function useCustomizeData(activeTab: CustomizeSection) {
  const user = useUserStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [marketLoading, setMarketLoading] = useState(true);
  const [skills, setSkills] = useState<UserSkillItem[]>([]);
  const [connectors, setConnectors] = useState<UserMcpItem[]>([]);
  const [marketSkills, setMarketSkills] = useState<MarketSkillItem[]>([]);
  const [marketConnectors, setMarketConnectors] = useState<MarketConnectorItem[]>([]);
  const [plugins, setPlugins] = useState<SystemPluginMarketItem[]>([]);
  const [skillForm, setSkillForm] = useState<SkillFormState>({ name: "", dir: "" });
  const [connectorForm, setConnectorForm] = useState<ConnectorFormState>({
    name: "",
    endpoint: "",
  });
  const [savingSkillDefaultId, setSavingSkillDefaultId] = useState<string | null>(null);
  const [savingConnectorDefaultId, setSavingConnectorDefaultId] = useState<string | null>(null);
  const [disconnectingConnectorId, setDisconnectingConnectorId] = useState<string | null>(null);

  const showActionError = (message: string) => {
    if (shouldShowErrorToast(message)) {
      toast.error(message);
    }
  };

  const refreshSettings = async () => {
    if (!user) {
      setSkills([]);
      setConnectors([]);
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

    setConnectors(
      result.data.mcpServers.map((item) => ({
        userMcpServerId: item.userMcpServerId,
        systemServerId: item.systemServerId,
        systemServerName: item.systemServerName,
        endpoint: item.endpoint,
        sourceType: item.sourceType,
        useByDefault: item.useByDefault,
        connectorSlug: item.connectorSlug,
        requiresAuth: item.requiresAuth,
        authProvider: item.authProvider,
        authStatus: item.authStatus,
        privacyLevel: item.privacyLevel,
        connectedAt: item.connectedAt,
        consentGrantedAt: item.consentGrantedAt,
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

  const refreshMarket = async () => {
    setMarketLoading(true);
    const result = await getSystemIntegrationMarketAction();
    setMarketLoading(false);

    if (!result.success || !result.data) {
      showActionError(result.message);
      return;
    }

    setMarketConnectors(result.data.mcpServers);
    setMarketSkills(result.data.skills);
    setPlugins(
      result.data.plugins.map((plugin) => ({
        pluginId: plugin.pluginId,
        name: plugin.name,
        status: plugin.status,
        runtimeStatus: plugin.runtimeStatus,
        description: plugin.description,
        highlights: plugin.highlights,
        tools: plugin.tools,
        skills: plugin.skills,
        mcpServers: plugin.mcpServers,
        uiPanels: plugin.uiPanels,
        workflows: plugin.workflows,
        subagentRoles: plugin.subagentRoles,
        dependencies: plugin.dependencies,
      })),
    );
  };

  useEffect(() => {
    void Promise.all([refreshSettings(), refreshMarket()]);
  }, [user]);

  const subagentRoles = useMemo<SubagentRoleItem[]>(() => {
    const uniqueRoles = new Map<string, SubagentRoleItem>();

    for (const plugin of plugins) {
      for (const role of plugin.subagentRoles) {
        uniqueRoles.set(role, {
          role,
          pluginId: plugin.pluginId,
          pluginName: plugin.name,
          status: plugin.status,
        });
      }
    }

    return Array.from(uniqueRoles.values());
  }, [plugins]);

  const sectionStatus = useMemo(() => {
    if (activeTab === "skills") {
      return `${skills.filter((item) => item.useByDefault).length} default skills`;
    }
    if (activeTab === "connectors") {
      return `${connectors.filter((item) => item.useByDefault).length} default connectors`;
    }
    if (activeTab === "plugins") {
      return `${plugins.filter((item) => item.status === "planned").length} planned plugin families`;
    }
    return `${subagentRoles.length} specialist roles`;
  }, [activeTab, connectors, plugins, skills, subagentRoles]);

  const handleAddSkill = async () => {
    const name = skillForm.name.trim();
    const directory = skillForm.dir.trim();
    if (!name || !directory) return;

    const result = await addUserSkillAction({ name, directory });
    if (!result.success) {
      showActionError(result.message);
      return;
    }

    setSkillForm({ name: "", dir: "" });
    toast.success("Skill added");
    await refreshSettings();
  };

  const handleQuickAddMarketSkill = async (skill: MarketSkillItem) => {
    const result = await addUserSkillAction({
      name: skill.name,
      directory: skill.directory,
      sourceType: skill.sourceType,
    });
    if (!result.success) {
      showActionError(result.message);
      return;
    }

    toast.success(`Skill added: ${skill.name}`);
    await refreshSettings();
  };

  const handleAddConnector = async () => {
    const name = connectorForm.name.trim();
    const endpoint = connectorForm.endpoint.trim();
    if (!name || !endpoint) return;

    const result = await addUserMcpServerAction({ name, endpoint });
    if (!result.success) {
      showActionError(result.message);
      return;
    }

    setConnectorForm({ name: "", endpoint: "" });
    toast.success("Connector added");
    await refreshSettings();
  };

  const handleQuickAddMarketConnector = async (
    connector: MarketConnectorItem,
  ) => {
    const result = await addUserMcpServerAction({
      name: connector.name,
      endpoint: connector.endpoint,
      sourceType: connector.sourceType,
    });
    if (!result.success) {
      showActionError(result.message);
      return;
    }

    toast.success(`Connector added: ${connector.name}`);
    await refreshSettings();
  };

  const toggleSkillDefault = async (userSkillId: string, next: boolean) => {
    setSavingSkillDefaultId(userSkillId);
    const result = await setUserSkillDefaultAction({ userSkillId, useByDefault: next });
    setSavingSkillDefaultId(null);

    if (!result.success) {
      showActionError(result.message);
      return;
    }

    setSkills((current) =>
      current.map((item) =>
        item.userSkillId === userSkillId ? { ...item, useByDefault: next } : item,
      ),
    );
  };

  const toggleConnectorDefault = async (
    userMcpServerId: string,
    next: boolean,
  ) => {
    setSavingConnectorDefaultId(userMcpServerId);
    const result = await setUserMcpDefaultAction({
      userMcpServerId,
      useByDefault: next,
    });
    setSavingConnectorDefaultId(null);

    if (!result.success) {
      showActionError(result.message);
      return;
    }

    setConnectors((current) =>
      current.map((item) =>
        item.userMcpServerId === userMcpServerId
          ? { ...item, useByDefault: next }
          : item,
        ),
    );
  };

  const disconnectConnector = async (userMcpServerId: string) => {
    setDisconnectingConnectorId(userMcpServerId);
    const result = await disconnectUserMcpServerAction({ userMcpServerId });
    setDisconnectingConnectorId(null);

    if (!result.success) {
      showActionError(result.message);
      return;
    }

    toast.success("Connector disconnected");
    await refreshSettings();
  };

  return {
    connectorForm,
    connectors,
    disconnectConnector,
    disconnectingConnectorId,
    handleQuickAddMarketConnector,
    handleQuickAddMarketSkill,
    loading,
    marketConnectors,
    marketLoading,
    marketSkills,
    plugins,
    sectionStatus,
    setConnectorForm,
    setSkillForm,
    skillForm,
    skills,
    savingConnectorDefaultId,
    savingSkillDefaultId,
    subagentRoles,
    handleAddConnector,
    handleAddSkill,
    toggleConnectorDefault,
    toggleSkillDefault,
  };
}
