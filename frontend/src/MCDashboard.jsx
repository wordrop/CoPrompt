import { useState, useEffect } from 'react';
import { db } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export default function MCDashboard({ sessionId, session }) {
  const [submissions, setSubmissions] = useState([]);
  const [synthesis, setSynthesis] = useState('');
  const [isGeneratingSynthesis, setIsGeneratingSynthesis] = useState(false);
  const [error, setError] = useState(null);
  
  // Modal state for viewing full analysis
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  // Open modal to view full analysis
  const viewFullAnalysis = (submission) => {
    setSelectedSubmission(submission);
    setIsModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedSubmission(null);
  };

  // Download synthesis as text file
  const downloadAsText = () => {
    const content = `${session.title}\n${'='.repeat(session.title.length)}\n\n${synthesis}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.title.replace(/[^a-z0-9]/gi, '_')}_synthesis.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download synthesis as markdown
  const downloadAsMarkdown = () => {
    const content = `# ${session.title}\n\n## AI Synthesis\n\n${synthesis}`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.title.replace(/[^a-z0-9]/gi, '_')}_synthesis.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Copy synthesis to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(synthesis);
    alert('Synthesis copied to clipboard!');
  };

  // Print synthesis (can save as PDF)
  const printSynthesis = () => {
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(`
      <html>
        <head>
          <title>${session.title} - Synthesis</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
            h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
            pre { white-space: pre-wrap; word-wrap: break-word; }
          </style>
        </head>
        <body>
          <h1>${session.title}</h1>
          <h2>AI Synthesis</h2>
          <pre>${synthesis}</pre>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{session.mcName}'s Dashboard</h1>
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
            <div>
              <div className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-200 mb-4">
                <p className="text-sm font-semibold text-purple-900 mb-4">Combined Analysis:</p>
                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap">{synthesis}</p>
                </div>
              </div>

              {/* Download Options */}
              <div className="flex flex-wrap gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="w-full text-sm font-semibold text-gray-700 mb-2">📥 Download Options:</p>
                
                <button
                  onClick={downloadAsText}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  📄 Download as Text
                </button>

                <button
                  onClick={downloadAsMarkdown}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                >
                  📝 Download as Markdown
                </button>

                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  📋 Copy to Clipboard
                </button>

                <button
                  onClick={printSynthesis}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                  🖨️ Print / Save as PDF
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-3 text-center">
                💡 Tip: Use "Print / Save as PDF" and select "Save as PDF" in the print dialog for a PDF version
              </p>
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

        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900">Collaborator Submissions</h2>
          <p className="text-sm text-gray-600 mt-1">Click on any card to view the full analysis</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {submissions.length === 0 ? (
            <div className="col-span-2 bg-white rounded-lg shadow-md p-8 text-center">
              <div className="text-6xl mb-4">🔭</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Submissions Yet</h3>
              <p className="text-gray-600">
                Share the collaboration links with your team to get started.
              </p>
            </div>
          ) : (
            submissions.map((submission, index) => (
              <div 
                key={index} 
                onClick={() => viewFullAnalysis(submission)}
                className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-xl transition-shadow border-2 border-transparent hover:border-blue-400"
              >
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
                  <p className="text-xs font-semibold text-gray-700 mb-2">Analysis Preview:</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-6">
                    {submission.analysis}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-gray-400">
                    Submitted: {new Date(submission.submittedAt).toLocaleString()}
                  </p>
                  <p className="text-xs font-medium text-blue-600">
                    Click to view full analysis →
                  </p>
                </div>

                {submission.iterations && submission.iterations.length > 1 && (
                  <p className="text-xs text-gray-500 mt-2">
                    {submission.iterations.length} iterations
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal for Full Analysis View */}
      {isModalOpen && selectedSubmission && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={closeModal}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{selectedSubmission.collaboratorName}</h2>
                  <p className="text-purple-100 text-sm mt-1">
                    {selectedSubmission.role || 'Collaborator'} • Submitted: {new Date(selectedSubmission.submittedAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {selectedSubmission.customPrompt && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-semibold text-blue-900 mb-2">Custom Focus:</p>
                  <p className="text-gray-700">{selectedSubmission.customPrompt}</p>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Full Analysis:</h3>
                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {selectedSubmission.analysis}
                  </p>
                </div>
              </div>

              {selectedSubmission.iterations && selectedSubmission.iterations.length > 1 && (
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    This analysis went through {selectedSubmission.iterations.length} iterations
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedSubmission.analysis);
                  alert('Analysis copied to clipboard!');
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                📋 Copy Analysis
              </button>
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}