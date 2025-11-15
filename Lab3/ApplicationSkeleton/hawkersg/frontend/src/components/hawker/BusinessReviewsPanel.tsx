import React from 'react';
import {
  Star,
  Filter,
  SortDesc,
  CalendarClock,
  MessageSquareReply,
  Send,
  X,
} from 'lucide-react';
import ReviewCard from './../shared/ReviewCard';

export type ReviewRow = {
  id: string;
  rating: number;                 // 1..5
  title?: string;
  comment?: string;               // review text
  author?: string;                // display name if userName not present
  createdAt?: string;             // ISO
  ownerReply?: {
    text: string;
    repliedAt: string;            // ISO
  } | null;

  // If your data already includes these, great — we’ll forward them.
  userId?: string;
  userName?: string;
  images?: string[];
};

export default function BusinessReviewsPanel({
  stallId,
  reviews,
}: {
  stallId: string;
  reviews: ReviewRow[];
}) {
  const [data, setData] = React.useState<ReviewRow[]>(
    Array.isArray(reviews) ? reviews : []
  );

  const [starFilter, setStarFilter] = React.useState<number | 'ALL'>('ALL');
  const [sort, setSort] = React.useState<'recent' | 'high' | 'low'>('recent');

  const [replyDraft, setReplyDraft] = React.useState<Record<string, string>>({});
  const [replyOpen, setReplyOpen] = React.useState<Record<string, boolean>>({});
  const [saving, setSaving] = React.useState<Record<string, boolean>>({});

  const total = data.length;
  const average =
    total === 0
      ? 0
      : Math.round(
          (data.reduce((s, r) => s + (r.rating || 0), 0) / total) * 10
        ) / 10;

  const breakdown = React.useMemo(() => {
    const acc: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of data) acc[r.rating] = (acc[r.rating] ?? 0) + 1;
    return acc;
  }, [data]);

  const list = React.useMemo(() => {
    let out = [...data];
    if (starFilter !== 'ALL') out = out.filter((r) => r.rating === starFilter);
    if (sort === 'recent') out.sort((a, b) => t(b.createdAt) - t(a.createdAt));
    if (sort === 'high')
      out.sort(
        (a, b) => b.rating - a.rating || t(b.createdAt) - t(a.createdAt)
      );
    if (sort === 'low')
      out.sort(
        (a, b) => a.rating - b.rating || t(b.createdAt) - t(a.createdAt)
      );
    return out;
  }, [data, starFilter, sort]);

  async function submitOwnerReply(reviewId: string) {
    const text = (replyDraft[reviewId] || '').trim();
    if (!text) return;
    setSaving((s) => ({ ...s, [reviewId]: true }));

    // TODO: backend call here (PATCH reply)
    setData((prev) =>
      prev.map((r) =>
        r.id === reviewId
          ? { ...r, ownerReply: { text, repliedAt: new Date().toISOString() } }
          : r
      )
    );
    setReplyDraft((d) => ({ ...d, [reviewId]: '' }));
    setReplyOpen((o) => ({ ...o, [reviewId]: false }));
    setSaving((s) => ({ ...s, [reviewId]: false }));
  }

  return (
    <div className="space-y-6">
      {/* Summary + Filters */}
      <div className="bg-white rounded-lg border shadow-sm p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {average.toFixed(1)}
              </div>
            </div>
            <div className="text-gray-600 text-sm">
              {total} review{total === 1 ? '' : 's'}
            </div>
            <Stars value={average} size="md" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-sm text-gray-600 mr-1">
              <Filter className="w-4 h-4" /> Filter:
            </span>
            <Pill
              active={starFilter === 'ALL'}
              onClick={() => setStarFilter('ALL')}
            >
              All
            </Pill>
            {[5, 4, 3, 2, 1].map((s) => (
              <Pill
                key={s}
                active={starFilter === s}
                onClick={() => setStarFilter(s)}
              >
                <div className="flex items-center gap-1">
                  <span>{s}</span>
                  <Star className="w-3.5 h-3.5 fill-yellow-500 stroke-yellow-500" />
                </div>
              </Pill>
            ))}

            <span className="ml-auto flex items-center gap-1 text-sm text-gray-600">
              <SortDesc className="w-4 h-4" /> Sort:
            </span>
            <select
              className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white"
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
            >
              <option value="recent">Most recent</option>
              <option value="high">Highest rating</option>
              <option value="low">Lowest rating</option>
            </select>
          </div>
        </div>

        {/* Star breakdown */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {[5, 4, 3, 2, 1].map((s) => (
            <BreakdownRow
              key={s}
              star={s}
              count={breakdown[s] || 0}
              total={total}
            />
          ))}
        </div>
      </div>

      {/* Reviews list */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-base font-semibold">Reviews</h3>
          <div className="text-xs text-gray-500 inline-flex items-center gap-1">
            <CalendarClock className="w-4 h-4" />
            Showing {list.length} item{list.length === 1 ? '' : 's'}
          </div>
        </div>

        <div className="divide-y">
          {list.length === 0 && (
            <div className="p-6 text-sm text-gray-600">
              No reviews found for the selected filters.
            </div>
          )}

          {list.map((rv) => (
            <div key={rv.id} className="p-5">
              {/* Adapt to EXACT ReviewCard shape; all required strings are guaranteed */}
              <ReviewCard review={toReviewCardReview(rv, stallId)} />

              {/* Reply UI (optional) */}
              {!rv.ownerReply && (
                <div className="mt-3">
                  <button
                    className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
                    onClick={() =>
                      setReplyOpen((o) => ({ ...o, [rv.id]: !o[rv.id] }))
                    }
                  >
                    <MessageSquareReply className="w-4 h-4" />
                    Reply
                  </button>

                  {replyOpen[rv.id] && (
                    <div className="mt-3">
                      <textarea
                        className="w-full rounded-md border border-gray-300 p-2 text-sm"
                        rows={3}
                        placeholder="Write a public owner response…"
                        value={replyDraft[rv.id] || ''}
                        onChange={(e) =>
                          setReplyDraft((d) => ({
                            ...d,
                            [rv.id]: e.target.value,
                          }))
                        }
                      />
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-gray-900 text-white text-sm disabled:opacity-50"
                          disabled={
                            saving[rv.id] || !(replyDraft[rv.id] || '').trim()
                          }
                          onClick={() => submitOwnerReply(rv.id)}
                        >
                          <Send className="w-4 h-4" />
                          {saving[rv.id] ? 'Saving…' : 'Post reply'}
                        </button>
                        <button
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border text-sm"
                          onClick={() =>
                            setReplyOpen((o) => ({ ...o, [rv.id]: false }))
                          }
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {rv.ownerReply && (
                <div className="mt-3 pl-3 border-l-2 border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">
                    Owner reply •{' '}
                    {new Date(rv.ownerReply.repliedAt).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-800 whitespace-pre-wrap">
                    {rv.ownerReply.text}
                  </div>
                </div>
              )}
              {/* End reply UI */}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ----------------------- Adapter + small helpers ------------------------ */

function toReviewCardReview(rv: ReviewRow, stallId: string) {
  // Coerce possibly-undefineds to required strings to satisfy ReviewCard's type:
  const title = rv.title ?? '';
  const comment = rv.comment ?? '';
  const createdAt = rv.createdAt ?? new Date(0).toISOString();
  const userName = rv.userName ?? rv.author ?? 'Anonymous';
  const userId = rv.userId ?? 'unknown';
  const images = rv.images ?? [];

  return {
    // Required by your ReviewCard's Review type:
    stallId,
    userId,
    userName,
    images,             // string[]

    // Common review fields — guaranteed to be strings where required
    id: rv.id,
    rating: rv.rating,
    title,
    comment,
    createdAt,

    // Optional: forward owner reply if your card displays it
    ownerReply: rv.ownerReply ?? null,
  };
}

function t(s?: string) {
  return s ? +new Date(s) : 0;
}

function Stars({ value, size = 'sm' }: { value: number; size?: 'sm' | 'md' }) {
  const full = Math.floor(value);
  const hasHalf = value - full >= 0.5;
  const base = size === 'md' ? 'w-5 h-5' : 'w-4 h-4';
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => {
        const idx = i + 1;
        const filled = idx <= full || (idx === full + 1 && hasHalf);
        return (
          <Star
            key={i}
            className={`${base} ${
              filled ? 'fill-yellow-500 stroke-yellow-500' : 'stroke-gray-300'
            }`}
          />
        );
      })}
    </div>
  );
}

function Pill({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm border transition
        ${
          active
            ? 'bg-gray-900 text-white border-gray-900'
            : 'bg-white hover:bg-gray-50 border-gray-300 text-gray-700'
        }`}
    >
      {children}
    </button>
  );
}

function BreakdownRow({
  star,
  count,
  total,
}: {
  star: number;
  count: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-16 flex items-center justify-end gap-1 text-sm text-gray-700">
        <span>{star}</span>
        <Star className="w-3.5 h-3.5 fill-yellow-500 stroke-yellow-500" />
      </div>
      <div className="flex-1 h-3 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full bg-yellow-500"
          style={{ width: `${pct}%` }}
          aria-label={`${pct}%`}
        />
      </div>
      <div className="w-14 text-right text-sm tabular-nums text-gray-600">
        {count}
      </div>
    </div>
  );
}

