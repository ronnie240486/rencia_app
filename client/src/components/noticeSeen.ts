export type NoticeIdentity = { id: number | string };

export function getUnseenNoticeIds(notices: NoticeIdentity[], seenIds: string[]): string[] {
  const seen = new Set(seenIds);
  return notices.map((notice) => String(notice.id)).filter((id) => !seen.has(id));
}

export function parseSeenNoticeIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
