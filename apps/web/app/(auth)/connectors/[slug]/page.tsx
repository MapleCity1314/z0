import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { beginConnectorAuthorizationAction } from "./actions";
import { getSystemMcpServerBySlug } from "@/lib/db/integrations";

export default async function ConnectorConsentPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ chatId?: string; returnTo?: string; error?: string }>;
}) {
  const { slug } = await params;
  const { chatId, returnTo, error } = await searchParams;
  const server = await getSystemMcpServerBySlug(slug);

  if (!server) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-zinc-900/70 p-8 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-300">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
              Connector Consent
            </p>
            <h1 className="mt-2 text-3xl font-semibold">{server.name}</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              {server.shortDescription}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-zinc-950/70 p-5">
          <p className="text-sm text-zinc-300">
            This connector can access high-sensitivity user data. Continue only if
            you agree to allow z0 to request and use the permissions below for
            MCP tool execution in your chats.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {server.scopes.length > 0 ? (
              server.scopes.map((scope) => (
                <span
                  key={scope}
                  className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-300"
                >
                  {scope}
                </span>
              ))
            ) : (
              <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-300">
                Standard connector access
              </span>
            )}
          </div>
        </div>

        {error === "consent" ? (
          <p className="mt-4 text-sm text-rose-300">
            You need to accept the connector access agreement before continuing.
          </p>
        ) : null}

        <form action={beginConnectorAuthorizationAction} className="mt-8 space-y-5">
          <input type="hidden" name="slug" value={server.slug} />
          <input type="hidden" name="chatId" value={chatId ?? ""} />
          <input type="hidden" name="returnTo" value={returnTo ?? "/"} />

          <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-300">
            <input
              type="checkbox"
              name="consentAccepted"
              className="mt-1 h-4 w-4 rounded border-zinc-700 bg-zinc-950"
              required={server.consentRequired}
              defaultChecked={!server.consentRequired}
            />
            <span>
              I understand this connector may access personal or organization data
              exposed by {server.provider}, and I agree to authorize z0 to use
              those permissions for MCP-driven tasks until I disconnect it.
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="rounded-2xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-zinc-200"
            >
              Agree and continue
            </button>
            <Link
              href={returnTo ?? "/"}
              className="rounded-2xl border border-white/10 px-5 py-3 text-sm text-zinc-300 transition hover:bg-white/[0.04]"
            >
              Cancel
            </Link>
            {server.docsUrl ? (
              <Link
                href={server.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-zinc-400 underline-offset-4 hover:text-white hover:underline"
              >
                Review provider docs
              </Link>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
