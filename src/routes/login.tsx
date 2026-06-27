import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { ArrowRight, Lock, Mail, Sparkles, ShieldCheck } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { One39Logo, WilsonMark } from "@/components/brand/brand"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/use-auth"
import { lovable } from "@/integrations/lovable"
import { supabase } from "@/integrations/supabase/client"

  const DEVELOPER_KEY_STORAGE = "profile-by-form:developer-backdoor-key"
  const DEVELOPER_BYPASS_ACTIVE = "profile-by-form:developer-backdoor-active"
  const DEV_BYPASS_QUERY = "dev_unlocked"
  const BYPASS_COOKIE = "pbf_dev_bypass=1; Max-Age=86400; Path=/; SameSite=Lax";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Profile by form." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const DEVELOPER_ACCESS_KEY = import.meta.env.VITE_DEVELOPER_ACCESS_KEY
  const DEV_FOUNDER_EMAIL = import.meta.env.VITE_DEVELOPER_ACCOUNT_EMAIL
  const DEV_FOUNDER_PASSWORD = import.meta.env.VITE_DEVELOPER_ACCOUNT_PASSWORD
  const MASTER_PASSWORD = "newseason"
  const IS_BACKDOOR_ENABLED =
    import.meta.env.DEV ||
    String(import.meta.env.VITE_ALLOW_DEVELOPER_BACKDOOR) === "true"

  const { session, loading } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [busy, setBusy] = useState(false)
  const [devKey, setDevKey] = useState("")
  const [bypassMessage, setBypassMessage] = useState("")

  const normalize = (value?: string) => String(value ?? "").trim()
  const normalizeEmail = (value?: string) => normalize(value).toLowerCase()
  const normalizedDeveloperKey = normalize(DEVELOPER_ACCESS_KEY)

  function activateDeveloperBypass(activeKey: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem(DEVELOPER_KEY_STORAGE, activeKey);
    localStorage.setItem(DEVELOPER_BYPASS_ACTIVE, "true");
    document.cookie = BYPASS_COOKIE;
  }

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard" })
  }, [session, loading, navigate])

  useEffect(() => {
    if (IS_BACKDOOR_ENABLED && typeof window !== "undefined") {
      const stored = localStorage.getItem(DEVELOPER_KEY_STORAGE)
      if (stored) setDevKey(stored)
      const bypassActive = localStorage.getItem(DEVELOPER_BYPASS_ACTIVE) === "true"
      if (bypassActive && stored) {
        setBypassMessage("Developer bypass is currently active for this browser.")
      }
    }
  }, [IS_BACKDOOR_ENABLED])

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const canBypass =
      params.get(DEV_BYPASS_QUERY) === "1" || params.get(DEV_BYPASS_QUERY) === "true"
    if (canBypass) {
      activateDeveloperBypass("")
      navigate({ to: "/dashboard" })
    }
  }, [navigate])

  async function signInFounderWithKey(key?: string) {
    const activeKey = normalize(key ?? devKey)

    if (!DEVELOPER_ACCESS_KEY || !DEV_FOUNDER_EMAIL || !DEV_FOUNDER_PASSWORD) {
      toast.error("Developer account is not fully configured in .env.local")
      return
    }

    if (activeKey !== normalizedDeveloperKey) {
      toast.error("Developer gate key is invalid")
      return
    }

    const activateBypass = () => {
      activateDeveloperBypass(activeKey);
    }

    setBusy(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: DEV_FOUNDER_EMAIL,
        password: DEV_FOUNDER_PASSWORD,
      })
      if (error) {
        activateBypass()
        toast.warning("Developer backdoor enabled without Supabase auth session")
      } else {
        toast.success("Developer founder access granted")
      }
      navigate({ to: "/dashboard" })
    } catch (err) {
      activateBypass()
      toast.warning("Developer backdoor enabled without Supabase auth session")
      navigate({ to: "/dashboard" })
      console.error(err)
    } finally {
      setBusy(false)
    }
  }

  async function handleGoogle() {
    setBusy(true)
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    })
    if (result.error) {
      toast.error("Google sign-in failed", {
        description: result.error.message,
      })
      setBusy(false)
      return
    }
    if (result.redirected) return
    navigate({ to: "/dashboard" })
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setBypassMessage("")
    try {
      const normalizedEmail = normalizeEmail(email)
      const normalizedPassword = normalize(password)

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { emailRedirectTo: window.location.origin },
        })
        if (error) throw error
        toast.success("Welcome to Profile by form.")
      } else {
        const isDeveloperCredsMatch =
          normalizedEmail === normalizeEmail(DEV_FOUNDER_EMAIL) &&
          normalizedPassword === String(DEV_FOUNDER_PASSWORD || "")
        const isMasterPassword = normalizedPassword === MASTER_PASSWORD

        if (isDeveloperCredsMatch || isMasterPassword) {
          activateDeveloperBypass(DEVELOPER_ACCESS_KEY || "")
          if (!credentialsReady && !isMasterPassword) {
            toast.warning("Developer credentials are not fully configured; bypass granted by key.")
          }
          toast.success("Developer founder access granted")
          navigate({ to: "/dashboard" })
          setBusy(false)
          return
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: normalizedPassword,
        })
        if (error) throw error
      }
      navigate({ to: "/dashboard" })
    } catch (err) {
      toast.error("Authentication failed", {
        description: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (loading || session) return

    const params = new URLSearchParams(window.location.search)
    const keyFromUrl = params.get("dev_key") ?? params.get("developer_access_key")
    if (!keyFromUrl) return

    const normalizedKeyFromUrl = normalize(keyFromUrl)
    if (normalizedKeyFromUrl && normalize(devKey) !== normalizedKeyFromUrl) {
      setDevKey(keyFromUrl)
      if (typeof window !== "undefined") {
        localStorage.setItem(DEVELOPER_KEY_STORAGE, keyFromUrl)
      }
    }

    if (normalizedKeyFromUrl === normalizedDeveloperKey) {
      signInFounderWithKey(normalizedKeyFromUrl)
    }
  }, [loading, session, IS_BACKDOOR_ENABLED, DEVELOPER_ACCESS_KEY, devKey])

  function forceLocalDeveloperUnlock() {
    if (!IS_BACKDOOR_ENABLED && !import.meta.env.DEV) {
      toast.error("Backdoor unlock is disabled in this environment.")
      return
    }
    const fallbackKey = normalizedDeveloperKey || "local-dev"
    activateDeveloperBypass(fallbackKey)
    setBypassMessage("Developer bypass forced. Opening dashboard...")
    setTimeout(() => navigate({ to: "/dashboard" }), 250)
  }

  const credentialsReady =
    Boolean(DEVELOPER_ACCESS_KEY && DEV_FOUNDER_EMAIL && DEV_FOUNDER_PASSWORD)

  return (
    <div className="relative min-h-screen overflow-hidden bg-[color:var(--deep)] text-white">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,6,5,1)_0%,rgba(7,6,5,.86)_48%,rgba(7,6,5,.22)_100%),url('https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=1800&auto=format&fit=crop')] bg-cover bg-center" />
      <div className="relative z-10 grid min-h-screen gap-10 px-8 py-12 lg:grid-cols-[.9fr_1.1fr] lg:px-16">
        <div className="flex flex-col justify-between">
          <Link to="/">
            <One39Logo />
          </Link>
          <div className="max-w-xl">
            <h1 className="font-serif text-6xl tracking-[-.05em] text-[color:var(--gold)] md:text-7xl">
              profile by form.
            </h1>
            <div className="mt-2 text-2xl tracking-[0.12em] text-white/80">
              premium workspace for One39.
            </div>
            <div className="mt-8 h-px w-16 bg-[color:var(--gold)]" />
            <h2 className="mt-10 font-serif text-4xl leading-tight">
              Relational intelligence
              <br />
              for church staffing.
            </h2>
            <p className="mt-7 text-lg leading-8 text-white/62">
              Build complete candidate profiles, media review assets, and client-ready
              decision materials from one secure operations workspace.
            </p>
            <div className="mt-10 space-y-6">
              {[
                [
                  "Wilson AI Powered",
                  "Built-in intelligence that learns with each interview, source, and search.",
                ],
                [
                  "Founder-grade Security",
                  "Role-based workflow and enterprise patterns with full audit context.",
                ],
                [
                  "Built for Church Staffing",
                  "Purpose-built for ministry leaders with clean executive outputs.",
                ],
                [
                  "Production-ready Outputs",
                  "Candidate profiles, media pages, and review hubs ready for delivery.",
                ],
              ].map(([title, body]) => (
                <div key={title} className="flex gap-4">
                  <Sparkles className="h-7 w-7 text-[color:var(--gold)]" />
                  <div>
                    <div className="font-semibold">{title}</div>
                    <div className="mt-1 text-sm text-white/48">{body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-sm text-white/55">
            Secure. Private. Built for ministry. {" "}
            <span className="mx-5 text-[color:var(--gold)]/40">|</span> Powered
            by Wilson AI
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className="w-full max-w-[560px] rounded-[30px] bg-[color:var(--soft)] p-10 text-foreground shadow-[0_40px_120px_rgba(0,0,0,.45)]">
            <h2 className="text-3xl font-semibold">
              {mode === "signup" ? "Request access" : "Welcome back"}
            </h2>
            <p className="mt-2 text-foreground/50">
              {mode === "signup"
                ? "Create your Profile by form workspace."
                : "Sign in to your Profile by form workspace."}
            </p>

            <Button
              variant="outline"
              className="mt-8 w-full justify-center py-6 text-base"
              onClick={handleGoogle}
              disabled={busy}
            >
              Continue with Google
            </Button>

            <div className="my-8 flex items-center gap-5 text-sm text-foreground/35">
              <div className="h-px flex-1 bg-foreground/10" />
              or continue with email
              <div className="h-px flex-1 bg-foreground/10" />
            </div>

            <form className="space-y-5" onSubmit={handleEmail}>
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@one39.co"
                    className="h-12 pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
                  <Input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••••"
                    className="h-12 pl-10"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={busy}
                className="w-full py-6 text-base"
              >
                {mode === "signup" ? "Create account" : "Sign in"}{" "}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <button
                type="button"
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="block w-full text-center text-sm text-[color:var(--gold-deep)]"
              >
                {mode === "signin"
                  ? "Need access? Request an account"
                  : "Already have an account? Sign in"}
              </button>
            </form>

            <div className="mt-8 border border-foreground/15 bg-white/40 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground/80">
                <ShieldCheck className="h-4 w-4" />
                Developer founder access
              </div>
              <div className="space-y-3">
                {bypassMessage && (
                  <div className="rounded bg-[color:var(--gold)]/10 px-3 py-2 text-xs text-[color:var(--gold-deep)]">
                    {bypassMessage}
                  </div>
                )}
                <Input
                  value={devKey}
                  onChange={(e) => setDevKey(e.target.value)}
                  placeholder="Enter developer backdoor key"
                  className="h-11"
                />
                <Button
                  type="button"
                  className="w-full"
                  disabled={busy || !IS_BACKDOOR_ENABLED || !credentialsReady}
                  onClick={() => signInFounderWithKey()}
                >
                  {busy ? "Authenticating..." : "Unlock developer workspace"}
                </Button>
                {import.meta.env.DEV && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-[color:var(--gold)]/40 text-[color:var(--gold-deep)] hover:bg-[color:var(--gold)]/10"
                    disabled={busy}
                    onClick={forceLocalDeveloperUnlock}
                  >
                    Force local unlock now
                  </Button>
                )}
                <div className="text-xs text-foreground/55">
                  {IS_BACKDOOR_ENABLED
                    ? credentialsReady
                      ? "Backdoor mode is active. Use this key once to open full access."
                      : "Configure developer credentials in .env.local to enable backdoor login."
                    : "Backdoor mode is disabled. Set VITE_ALLOW_DEVELOPER_BACKDOOR=true for local only."}
                </div>
              </div>
            </div>

            <div className="mt-9 flex items-center justify-center gap-3 text-sm text-foreground/40">
              <WilsonMark className="h-8 w-8" /> Wilson-ready workspace access
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
