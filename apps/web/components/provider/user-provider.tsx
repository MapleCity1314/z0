"use client";

import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { useUserStore, type PublicUser } from "@/store/user";

interface UserProviderProps {
  children: React.ReactNode;
  initialUser: PublicUser | null;
}

export function UserProvider({ children, initialUser }: UserProviderProps) {
  const session = authClient.useSession();
  const setUser = useUserStore((state) => state.setUser);

  useEffect(() => {
    setUser(initialUser);
  }, [initialUser, setUser]);

  useEffect(() => {
    if (session.data?.user) {
      setUser({
        id: session.data.user.id,
        name: session.data.user.name ?? null,
        email: session.data.user.email,
        avatar: session.data.user.image ?? null,
      });
      return;
    }

    if (!session.isPending) {
      setUser(null);
    }
  }, [session.data, session.isPending, setUser]);

  return <>{children}</>;
}
