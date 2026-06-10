import { sql } from "@vercel/postgres";

/**
 * Thin typed layer over @vercel/postgres. We expose `sql` directly for ad-hoc
 * queries and a set of typed helpers for the common access paths so the rest of
 * the app never hand-writes the same query twice.
 *
 * NOTE: @vercel/postgres reads POSTGRES_URL (and friends) from the environment
 * automatically — no client construction needed.
 */
export { sql };

export type Report = {
  id: string;
  title: string;
  slug: string;
  file_url: string;
  archived: boolean;
  allow_download: boolean;
  created_at: string;
  updated_at: string;
};

export type AccessToken = {
  id: string;
  report_id: string;
  token: string;
  recipient_name: string;
  recipient_email: string;
  revoked: boolean;
  notify_on_view: boolean;
  created_at: string;
};

export type ViewEvent = {
  id: string;
  access_token_id: string;
  viewed_at: string;
  session_duration_seconds: number | null;
};

export type ActivityKind =
  | "published"
  | "invite_sent"
  | "token_revoked"
  | "html_replaced"
  | "archived";

export type ActivityEvent = {
  id: string;
  report_id: string;
  kind: ActivityKind;
  detail: string | null;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export async function getReportBySlug(slug: string): Promise<Report | null> {
  const { rows } = await sql<Report>`
    SELECT * FROM reports WHERE slug = ${slug} LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getReportById(id: string): Promise<Report | null> {
  const { rows } = await sql<Report>`
    SELECT * FROM reports WHERE id = ${id} LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function slugExists(slug: string): Promise<boolean> {
  const { rows } = await sql`SELECT 1 FROM reports WHERE slug = ${slug} LIMIT 1`;
  return rows.length > 0;
}

export type CreateReportInput = {
  title: string;
  slug: string;
  fileUrl: string;
};

export async function insertReport(input: CreateReportInput): Promise<Report> {
  const { rows } = await sql<Report>`
    INSERT INTO reports (title, slug, file_url)
    VALUES (${input.title}, ${input.slug}, ${input.fileUrl})
    RETURNING *
  `;
  return rows[0];
}

export async function archiveReport(id: string): Promise<void> {
  await sql`UPDATE reports SET archived = TRUE, updated_at = NOW() WHERE id = ${id}`;
}

// ---------------------------------------------------------------------------
// Access tokens
// ---------------------------------------------------------------------------

export type CreateTokenInput = {
  reportId: string;
  token: string;
  recipientName: string;
  recipientEmail: string;
  notifyOnView: boolean;
};

export async function insertAccessToken(
  input: CreateTokenInput
): Promise<AccessToken> {
  const { rows } = await sql<AccessToken>`
    INSERT INTO access_tokens (report_id, token, recipient_name, recipient_email, notify_on_view)
    VALUES (${input.reportId}, ${input.token}, ${input.recipientName}, ${input.recipientEmail}, ${input.notifyOnView})
    RETURNING *
  `;
  return rows[0];
}

export async function getTokenByValue(
  token: string
): Promise<AccessToken | null> {
  const { rows } = await sql<AccessToken>`
    SELECT * FROM access_tokens WHERE token = ${token} LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getTokensForReport(
  reportId: string
): Promise<AccessToken[]> {
  const { rows } = await sql<AccessToken>`
    SELECT * FROM access_tokens WHERE report_id = ${reportId} ORDER BY created_at ASC
  `;
  return rows;
}

export async function revokeToken(id: string): Promise<AccessToken | null> {
  const { rows } = await sql<AccessToken>`
    UPDATE access_tokens SET revoked = TRUE WHERE id = ${id} RETURNING *
  `;
  return rows[0] ?? null;
}

export async function revokeAllTokensForReport(reportId: string): Promise<void> {
  await sql`UPDATE access_tokens SET revoked = TRUE WHERE report_id = ${reportId}`;
}

// ---------------------------------------------------------------------------
// View events
// ---------------------------------------------------------------------------

/**
 * Records a view, but only once per token per calendar day. Returns the row if
 * a new event was inserted, or null if one already existed for today.
 */
export async function recordViewOncePerDay(
  accessTokenId: string
): Promise<ViewEvent | null> {
  const { rows } = await sql<ViewEvent>`
    INSERT INTO view_events (access_token_id)
    SELECT ${accessTokenId}
    WHERE NOT EXISTS (
      SELECT 1 FROM view_events
      WHERE access_token_id = ${accessTokenId}
        AND viewed_at::date = NOW()::date
    )
    RETURNING *
  `;
  return rows[0] ?? null;
}

/** Finds today's view event for a token (used by session-ping). */
export async function getTodaysViewEvent(
  accessTokenId: string
): Promise<ViewEvent | null> {
  const { rows } = await sql<ViewEvent>`
    SELECT * FROM view_events
    WHERE access_token_id = ${accessTokenId}
      AND viewed_at::date = NOW()::date
    ORDER BY viewed_at DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

/** Bumps a view event's session duration if the new value is larger. */
export async function updateSessionDuration(
  viewEventId: string,
  seconds: number
): Promise<void> {
  await sql`
    UPDATE view_events
    SET session_duration_seconds = GREATEST(COALESCE(session_duration_seconds, 0), ${seconds})
    WHERE id = ${viewEventId}
  `;
}

export type ReportView = ViewEvent & {
  recipient_name: string;
  recipient_email: string;
};

/** Recent views for a report, joined to the recipient, newest first. */
export async function getRecentViewsForReport(
  reportId: string
): Promise<ReportView[]> {
  const { rows } = await sql<ReportView>`
    SELECT ve.*, at.recipient_name, at.recipient_email
    FROM view_events ve
    JOIN access_tokens at ON at.id = ve.access_token_id
    WHERE at.report_id = ${reportId}
    ORDER BY ve.viewed_at DESC
    LIMIT 100
  `;
  return rows;
}

// ---------------------------------------------------------------------------
// Activity feed
// ---------------------------------------------------------------------------

export async function logActivity(
  reportId: string,
  kind: ActivityKind,
  detail?: string
): Promise<void> {
  await sql`
    INSERT INTO activity_events (report_id, kind, detail)
    VALUES (${reportId}, ${kind}, ${detail ?? null})
  `;
}

export async function getActivityForReport(
  reportId: string
): Promise<ActivityEvent[]> {
  const { rows } = await sql<ActivityEvent>`
    SELECT * FROM activity_events
    WHERE report_id = ${reportId}
    ORDER BY created_at DESC
    LIMIT 100
  `;
  return rows;
}

// ---------------------------------------------------------------------------
// Dashboard aggregates
// ---------------------------------------------------------------------------

export type ReportRow = Report & {
  recipient_count: number;
  active_token_count: number;
  view_count: number;
  recipients: string; // comma-separated "Name <email>"
};

export async function listReportsWithStats(): Promise<ReportRow[]> {
  const { rows } = await sql<ReportRow>`
    SELECT
      r.*,
      COUNT(DISTINCT at.id)::int AS recipient_count,
      COUNT(DISTINCT at.id) FILTER (WHERE at.revoked = FALSE)::int AS active_token_count,
      COUNT(DISTINCT ve.id)::int AS view_count,
      COALESCE(
        STRING_AGG(DISTINCT at.recipient_name || ' <' || at.recipient_email || '>', ', '),
        ''
      ) AS recipients
    FROM reports r
    LEFT JOIN access_tokens at ON at.report_id = r.id
    LEFT JOIN view_events ve ON ve.access_token_id = at.id
    WHERE r.archived = FALSE
    GROUP BY r.id
    ORDER BY r.created_at DESC
  `;
  return rows;
}

export type DashboardStats = {
  total_reports: number;
  active_access: number;
  viewed_reports: number;
  revoked_tokens: number;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const { rows } = await sql<DashboardStats>`
    SELECT
      (SELECT COUNT(*) FROM reports WHERE archived = FALSE)::int AS total_reports,
      (SELECT COUNT(*) FROM access_tokens WHERE revoked = FALSE)::int AS active_access,
      (SELECT COUNT(DISTINCT r.id)
         FROM reports r
         JOIN access_tokens at ON at.report_id = r.id
         JOIN view_events ve ON ve.access_token_id = at.id
         WHERE r.archived = FALSE)::int AS viewed_reports,
      (SELECT COUNT(*) FROM access_tokens WHERE revoked = TRUE)::int AS revoked_tokens
  `;
  return rows[0];
}
