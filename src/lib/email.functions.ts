import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const FROM_FALLBACK = "One39 <onboarding@resend.dev>";

function getFromAddress() {
  return process.env.EMAIL_FROM || FROM_FALLBACK;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildEmailHtml(opts: {
  recipientName?: string | null;
  senderName: string;
  candidateName: string;
  candidateRole?: string | null;
  message?: string | null;
  shareUrl: string;
  accessCode?: string | null;
}) {
  const greeting = opts.recipientName ? `Hi ${escapeHtml(opts.recipientName)},` : "Hi,";
  const role = opts.candidateRole ? ` for the ${escapeHtml(opts.candidateRole)} role` : "";
  const userMsg = opts.message
    ? `<p style="margin:16px 0;color:#3b3b3b;line-height:1.55;white-space:pre-line">${escapeHtml(opts.message)}</p>`
    : "";
  const code = opts.accessCode
    ? `<p style="margin:16px 0;color:#555;font-size:14px">Access code: <strong style="font-family:ui-monospace,monospace;letter-spacing:0.08em">${escapeHtml(opts.accessCode)}</strong></p>`
    : "";
  return `<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:#FAF7EE;margin:0;padding:32px">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:16px;overflow:hidden">
    <tr><td style="padding:28px 32px;border-bottom:1px solid #eee">
      <div style="font-family:Georgia,serif;font-size:22px;color:#1a1a1a">ONE<span style="color:#b89263">39</span></div>
      <div style="color:#777;font-size:12px;letter-spacing:.18em;text-transform:uppercase;margin-top:4px">Profile by form.</div>
    </td></tr>
    <tr><td style="padding:28px 32px">
      <p style="margin:0 0 8px;color:#3b3b3b;line-height:1.55">${greeting}</p>
      <p style="margin:0;color:#3b3b3b;line-height:1.55">
        ${escapeHtml(opts.senderName)} has shared a candidate profile for
        <strong>${escapeHtml(opts.candidateName)}</strong>${role}.
      </p>
      ${userMsg}
      <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px auto">
        <tr><td style="background:#1a1a1a;border-radius:999px">
          <a href="${escapeHtml(opts.shareUrl)}" style="display:inline-block;padding:12px 24px;color:#fff;text-decoration:none;font-weight:600;font-size:14px;letter-spacing:.04em">
            View candidate profile →
          </a>
        </td></tr>
      </table>
      ${code}
      <p style="margin:20px 0 0;color:#999;font-size:12px;line-height:1.5">
        Or paste this link in your browser:<br>
        <span style="word-break:break-all;color:#666">${escapeHtml(opts.shareUrl)}</span>
      </p>
    </td></tr>
    <tr><td style="padding:18px 32px;border-top:1px solid #eee;color:#999;font-size:11px;text-align:center;letter-spacing:.16em;text-transform:uppercase">
      One39 · Profile by form.
    </td></tr>
  </table>
</body></html>`;
}

export const sendShareLinkEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        candidate_id: z.string().uuid(),
        to_email: z.string().email().max(255),
        to_name: z.string().trim().max(120).optional().nullable(),
        message: z.string().trim().max(2000).optional().nullable(),
        subject: z.string().trim().max(200).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Email is not configured. Add RESEND_API_KEY in Settings → Secrets.",
      );
    }

    const { supabase, userId } = context;

    // Fetch candidate, presentation, sender profile
    const [{ data: candidate }, { data: pres }, { data: profile }] =
      await Promise.all([
        supabase
          .from("candidates")
          .select("id, full_name, fit_role")
          .eq("id", data.candidate_id)
          .maybeSingle(),
        supabase
          .from("presentations")
          .select("id, share_slug, access_code")
          .eq("candidate_id", data.candidate_id)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", userId)
          .maybeSingle(),
      ]);

    if (!candidate) throw new Error("Candidate not found");
    if (!pres?.share_slug)
      throw new Error("Create a share link first, then send the email.");

    const origin = process.env.APP_ORIGIN || process.env.PUBLIC_APP_URL || "";
    const shareUrl = `${origin.replace(/\/$/, "")}/p/${pres.share_slug}`;

    const senderName = profile?.full_name || profile?.email || "A One39 user";
    const subject =
      data.subject?.trim() ||
      `${candidate.full_name} — Executive candidate profile`;
    const html = buildEmailHtml({
      recipientName: data.to_name ?? null,
      senderName,
      candidateName: candidate.full_name,
      candidateRole: candidate.fit_role ?? null,
      message: data.message ?? null,
      shareUrl,
      accessCode: pres.access_code ?? null,
    });

    // Dynamic import to avoid bundling resend into the client.
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    const res = await resend.emails.send({
      from: getFromAddress(),
      to: [data.to_email],
      subject,
      html,
      replyTo: profile?.email ?? undefined,
    });

    if (res.error) {
      await (supabaseAdmin as any).from("share_emails").insert({
        presentation_id: pres.id,
        candidate_id: candidate.id,
        to_email: data.to_email,
        to_name: data.to_name ?? null,
        subject,
        message: data.message ?? null,
        sent_by: userId,
        status: "failed",
        error: res.error.message ?? JSON.stringify(res.error),
      });
      throw new Error(res.error.message ?? "Email failed to send");
    }

    await (supabaseAdmin as any).from("share_emails").insert({
      presentation_id: pres.id,
      candidate_id: candidate.id,
      to_email: data.to_email,
      to_name: data.to_name ?? null,
      subject,
      message: data.message ?? null,
      sent_by: userId,
      provider_message_id: res.data?.id ?? null,
      status: "sent",
    });

    // Self-notification, opt-in via notify_share_email_sent (default true).
    const { data: prefs } = await (supabaseAdmin as any)
      .from("notification_preferences")
      .select("notify_share_email_sent")
      .eq("user_id", userId)
      .maybeSingle();
    const wantsInApp =
      (prefs as { notify_share_email_sent?: boolean } | null)
        ?.notify_share_email_sent ?? true;
    if (wantsInApp) {
      await supabaseAdmin.from("notifications").insert({
        user_id: userId,
        kind: "share_email_sent",
        title: `Email sent to ${data.to_name ?? data.to_email}`,
        body: `Share link for ${candidate.full_name} delivered.`,
        link: `/candidates/${candidate.id}`,
      });
    }

    return { ok: true, message_id: res.data?.id ?? null };
  });

export const listShareEmails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ candidate_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await (supabase as any)
      .from("share_emails")
      .select("id, to_email, to_name, subject, status, created_at, error")
      .eq("candidate_id", data.candidate_id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return (rows ?? []) as Array<{
      id: string;
      to_email: string;
      to_name: string | null;
      subject: string;
      status: string;
      created_at: string;
      error: string | null;
    }>;
  });
