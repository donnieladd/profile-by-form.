import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Lock, Mail, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { One39Logo, WilsonMark } from "@/components/brand/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Profile by form." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard" });
  }, [session, loading, navigate]);

  async function handleGoogle() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed", {
        description: result.error.message,
      });
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Welcome to Profile by form.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error("Authentication failed", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  }

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
              beta for One39.
            </div>
            <div className="mt-8 h-px w-16 bg-[color:var(--gold)]" />
            <h2 className="mt-10 font-serif text-4xl leading-tight">
              Relational intelligence
              <br />
              for church staffing.
            </h2>
            <p className="mt-7 text-lg leading-8 text-white/62">
              An intelligence workspace for building deeper candidate profiles,
              crafting executive-ready profiles, and moving the right
              leaders into the right places — faster.
            </p>
            <div className="mt-10 space-y-6">
              {[
                ["Wilson AI Powered", "Built-in intelligence that learns with you."],
                ["Built for Church Staffing", "Purpose-built for ministry leaders."],
                ["Secure by Design", "Your data is private and protected."],
                ["Executive-Ready Output", "Reports and insights that drive decisions."],
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
            Secure. Private. Built for ministry.{" "}
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
              className="mt-9 w-full justify-center py-6 text-base"
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

            <div className="mt-9 flex items-center justify-center gap-3 text-sm text-foreground/40">
              <WilsonMark className="h-8 w-8" /> Wilson-ready workspace access
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
