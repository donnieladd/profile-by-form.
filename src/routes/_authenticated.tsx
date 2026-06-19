import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"

import { AppShell } from "@/components/app/app-shell";
import { supabase } from "@/integrations/supabase/client";

const DEVELOPER_KEY_STORAGE = "profile-by-form:developer-backdoor-key";
const DEVELOPER_BYPASS_ACTIVE = "profile-by-form:developer-backdoor-active";
const DEV_BYPASS_QUERY = "dev_unlocked";
const DEVELOPER_BYPASS_COOKIE = "pbf_dev_bypass=1";
const normalize = (value: string | null) => (value ?? "").trim();

function hasDeveloperBypass(): boolean {
  if (typeof window === "undefined") return false;

  const bypassQuery = new URLSearchParams(window.location.search).get(DEV_BYPASS_QUERY);
  if (bypassQuery === "1" || bypassQuery === "true") {
    localStorage.setItem(DEVELOPER_BYPASS_ACTIVE, "true");
    return true;
  }

  const stored = normalize(localStorage.getItem(DEVELOPER_KEY_STORAGE));
  const active = localStorage.getItem(DEVELOPER_BYPASS_ACTIVE);
  const key = normalize(import.meta.env.VITE_DEVELOPER_ACCESS_KEY);
  const hasKey = Boolean(stored && key && stored === key);
  const bypassActive = active === "true";
  return hasKey || bypassActive;
}

function isLocalhostHost(hostname: string | null): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function parseLocalHostFromUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  try {
    const hostname = new URL(url).hostname;
    return isLocalhostHost(hostname);
  } catch {
    return false;
  }
}

function hasBypassCookie(cookieHeader: string | null | undefined): boolean {
  if (!cookieHeader) return false;
  return cookieHeader.includes(DEVELOPER_BYPASS_COOKIE);
}

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ request }) => {
    if (typeof window !== "undefined") {
      if (isLocalhostHost(window.location.hostname)) return;
    } else if (parseLocalHostFromUrl(request?.url)) {
      return;
    }

    const cookieHeader = request?.headers.get("cookie");
    if (hasBypassCookie(cookieHeader)) {
      return;
    }

    try {
      const { data } = await supabase.auth.getSession()
      if (!data.session && !hasDeveloperBypass()) {
        throw redirect({ to: "/login" })
      }
    } catch {
      if (!hasDeveloperBypass()) {
        throw redirect({ to: "/login" })
      }
    }
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
})
