import { useState, useEffect } from 'react';
import { db } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export default function MCDashboard({ sessionId, session }) {
  const [submissions, setSubmissions] = useState([]);
  const [synthesis, setSynthesis] = useState('');
  const [isGeneratingSynthesis, setIsGeneratingSynthesis] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sessionId) return;

    const sessionRef = doc(db, 'sessions', sessionId);
    const unsubscribe = onSnapshot(sessionRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setSubmissions(data.submissions || []);
      }
    });

    return () => unsubscribe();
  }, [sessionId]);

  const generateSynthesis = async () => {
    if (submissions.length === 0) {
      setError('No submissions to synthesize yet.');
      return;
    }

    setIsGeneratingSynthesis(true);
    setError(null);

    try {
      const analyses = submissions.map(sub => ({
        collaboratorName: sub.collaboratorName,
        text: sub.analysis,
      }));

      console.log(`📡 Calling backend to synthesize ${analyses.length} analyses...`);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/generate-synthesis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analyses: analyses,
          topic: session.title,
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setSynthesis(data.response);
        console.log('✅ Synthesis received from backend');
      } else {
        throw new Error(data.error || 'Failed to generate synthesis');
      }
    } catch (err) {
      console.error('❌ Error generating synthesis:', err);
      setError(err.message || 'Failed to generate synthesis. Please try again.');
    } finally {
      setIsGeneratingSynthesis(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">MC Dashboard</h1>
          <p className="text-gray-600">{session.title}</p>
          <div className="mt-4 flex items-center gap-4">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
              {submissions.length} Submissions
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Original Context</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{session.context}</p>
          
          {session.aiAnalysis && (
            <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm font-semibold text-purple-900 mb-2">Your AI Analysis:</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{session.aiAnalysis}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">AI Synthesis</h2>
            <button
              onClick={generateSynthesis}
              disabled={isGeneratingSynthesis || submissions.length === 0}
              className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                isGeneratingSynthesis || submissions.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
              }`}
            >
              {isGeneratingSynthesis ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </span>
              ) : (
                '✨ Generate Synthesis'
              )}
            </button>
          </div>

          {synthesis ? (
            <div className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-200">
              <p className="text-sm font-semibold text-purple-900 mb-4">Combined Analysis:</p>
              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">{synthesis}</p>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 text-center">
              <p className="text-gray-500">
                {submissions.length === 0 
                  ? 'Waiting for collaborator submissions...'
                  : 'Click "Generate Synthesis" to combine all analyses'}
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {submissions.length === 0 ? (
            <div className="col-span-2 bg-white rounded-lg shadow-md p-8 text-center">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Submissions Yet</h3>
              <p className="text-gray-600">
                Share the collaboration links with your team to get started.
              </p>
            </div>
          ) : (
            submissions.map((submission, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {submission.collaboratorName}
                    </h3>
                    <span className="text-sm text-gray-500">
                      {submission.role || 'Collaborator'}
                    </span>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                    Submitted
                  </span>
                </div>

                {submission.customPrompt && (
                  <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs font-semibold text-blue-900 mb-1">Custom Focus:</p>
                    <p className="text-sm text-gray-700">{submission.customPrompt}</p>
                  </div>
                )}

                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Analysis:</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-6">
                    {submission.analysis}
                  </p>
                </div>

                {submission.iterations && submission.iterations.length > 1 && (
                  <p className="text-xs text-gray-500 mt-2">
                    {submission.iterations.length} iterations
                  </p>
                )}

                <p className="text-xs text-gray-400 mt-3">
                  Submitted: {new Date(submission.submittedAt).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}