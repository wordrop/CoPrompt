import { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';
import CollaboratorRoom from './CollaboratorRoom';
import MCDashboard from './MCDashboard';

function App() {
  const [mode, setMode] = useState('mc-create'); // 'mc-create', 'mc-dashboard', 'collaborator'
  const [sessionId, setSessionId] = useState(null);
  const [session, setSession] = useState(null);
  const [inviteLinks, setInviteLinks] = useState({});

  // Form states
  const [title, setTitle] = useState('');
  const [context, setContext] = useState('');
  const [mcName, setMcName] = useState('');
  const [mcEmail, setMcEmail] = useState('');
  const [mcRole, setMcRole] = useState('Project Lead');
  const [mcCustomRole, setMcCustomRole] = useState('');
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [error, setError] = useState(null);

  const roleOptions = [
    'Project Lead',
    'Product Manager',
    'CEO / Founder',
    'Strategy Lead',
    'Department Head',
    'Team Lead',
    'Director',
    'VP / Executive',
    'Other'
  ];

  const collaboratorRoles = [
    'Marketing', 'Sales', 'Product', 'Engineering', 
    'Finance', 'Operations', 'Legal', 'HR', 
    'Customer Success', 'Data Analytics', 'Risk Management', 
    'Strategy', 'Design', 'Security'
  ];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSessionId = params.get('session');
    const role = params.get('role');
    
    if (urlSessionId && role) {
      setMode('collaborator');
      setSessionId(urlSessionId);
    }
  }, []);

  const toggleRole = (role) => {
    setSelectedRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const generateAIAnalysis = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const prompt = `You are an expert strategic analyst helping a ${mcRole === 'Other' ? mcCustomRole : mcRole} prepare for a collaborative decision-making session.

STRATEGIC CONTEXT:
${context}

SESSION TITLE: ${title}

Please provide a comprehensive initial analysis focusing specifically on the strategic question and context provided above. Your analysis should:

1. Key Themes and Concepts - Identify the core elements relevant to THIS specific strategic question
2. Different Perspectives to Consider - What viewpoints are crucial for THIS particular decision
3. Important Questions to Explore - What needs to be answered for THIS specific context
4. Potential Implications - What are the consequences and considerations for THIS particular situation

Be thorough, critical, and specific to the context provided. Focus on actionable insights directly relevant to the strategic question, not generic background information.`;

      console.log('📡 Calling backend for analysis...');

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/generate-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          topic: title,
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setAiAnalysis(data.response);
        console.log('✅ Analysis received from backend');
      } else {
        throw new Error(data.error || 'Failed to generate analysis');
      }
    } catch (err) {
      console.error('❌ Error generating analysis:', err);
      setError(err.message || 'Failed to generate AI analysis. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const createSession = async () => {
    if (!title.trim() || !context.trim() || !mcName.trim() || !mcEmail.trim() || selectedRoles.length === 0) {
      alert('Please fill all required fields and select at least one role');
      return;
    }

    if (mcRole === 'Other' && !mcCustomRole.trim()) {
      alert('Please specify your role');
      return;
    }

    try {
      const finalRole = mcRole === 'Other' ? mcCustomRole : mcRole;
      
      const sessionData = {
        title,
        context,
        aiAnalysis,
        mcName,
        mcEmail,
        mcRole: finalRole,
        selectedRoles,
        createdAt: new Date().toISOString(),
        submissions: [],
        synthesis: ''
      };

      const docRef = await addDoc(collection(db, 'sessions'), sessionData);
      const newSessionId = docRef.id;
      setSessionId(newSessionId);
      setSession(sessionData);

      // Generate invite links
      const baseUrl = window.location.origin;
      const links = {};
      selectedRoles.forEach(role => {
        links[role] = `${baseUrl}?session=${newSessionId}&role=${encodeURIComponent(role)}`;
      });
      setInviteLinks(links);

      // Switch to dashboard view
      setMode('mc-dashboard');
    } catch (error) {
      console.error('Session creation error:', error);
      alert('Failed to create session');
    }
  };

  const copyInviteLink = (role) => {
    navigator.clipboard.writeText(inviteLinks[role]);
    alert(`Copied invite link for ${role}!`);
  };

  const resetAndGoHome = () => {
    setMode('mc-create');
    setSessionId(null);
    setSession(null);
    setTitle('');
    setContext('');
    setMcName('');
    setMcEmail('');
    setMcRole('Project Lead');
    setMcCustomRole('');
    setSelectedRoles([]);
    setAiAnalysis('');
    setInviteLinks({});
    setError(null);
    window.history.pushState({}, '', window.location.pathname);
  };

  // Collaborator view
  if (mode === 'collaborator') {
    return <CollaboratorRoom sessionId={sessionId} />;
  }

  // MC Dashboard view
  if (mode === 'mc-dashboard' && sessionId) {
    return (
      <div>
        {/* Navigation Bar */}
        <nav className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 shadow-lg">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <h1 className="text-xl font-bold">CoPrompt</h1>
            <div className="flex gap-4">
              <button
                onClick={() => setMode('mc-dashboard')}
                className="px-4 py-2 bg-white/20 rounded hover:bg-white/30 transition-colors"
              >
                📊 Dashboard
              </button>
              <button
                onClick={resetAndGoHome}
                className="px-4 py-2 bg-white/20 rounded hover:bg-white/30 transition-colors"
              >
                ➕ New Session
              </button>
            </div>
          </div>
        </nav>

        {/* Invite Links Section (Sticky) */}
        {Object.keys(inviteLinks).length > 0 && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border-b border-green-200 p-4 sticky top-0 z-10 shadow-sm">
            <div className="max-w-6xl mx-auto">
              <h3 className="font-bold text-gray-900 mb-3">📨 Invite Links (Click to Copy)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(inviteLinks).map(([role, link]) => (
                  <button
                    key={role}
                    onClick={() => copyInviteLink(role)}
                    className="flex items-center justify-between bg-white px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors border border-gray-200 text-sm"
                  >
                    <span className="font-medium text-gray-900">{role}</span>
                    <span className="text-blue-600">📋</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Dashboard */}
        <MCDashboard sessionId={sessionId} session={session} />
      </div>
    );
  }

  // MC Create Session view (DEFAULT)
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-3xl">✨</span>
            </div>
          </div>
          <h1 className="text-5xl font-bold text-white mb-3">CoPrompt</h1>
          <p className="text-xl text-purple-200 mb-6">Where Teams and AI Collaborate</p>
          
          {/* Description */}

          {/* Key Features Section */}
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700 p-8 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center justify-center gap-2">
              <span>✨</span> Key Features
            </h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              {/* AI-Powered */}
              <div className="text-center">
                <div className="text-5xl mb-3">🤖</div>
                <h3 className="text-lg font-bold text-white mb-2">AI-Powered</h3>
                <p className="text-sm text-slate-300">
                  Claude AI generates insights for both project leads and collaborators
                </p>
              </div>

              {/* Real-time */}
              <div className="text-center">
                <div className="text-5xl mb-3">🔄</div>
                <h3 className="text-lg font-bold text-white mb-2">Real-time</h3>
                <p className="text-sm text-slate-300">
                  Live updates as collaborators submit their analyses
                </p>
              </div>

              {/* Role-Based */}
              <div className="text-center">
                <div className="text-5xl mb-3">🎯</div>
                <h3 className="text-lg font-bold text-white mb-2">Role-Based</h3>
                <p className="text-sm text-slate-300">
                  Each collaborator brings their domain expertise
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Form Card */}
        <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-6">Create New Session</h2>
          <p className="text-slate-300 mb-8">Kick off with an AI analysis of your project or idea, invite collaborators for AI-enhanced insights, synthesize all perspectives, and watch the magic unfold.</p>

          {error && (
            <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg">
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          {/* Session Name */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              Session Name
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Fitness App Strategy Review"
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Name and Email Row */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={mcName}
                onChange={(e) => setMcName(e.target.value)}
                placeholder="Alex Rodriguez"
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Your Email
              </label>
              <input
                type="email"
                value={mcEmail}
                onChange={(e) => setMcEmail(e.target.value)}
                placeholder="alex@company.com"
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Your Role */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              Your Role
            </label>
            <select
              value={mcRole}
              onChange={(e) => setMcRole(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {roleOptions.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            
            {mcRole === 'Other' && (
              <input
                type="text"
                value={mcCustomRole}
                onChange={(e) => setMcCustomRole(e.target.value)}
                placeholder="Specify your role"
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent mt-3"
              />
            )}
          </div>

          {/* Strategic Context */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              Your Product Idea or Strategic Question
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Example: Build an AI-powered meal planning app for diabetics..."
              rows={6}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Live Mode Info */}
          <div className="mb-6 p-4 bg-green-900/30 border border-green-700 rounded-lg flex items-start gap-3">
            <span className="text-green-400 text-xl">✓</span>
            <div>
              <p className="text-sm text-green-200 font-semibold">Live Mode: Real Claude API responses</p>
              <p className="text-xs text-green-300 mt-1">Session will be saved to Firebase</p>
            </div>
          </div>

          {/* Generate Analysis Button */}
          <div className="mb-6">
            <button
              onClick={generateAIAnalysis}
              disabled={isGenerating || !context.trim() || !title.trim()}
              className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                isGenerating || !context.trim() || !title.trim()
                  ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
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
              ) : (
                '✨ Generate AI Analysis'
              )}
            </button>

            {aiAnalysis && (
              <div className="mt-4 p-4 bg-purple-900/30 border border-purple-700 rounded-lg">
                <p className="text-sm font-semibold text-purple-200 mb-2">AI Analysis:</p>
                <p className="text-sm text-slate-300 whitespace-pre-wrap max-h-64 overflow-y-auto">{aiAnalysis}</p>
              </div>
            )}
          </div>

          {/* Role Selection */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-200 mb-3">
              Select Roles to Invite ({selectedRoles.length} selected)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {collaboratorRoles.map(role => (
                <button
                  key={role}
                  onClick={() => toggleRole(role)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedRoles.includes(role)
                      ? 'bg-purple-600 text-white border-2 border-purple-400'
                      : 'bg-slate-700 text-slate-300 border-2 border-slate-600 hover:bg-slate-600'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* Create Session Button */}
          <button
            onClick={createSession}
            disabled={!title.trim() || !context.trim() || !mcName.trim() || !mcEmail.trim() || selectedRoles.length === 0 || (mcRole === 'Other' && !mcCustomRole.trim())}
            className={`w-full py-4 rounded-lg font-bold text-lg transition-colors ${
              !title.trim() || !context.trim() || !mcName.trim() || !mcEmail.trim() || selectedRoles.length === 0 || (mcRole === 'Other' && !mcCustomRole.trim())
                ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
            }`}
          >
            ✨ Create Session & Generate Analysis
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;