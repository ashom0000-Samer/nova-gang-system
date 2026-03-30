import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { trpc } from "@/lib/trpc";

interface GangUserInfo {
  id: number;
  username: string;
  displayName: string;
  role: "superadmin" | "gang_admin" | "gang_supervisor" | "recruiter";
  gangId: number | null;
  gangRank?: string | null;
}

interface GangAuthContextType {
  gangUser: GangUserInfo | null;
  loading: boolean;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  refetch: () => void;
}

const GangAuthContext = createContext<GangAuthContextType>({
  gangUser: null,
  loading: true,
  isAuthenticated: false,
  isSuperAdmin: false,
  refetch: () => {},
});

export function GangAuthProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, refetch } = trpc.gangAuth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const gangUser = data as GangUserInfo | null | undefined;

  return (
    <GangAuthContext.Provider value={{
      gangUser: gangUser ?? null,
      loading: isLoading,
      isAuthenticated: !!gangUser,
      isSuperAdmin: gangUser?.role === "superadmin",
      refetch,
    }}>
      {children}
    </GangAuthContext.Provider>
  );
}

export function useGangAuth() {
  return useContext(GangAuthContext);
}
