import { useState, useEffect } from 'react';
import { db } from './firebase';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';

export default function CollaboratorRoom({ sessionId }) {
  const [session, setSession] = useState(null);
  const [collaboratorName, setCollaboratorName] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [iterations, setIterations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get role from URL
  const urlParams = new URLSearchParams(window.location.search);
  const role = urlParams.get('role');

  useEffect(() => {
    const loadSession = async () => {
      try {
        const sessionRef = doc(db, 'sessions', sessionId);
        const sessionSnap = await getDoc(sessionRef);
        
        if (sessionSnap.exists()) {
          setSession(sessionSnap.data());
        } else {
          console.error('Session not found');
        }
      } catch (error) {
        console.error('Error loading session:', error);
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      loadSession();
    }
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
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md text-center">
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