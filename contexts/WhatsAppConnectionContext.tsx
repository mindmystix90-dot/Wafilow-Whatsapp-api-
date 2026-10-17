"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { useSession } from "next-auth/react";

export interface WhatsAppEnvironmentStatus {
  configured: boolean;
  status: string;
  phoneNumberId: string | null;
  wabaId: string | null;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  lastCheckedAt: string | null;
  isPendingRegistration?: boolean;
}

export interface WhatsAppConnectionState {
  isConfigured: boolean | null;
  status: string;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  lastCheckedAt: string | null;
  isPendingRegistration: boolean;
  production: WhatsAppEnvironmentStatus | null;
  sandbox: WhatsAppEnvironmentStatus | null;
  isLoading: boolean;
  error: string | null;
  refresh: (force?: boolean) => Promise<void>;
  updateStatusLocally: (update: Partial<WhatsAppConnectionState>) => void;
}

const defaultState: WhatsAppConnectionState = {
  isConfigured: null,
  status: "disconnected",
  displayPhoneNumber: null,
  verifiedName: null,
  lastCheckedAt: null,
  isPendingRegistration: false,
  production: null,
  sandbox: null,
  isLoading: true,
  error: null,
  refresh: async () => {},
  updateStatusLocally: () => {},
};

const WhatsAppConnectionContext = createContext<WhatsAppConnectionState>(defaultState);

const CACHE_STORAGE_PREFIX = "wafilow_wa_status_";
const CACHE_TTL_MS = 60 * 1000; // 60 seconds fresh window for background refresh

interface StoredCacheData {
  isConfigured: boolean | null;
  status: string;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  lastCheckedAt: string | null;
  isPendingRegistration: boolean;
  production: WhatsAppEnvironmentStatus | null;
  sandbox: WhatsAppEnvironmentStatus | null;
}

function readSessionStorageCache(orgId: string | null): StoredCacheData | null {
  if (!orgId || typeof window === "undefined") {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(`${CACHE_STORAGE_PREFIX}${orgId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.isConfigured === "boolean") {
        return {
          isConfigured: parsed.isConfigured,
          status: parsed.status || (parsed.isConfigured ? "connected" : "disconnected"),
          displayPhoneNumber: parsed.displayPhoneNumber || null,
          verifiedName: parsed.verifiedName || null,
          lastCheckedAt: parsed.lastCheckedAt || null,
          isPendingRegistration: Boolean(parsed.isPendingRegistration),
          production: parsed.production || null,
          sandbox: parsed.sandbox || null,
        };
      }
    }
  } catch {
    // Non-critical cache read fallback
  }
  return null;
}

export function WhatsAppConnectionProvider({ children }: { children: ReactNode }) {
  const { data: session, status: sessionStatus } = useSession();
  const orgId = session?.user?.organizationId || session?.user?.id || null;

  // Initialize from cache if present for 0ms instantaneous state
  const [connectionData, setConnectionData] = useState<StoredCacheData>(() => {
    const cached = readSessionStorageCache(orgId);
    return (
      cached || {
        isConfigured: null,
        status: "disconnected",
        displayPhoneNumber: null,
        verifiedName: null,
        lastCheckedAt: null,
        isPendingRegistration: false,
        production: null,
        sandbox: null,
      }
    );
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => {
    const cached = readSessionStorageCache(orgId);
    return !cached;
  });
  const [error, setError] = useState<string | null>(null);

  // In-flight request deduplication ref
  const inFlightPromiseRef = useRef<Promise<void> | null>(null);
  const lastFetchedTimeRef = useRef<number>(0);
  const activeOrgIdRef = useRef<string | null>(orgId);

  // Fetch connection status with request deduplication and persistence
  const fetchStatus = useCallback(
    async (force = false) => {
      if (!orgId || sessionStatus !== "authenticated") {
        return;
      }

      const now = Date.now();
      // Reuse in-flight promise if one is already pending
      if (inFlightPromiseRef.current) {
        return inFlightPromiseRef.current;
      }

      // Avoid refetching if fetched recently, unless explicitly forced
      if (!force && lastFetchedTimeRef.current && now - lastFetchedTimeRef.current < CACHE_TTL_MS) {
        return;
      }

      const fetchPromise = (async () => {
        try {
          const res = await fetch("/api/whatsapp/config");
          if (!res.ok) {
            throw new Error(`Config API returned status ${res.status}`);
          }
          const data = await res.json();

          // Ensure response matches currently active organization
          if (activeOrgIdRef.current !== orgId) {
            return;
          }

          const configuredBool = Boolean(data.configured);
          const currentStatus = data.status || (configuredBool ? "connected" : "disconnected");
          const phone = data.displayPhoneNumber || null;
          const name = data.verifiedName || null;
          const checked = data.lastCheckedAt || new Date().toISOString();
          const pendingReg = Boolean(data.production?.isPendingRegistration);
          const prodData: WhatsAppEnvironmentStatus | null = data.production
            ? {
                configured: Boolean(data.production.configured),
                status: data.production.status || "disconnected",
                phoneNumberId: data.production.phoneNumberId || null,
                wabaId: data.production.wabaId || null,
                displayPhoneNumber: data.production.displayPhoneNumber || null,
                verifiedName: data.production.verifiedName || null,
                lastCheckedAt: data.production.lastCheckedAt || null,
                isPendingRegistration: Boolean(data.production.isPendingRegistration),
              }
            : null;

          const sandData: WhatsAppEnvironmentStatus | null = data.sandbox
            ? {
                configured: Boolean(data.sandbox.configured),
                status: data.sandbox.status || "disconnected",
                phoneNumberId: data.sandbox.phoneNumberId || null,
                wabaId: data.sandbox.wabaId || null,
                displayPhoneNumber: data.sandbox.displayPhoneNumber || null,
                verifiedName: data.sandbox.verifiedName || null,
                lastCheckedAt: data.sandbox.lastCheckedAt || null,
              }
            : null;

          const updated: StoredCacheData = {
            isConfigured: configuredBool,
            status: currentStatus,
            displayPhoneNumber: phone,
            verifiedName: name,
            lastCheckedAt: checked,
            isPendingRegistration: pendingReg,
            production: prodData,
            sandbox: sandData,
          };

          setConnectionData(updated);
          setError(null);
          setIsLoading(false);
          lastFetchedTimeRef.current = Date.now();

          // Persist non-sensitive display state into sessionStorage
          try {
            if (typeof window !== "undefined") {
              const cacheKey = `${CACHE_STORAGE_PREFIX}${orgId}`;
              sessionStorage.setItem(
                cacheKey,
                JSON.stringify({
                  ...updated,
                  cachedAt: Date.now(),
                })
              );
            }
          } catch {
            // Storage quota or sandboxing
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Failed to load connection status";
          setError(msg);
          setConnectionData((prev) => ({
            ...prev,
            isConfigured: prev.isConfigured === null ? false : prev.isConfigured,
          }));
          setIsLoading(false);
        } finally {
          inFlightPromiseRef.current = null;
        }
      })();

      inFlightPromiseRef.current = fetchPromise;
      return fetchPromise;
    },
    [orgId, sessionStatus]
  );

  // Trigger fetch on session load
  useEffect(() => {
    activeOrgIdRef.current = orgId;
    if (sessionStatus === "authenticated" && orgId) {
      fetchStatus(false);
    }
  }, [sessionStatus, orgId, fetchStatus]);

  // Update status locally for immediate optimistic UI response after actions
  const updateStatusLocally = useCallback(
    (update: Partial<WhatsAppConnectionState>) => {
      setConnectionData((prev) => {
        const next: StoredCacheData = {
          isConfigured: update.isConfigured !== undefined ? update.isConfigured : prev.isConfigured,
          status: update.status !== undefined ? update.status : prev.status,
          displayPhoneNumber:
            update.displayPhoneNumber !== undefined ? update.displayPhoneNumber : prev.displayPhoneNumber,
          verifiedName: update.verifiedName !== undefined ? update.verifiedName : prev.verifiedName,
          lastCheckedAt:
            update.lastCheckedAt !== undefined ? update.lastCheckedAt : prev.lastCheckedAt,
          isPendingRegistration:
            update.isPendingRegistration !== undefined
              ? update.isPendingRegistration
              : prev.isPendingRegistration,
          production: update.production !== undefined ? update.production : prev.production,
          sandbox: update.sandbox !== undefined ? update.sandbox : prev.sandbox,
        };

        if (orgId && typeof window !== "undefined") {
          try {
            const cacheKey = `${CACHE_STORAGE_PREFIX}${orgId}`;
            sessionStorage.setItem(
              cacheKey,
              JSON.stringify({
                ...next,
                cachedAt: Date.now(),
              })
            );
          } catch {}
        }

        return next;
      });
    },
    [orgId]
  );

  return (
    <WhatsAppConnectionContext.Provider
      value={{
        isConfigured: connectionData.isConfigured,
        status: connectionData.status,
        displayPhoneNumber: connectionData.displayPhoneNumber,
        verifiedName: connectionData.verifiedName,
        lastCheckedAt: connectionData.lastCheckedAt,
        isPendingRegistration: connectionData.isPendingRegistration,
        production: connectionData.production,
        sandbox: connectionData.sandbox,
        isLoading,
        error,
        refresh: fetchStatus,
        updateStatusLocally,
      }}
    >
      {children}
    </WhatsAppConnectionContext.Provider>
  );
}

export function useWhatsAppConnection(): WhatsAppConnectionState {
  const context = useContext(WhatsAppConnectionContext);
  if (!context) {
    return defaultState;
  }
  return context;
}
