import React, { useState, useEffect } from 'react';
import { Users, GitBranch, Sparkles, ArrowRight, Lock, Eye, CheckCircle2, AlertTriangle, TrendingUp, Upload, FileText, RefreshCw } from 'lucide-react';

// Firebase imports
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';
import { createSession, getSession, addParticipant, subscribeToSession, submitAnalysis } from './sessionManager';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function App() {
  // Detect mode from URL
  const urlParams = new URLSearchParams(window.location.search);
  const sessionIdFromUrl = urlParams.get('session');
  const roleFromUrl = urlParams.get('role');
  
  const [userMode, setUserMode] = useState(roleFromUrl ? 'collaborator' : 'mc'); // 'mc' or 'collaborator'
  const [currentRole, setCurrentRole] = useState(roleFromUrl || null);

  // MC States
  const [phase, setPhase] = useState('input');
  const [mainPrompt, setMainPrompt] = useState('');
  const [mainResponse, setMainResponse] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomResponses, setRoomResponses] = useState({});
  const [completedRooms, setCompletedRooms] = useState([]);
  const [invitedParticipants, setInvitedParticipants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [synthesisOutput, setSynthesisOutput] = useState(null);
  const [error, setError] = useState('');

  // Session management
  const [sessionId, setSessionId] = useState(sessionIdFromUrl || null);
  const [sessionData, setSessionData] = useState(null);
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [sessionName, setSessionName] = useState('');

  // Collaborator States
  const [collaboratorName, setCollaboratorName] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [analysisVersions, setAnalysisVersions] = useState([]);
  const [currentAnalysis, setCurrentAnalysis] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const rooms = [
    { 
      id: 'marketing', 
      name: 'Marketing Strategy', 
      icon: '📊',
      defaultFocus: [
        'Target market analysis (TAM/SAM/SOM)',
        'Go-to-market strategy and channels',
        'Customer acquisition cost and lifetime value',
        'Competitive positioning'
      ],
      systemPrompt: 'You are a marketing strategist analyzing business opportunities.'
    },
    { 
      id: 'risk', 
      name: 'Risk & Compliance', 
      icon: '⚖️',
      defaultFocus: [
        'Regulatory compliance requirements',
        'Legal and liability risks',
        'Data privacy and security concerns',
        'Risk mitigation strategies'
      ],
      systemPrompt: 'You are a risk officer evaluating potential risks.'
    },
    { 
      id: 'tech', 
      name: 'Technical Architecture', 
      icon: '⚙️',
      defaultFocus: [
        'Technology stack recommendations',
        'System architecture and scalability',
        'Integration requirements',
        'Development timeline'
      ],
      systemPrompt: 'You are a technical architect designing systems.'
    },
    { 
      id: 'finance', 
      name: 'Financial Model', 
      icon: '💰',
      defaultFocus: [
        'Revenue model and pricing',
        'Cost structure and projections',
        'Break-even analysis',
        'Unit economics (CAC/LTV)'
      ],
      systemPrompt: 'You are a financial analyst creating financial models.'
    },
    { 
      id: 'legal', 
      name: 'Legal Affairs', 
      icon: '⚖️',
      defaultFocus: [
        'Intellectual property strategy',
        'Required contracts',
        'Litigation risks',
        'Regulatory compliance'
      ],
      systemPrompt: 'You are legal counsel assessing legal requirements.'
    },
    { 
      id: 'operations', 
      name: 'Operations', 
      icon: '🔧',
      defaultFocus: [
        'Operational infrastructure',
        'Customer support strategy',
        'Scaling plans',
        'Process automation'
      ],
      systemPrompt: 'You are an operations manager planning operational readiness.'
    }
  ];

  // Load session data if URL has sessionId
  useEffect(() => {
    if (sessionIdFromUrl) {
      loadSession(sessionIdFromUrl);
    }
  }, [sessionIdFromUrl]);

  const loadSession = async (sessionId) => {
    try {
      const data = await getSession(sessionId);
      setSessionData(data);
      setMainPrompt(data.mainPrompt);
      setMainResponse(data.mainResponse);
      setSessionName(data.name);
      
      if (roleFromUrl) {
        // Collaborator view
        setUserMode('collaborator');
        setCurrentRole(roleFromUrl);
        
        // Load their existing analysis if any
        if (data.analyses && data.analyses[roleFromUrl]) {
          setCurrentAnalysis(data.analyses[roleFromUrl].analysis);
          setIsSubmitted(data.analyses[roleFromUrl].status === 'submitted');
        }
      } else {
        // MC view - load session state
        setPhase('review');
      }
    } catch (err) {
      setError('Session not found');
    }
  };

  const callClaude = async (prompt, systemPrompt = '', retries = 3) => {
    let lastError;
    
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(`${API_URL}/api/claude`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, systemPrompt })
        });

        if (!response.ok) {
          const errorData = await response.json();
          
          if (response.status === 529 && i < retries - 1) {
            console.log(`⏳ API overloaded, retrying in ${(i + 1) * 2}s...`);
            await new Promise(resolve => setTimeout(resolve, (i + 1) * 2000));
            lastError = new Error(errorData.error || 'API overloaded');
          } else {
            throw new Error(errorData.error || 'API call failed');
          }
        } else {
          const data = await response.json();
          return data.response;
        }
      } catch (err) {
        lastError = err;
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, (i + 1) * 2000));
        }
      }
    }
    
    throw lastError;
  };

  const handleMainPrompt = async () => {
    setLoading(true);
    setError('');
    try {
      if (!ownerName.trim() || !ownerEmail.trim() || !sessionName.trim()) {
        setError('Please provide your name, email, and session name');
        setLoading(false);
        return;
      }

      const response = await callClaude(
        mainPrompt,
        'You are a strategic advisor analyzing a product or business idea. Provide a comprehensive initial analysis covering: key features, main challenges, target market, and monetization opportunities. Be detailed but concise (300-400 words).'
      );
      
      setMainResponse(response);

      const newSessionId = await createSession({
        ownerName,
        ownerEmail,
        sessionName,
        mainPrompt,
        mainResponse: response
      });

      setSessionId(newSessionId);
      console.log('✅ Session created:', newSessionId);
      
      setPhase('invite');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCollaboratorAnalysis = async () => {
    setLoading(true);
    setError('');
    try {
      const room = rooms.find(r => r.id === currentRole);
      
      // Build the full prompt with context
      const fullPrompt = `
Original Context from Product Owner:
${mainResponse}

Your Role: ${room.name}

Your Custom Instructions:
${customPrompt}

${uploadedDocs.length > 0 ? `\nReference Documents: ${uploadedDocs.map(d => d.name).join(', ')}` : ''}

Please provide a detailed ${room.name} analysis based on the above context and instructions. Include specific recommendations, numbers where relevant, and actionable insights (300-500 words).
      `.trim();

      const analysis = await callClaude(fullPrompt, room.systemPrompt);
      
      setCurrentAnalysis(analysis);
      setAnalysisVersions([...analysisVersions, {
        version: analysisVersions.length + 1,
        prompt: customPrompt,
        analysis: analysis,
        timestamp: new Date().toISOString()
      }]);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnalysis = async () => {
    if (!currentAnalysis.trim()) {
      setError('Please generate an analysis before submitting');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await submitAnalysis(sessionId, currentRole, {
        userId: collaboratorName,
        type: 'ai',
        customPrompt: customPrompt,
        documents: uploadedDocs,
        analysis: currentAnalysis,
        versions: analysisVersions
      });

      setIsSubmitted(true);
      alert('✅ Analysis submitted successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleParticipant = (roomId) => {
    if (invitedParticipants.includes(roomId)) {
      setInvitedParticipants(invitedParticipants.filter(id => id !== roomId));
    } else {
      setInvitedParticipants([...invitedParticipants, roomId]);
    }
  };

  const copyInviteLink = (roomId) => {
    const link = `${window.location.origin}?session=${sessionId}&role=${roomId}`;
    navigator.clipboard.writeText(link);
    alert(`✅ Invite link copied for ${rooms.find(r => r.id === roomId)?.name}!\n\nShare this link with your collaborator.`);
  };

  // COLLABORATOR VIEW
  if (userMode === 'collaborator' && currentRole) {
    const room = rooms.find(r => r.id === currentRole);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-3 rounded-xl shadow-lg shadow-violet-500/50">
                <span className="text-3xl">{room?.icon}</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                  {room?.name}
                </h1>
                <p className="text-slate-400 text-sm">Session: {sessionName}</p>
              </div>
            </div>
            
            {isSubmitted && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-sm text-green-400">Your analysis has been submitted</span>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-400">Error</p>
                <p className="text-sm text-red-300">{error}</p>
              </div>
            </div>
          )}

          {/* Collaborator Name Input (if not set) */}
          {!collaboratorName && (
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-8 mb-6">
              <h2 className="text-xl font-bold mb-4">Welcome! Please introduce yourself</h2>
              <input
                type="text"
                value={collaboratorName}
                onChange={(e) => setCollaboratorName(e.target.value)}
                placeholder="Enter your name"
                className="w-full bg-slate-900/50 border border-slate-600 rounded-lg p-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:outline-none mb-4"
              />
              <button
                onClick={() => collaboratorName.trim() && setCollaboratorName(collaboratorName)}
                disabled={!collaboratorName.trim()}
                className="bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-3 rounded-lg font-medium hover:shadow-lg hover:shadow-violet-500/50 transition-all disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          )}

          {collaboratorName && (
            <>
              {/* Original Context */}
              <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 mb-6">
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  Original Context (from Product Owner)
                </h3>
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-600">
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{mainResponse}</p>
                </div>
              </div>

              {/* Your Role & Focus */}
              <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 mb-6">
                <h3 className="text-lg font-bold mb-3">Your Role & Focus Areas</h3>
                <div className="bg-violet-500/10 border border-violet-500/30 rounded-lg p-4 mb-3">
                  <p className="font-medium text-violet-300 mb-2">{room?.name}</p>
                  <ul className="text-sm text-slate-300 space-y-1">
                    {room?.defaultFocus.map((focus, idx) => (
                      <li key={idx}>• {focus}</li>
                    ))}
                  </ul>
                </div>
                <p className="text-xs text-slate-400">You can customize your analysis with your own prompt below</p>
              </div>

              {/* Custom Prompt */}
              <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 mb-6">
                <h3 className="text-lg font-bold mb-3">Your Custom Analysis Prompt</h3>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder={`Example: Focus on Gen Z market (18-25). Analyze social media strategy, particularly TikTok and Instagram. Budget constraint: $50K for first 6 months. Include influencer partnership recommendations.`}
                  disabled={isSubmitted}
                  className="w-full h-32 bg-slate-900/50 border border-slate-600 rounded-lg p-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:outline-none disabled:opacity-50"
                />
              </div>

              {/* Document Upload */}
              <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 mb-6">
                <h3 className="text-lg font-bold mb-3">Upload Reference Documents (Optional)</h3>
                <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-sm text-slate-400 mb-2">Drag files here or click to upload</p>
                  <p className="text-xs text-slate-500">PDF, Word, Excel files supported</p>
                  <button
                    disabled={isSubmitted}
                    className="mt-3 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-50"
                  >
                    Choose Files
                  </button>
                </div>
                {uploadedDocs.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {uploadedDocs.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-900/50 rounded p-2">
                        <span className="text-sm">{doc.name}</span>
                        <button className="text-red-400 text-sm">Remove</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Generate / Regenerate */}
              {!isSubmitted && (
                <div className="mb-6">
                  <button
                    onClick={handleCollaboratorAnalysis}
                    disabled={!customPrompt.trim() || loading}
                    className="w-full bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-4 rounded-lg font-medium hover:shadow-lg hover:shadow-violet-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Generating Analysis...
                      </>
                    ) : (
                      <>
                        {currentAnalysis ? <RefreshCw className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                        {currentAnalysis ? 'Regenerate Analysis' : 'Generate AI Analysis'}
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Analysis Output */}
              {currentAnalysis && (
                <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-violet-400" />
                      Your Analysis
                      {analysisVersions.length > 0 && (
                        <span className="text-sm text-slate-400">(v{analysisVersions.length})</span>
                      )}
                    </h3>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-6 border border-violet-500/20">
                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{currentAnalysis}</p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              {currentAnalysis && !isSubmitted && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-blue-300 mb-1">Ready to submit?</h3>
                      <p className="text-sm text-slate-400">Once submitted, you won't be able to edit this analysis</p>
                    </div>
                    <button
                      onClick={handleSubmitAnalysis}
                      disabled={loading}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-3 rounded-lg font-medium hover:shadow-lg hover:shadow-green-500/50 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      Submit to Main Room
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // MC VIEW (continues with existing MC code...)
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-3 rounded-xl shadow-lg shadow-violet-500/50">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">CoPrompt</h1>
              <p className="text-slate-400 text-sm">AI-Powered Collaborative Decision Making</p>
            </div>
          </div>

          {phase !== 'input' && (
            <div className="flex items-center gap-2 bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700">
              <div className={`w-2 h-2 rounded-full ${phase === 'review' ? 'bg-blue-500 animate-pulse' : 'bg-slate-600'}`} />
              <span className="text-sm">Review</span>
              <ArrowRight className="w-4 h-4 text-slate-500" />
              <div className={`w-2 h-2 rounded-full ${phase === 'invite' ? 'bg-orange-500 animate-pulse' : 'bg-slate-600'}`} />
              <span className="text-sm">Invite</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto mb-6">
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-400">Error</p>
              <p className="text-sm text-red-300">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {phase === 'input' && (
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Create New Session</h2>
              <p className="text-slate-400">Start a collaborative decision-making session</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Session Name</label>
                <input
                  type="text"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="e.g., Fitness App Strategy Review"
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg p-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Your Name</label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Alex Rodriguez"
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-lg p-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Your Email</label>
                  <input
                    type="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="alex@company.com"
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-lg p-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Your Product Idea or Strategic Question</label>
                <textarea
                  value={mainPrompt}
                  onChange={(e) => setMainPrompt(e.target.value)}
                  placeholder="Example: Build an AI-powered meal planning app for diabetics..."
                  className="w-full h-32 bg-slate-900/50 border border-slate-600 rounded-lg p-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-400 bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                <Sparkles className="w-4 h-4 text-green-400" />
                <span>Live Mode: Real Claude API responses • Session will be saved to Firebase</span>
              </div>

              <button
                onClick={handleMainPrompt}
                disabled={!mainPrompt.trim() || !ownerName.trim() || !ownerEmail.trim() || !sessionName.trim() || loading}
                className="bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-3 rounded-lg font-medium hover:shadow-lg hover:shadow-violet-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating Session...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Create Session & Generate Analysis
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {phase === 'invite' && (
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Invite Collaborators</h2>
              <p className="text-slate-400">Select domain experts and get their invite links</p>
            </div>

            {/* Session Info */}
            <div className="bg-slate-900/50 rounded-lg p-4 mb-6 border border-slate-600">
              <div className="flex items-start gap-3">
                <div className="bg-violet-500/20 p-2 rounded-lg">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-300 mb-2">Session: {sessionName}</p>
                  <p className="text-xs text-slate-400 mb-2">They'll see this context:</p>
                  <p className="text-xs text-slate-500 line-clamp-2">{mainResponse}</p>
                </div>
              </div>
            </div>

            {/* Select Collaborators */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {rooms.map(room => (
                <button
                  key={room.id}
                  onClick={() => toggleParticipant(room.id)}
                  className={`text-left p-5 rounded-xl transition-all ${
                    invitedParticipants.includes(room.id)
                      ? 'bg-gradient-to-br from-violet-500/20 to-purple-500/20 border-2 border-violet-500 shadow-lg'
                      : 'bg-slate-900/50 border-2 border-slate-600 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-3xl">{room.icon}</span>
                    {invitedParticipants.includes(room.id) && (
                      <CheckCircle2 className="w-6 h-6 text-violet-400" />
                    )}
                  </div>
                  <h3 className="font-bold text-lg mb-1">{room.name}</h3>
                  <p className="text-xs text-slate-400 mb-2">{room.defaultFocus[0]}</p>
                  
                  {invitedParticipants.includes(room.id) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyInviteLink(room.id);
                      }}
                      className="mt-2 w-full bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2"
                    >
                      📋 Copy Invite Link
                    </button>
                  )}
                </button>
              ))}
            </div>

            {/* Summary */}
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">
                    <span className="font-medium text-white text-lg">{invitedParticipants.length}</span> collaborator{invitedParticipants.length !== 1 ? 's' : ''} selected
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Share the invite links with your team members</p>
                </div>
                <button
                  onClick={() => {
                    if (invitedParticipants.length === 0) {
                      alert('Please select at least one collaborator');
                      return;
                    }
                    alert(`✅ Session ready!\n\n${invitedParticipants.length} invite links are ready to share.\n\nClick "Copy Invite Link" on each role to share with your team.`);
                  }}
                  disabled={invitedParticipants.length === 0}
                  className="bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-3 rounded-lg font-medium hover:shadow-lg hover:shadow-violet-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Users className="w-5 h-5" />
                  Ready to Collaborate
                </button>
              </div>
            </div>

            {/* Example Links Display */}
            {invitedParticipants.length > 0 && (
              <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-300 mb-3">📧 Invite Links Ready</h3>
                <div className="space-y-2">
                  {invitedParticipants.slice(0, 2).map(roleId => {
                    const room = rooms.find(r => r.id === roleId);
                    return (
                      <div key={roleId} className="bg-slate-900/50 rounded p-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{room?.icon}</span>
                          <span className="text-sm text-slate-300">{room?.name}</span>
                        </div>
                        <button
                          onClick={() => copyInviteLink(roleId)}
                          className="text-xs text-blue-400 hover:text-blue-300"
                        >
                          Copy Link
                        </button>
                      </div>
                    );
                  })}
                  {invitedParticipants.length > 2 && (
                    <p className="text-xs text-slate-500 text-center">
                      + {invitedParticipants.length - 2} more (scroll up to copy their links)
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;