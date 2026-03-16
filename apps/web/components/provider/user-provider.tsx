"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useUserStore, type PublicUser } from "@/store/user";

interface UserProviderProps {
  children: React.ReactNode;
  initialUser: PublicUser | null;
}

export function UserProvider({ children, initialUser }: UserProviderProps) {
  const { status } = useSession();
  const setUser = useUserStore((state) => state.setUser);

  // Initialize with server-provided data on mount
  useEffect(() => {
    setUser(initialUser);
  }, [initialUser, setUser]);

  // Clear user when session is lost
  useEffect(() => {
    if (status === "unauthenticated") {
      setUser(null);
    }
  }, [status, setUser]);

  return <>{children}</>;
}
