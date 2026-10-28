import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

/* ---------- helpers ---------- */

const fmtDate = (d, opts = { year: 'numeric', month: 'short', day: 'numeric' }) =>
  d ? new Date(d).toLocaleDateString('en-US', opts) : 'N/A';

const bandLabel = (score) => (score >= 75 ? 'Strong' : score >= 50 ? 'Satisfactory' : 'Needs improvement');

const label = 'text-[10px] uppercase tracking-[.14em] text-muted';
const rule = 'border-rule dark:border-white/10';

/* ---------- pieces ---------- */

const Stat = ({ title, value, note }) => (
  <div className="px-6 py-5">
    <p className={label}>{title}</p>
    <p className="mt-2 font-serif text-4xl leading-none">{value}</p>
    {note && <p className="mt-2 text-xs text-muted">{note}</p>}
  </div>
);

const TrendChart = ({ items, activeId, onSelect }) => {
  const W = 640;
  const H = 180;
  const padX = 28;
  const padY = 20;

  if (items.length < 2) {
    return <p className="py-10 text-sm text-muted">A trend appears once two interviews are completed.</p>;
  }

  const pts = items.map((it, i) => ({
    id: it.id,
    score: it.averageScore || 0,
    x: padX + (i * (W - padX * 2)) / (items.length - 1),
    y: H - padY - ((it.averageScore || 0) / 100) * (H - padY * 2),
  }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Overall score across interviews">
      {[0, 25, 50, 75, 100].map((g) => {
        const y = H - padY - (g / 100) * (H - padY * 2);
        return (
          <g key={g}>
            <line x1={padX} x2={W - padX} y1={y} y2={y} className="stroke-slate-300 dark:stroke-white/10" strokeWidth="1" />
            <text x={0} y={y + 3} fontSize="9" className="fill-slate-500">{g}</text>
          </g>
        );
      })}
      <polyline points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" strokeWidth="1.5" className="stroke-accent" />
      {pts.map((p) => (
        <circle
          key={p.id}
          cx={p.x}
          cy={p.y}
          r={p.id === activeId ? 5 : 3.5}
          strokeWidth="1.5"
          className={`cursor-pointer stroke-accent ${p.id === activeId ? 'fill-accent' : 'fill-white dark:fill-black'}`}
          onClick={() => onSelect(p.id)}
        >
          <title>{p.score}</title>
        </circle>
      ))}
    </svg>
  );
};

const TopicList = ({ title, topics, empty }) => (
  <div>
    <h3 className={`${label} mb-3`}>{title}</h3>
    {topics && topics.length > 0 ? (
      <ul className={`divide-y border-y ${rule} divide-rule dark:divide-white/10`}>
        {topics.map((t, i) => (
          <li key={i} className="py-3 text-sm text-slate-700 dark:text-gray-300">{t}</li>
        ))}
      </ul>
    ) : (
      <p className="border-y border-rule py-3 text-sm text-muted dark:border-white/10">{empty}</p>
    )}
  </div>
);

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
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setInterviews(completed);
        setSelectedId(completed[0]?.id ?? null);
      } catch (err) {
        console.error('Failed to fetch interview history:', err);
        setError('Interview history could not be loaded. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };
    fetchInterviewHistory();
  }, []);

  const interview = useMemo(() => interviews.find((i) => i.id === selectedId) || null, [interviews, selectedId]);
  const chronological = useMemo(() => [...interviews].reverse(), [interviews]);

  const stats = useMemo(() => {
    if (!interviews.length) return null;
    const scores = interviews.map((i) => i.averageScore || 0);
    return {
      total: interviews.length,
      avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      best: Math.max(...scores),
      delta: scores.length > 1 ? Math.round(scores[0] - scores[1]) : null,
    };
  }, [interviews]);

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
          <h2 className="mb-4 font-serif text-4xl">Unable to load data</h2>
          <p className="text-muted">{error}</p>
        </div>
      </section>
    );
  }

  if (!interview) {
    return (
      <section className="mx-auto max-w-7xl p-8">
        <div className="py-20 text-center">
          <h2 className="mb-4 font-serif text-4xl">No Interview Data</h2>
          <p className="text-muted">Complete an interview to see your analysis here.</p>
        </div>
      </section>
    );
  }

  const score = interview.averageScore || 0;

  return (
    <section className="mx-auto max-w-7xl space-y-10 p-8">
      {/* Page heading */}
      <div className={`border-b pb-8 ${rule}`}>
        <h1 className="font-serif text-5xl">Dashboard</h1>
        <p className="mt-2 text-sm text-muted">A record of your completed interviews and areas for development.</p>
      </div>

      {/* Overview */}
      <div className={`grid grid-cols-2 divide-x divide-y border ${rule} divide-rule dark:divide-white/10 lg:grid-cols-4 lg:divide-y-0`}>
        <Stat title="Interviews completed" value={stats.total} />
        <Stat title="Average score" value={stats.avg} note="Across all interviews" />
        <Stat title="Highest score" value={stats.best} />
        <Stat
          title="Change since previous"
          value={stats.delta === null ? 'N/A' : `${stats.delta > 0 ? '+' : ''}${stats.delta}`}
          note={stats.delta === null ? 'Requires two interviews' : 'Latest compared with the one before'}
        />
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* History */}
        <aside>
          <p className={`${label} mb-3`}>Interview history</p>
          <ul className={`max-h-[28rem] divide-y overflow-y-auto border-y ${rule} divide-rule dark:divide-white/10 lg:max-h-[calc(100vh-10rem)]`}>
            {interviews.map((item) => {
              const active = item.id === interview.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setSelectedId(item.id)}
                    aria-current={active ? 'true' : undefined}
                    className={`flex w-full items-center justify-between gap-4 px-4 py-4 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${
                      active ? 'bg-accent text-white' : 'hover:bg-[#F3F1EB] dark:hover:bg-white/5'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{item.role}</span>
                      <span className="mt-1 block truncate text-xs opacity-70">
                        {item.type} / {fmtDate(item.createdAt)}
                      </span>
                    </span>
                    <span className="font-serif text-2xl leading-none">{Math.round(item.averageScore || 0)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Selected interview */}
        <div className="min-w-0 space-y-10">
          <div className={`flex flex-wrap items-end justify-between gap-6 border-b pb-8 ${rule}`}>
            <div>
              <h2 className="font-serif text-4xl sm:text-5xl">Interview Assessment</h2>
              <p className="mt-2 text-sm text-muted">
                {interview.role} / {interview.type} / {fmtDate(interview.createdAt)}
              </p>
            </div>
            <div className="text-right">
              <div className="font-serif text-6xl">
                {score}
                <span className="ml-2 text-xl text-muted">/ 100</span>
              </div>
              <p className={label}>Overall score / {bandLabel(score)}</p>
            </div>
          </div>

          {interview.summary && (
            <div className={`border-b pb-10 ${rule}`}>
              <h3 className={`${label} mb-4`}>Interview summary</h3>
              <p className="max-w-3xl font-serif text-lg leading-8 text-slate-700 dark:text-gray-300">{interview.summary}</p>
            </div>
          )}

          <div className={`border-b pb-10 ${rule}`}>
            <div className="mb-4 flex items-baseline justify-between gap-4">
              <h3 className={label}>Score history</h3>
              <p className="text-xs text-muted">Select a point to view that interview.</p>
            </div>
            <TrendChart items={chronological} activeId={interview.id} onSelect={setSelectedId} />
          </div>

          <div className="grid grid-cols-1 gap-10 xl:grid-cols-2">
            <TopicList title="Strong concepts" topics={interview.strongTopics} empty="No strong topics identified." />
            <TopicList title="Weak concepts" topics={interview.weakTopics} empty="No weak topics identified." />
          </div>

          {interview.suggestions && interview.suggestions.length > 0 && (
            <div>
              <h3 className={`${label} mb-3`}>Recommendations for improvement</h3>
              <ol className={`divide-y border-y ${rule} divide-rule dark:divide-white/10`}>
                {interview.suggestions.map((suggestion, idx) => (
                  <li key={idx} className="flex items-start gap-5 py-5">
                    <span className="w-6 shrink-0 font-serif text-xl text-muted">{idx + 1}</span>
                    <p className="max-w-3xl leading-7 text-slate-700 dark:text-gray-300">{suggestion}</p>
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