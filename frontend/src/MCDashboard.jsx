import { useState, useEffect } from 'react';
import { db } from './firebase';
import { updateSessionStatus } from './sessionStorage';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';

// Add this helper component after imports, before the main export
function SynthesisDisplay({ synthesis }) {
  // Parse synthesis into sections
  const sections = parseSynthesisSections(synthesis);
  
  return (
    <div className="space-y-4">
      {/* Agreement Section - Green */}
      {sections.agreement && (
        <div className="border-2 border-green-400 bg-green-50 rounded-xl p-6 shadow-sm">
          <h3 className="text-xl font-bold text-green-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">🤝</span>
            Areas of Agreement
          </h3>
          <div className="text-gray-800 whitespace-pre-wrap leading-relaxed">
            {sections.agreement}
          </div>
        </div>
      )}

      {/* Conflict Section - Orange */}
      {sections.conflict && (
        <div className="border-2 border-orange-400 bg-orange-50 rounded-xl p-6 shadow-sm">
          <h3 className="text-xl font-bold text-orange-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">⚔️</span>
            Areas of Conflict
          </h3>
          <div className="text-gray-800 whitespace-pre-wrap leading-relaxed">
            {sections.conflict}
          </div>
        </div>
      )}

      {/* Critical Points Section - Red */}
      {sections.critical && (
        <div className="border-2 border-red-400 bg-red-50 rounded-xl p-6 shadow-sm">
          <h3 className="text-xl font-bold text-red-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">⚠️</span>
            Critical Points & Red Flags
          </h3>
          <div className="text-gray-800 whitespace-pre-wrap leading-relaxed">
            {sections.critical}
          </div>
        </div>
      )}

      {/* Executive Summary Section - Blue */}
      {sections.summary && (
        <div className="border-2 border-blue-400 bg-blue-50 rounded-xl p-6 shadow-sm">
          <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">📊</span>
            Executive Summary & Recommendation
          </h3>
          <div className="text-gray-800 whitespace-pre-wrap leading-relaxed">
            {sections.summary}
          </div>
        </div>
      )}

      {/* Fallback: If parsing fails, show original */}
      {!sections.agreement && !sections.conflict && !sections.critical && !sections.summary && (
        <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-700 whitespace-pre-wrap">{synthesis}</p>
        </div>
      )}
    </div>
  );
}

// Helper function to parse synthesis into sections
function parseSynthesisSections(synthesis) {
  const sections = {
    agreement: null,
    conflict: null,
    critical: null,
    summary: null
  };

  // Split by section headers
  const agreementMatch = synthesis.match(/🤝 AREAS OF AGREEMENT([\s\S]*?)(?=⚔️ AREAS OF CONFLICT|$)/);
  const conflictMatch = synthesis.match(/⚔️ AREAS OF CONFLICT([\s\S]*?)(?=⚠️ CRITICAL POINTS|$)/);
  const criticalMatch = synthesis.match(/⚠️ CRITICAL POINTS[\s\S]*?RED FLAGS([\s\S]*?)(?=📊 EXECUTIVE SUMMARY|$)/);
  const summaryMatch = synthesis.match(/📊 EXECUTIVE SUMMARY[\s\S]*?RECOMMENDATION([\s\S]*?)$/);

  if (agreementMatch) sections.agreement = agreementMatch[1].trim();
  if (conflictMatch) sections.conflict = conflictMatch[1].trim();
  if (criticalMatch) sections.critical = criticalMatch[1].trim();
  if (summaryMatch) sections.summary = summaryMatch[1].trim();

  return sections;
}

export default function MCDashboard({ sessionId, session }) {
  const [submissions, setSubmissions] = useState([]);
  const [synthesis, setSynthesis] = useState('');
  const [isGeneratingSynthesis, setIsGeneratingSynthesis] = useState(false);
  const [synthesisReviews, setSynthesisReviews] = useState([]);
  const [finalDecisionNotes, setFinalDecisionNotes] = useState('');
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [error, setError] = useState(null);
  // NEW: Track session status internally
  const [sessionStatus, setSessionStatus] = useState(session?.status || 'active');

  
  // Modal state for viewing full analysis
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // NEW: Phase 1B - Revision modal state
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [revisionInstructions, setRevisionInstructions] = useState('');
  const [isRevising, setIsRevising] = useState(false);
  // NEW: Sync session status when prop changes
  useEffect(() => {
    if (session?.status) {
      console.log('🔄 Session status updated:', session.status);
      setSessionStatus(session.status);
    }
  }, [session?.status]);
  useEffect(() => {
    if (!sessionId) return;

    const sessionRef = doc(db, 'sessions', sessionId);
    const unsubscribe = onSnapshot(sessionRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setSubmissions(data.submissions || []);
        setSynthesisReviews(data.synthesisReviews || []);
        // NEW: Also set synthesis from session if it exists
        if (data.synthesis) {
          setSynthesis(data.synthesis);
        }
      }
    });

    return () => unsubscribe();
  }, [sessionId]);

  const handleFinalizeSession = async () => {
    console.log('🔍 FINALIZE CLICKED', { 
      sessionId, 
      session, 
      mcName: session?.mcName,
      finalNotes: finalDecisionNotes 
    });

    if (!window.confirm('⚠️ Are you sure? This will permanently lock the session.\n\nNo more synthesis iterations or feedback can be submitted.\n\nCollaborators can still view the final synthesis.')) {
      console.log('❌ User cancelled finalization');
      return;
    }
    
    console.log('✅ User confirmed, proceeding with finalization...');
    setIsFinalizing(true);
    
    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      console.log('📝 Session ref created:', sessionRef.id);
      
      const updateData = {
        status: 'finalized',
        finalizedAt: new Date().toISOString(),
        finalizedBy: session.mcName,
        finalDecision: finalDecisionNotes.trim() || null
      };
      console.log('📦 Sending update to Firebase:', updateData);
      
      await updateDoc(sessionRef, updateData);
      
      console.log('✅ Firebase updated successfully!');
      console.log('🔄 Updating localStorage status for:', sessionId);
      updateSessionStatus(sessionId, 'finalized');
      console.log('✅ localStorage update called');
      setSessionStatus('finalized');
      alert('✅ Decision finalized successfully!');
    } catch (error) {
      console.error('❌ FIREBASE ERROR:', error);
      console.error('❌ Error details:', error.message, error.code);
      alert('❌ Failed to finalize decision: ' + error.message);
    } finally {
      setIsFinalizing(false);
      console.log('🏁 Finalization process complete');
    }
  };

  const generateSynthesis = async () => {
    if (!submissions || submissions.length === 0) {
      setError('No submissions to synthesize yet.');
      return;
    }
    setIsGeneratingSynthesis(true);
    setError(null);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/generate-synthesis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analyses: submissions,
          topic: session.title,
          sessionId: sessionId
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

  // NEW: Phase 1B - Revise synthesis with feedback
  const reviseSynthesis = async () => {
    if (!synthesisReviews || synthesisReviews.length === 0) {
      setError('No feedback to incorporate yet.');
      return;
    }

    setIsRevising(true);
    setError(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/revise-synthesis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionId,
          originalSynthesis: synthesis,
          analyses: submissions,
          feedback: synthesisReviews,
          revisionInstructions: revisionInstructions,
          topic: session.title
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setSynthesis(data.response);
        setIsRevisionModalOpen(false);
        setRevisionInstructions('');
        console.log('✅ Revised synthesis received from backend');
      } else {
        throw new Error(data.error || 'Failed to revise synthesis');
      }
    } catch (err) {
      console.error('❌ Error revising synthesis:', err);
      setError(err.message || 'Failed to revise synthesis. Please try again.');
    } finally {
      setIsRevising(false);
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
            h1 { color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 10px; }
            .synthesis { white-space: pre-wrap; margin-top: 20px; }
          </style>
        </head>
        <body>
          <h1>${session.title}</h1>
          <div class="synthesis">${synthesis}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // NEW: Calculate feedback summary
  const feedbackSummary = {
    total: synthesisReviews.length,
    helpful: synthesisReviews.filter(r => r.rating === 'thumbs_up').length,
    needsWork: synthesisReviews.filter(r => r.rating === 'thumbs_down').length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{session.mcName}'s Dashboard</h1>
          <p className="text-gray-600">{session.title}</p>
          <div className="mt-4 flex items-center gap-4">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
              {submissions.length} submissions
            </span>
            {synthesisReviews.length > 0 && (
              <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold">
                {synthesisReviews.length} feedback received
              </span>
            )}
            {sessionStatus === 'finalized' && (
              <span className="px-3 py-1 bg-green-600 text-white rounded-full text-sm font-bold uppercase tracking-wide">
                ✓ Finalized
              </span>
            )}
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

        {/* Uploaded Documents Section */}
        {session.uploadedDocuments && session.uploadedDocuments.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              📄 Uploaded Documents
            </h2>
            <div className="space-y-3">
              {session.uploadedDocuments.map((doc, index) => (
                <a
                  key={index}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">
                      {doc.type === 'application/pdf' ? '📕' : '📘'}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{doc.name}</p>
                      <p className="text-xs text-gray-500">
                        {(doc.size / 1024).toFixed(1)} KB • Click to view
                      </p>
                    </div>
                  </div>
                  <span className="text-purple-600 text-xl">↗</span>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900">AI Synthesis</h2>
              {sessionStatus === 'finalized' && (
                <span className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-full uppercase tracking-wide">
                  ✓ FINAL
                </span>
              )}
            </div>
            
            {sessionStatus !== 'finalized' && (
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
            )}
          </div>

          {synthesis ? (
            <div>
              {/* Parse and display synthesis in colored boxes */}
              <SynthesisDisplay synthesis={synthesis} />

              {/* NEW: Phase 1B - Synthesis Feedback Section */}
             {synthesisReviews.length > 0 && (
                <div className="mt-6 p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-200">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                        💬 Collaborator Feedback
                      </h3>
                      <p className="text-sm text-gray-600">
                        {feedbackSummary.helpful} of {feedbackSummary.total} found it helpful
                        {feedbackSummary.helpful > 0 && ' 👍'}
                        {feedbackSummary.needsWork > 0 && ` • ${feedbackSummary.needsWork} suggested improvements 👎`}
                      </p>
                    </div>
                    <button
                      onClick={() => setIsRevisionModalOpen(true)}
                      className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors font-semibold text-sm"
                    >
                      🔄 Revise Synthesis
                    </button>
                  </div>

                  <div className="space-y-3">
                    {synthesisReviews.map((review, index) => (
                      <div 
                        key={index}
                        className={`p-4 rounded-lg border-2 ${
                          review.rating === 'thumbs_up' 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-orange-50 border-orange-200'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">
                              {review.rating === 'thumbs_up' ? '👍' : '👎'}
                            </span>
                            <div>
                              <p className="font-semibold text-gray-900">
                                {review.collaboratorName}
                              </p>
                              <p className="text-xs text-gray-600">
                                {review.role}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(review.timestamp).toLocaleString()}
                          </span>
                        </div>
                        {review.comment && (
                          <p className="text-sm text-gray-700 mt-2 pl-8">
                            "{review.comment}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Download Options */}
              <div className="flex flex-wrap gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 mt-6">
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

        {/* Finalize Decision Section */}
        {synthesis && sessionStatus !== 'finalized' && (
  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-lg p-8 mb-6 border-2 border-green-200">

    <div className="flex items-start gap-4 mb-4">
      <span className="text-4xl">🔒</span>
      
    </div>
            <div className="flex items-start gap-4 mb-4">
              <span className="text-4xl">🔒</span>
              <div>
                <h3 className="text-2xl font-bold text-green-900 mb-2">
                  Ready to Finalize Decision?
                </h3>
                <p className="text-sm text-green-800">
                  Finalizing will lock this session - no more synthesis iterations or feedback submissions. Collaborators can still view the final synthesis.
                </p>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-semibold text-green-900 mb-2">
                Final Decision Summary (Optional):
              </label>
              <textarea
                value={finalDecisionNotes}
                onChange={(e) => setFinalDecisionNotes(e.target.value)}
                placeholder="Add final decision summary, action items, or closing notes..."
                rows={4}
                className="w-full px-4 py-3 border-2 border-green-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            
            <button
              onClick={handleFinalizeSession}
              disabled={isFinalizing}
              className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
                isFinalizing
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl'
              }`}
            >
              {isFinalizing ? '⏳ Finalizing...' : '🔒 Finalize Decision'}
            </button>
          </div>
        )}

        {/* Finalized Status Display */}
        {sessionStatus === 'finalized' && (
  <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl shadow-lg p-8 mb-6 border-2 border-slate-600">
    <div className="flex items-start gap-4 mb-4">
      <span className="text-5xl">✅</span>
      <div>
        <h3 className="text-2xl font-bold text-white mb-2">
          Decision Finalized
        </h3>
        <p className="text-slate-300">
          Closed by {session?.finalizedBy || session?.mcName || 'MC'} on {session?.finalizedAt ? new Date(session.finalizedAt).toLocaleDateString() : 'just now'} at {session?.finalizedAt ? new Date(session.finalizedAt).toLocaleTimeString() : 'just now'}
        </p>
      </div>
    </div>
            
            {session.finalDecision && (
              <div className="bg-slate-900 rounded-lg p-6 mt-4">
                <p className="text-sm font-semibold text-slate-400 mb-3">Final Decision Summary:</p>
                <p className="text-slate-100 whitespace-pre-wrap leading-relaxed">{session.finalDecision}</p>
              </div>
            )}
          </div>
        )}

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

		{/* Collaborator Uploaded Documents Indicator */}
                {submission.uploadedDocuments && submission.uploadedDocuments.length > 0 && (
                  <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-xs font-semibold text-green-800">
                      📎 {submission.uploadedDocuments.length} supporting document{submission.uploadedDocuments.length > 1 ? 's' : ''} uploaded
                    </p>
                  </div>
                )}

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
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  {selectedSubmission.collaboratorName}'s Analysis
                </h2>
                <p className="text-purple-100 text-sm">
                  {selectedSubmission.role || 'Collaborator'} • Submitted {new Date(selectedSubmission.submittedAt).toLocaleString()}
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

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {selectedSubmission.customPrompt && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-semibold text-blue-900 mb-2">Custom Focus:</p>
                  <p className="text-gray-700">{selectedSubmission.customPrompt}</p>
                </div>
              )}

              <div className="prose max-w-none">
                <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {selectedSubmission.analysis}
                </p>
              </div>

              {/* Show Uploaded Documents */}
              {selectedSubmission.uploadedDocuments && selectedSubmission.uploadedDocuments.length > 0 && (
                <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm font-semibold text-green-900 mb-3">
                    📎 Supporting Documents ({selectedSubmission.uploadedDocuments.length})
                  </p>
                  <div className="space-y-2">
                    {selectedSubmission.uploadedDocuments.map((doc, idx) => (
                      <a
                        key={idx}
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 bg-white rounded-lg hover:bg-green-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xl">
                            {doc.type === 'application/pdf' ? '📕' : '📘'}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                            <p className="text-xs text-gray-500">
                              {(doc.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <span className="text-green-600">↗</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {selectedSubmission.iterations && selectedSubmission.iterations.length > 1 && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    📝 Iteration History ({selectedSubmission.iterations.length} versions)
                  </p>
                  <p className="text-xs text-gray-500">
                    This analysis was refined {selectedSubmission.iterations.length - 1} time(s)
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end border-t">
              <button
                onClick={closeModal}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW: Phase 1B - Revision Modal */}
      {isRevisionModalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setIsRevisionModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-2xl">
              <h2 className="text-2xl font-bold">Revise Synthesis</h2>
              <p className="text-indigo-100 text-sm mt-1">
                Add specific instructions for improving the synthesis
              </p>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Revision Instructions (Optional):
                </label>
                <textarea
                  value={revisionInstructions}
                  onChange={(e) => setRevisionInstructions(e.target.value)}
                  placeholder="e.g., 'Focus more on cost implications' or 'Add timeline recommendations'"
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div className="bg-indigo-50 p-4 rounded-lg mb-4">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">💡 Tip:</span> The synthesis will be revised based on all collaborator feedback. 
                  Add specific instructions here if you want to emphasize particular aspects.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setIsRevisionModalOpen(false)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={reviseSynthesis}
                  disabled={isRevising}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    isRevising
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'
                  }`}
                >
                  {isRevising ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Revising...
                    </span>
                  ) : (
                    '🔄 Generate Revised Synthesis'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}