import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

// Add this component after imports, before the main CollaboratorRoom export
function SynthesisReviewForm({ sessionId, collaboratorName, collaboratorRole, onReviewSubmitted }) {
  const [rating, setRating] = useState('');
const [comment, setComment] = useState('');
const [isSubmitting, setIsSubmitting] = useState(false);
const [error, setError] = useState('');

  const submitReview = async () => {
    if (!rating) {
      setError('Please select a rating');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      
      const review = {
        collaboratorName,
        role: collaboratorRole,
        rating,
        comment: comment.trim(),
        timestamp: new Date().toISOString()
      };

      await updateDoc(sessionRef, {
        synthesisReviews: arrayUnion(review)
      });

      onReviewSubmitted();
    } catch (err) {
      console.error('Error submitting review:', err);
      setError('Failed to submit review. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-slate-200 mb-3">
          Rate this synthesis:
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => setRating('thumbs_up')}
            className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
              rating === 'thumbs_up'
                ? 'bg-green-600 border-green-400 text-white'
                : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <span className="text-2xl">👍</span>
            <div className="text-sm font-semibold mt-1">Helpful</div>
          </button>
          <button
            onClick={() => setRating('thumbs_down')}
            className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
              rating === 'thumbs_down'
                ? 'bg-orange-600 border-orange-400 text-white'
                : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <span className="text-2xl">👎</span>
            <div className="text-sm font-semibold mt-1">Needs Work</div>
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-200 mb-2">
          Comments or Suggestions (optional):
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="e.g., Need more detail on timeline, or Please format as a comparison table"
          rows={3}
          className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {error && (
        <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      <button
        onClick={submitReview}
        disabled={!rating || isSubmitting}
        className={`w-full py-3 rounded-lg font-semibold transition-colors ${
          !rating || isSubmitting
            ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
            : 'bg-purple-600 text-white hover:bg-purple-700'
        }`}
      >
        {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
      </button>
    </div>
  );
}

export default function CollaboratorRoom({ sessionId }) {
  const [session, setSession] = useState(null);
  const [collaboratorName, setCollaboratorName] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [hasReviewed, setHasReviewed] = useState(false);
  const [showMyAnalysis, setShowMyAnalysis] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [iterations, setIterations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get role from URL
  const urlParams = new URLSearchParams(window.location.search);
  const role = urlParams.get('role');

 useEffect(() => {
  if (!sessionId) return;

  const sessionRef = doc(db, 'sessions', sessionId);
  
  // Real-time listener instead of one-time fetch
  const unsubscribe = onSnapshot(sessionRef, (docSnapshot) => {
    if (docSnapshot.exists()) {
      const sessionData = docSnapshot.data();
      setSession(sessionData);
      setLoading(false);
      
      // Debug logs
      console.log('🔄 Session updated:', {
        hasSynthesis: !!sessionData.synthesis,
        synthesisLength: sessionData.synthesis?.length || 0
      });
    } else {
      setError('Session not found');
      setLoading(false);
    }
  }, (err) => {
    console.error('Error listening to session:', err);
    setError('Failed to load session');
    setLoading(false);
  });

  // Cleanup listener when component unmounts
  return () => unsubscribe();
}, [sessionId]);

  const generateAnalysis = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      let prompt;
      
      if (customPrompt.trim()) {
        // User provided custom instructions
        prompt = `${customPrompt}\n\nTopic: ${session.title}`;
      } else {
        // Default analysis prompt
        prompt = `Provide a detailed analysis of: "${session.title}"

Please include:
1. Your interpretation of the topic
2. Key insights and observations
3. Critical questions or considerations
4. Potential implications or applications

Be thorough and structured in your response. Focus on insights only YOU can provide. Build upon the MC's analysis, don't repeat it.

STRICT LIMIT: 150-200 words maximum. Be ruthlessly concise.`;
      }

      console.log('📡 Calling backend for collaborator analysis...');

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/generate-collaborator-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          customPrompt: customPrompt.trim(),
          topic: session.title,
          mcAnalysis: session.aiAnalysis,
          context: session.context,
          uploadedDocuments: session.uploadedDocuments || [],
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setAnalysis(data.response);
        
        // Save iteration
        const newIteration = {
          prompt: customPrompt.trim(),
          analysis: data.response,
          timestamp: new Date().toISOString()
        };
        setIterations([...iterations, newIteration]);
        
        console.log('✅ Collaborator analysis received from backend');
      } else {
        throw new Error(data.error || 'Failed to generate analysis');
      }
    } catch (err) {
      console.error('❌ Error generating analysis:', err);
      setError(err.message || 'Failed to generate analysis. Please try again.');
      alert('Failed to generate analysis: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const submitToMainRoom = async () => {
    if (!collaboratorName.trim()) {
      alert('Please enter your name');
      return;
    }

    if (!analysis.trim()) {
      alert('Please generate an analysis first');
      return;
    }

    try {
      const submission = {
        role,
        collaboratorName: collaboratorName.trim(),
        customPrompt: customPrompt.trim(),
        analysis,
        iterations,
        submittedAt: new Date().toISOString()
      };

      const sessionRef = doc(db, 'sessions', sessionId);
      await updateDoc(sessionRef, {
        submissions: arrayUnion(submission)
      });

      setHasSubmitted(true);
      alert('✅ Successfully submitted!');

    } catch (error) {
      console.error('Submission error:', error);
      alert('Failed to submit. Check console for details.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Session Not Found</h2>
          <p className="text-gray-600">This session link may be invalid or expired.</p>
        </div>
      </div>
    );
  }

if (hasSubmitted) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Success Card */}
        <div className="bg-white rounded-lg shadow-xl p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-600 mb-4">
            Submission Complete!
          </h2>
          <p className="text-gray-600 mb-4">
            Your {role} analysis has been submitted.
          </p>
          <p className="text-sm text-gray-500">
            {session.mcName} can now view your contribution.
          </p>
        </div>

{/* Your Submitted Analysis - Collapsible */}
        <div className="bg-blue-50 rounded-lg shadow-md p-6 border-2 border-blue-200">
          <button
            onClick={() => setShowMyAnalysis(!showMyAnalysis)}
            className="w-full flex items-center justify-between text-left hover:bg-blue-100 p-2 rounded transition-colors"
          >
            <h3 className="text-lg font-bold text-blue-900">
              {showMyAnalysis ? '▼' : '▶'} Your Submitted Analysis ({role})
            </h3>
            <span className="text-sm text-blue-600 font-semibold">
              {showMyAnalysis ? 'Hide' : 'Show'}
            </span>
          </button>
          
          {showMyAnalysis && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-600 bg-white px-3 py-2 rounded">
                <span>Submitted by: <strong>{collaboratorName}</strong></span>
                <span>{new Date(session.submissions?.find(sub => sub.role === role)?.submittedAt).toLocaleString()}</span>
              </div>
              
              <div className="p-4 bg-white rounded-lg border border-blue-200 max-h-64 overflow-y-auto">
                <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                  {session.submissions?.find(sub => sub.role === role)?.analysis || analysis}
                </p>
              </div>
              
              {customPrompt && (
                <div className="p-3 bg-blue-100 rounded border border-blue-300">
                  <p className="text-xs font-semibold text-blue-900 mb-1">Your Custom Focus:</p>
                  <p className="text-xs text-blue-800">{customPrompt}</p>
                </div>
              )}
            </div>
          )}
        </div>        
{/* Synthesis Review Section */}
        {session?.synthesis && (
          <div className="bg-white rounded-lg shadow-xl p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              📊 Synthesis Ready for Your Review
            </h3>
            <p className="text-gray-600 mb-4">
              The session leader has generated a synthesis. Please review and provide feedback.
            </p>

            {/* Display Synthesis */}
            <div className="mb-6 p-6 bg-gray-50 rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
              <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                {session.synthesis}
              </p>
            </div>

            {/* Check if this collaborator already reviewed */}
            {session.synthesisReviews?.find(r => r.collaboratorName === collaboratorName) ? (
              <div className="p-4 bg-green-50 border border-green-300 rounded-lg">
                <p className="text-green-700 text-sm">
                  ✓ You've already provided feedback on this synthesis
                </p>
              </div>
            ) : (
              <SynthesisReviewForm 
                sessionId={sessionId}
                collaboratorName={collaboratorName}
                collaboratorRole={role}
                onReviewSubmitted={() => {
  // Do nothing - Firebase real-time listener will update automatically
}}
              />
            )}
          </div>
        )}

        {/* Helpful message if no synthesis yet */}
        {!session?.synthesis && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <p className="text-blue-800">
              📊 The session leader will generate a synthesis soon. 
              <br/>
              <span className="text-sm">Bookmark this page and check back later to review and provide feedback.</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Collaborator Room: {role}
            </h1>
            <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full font-semibold">
              {role}
            </span>
          </div>
          <p className="text-gray-600">{session.title}</p>
        </div>

        {/* Original Context */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            Original Context from {session.mcName} ({session.mcRole})
          </h2>
          <div className="prose max-w-none">
            <p className="text-gray-700 whitespace-pre-wrap">{session.context}</p>
          </div>
          
          {session.aiAnalysis && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-semibold text-blue-900 mb-2">{session.mcName}'s Initial Analysis ({session.mcRole}):</p>
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
            <p className="text-sm text-gray-600 mb-4">
              Review these documents before providing your analysis
            </p>
            <div className="space-y-3">
              {session.uploadedDocuments.map((doc, index) => (
                <a
                  key={index}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
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
                  <span className="text-blue-600 text-xl">↗</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Collaborator Input */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Your {role} Analysis
          </h2>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Name Input */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={collaboratorName}
              onChange={(e) => setCollaboratorName(e.target.value)}
              placeholder="e.g., Sarah Chen"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Custom Prompt */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Custom Focus Areas (Optional)
            </label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder={`As a ${role} expert, what specific aspects would you like the AI to focus on?\n\nExample: "Focus on Gen Z market, TikTok strategy, and influencer partnerships"`}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={generateAnalysis}
            disabled={isGenerating}
            className={`w-full py-3 rounded-lg font-semibold transition-colors mb-4 ${
              isGenerating
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
            }`}
          >
            {isGenerating ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating AI Analysis...
              </span>
            ) : iterations.length > 0 ? (
              '🔄 Regenerate Analysis'
            ) : (
              '✨ Generate AI Analysis'
            )}
          </button>

          {/* AI Analysis Display */}
          {analysis && (
            <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm font-semibold text-blue-900">AI Generated Analysis:</p>
                <span className="text-xs text-gray-600">
                  Version {iterations.length}
                </span>
              </div>
              <div className="prose max-w-none">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{analysis}</p>
              </div>
            </div>
          )}

          {/* Iteration History */}
          {iterations.length > 1 && (
            <div className="mt-4">
              <details className="bg-gray-50 rounded-lg p-3">
                <summary className="cursor-pointer text-sm font-semibold text-gray-700">
                  View Previous Versions ({iterations.length - 1})
                </summary>
                <div className="mt-3 space-y-3">
                  {iterations.slice(0, -1).reverse().map((iter, idx) => (
                    <div key={idx} className="p-3 bg-white rounded border border-gray-200">
                      <p className="text-xs text-gray-500 mb-2">
                        Version {iterations.length - 1 - idx}
                      </p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">
                        {iter.analysis}
                      </p>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <button
            onClick={submitToMainRoom}
            disabled={!analysis || !collaboratorName.trim()}
            className={`w-full py-4 rounded-lg font-bold text-lg transition-colors ${
              !analysis || !collaboratorName.trim()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-600 to-blue-600 text-white hover:from-green-700 hover:to-blue-700'
            }`}
          >
            📤 Submit your Analysis
          </button>
          <p className="text-xs text-gray-500 text-center mt-2">
            Once submitted, the {session.mcName} will be able to view your analysis
          </p>
        </div>
      </div>
    </div>
  );
}