import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

/* ---------- helpers ---------- */

const scoreTone = (score) => {
  if (score >= 75) return { text: 'text-emerald-500', bg: 'bg-emerald-500', stroke: '#10b981', label: 'Strong' };
  if (score >= 50) return { text: 'text-amber-500', bg: 'bg-amber-500', stroke: '#f59e0b', label: 'Fair' };
  return { text: 'text-rose-500', bg: 'bg-rose-500', stroke: '#f43f5e', label: 'Needs work' };
};

const fmtDate = (d, opts = { year: 'numeric', month: 'short', day: 'numeric' }) =>
  d ? new Date(d).toLocaleDateString('en-US', opts) : 'N/A';

const card =
  'rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-md dark:border-white/10 dark:bg-white/5';

/* ---------- small pieces ---------- */

const ScoreRing = ({ score, size = 148 }) => {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const tone = scoreTone(score);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-slate-200 dark:stroke-white/10" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={tone.stroke}
          strokeDasharray={c}
          strokeDashoffset={c - (Math.min(score, 100) / 100) * c}
          style={{ transition: 'stroke-dashoffset .6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-serif text-4xl leading-none">{Math.round(score)}</span>
        <span className="mt-1 text-xs text-muted">out of 100</span>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, hint }) => (
  <div className={`${card} p-5`}>
    <p className="text-xs text-muted">{label}</p>
    <p className="mt-2 font-serif text-3xl leading-none">{value}</p>
    {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
  </div>
);

const TrendChart = ({ items, activeId, onSelect }) => {
  // items: oldest -> newest
  const W = 600;
  const H = 160;
  const pad = 24;
  if (items.length < 2) {
    return <p className="py-10 text-center text-sm text-muted">Complete one more interview to see your trend.</p>;
  }
  const pts = items.map((it, i) => ({
    id: it.id,
    x: pad + (i * (W - pad * 2)) / (items.length - 1),
    y: H - pad - ((it.averageScore || 0) / 100) * (H - pad * 2),
    score: it.averageScore || 0,
  }));
  const line = pts.map((p) => `${p.x},${p.y}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Score trend across interviews">
      {[0, 50, 100].map((g) => {
        const y = H - pad - (g / 100) * (H - pad * 2);
        return (
          <g key={g}>
            <line x1={pad} x2={W - pad} y1={y} y2={y} className="stroke-slate-200 dark:stroke-white/10" strokeDasharray="4 4" />
            <text x={0} y={y + 4} className="fill-slate-400" fontSize="10">{g}</text>
          </g>
        );
      })}
      <polyline points={line} fill="none" strokeWidth="2" className="stroke-purple-500" />
      {pts.map((p) => (
        <circle
          key={p.id}
          cx={p.x}
          cy={p.y}
          r={p.id === activeId ? 7 : 5}
          className={`cursor-pointer ${p.id === activeId ? 'fill-purple-500 stroke-white' : 'fill-white stroke-purple-500'}`}
          strokeWidth="2"
          onClick={() => onSelect(p.id)}
        >
          <title>{p.score}</title>
        </circle>
      ))}
    </svg>
  );
};

const TopicCard = ({ title, topics, tone, emptyText }) => {
  const isGood = tone === 'good';
  return (
    <div className={`${card} p-6`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-medium">{title}</h3>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            isGood ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
          }`}
        >
          {topics?.length || 0}
        </span>
      </div>
      {topics && topics.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {topics.map((t, i) => (
            <span
              key={i}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                isGood
                  ? 'border-emerald-500/20 bg-emerald-500/5 text-slate-700 dark:text-gray-300'
                  : 'border-rose-500/20 bg-rose-500/5 text-slate-700 dark:text-gray-300'
              }`}
            >
              {t}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">{emptyText}</p>
      )}
    </div>
  );
};

/* ---------- main ---------- */

const Dashboard = () => {
  const [interviews, setInterviews] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchInterviewHistory = async () => {
      try {
        const res = await axios.get('http://localhost:8000/ai/interviews', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        const completed = (res.data.interviews || [])
          .filter((item) => item.status === 'ended')
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // newest first
        setInterviews(completed);
        setSelectedId(completed[0]?.id ?? null);
      } catch (err) {
        console.error('Failed to fetch interview history:', err);
        setError('Could not load your interviews. Check your connection and refresh.');
      } finally {
        setLoading(false);
      }
    };
    fetchInterviewHistory();
  }, []);

  const interview = useMemo(() => interviews.find((i) => i.id === selectedId) || null, [interviews, selectedId]);

  const stats = useMemo(() => {
    if (!interviews.length) return null;
    const scores = interviews.map((i) => i.averageScore || 0);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const best = Math.max(...scores);
    // interviews is newest first; compare newest vs previous
    const delta = scores.length > 1 ? scores[0] - scores[1] : null;
    return { total: interviews.length, avg: Math.round(avg), best, delta };
  }, [interviews]);

  const chronological = useMemo(() => [...interviews].reverse(), [interviews]);

  if (loading) {
    return (
      <section className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-purple-500" />
          <p className="text-sm text-muted">Loading interview analysis...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mx-auto max-w-7xl p-8">
        <div className="py-20 text-center">
          <h2 className="mb-4 font-serif text-4xl">Something went wrong</h2>
          <p className="text-muted">{error}</p>
        </div>
      </section>
    );
  }

  if (!interview) {
    return (
      <section className="mx-auto max-w-7xl p-8">
        <div className="py-20 text-center">
          <h2 className="mb-4 font-serif text-4xl">No interview data yet</h2>
          <p className="text-muted">Complete an interview to see your analysis here.</p>
        </div>
      </section>
    );
  }

  const score = interview.averageScore || 0;
  const tone = scoreTone(score);

  return (
    <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8">
      {/* Page header */}
      <div>
        <h1 className="font-serif text-4xl sm:text-5xl">Dashboard</h1>
        <p className="mt-2 text-sm text-muted">Your interview performance and what to work on next.</p>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Interviews completed" value={stats.total} />
        <StatCard label="Average score" value={stats.avg} hint="across all interviews" />
        <StatCard label="Best score" value={stats.best} />
        <StatCard
          label="Latest vs previous"
          value={stats.delta === null ? '—' : `${stats.delta > 0 ? '+' : ''}${Math.round(stats.delta)}`}
          hint={stats.delta === null ? 'Need two interviews' : stats.delta >= 0 ? 'Improving' : 'Dropped'}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* History sidebar */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className={`${card} p-4`}>
            <h2 className="mb-3 px-1 text-sm font-medium">Interview history</h2>
            <ul className="max-h-72 space-y-2 overflow-y-auto pr-1 lg:max-h-[calc(100vh-14rem)]">
              {interviews.map((item) => {
                const active = item.id === interview.id;
                const s = item.averageScore || 0;
                const t = scoreTone(s);
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => setSelectedId(item.id)}
                      aria-current={active ? 'true' : undefined}
                      className={`w-full rounded-xl border p-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                        active
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-slate-200 hover:bg-slate-100/70 dark:border-white/10 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{item.role}</p>
                          <p className="mt-0.5 truncate text-xs text-muted">
                            {item.type} · {fmtDate(item.createdAt, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                        <span className={`font-serif text-xl leading-none ${t.text}`}>{Math.round(s)}</span>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                        <div className={`h-full rounded-full ${t.bg}`} style={{ width: `${Math.min(s, 100)}%` }} />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        {/* Selected interview */}
        <div className="min-w-0 space-y-6">
          {/* Assessment hero */}
          <div className={`${card} flex flex-col items-center gap-6 p-6 sm:flex-row sm:p-8`}>
            <ScoreRing score={score} />
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <span className={`inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-medium dark:bg-white/10 ${tone.text}`}>
                {tone.label}
              </span>
              <h2 className="mt-3 font-serif text-3xl sm:text-4xl">{interview.role}</h2>
              <p className="mt-1 text-sm text-muted">
                {interview.type} · {fmtDate(interview.createdAt)}
              </p>
              {interview.summary && (
                <p className="mt-4 max-w-2xl leading-7 text-slate-700 dark:text-gray-300">{interview.summary}</p>
              )}
            </div>
          </div>

          {/* Trend */}
          <div className={`${card} p-6`}>
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="font-medium">Score trend</h3>
              <p className="text-xs text-muted">Oldest to newest. Click a point to open it.</p>
            </div>
            <TrendChart items={chronological} activeId={interview.id} onSelect={setSelectedId} />
          </div>

          {/* Strong / weak */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <TopicCard title="Strong concepts" topics={interview.strongTopics} tone="good" emptyText="No strong topics identified." />
            <TopicCard title="Weak concepts" topics={interview.weakTopics} tone="bad" emptyText="No weak topics identified." />
          </div>

          {/* Suggestions */}
          {interview.suggestions && interview.suggestions.length > 0 && (
            <div className={`${card} p-6`}>
              <h3 className="mb-4 font-medium">How to improve</h3>
              <ol className="space-y-4">
                {interview.suggestions.map((suggestion, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/15 text-xs font-bold text-purple-500">
                      {idx + 1}
                    </span>
                    <p className="leading-relaxed text-slate-700 dark:text-gray-300">{suggestion}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Dashboard;