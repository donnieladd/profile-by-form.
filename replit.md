# One39 - Church Staffing App

TanStack Start + React 19 + Vite + Tailwind v4 app, with Supabase integration. Originally a Lovable.dev project.

## Stack
- Vite dev server (`@lovable.dev/vite-tanstack-config`)
- TanStack Start / Router
- React 19, Tailwind v4, shadcn/ui (Radix)
- Supabase JS client
- Cloudflare worker target for production build

## Replit setup
- Workflow: `Start application` → `npm run dev` on port 5000 (webview)
- `vite.config.ts` overrides server to `host: 0.0.0.0`, `port: 5000`, `allowedHosts: true` for the Replit iframe proxy
- Env vars come from `.env` (Supabase URL / anon key)
- Deployment: autoscale, build = `npm run build`, run = `npm run preview`

## User preferences
(none yet)
