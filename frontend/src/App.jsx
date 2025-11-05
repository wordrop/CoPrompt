import { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';
import CollaboratorRoom from './CollaboratorRoom';
import MCDashboard from './MCDashboard';
// import "./App.css";

function App() {
  const [mode, setMode] = useState('home'); // 'home', 'mc-create', 'mc-dashboard', 'collaborator'
  const [sessionId, setSessionId] = useState(null);
const [session, setSession] = useState(null);
  const [inviteLinks, setInviteLinks] = useState({});

  // Form states
  const [title, setTitle] = useState('');
  const [context, setContext] = useState('');
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState('');
const [error, setError] = useState(null);
  const roles = [
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
    const prompt = `Analyze the following topic in depth: "${title}"

Please provide:
1. Key themes and concepts
2. Different perspectives to consider
3. Important questions to explore
4. Potential implications

Be thorough but concise. Format with clear sections.`;

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
    if (!title.trim() || !context.trim() || selectedRoles.length === 0) {
      alert('Please fill all fields and select at least one role');
      return;
    }

    try {
      const sessionData = {
        title,
        context,
        aiAnalysis,
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
    setMode('home');
    setSessionId(null);
    setTitle('');
    setContext('');
    setSelectedRoles([]);
    setAiAnalysis('');
    setInviteLinks({});
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
                onClick={() => {
                  setMode('mc-create');
                  setSessionId(null);
                }}
                className="px-4 py-2 bg-white/20 rounded hover:bg-white/30 transition-colors"
              >
                ➕ New Session
              </button>
              <button
                onClick={resetAndGoHome}
                className="px-4 py-2 bg-white/20 rounded hover:bg-white/30 transition-colors"
              >
                🏠 Home
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

  // Home screen
  if (mode === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-4xl mx-auto p-8">
          <div className="text-center mb-12 pt-12">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
              CoPrompt
            </h1>
            <p className="text-xl text-gray-600">
              Collaborative AI-Powered Strategic Analysis
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* MC Card */}
            <div 
              onClick={() => setMode('mc-create')}
              className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow cursor-pointer border-2 border-transparent hover:border-blue-500"
            >
              <div className="text-6xl mb-4">🎭</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Master of Ceremonies
              </h2>
              <p className="text-gray-600 mb-4">
                Create a strategic session, invite domain experts, and synthesize their analyses
              </p>
              <ul className="text-sm text-gray-500 space-y-2">
                <li>✓ Define strategic context</li>
                <li>✓ Invite collaborators by role</li>
                <li>✓ View all submissions</li>
                <li>✓ Generate AI synthesis</li>
              </ul>
            </div>

            {/* Collaborator Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-gray-200">
              <div className="text-6xl mb-4">🤝</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Collaborator
              </h2>
              <p className="text-gray-600 mb-4">
                Join via invite link to provide your expert analysis
              </p>
              <ul className="text-sm text-gray-500 space-y-2">
                <li>✓ Receive invite link from MC</li>
                <li>✓ Add custom prompts</li>
                <li>✓ Generate AI analysis</li>
                <li>✓ Submit to main room</li>
              </ul>
              <div className="mt-6 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-800">
                  💡 Waiting for an invite? Check your email or ask the session MC!
                </p>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="mt-12 bg-white rounded-2xl shadow-xl p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              ✨ Key Features
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <div className="text-3xl mb-2">🤖</div>
                <h4 className="font-semibold text-gray-900 mb-1">AI-Powered</h4>
                <p className="text-sm text-gray-600">
                  Claude AI generates insights for both MC and collaborators
                </p>
              </div>
              <div>
                <div className="text-3xl mb-2">🔄</div>
                <h4 className="font-semibold text-gray-900 mb-1">Real-time</h4>
                <p className="text-sm text-gray-600">
                  Live updates as collaborators submit their analyses
                </p>
              </div>
              <div>
                <div className="text-3xl mb-2">🎯</div>
                <h4 className="font-semibold text-gray-900 mb-1">Role-Based</h4>
                <p className="text-sm text-gray-600">
                  Each collaborator brings their domain expertise
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MC Create Session view
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Create Strategic Session
          </h1>
          <button
            onClick={resetAndGoHome}
            className="px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-gray-700"
          >
            ← Back to Home
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          {/* Session Title */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Session Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Q1 2025 Product Strategy"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Strategic Context */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Strategic Context
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Describe the strategic situation, challenges, or opportunity..."
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* AI Analysis Generation */}
          <div className="mb-6">
            <button
              onClick={generateAIAnalysis}
              disabled={isGenerating || !context.trim()}
              className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                isGenerating || !context.trim()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
              }`}
            >
              {isGenerating ? 'Generating AI Analysis...' : '✨ Generate AI Analysis'}
            </button>

            {aiAnalysis && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-semibold text-blue-900 mb-2">AI Analysis:</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{aiAnalysis}</p>
              </div>
            )}
          </div>

          {/* Role Selection */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Select Roles to Invite ({selectedRoles.length} selected)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {roles.map(role => (
                <button
                  key={role}
                  onClick={() => toggleRole(role)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedRoles.includes(role)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* Create Button */}
          <button
            onClick={createSession}
            disabled={!title.trim() || !context.trim() || selectedRoles.length === 0}
            className={`w-full py-4 rounded-lg font-bold text-lg transition-colors ${
              !title.trim() || !context.trim() || selectedRoles.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-600 to-blue-600 text-white hover:from-green-700 hover:to-blue-700'
            }`}
          >
            🚀 Create Session & Generate Invite Links
          </button>
        </div>
      </div>
    </div>
  );
}
export default App;