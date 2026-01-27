import { useState, useEffect } from 'react';
import { getAllSessions, getAnalyticsSummary } from './sessionStorage';

function SessionDashboard({ onNavigateToSession, onCreateNew }) {
  const [sessions, setSessions] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    setSessions(getAllSessions());
    setAnalytics(getAnalyticsSummary());
  }, []);

  const formatDate = (isoDate) => {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
{/* Navigation Bar */}
      <nav className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">✨ CoPrompt</h1>
          <button
            onClick={onCreateNew}
            className="px-4 py-2 bg-white/20 rounded hover:bg-white/30 transition-colors text-sm font-semibold"
          >
            ➕ New Session
          </button>
        </div>
      </nav>      
{/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 pt-0 p-6 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">📊 My Sessions</h1>
          <p className="text-blue-100">All your collaborative decision sessions in one place</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {/* Summary Cards */}
        {analytics && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <div className="text-3xl font-bold text-purple-400">{analytics.totalSessions}</div>
              <div className="text-sm text-slate-400">Total Sessions</div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <div className="text-3xl font-bold text-blue-400">{sessions.filter(s => s.status === 'active').length}</div>
              <div className="text-sm text-slate-400">Active</div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <div className="text-3xl font-bold text-green-400">{sessions.filter(s => s.status === 'finalized').length}</div>
              <div className="text-sm text-slate-400">Completed</div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {sessions.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-2xl font-bold mb-2">No sessions yet</h2>
            <p className="text-slate-400 mb-6">Create your first collaborative decision session to get started</p>
            <button
              onClick={() => window.location.href = '/?create=true'}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-colors"
            >
              ➕ Create New Session
            </button>
          </div>
        ) : (
          <>
            {/* Session List */}
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Your Sessions</h2>
                <button
                  onClick={() => window.location.href = '/?create=true'}
                  className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold"
                >
                  ➕ New Session
                </button>
              </div>

              {sessions.map((session) => (
                <div
                  key={session.sessionId}
                  className="bg-slate-800 border border-slate-700 rounded-lg p-5 hover:border-purple-500 transition-colors cursor-pointer"
                  onClick={() => onNavigateToSession(session.sessionId)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-1">{session.title}</h3>
                      <p className="text-sm text-slate-400">Created by {session.mcName}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        session.status === 'finalized' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {session.status === 'finalized' ? '✓ Completed' : '⏳ Active'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <span>👥 {session.collaboratorCount} collaborators</span>
                    <span>•</span>
                    <span>🕐 {formatDate(session.createdAt)}</span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-700">
                    <button className="text-purple-400 hover:text-purple-300 text-sm font-semibold">
                      View Session →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default SessionDashboard;