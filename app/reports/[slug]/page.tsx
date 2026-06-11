import { cookies } from "next/headers";
import { validateAccess, cookieNameForSlug } from "@/lib/access";
import { fetchReportHtml } from "@/lib/blob";
import { recordView, isFirstViewOfDay } from "@/lib/db";
import { sendNotifyEmail } from "@/lib/emails/notify";
import ReportFrame from "@/components/viewer/ReportFrame";
import SessionPinger from "@/components/viewer/SessionPinger";

// Always run fresh: access checks + view tracking must not be cached.
export const dynamic = "force-dynamic";

export const metadata = { robots: { index: false, follow: false } };

function NoAccess() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        You don&apos;t have access to this report
      </h1>
      <p className="mt-3 max-w-md text-sm text-neutral-500">
        This report is private. If you believe you should have access, please use
        the personal link that was shared with you.
      </p>
    </main>
  );
}

export default async function ReportViewerPage({
  params,
}: {
  params: { slug: string };
}) {
  const slug = params.slug;
  const tokenValue = cookies().get(cookieNameForSlug(slug))?.value;

  const access = await validateAccess(tokenValue, slug);
  if (!access.ok) {
    return <NoAccess />;
  }

  const { token, report } = access;

  // Fetch the report HTML server-side; the Blob URL never reaches the browser.
  let html: string;
  try {
    html = await fetchReportHtml(report.file_url);
  } catch {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center text-sm text-neutral-500">
        This report is temporarily unavailable.
      </main>
    );
  }

  // Record a view on every page load. Notify Bani only on the first view of the
  // day so the audit trail stays complete without spamming the inbox on refresh.
  try {
    const view = await recordView(token.id);
    if (token.notify_on_view && (await isFirstViewOfDay(token.id, view.id))) {
      await sendNotifyEmail({
        recipientName: token.recipient_name,
        recipientEmail: token.recipient_email,
        reportTitle: report.title,
        viewedAt: new Date(),
      }).catch((e) => console.error("notify email failed:", e));
    }
  } catch (e) {
    console.error("view tracking failed:", e);
  }

  return (
    <>
      <ReportFrame html={html} title={report.title} />
      <SessionPinger slug={slug} />
    </>
  );
}
