import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Bell,
  BriefcaseBusiness,
  ChevronDown,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Presentation,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

import { One39Logo, WilsonMark } from "@/components/brand/brand";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { globalSearch } from "@/lib/search.functions";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/searches", label: "Searches", icon: Search },
  { to: "/candidates", label: "Candidates", icon: Users },
  { to: "/source", label: "Source Package", icon: FolderOpen },
  { to: "/profile-builder", label: "Profile Builder", icon: FileText },
  { to: "/presentations", label: "Presentations", icon: Presentation },
  { to: "/wilson", label: "Wilson", icon: Sparkles },
  { to: "/admin", label: "Admin", icon: ShieldCheck },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

type Results = Awaited<ReturnType<typeof globalSearch>>;

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const search = useServerFn(globalSearch);

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Results | null>(null);

  // ⌘K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // debounced search
  useEffect(() => {
    if (!open || !q.trim()) {
      setResults(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await search({ data: { q } });
        setResults(r);
      } catch {
        setResults(null);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q, open, search]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  function go(to: string) {
    setOpen(false);
    navigate({ to });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-[236px] flex-col border-r border-white/10 bg-[color:var(--deep)] text-white lg:flex">
        <div className="p-8">
          <Link to="/dashboard">
            <One39Logo />
          </Link>
          <div className="mt-8 font-serif text-lg leading-none text-[color:var(--gold)]">
            profile by form.
          </div>
          <div className="mt-1 text-xs tracking-[0.18em] text-white/40">
            beta for One39
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm transition",
                  active
                    ? "bg-white/10 text-[color:var(--gold)]"
                    : "text-white/60 hover:bg-white/[0.06] hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-6">
          <div className="rounded-2xl border border-[color:var(--gold)]/30 bg-[color:var(--gold)]/10 p-5">
            <WilsonMark className="h-11 w-14 text-[color:var(--gold)]" />
            <div className="mt-4 text-sm font-semibold text-[color:var(--gold)]">
              Wilson AI
            </div>
            <p className="mt-2 text-xs leading-5 text-white/48">
              Secure. Private. Built for ministry.
            </p>
          </div>
        </div>
      </aside>

      <main className="lg:pl-[236px]">
        <header className="sticky top-0 z-30 flex h-[74px] items-center justify-between border-b border-foreground/10 bg-background/86 px-5 backdrop-blur-xl lg:px-8">
          <button
            onClick={() => setOpen(true)}
            className="flex w-full max-w-2xl items-center gap-3 rounded-xl border border-foreground/10 bg-card px-4 py-3 text-sm text-foreground/40 transition hover:border-[color:var(--gold)]/40"
          >
            <Search className="h-4 w-4" />
            <span>Search candidates, searches, presentations…</span>
            <span className="ml-auto rounded-md border border-foreground/10 px-2 py-1 text-xs">
              ⌘ K
            </span>
          </button>
          <div className="ml-4 flex items-center gap-4">
            <Bell className="h-5 w-5 text-foreground/60" />
            <div className="hidden items-center gap-3 md:flex">
              <div className="h-10 w-10 rounded-full bg-[linear-gradient(135deg,var(--gold),var(--ink))]" />
              <div className="text-sm">
                <div className="font-semibold">
                  {user?.user_metadata?.full_name ??
                    user?.email?.split("@")[0] ??
                    "Team member"}
                </div>
                <div className="text-xs text-foreground/45">ONE39 workspace</div>
              </div>
              <button
                onClick={handleSignOut}
                title="Sign out"
                className="rounded-md p-2 text-foreground/40 hover:bg-foreground/5"
              >
                <LogOut className="h-4 w-4" />
              </button>
              <ChevronDown className="h-4 w-4 text-foreground/40" />
            </div>
          </div>
        </header>
        {children}
      </main>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search candidates, searches, presentations…"
          value={q}
          onValueChange={setQ}
        />
        <CommandList>
          {!q.trim() && (
            <CommandEmpty>Type to search across your workspace.</CommandEmpty>
          )}
          {q.trim() && !results && (
            <CommandEmpty>Searching…</CommandEmpty>
          )}
          {results && results.candidates.length === 0 &&
            results.searches.length === 0 &&
            results.presentations.length === 0 && (
              <CommandEmpty>No results.</CommandEmpty>
            )}
          {results && results.candidates.length > 0 && (
            <CommandGroup heading="Candidates">
              {results.candidates.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`cand-${c.id}-${c.full_name}`}
                  onSelect={() => go(`/candidates/${c.id}`)}
                >
                  <Users className="mr-2 h-4 w-4 text-foreground/45" />
                  <div>
                    <div>{c.full_name}</div>
                    <div className="text-xs text-foreground/45">
                      {c.fit_role ?? c.current_org ?? c.email}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {results && results.searches.length > 0 && (
            <CommandGroup heading="Searches">
              {results.searches.map((s) => (
                <CommandItem
                  key={s.id}
                  value={`search-${s.id}-${s.church}`}
                  onSelect={() => go(`/searches/${s.id}`)}
                >
                  <BriefcaseBusiness className="mr-2 h-4 w-4 text-foreground/45" />
                  <div>
                    <div>
                      {s.church} · {s.role}
                    </div>
                    <div className="text-xs text-foreground/45">{s.city}</div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {results && results.presentations.length > 0 && (
            <CommandGroup heading="Presentations">
              {results.presentations.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`pres-${p.id}-${p.title}`}
                  onSelect={() => go(`/candidates/${p.candidate_id}`)}
                >
                  <Presentation className="mr-2 h-4 w-4 text-foreground/45" />
                  <div>
                    <div>{p.title}</div>
                    <div className="text-xs text-foreground/45">{p.status}</div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </div>
  );
}
