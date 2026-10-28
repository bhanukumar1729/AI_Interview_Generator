import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Dashboard = () => {
  const [interview, setInterview] = useState(null);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInterviewHistory = async () => {
      try {
        const res = await axios.get('http://localhost:8000/ai/interviews', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        const completedInterviews = res.data.interviews.filter((item) => item.status === 'ended');
        setInterviews(completedInterviews);
        setInterview(completedInterviews[0] || null);
      } catch (error) {
        console.error("Failed to fetch interview history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInterviewHistory();
  }, []);

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-sm text-muted">Loading interview analysis...</p>
        </div>
      </section>
    );
  }

  if (!interview || interview.status !== 'ended') {
    return (
      <section className="max-w-7xl mx-auto p-8 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center py-20">
          <h2 className="mb-4 font-serif text-4xl">No Interview Data</h2>
          <p className="text-muted">Complete an interview to see your analysis here.</p>
        </div>
      </section>
    );
  }

  const score = interview.averageScore || 0;
  const formattedDate = interview.createdAt 
    ? new Date(interview.createdAt).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })
    : 'N/A';

  return (
    <section className="max-w-7xl mx-auto p-8 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {interviews.length > 1 && (
        <div className="border-y border-rule py-5 dark:border-white/10">
          <p className="mb-3 text-[10px] uppercase tracking-[.14em] text-muted">Previous interviews</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {interviews.map((item) => (
              <button
                key={item.id}
                onClick={() => setInterview(item)}
                className={`shrink-0 border px-4 py-3 text-left text-sm transition-colors ${
                  item.id === interview.id
                    ? 'border-accent bg-accent text-white'
                    : 'border-rule hover:bg-[#F3F1EB] dark:border-white/15 dark:hover:bg-white/5'
                }`}
              >
                <span className="block font-medium">{item.role}</span>
                <span className="mt-1 block text-xs opacity-70">{new Date(item.createdAt).toLocaleDateString()}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-end justify-between border-b border-rule pb-8 dark:border-white/10">
        <div>
          <h2 className="font-serif text-5xl">Interview Assessment</h2>
          <p className="mt-2 text-sm text-muted">{interview.role} / {interview.type} / {formattedDate}</p>
        </div>
        <div className="text-right">
          <div className="font-serif text-6xl">{score}<span className="ml-2 text-xl text-muted">/ 100</span></div>
          <p className="text-[10px] uppercase tracking-[.14em] text-muted">Overall score</p>
        </div>
      </div>

      {/* Summary Section */}
      {interview.summary && (
        <div className="border-b border-rule py-8 dark:border-white/10">
          <h3 className="text-xs font-bold text-gray-500 uppercase mb-4">Interview Summary</h3>
          <p className="max-w-3xl leading-8 text-muted">{interview.summary}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Strong Topics */}
        <div className="p-8 rounded-[2rem] bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-md">
          <h3 className="text-xs font-bold text-green-400 uppercase mb-4">Strong Concepts</h3>
          {interview.strongTopics && interview.strongTopics.length > 0 ? (
            <ul className="space-y-3">
              {interview.strongTopics.map((topic, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-slate-700 dark:text-gray-300">{topic}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-600 dark:text-gray-500 text-sm">No strong topics identified</p>
          )}
        </div>

        {/* Weak Topics */}
        <div className="p-8 rounded-[2rem] bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-md">
          <h3 className="text-xs font-bold text-red-400 uppercase mb-4">Weak Concepts</h3>
          {interview.weakTopics && interview.weakTopics.length > 0 ? (
            <ul className="space-y-3">
              {interview.weakTopics.map((topic, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-slate-700 dark:text-gray-300">{topic}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-600 dark:text-gray-500 text-sm">No weak topics identified</p>
          )}
        </div>
      </div>

      {/* Suggestions Section */}
      {interview.suggestions && interview.suggestions.length > 0 && (
        <div className="p-8 rounded-[2rem] bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 backdrop-blur-md">
          <h3 className="text-xs font-bold text-purple-400 uppercase mb-4">How to Improve</h3>
          <ul className="space-y-4">
            {interview.suggestions.map((suggestion, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-purple-400 text-xs font-bold">{idx + 1}</span>
                </div>
                <p className="text-slate-700 dark:text-gray-300 leading-relaxed">{suggestion}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

export default Dashboard;
