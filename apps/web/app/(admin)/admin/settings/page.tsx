import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">System configuration</p>
      </div>

      <div className="rounded-xl border bg-card p-12 flex flex-col items-center justify-center text-center">
        <div className="p-4 rounded-full bg-muted mb-4">
          <Settings className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold mb-2">Coming Soon</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          System settings including AI configuration, security settings, and notification preferences will be available here.
        </p>
      </div>
    </div>
  );
}
