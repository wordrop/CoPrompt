import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, onSnapshot } from 'firebase/firestore';
import { db, storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [iterations, setIterations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get role from URL
  const urlParams = new URLSearchParams(window.location.search);
  const role = urlParams.get('role');
useEffect(() => {
    if (session && session.sessionType === 'risk' && role) {
      const roleLower = role.toLowerCase();
      const riskPrompts = {
        'operations': `As the Business / Operations owner, please address:

1. Root Cause: Not what happened — why did the conditions exist for it to happen? "Human error" is not a complete answer.
2. Your role in the event: When did you first become aware? What actions did you take?
3. Corrective Action (CAPA): What has been fixed immediately? What prevents recurrence? Who owns each action and by what date?
4. Process reality: Describe how the process actually operates — including any workarounds or manual interventions not in the documented procedure.`,

        'business': `As the Business / Operations owner, please address:

1. Root Cause: Not what happened — why did the conditions exist for it to happen? "Human error" is not a complete answer.
2. Your role in the event: When did you first become aware? What actions did you take?
3. Corrective Action (CAPA): What has been fixed immediately? What prevents recurrence? Who owns each action and by what date?
4. Process reality: Describe how the process actually operates — including any workarounds or manual interventions not in the documented procedure.`,

        'technology': `As the Technology / Cybersecurity owner, please address:

1. Change management: Was this integration reviewed by business, operations, and risk before deployment? Who approved it?
2. Access permissions: What exact permissions were granted? Who approved the scope?
3. Monitoring gap: Why did existing controls not detect the anomaly within the expected window?
4. Remediation: What technical fixes have been implemented and what remains outstanding?`,

        'tech': `As the Technology / Cybersecurity owner, please address:

1. Change management: Was this integration reviewed by business, operations, and risk before deployment? Who approved it?
2. Access permissions: What exact permissions were granted? Who approved the scope?
3. Monitoring gap: Why did existing controls not detect the anomaly within the expected window?
4. Remediation: What technical fixes have been implemented and what remains outstanding?`,

        'compliance': `As the Compliance / Legal owner, please address:

1. Policy assessment: Was the relevant policy adequate? If there was a gap, was it previously known or flagged?
2. Oversight: What oversight mechanism should have identified this risk earlier? Why didn't it?
3. Regulatory obligations: What notification requirements apply? What decisions have been made on timing?
4. Recommended next steps from a compliance and legal perspective.`,

        'legal': `As the Compliance / Legal owner, please address:

1. Policy assessment: Was the relevant policy adequate? If there was a gap, was it previously known or flagged?
2. Oversight: What oversight mechanism should have identified this risk earlier? Why didn't it?
3. Regulatory obligations: What notification requirements apply? What decisions have been made on timing?
4. Recommended next steps from a compliance and legal perspective.`,

        'vendor': `As the Vendor Management owner, please address:

1. Due diligence: What assessments were conducted before this vendor was onboarded? What did they find?
2. Access scope: Were the data access permissions granted appropriate for the stated purpose?
3. Ongoing monitoring: What vendor monitoring was in place after onboarding?
4. Contract terms: What do the contract terms say about data access, security obligations, and breach notification?`,

        'controls': `As the Controls / 1LOD Controls owner, please address:

1. Control design: Were controls designed to detect or prevent this type of event? If yes, why did they fail?
2. Monitoring: What monitoring activities were in place and what did they show?
3. Shared ownership: Controls are part of the business — where did your team's oversight break down?
4. Remediation: What control fixes are required, who owns them, and by when?`,

        '1lod': `As the Controls / 1LOD Controls owner, please address:

1. Control design: Were controls designed to detect or prevent this type of event? If yes, why did they fail?
2. Monitoring: What monitoring activities were in place and what did they show?
3. Shared ownership: Controls are part of the business — where did your team's oversight break down?
4. Remediation: What control fixes are required, who owns them, and by when?`,
      };

      if (riskPrompts[roleLower]) {
        setCustomPrompt(riskPrompts[roleLower]);
      }
    }
  }, [session, role]);

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

const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;
    
    // Validate file types
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    const invalidFiles = files.filter(file => !allowedTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      alert('Only PDF and DOCX files are allowed');
      return;
    }
    
    // Validate file size (max 10MB per file)
    const oversizedFiles = files.filter(file => file.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      alert('Files must be under 10MB each');
      return;
    }
    
    setIsUploadingFiles(true);
    
    try {
      const uploadedFileData = [];
      
      for (const file of files) {
        // Create unique filename
        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.name}`;
        const storageRef = ref(storage, `session-documents/${fileName}`);
        
        // Upload file
        await uploadBytes(storageRef, file);
        
        // Get download URL
        const downloadURL = await getDownloadURL(storageRef);
        
        uploadedFileData.push({
          name: file.name,
          url: downloadURL,
          type: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString()
        });
      }
      
      setUploadedFiles([...uploadedFiles, ...uploadedFileData]);
      alert(`Successfully uploaded ${files.length} file(s)!`);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload files. Please try again.');
    } finally {
      setIsUploadingFiles(false);
    }
  };

  const removeFile = (index) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const generateAnalysis = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      let prompt;
      
      if (customPrompt.trim()) {
        // User provided custom instructions
        prompt = `You are an expert [${selectedRole || 'advisor'}] analyzing: "${session.title}"

${customPrompt}

INSTRUCTIONS:
- Maximum 200 words
- Use bullet points
- Be specific and actionable
- Focus on insights requiring your expertise

Build on MC's analysis - add NEW perspective, don't repeat existing points.`;
      } else {
        // Default analysis prompt
        prompt = `You are an expert [${selectedRole || 'advisor'}] analyzing: "${session.title}"

CRITICAL INSTRUCTIONS:
- Maximum 200 words total
- Use bullet points for ALL insights
- Be pointed and specific, avoid generalities
- Focus on NON-OBVIOUS insights that require your expertise
- Reference relevant data, benchmarks, or best practices when applicable

Provide 3-5 key insights:

**PRIMARY RECOMMENDATION:**
- [One clear recommendation with rationale - 1-2 sentences]

**CRITICAL CONSIDERATIONS:**
- [Key risk, opportunity, or trade-off - 1 sentence]
- [Non-obvious factor others might miss - 1 sentence]

**ACTION-ORIENTED CONCLUSION:**
- [Specific next step or decision criterion - 1 sentence]

Build on MC's analysis - add NEW perspective, don't repeat existing points.`;
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
          uploadedDocuments: [...(session.uploadedDocuments || []), ...uploadedFiles],
          sessionType: session.sessionType || 'general',
          collaboratorRole: role || 'general',
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
        uploadedDocuments: uploadedFiles,
        submittedAt: new Date().toISOString()
      };

      const sessionRef = doc(db, 'sessions', sessionId);
      await updateDoc(sessionRef, {
        submissions: arrayUnion(submission)
      });

      setHasSubmitted(true);
      alert('✅ Successfully submitted!');

    } catch (err) {
      console.error('Submit error:', err);
      alert('Failed to submit. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">

        <div className="text-white text-xl">Loading session...</div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">{error || 'Session not found'}</div>
      </div>
    );
  }

  if (hasSubmitted) {
 return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Navigation Bar */}
        <nav className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-700 text-white p-4">
          <div className="max-w-4xl mx-auto">
            <a 
              href="/?create=true" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-xl font-bold hover:text-purple-300 transition-colors cursor-pointer"
            >
              ✨ CoPrompt
            </a>
          </div>
        </nav>

        <div className="max-w-4xl mx-auto py-8 px-6">
        
        {/* Finalized Status Banner - Show if session is finalized */}
        {session.status === 'finalized' && (
          <div className="space-y-6 mb-8">
            {/* Finalization Notice */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl shadow-2xl p-8 border-2 border-green-400">
              <div className="flex items-start gap-4">
                <span className="text-6xl">🎉</span>
                <div>
                  <h2 className="text-3xl font-bold text-white mb-3">
                    Decision Finalized
                  </h2>
                  <p className="text-green-100 text-lg">
                    This decision has been closed by {session.mcName} on {new Date(session.finalizedAt).toLocaleDateString()}.
                  </p>
                  {session.finalDecision && (
                    <div className="mt-4 p-4 bg-green-900/30 rounded-lg border border-green-400">
                      <p className="text-sm font-semibold text-green-200 mb-2">Final Notes from MC:</p>
                      <p className="text-white whitespace-pre-wrap">{session.finalDecision}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* CTA - Only After Finalization */}
            <div className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-purple-700 rounded-xl p-8 text-center">
              <h4 className="text-2xl font-bold text-white mb-3">
                Want to lead your own collaborative projects?
              </h4>
              <p className="text-slate-300 mb-6">
                Experience the power of AI-facilitated collaboration from the organizer's perspective.
              </p>
              <a
                href="/?create=true"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-bold text-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
              >
                🚀 Start Your Own Session
              </a>
            </div>
          </div>
        )}

        {/* Submission Confirmation - Show if NOT finalized yet */}
        {session.status !== 'finalized' && (
          <div className="space-y-6">
            {/* Success Message */}
            <div className="bg-white rounded-lg shadow-xl p-8 text-center">
              <div className="text-6xl mb-4">✅</div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Thank you, {collaboratorName}!
              </h1>
              <p className="text-lg text-gray-600 mb-6">
                Your {role} analysis has been successfully submitted.
              </p>
              <p className="text-gray-500">
                {session.mcName} will now be able to view your contribution in their dashboard.
              </p>
            </div>

            {/* CTA for Collaborators to Start Their Own */}
            <div className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-purple-700 rounded-xl p-8 text-center">
              <h4 className="text-2xl font-bold text-white mb-3">
                Want to lead your own collaborative projects?
              </h4>
              <p className="text-slate-300 mb-6">
                Experience the power of AI-facilitated collaboration from the organizer's perspective.
              </p>
              <a
                href="/?create=true"
                className="inline-block px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-bold text-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
              >
                🚀 Start Your Own Session
              </a>
            </div>
          </div>
        )}

        {/* Always show: Your Analysis */}
        <div className="bg-white rounded-lg shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            📝 Your Analysis
          </h2>
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{analysis}</p>
          </div>
        </div>

        {/* Always show: MC's Analysis */}
        {session.aiAnalysis && session.sessionType !== 'performance' && (
          <div className="bg-white rounded-lg shadow-xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              🎯 MC's Initial Analysis
            </h2>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{session.aiAnalysis}</p>
            </div>
          </div>
        )}

        {/* Synthesis Section - Show if exists */}
        {session.synthesis && (
          <div className="border-t pt-8">
            <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 rounded-lg shadow-xl p-8 mb-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                      📊 Final Synthesis
                    </h2>
                    {session.status === 'finalized' && (
                      <span className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-full uppercase tracking-wide">
                        ✓ FINAL
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 text-sm mt-1">
                    {session.status === 'finalized' 
                      ? 'This is the final decision synthesis'
                      : 'Generated from all expert analyses'}
                  </p>
                </div>
                {session.synthesisGeneratedAt && (
                  <span className="text-xs text-slate-500">
                    {new Date(session.synthesisGeneratedAt).toLocaleString()}
                  </span>
                )}
              </div>

              {/* Synthesis Content */}
              <div className="prose prose-invert max-w-none">
                <div 
                  className="text-slate-200 leading-relaxed whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ 
                    __html: session.synthesis
                      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-purple-300 font-bold">$1</strong>')
                      .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold text-purple-400 mt-8 mb-4 border-b border-purple-800 pb-2">$1</h2>')
                      .replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold text-purple-300 mt-6 mb-3">$1</h3>')
                      .replace(/^- (.*$)/gim, '<li class="ml-4 mb-2">$1</li>')
                      .replace(/\n\n/g, '</p><p class="mb-4">')
                  }}
                />
              </div>
            </div>

            {/* Synthesis Feedback Form - Only show if NOT finalized */}
            {!hasReviewed && session.status !== 'finalized' && (
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg shadow-xl p-6 border border-slate-700">
                <h3 className="text-xl font-bold text-slate-200 mb-4">
                  💬 Provide Feedback on Synthesis
                </h3>
                <p className="text-sm text-slate-400 mb-4">
                  Help improve the synthesis quality by sharing your thoughts
                </p>
                <SynthesisReviewForm
                  sessionId={sessionId}
                  collaboratorName={collaboratorName}
                  collaboratorRole={role}
                  onReviewSubmitted={() => setHasReviewed(true)}
                />
              </div>
            )}

            {hasReviewed && session.status !== 'finalized' && (
              <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 text-center">
                <p className="text-green-300 font-semibold">
                  ✅ Thank you for your feedback!
                </p>
              </div>
            )}

            {session.status === 'finalized' && (
              <div className="bg-slate-800 border border-slate-600 rounded-lg p-4 text-center">
                <p className="text-slate-300">
                  This decision has been finalized. No further feedback can be submitted.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

  const selectedRole = role || 'Advisor';

return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Navigation Bar */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 p-4">
        <div className="max-w-4xl mx-auto">
          <a 
            href="/?create=true" 
            target="_blank"
            rel="noopener noreferrer"
            className="text-xl font-bold text-gray-900 hover:text-purple-600 transition-colors cursor-pointer"
          >
            ✨ CoPrompt
          </a>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto py-8 px-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {session.title}
              </h1>
              <p className="text-gray-600 mt-1">
                You are participating as: <span className="font-semibold text-blue-600">{selectedRole}</span>
              </p>
            </div>
            <div className="text-sm text-gray-500">
              MC: {session.mcName}
            </div>
          </div>
        </div>

        {/* MC Context */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            📋 Decision Context
          </h2>
          <p className="text-gray-700 whitespace-pre-wrap">{session.context}</p>
          
          {/* MC's AI Analysis */}
          {session.aiAnalysis && session.sessionType !== 'performance' && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-semibold text-blue-900 mb-2">MC's Initial AI Analysis:</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{session.aiAnalysis}</p>
            </div>
          )}
        </div>
{/* Collaborator Guidance - module specific */}
        {session.sessionType === 'performance' && (
          <div className="bg-amber-50 rounded-lg shadow-md p-6 mb-6 border border-amber-200">
            <h2 className="text-xl font-bold text-amber-900 mb-4">
              📝 Reviewer Guidance
            </h2>
            <p className="text-sm text-amber-800 mb-4">
              Your role: You've worked directly with this person. Your observations are independent and valuable — you won't see the line manager's assessment before submitting yours.
            </p>
            <p className="text-sm font-semibold text-amber-900 mb-2">Three things to address in your input:</p>
            <div className="space-y-3 text-sm text-amber-800">
              <div>
                <p className="font-semibold">1. Your direct observations</p>
                <p>What did you personally see? Focus on specific situations, behaviours, and outcomes — not general impressions. "In the Q3 project, she..." is more useful than "she's a good collaborator."</p>
              </div>
              <div>
                <p className="font-semibold">2. Validate or challenge the self-rating</p>
                <p>Read their self-assessment. Do you agree with how they've rated themselves? Are they underselling a strength? Overlooking a real gap? Say so specifically.</p>
              </div>
              <div>
                <p className="font-semibold">3. One development priority from your vantage point</p>
                <p>Based on what you've observed, what's the one thing that would most increase their effectiveness?</p>
              </div>
            </div>
          </div>
        )}

        {session.sessionType === 'risk' && (
          <div className="bg-red-50 rounded-lg shadow-md p-6 mb-6 border border-red-200">
            <h2 className="text-xl font-bold text-red-900 mb-4">
              ⚠️ Risk Owner Guidance
            </h2>
            <p className="text-sm text-red-800 mb-4">
              Your role: You own or operate in the area where this risk lives. Your ground-level insight is what the Risk Officer needs — not a defence of your function, but an honest account of what you know.
            </p>
            <p className="text-sm font-semibold text-red-900 mb-2">Three things to address in your input:</p>
            <div className="space-y-3 text-sm text-red-800">
              <div>
                <p className="font-semibold">1. Your direct observations</p>
                <p>What have you personally seen or experienced related to this risk? Specific incidents, near-misses, or control failures are all valuable.</p>
              </div>
              <div>
                <p className="font-semibold">2. Validate or challenge the risk assessment</p>
                <p>Do you agree with the likelihood and impact ratings? You have operational context the assessment may be missing — use it.</p>
              </div>
              <div>
                <p className="font-semibold">3. One control gap from your vantage point</p>
                <p>What's the most important control that's missing, weak, or not working as designed?</p>
              </div>
            </div>
          </div>
        )}
        {/* MC's Uploaded Documents */}
        {session.uploadedDocuments && session.uploadedDocuments.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              📎 Reference Documents (from MC)
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              These documents provide additional context for your analysis
            </p>
            <div className="space-y-3">
              {session.uploadedDocuments.map((doc, index) => (
                <a
                  key={index}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">
                      {doc.type === 'application/pdf' ? '📕' : 
                       doc.type.includes('spreadsheet') || doc.type.includes('excel') ? '📊' : '📘'}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700">
                        {doc.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(doc.size / 1024).toFixed(1)} KB
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

          {/* Document Upload Section */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Upload Supporting Documents (Optional)
            </label>
            <p className="text-xs text-gray-600 mb-3">
              Add reference materials (frameworks, models, reports, etc.). Max 10MB per file.
              <br/>
              <span className="text-orange-600">💡 Tip: DOCX and XLSX files work best. Scanned PDFs may not extract properly.</span>
            </p>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 hover:border-blue-400 transition-colors">
              <input
                type="file"
                multiple
                accept=".pdf,.docx,.doc,.xlsx,.xls"
                onChange={handleFileUpload}
                disabled={isUploadingFiles}
                className="hidden"
                id="collaborator-file-upload"
              />
              <label
                htmlFor="collaborator-file-upload"
                className={`flex flex-col items-center justify-center cursor-pointer ${
                  isUploadingFiles ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <div className="text-4xl mb-2">📎</div>
                <p className="text-gray-700 font-medium mb-1">
                  {isUploadingFiles ? 'Uploading...' : 'Click to upload documents'}
                </p>
                <p className="text-xs text-gray-500">
                  PDF, DOCX, or XLSX files
                </p>
              </label>
            </div>

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-sm font-semibold text-gray-700">
                  Uploaded Files ({uploadedFiles.length}):
                </p>
                {uploadedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-300"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {file.type === 'application/pdf' ? '📕' : 
                         file.type.includes('spreadsheet') || file.type.includes('excel') ? '📊' : '📘'}
                      </span>
                      <div>
                        <p className="text-sm text-gray-900 font-medium">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700 transition-colors text-xl font-bold"
                      title="Remove file"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
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
            Once submitted, {session.mcName} will be able to view your analysis
          </p>
        </div>
      </div>
    </div>
  );
}