import { useState, useEffect } from 'react';
import { db, storage } from './firebase';
import { collection, addDoc, doc, getDoc, onSnapshot } from 'firebase/firestore';
import Landing from './Landing';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import CollaboratorRoom from './CollaboratorRoom';
import MCDashboard from './MCDashboard';
import RestaurantPlanner from './RestaurantPlanner';

function App() {
// Check if this is restaurant mode
  if (window.location.pathname === '/restaurant') {
    return <RestaurantPlanner />;
  }
/// Check if this is landing page (no URL params and no create mode)
  const params = new URLSearchParams(window.location.search);
  const showLanding = !params.has('session') && !params.has('create') && window.location.pathname === '/';
  
  if (showLanding) {
    return <Landing onStartSession={() => {
      // Navigate to create mode
      window.location.href = '/?create=true';
    }} />;
  }
  
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
  const [customRoles, setCustomRoles] = useState([]);           // NEW: Array of custom role names
  const [customRoleInput, setCustomRoleInput] = useState('');   // NEW: Text input for new custom role
  const [customRoleError, setCustomRoleError] = useState('');   // NEW: Error message for custom roles
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [error, setError] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);

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

  // NEW: Add custom role
  const addCustomRole = () => {
    const trimmedRole = customRoleInput.trim();
    
    // Validation
    if (!trimmedRole) {
      setCustomRoleError('Please enter a role name');
      return;
    }
    
    if (customRoles.length >= 5) {
      setCustomRoleError('Maximum 5 custom roles allowed');
      return;
    }
    
    if (selectedRoles.includes(trimmedRole) || customRoles.includes(trimmedRole)) {
      setCustomRoleError('This role already exists');
      return;
    }
    
    // Add role and clear input
    setCustomRoles([...customRoles, trimmedRole]);
    setCustomRoleInput('');
    setCustomRoleError('');
  };

  // NEW: Remove custom role
  const removeCustomRole = (roleToRemove) => {
    setCustomRoles(customRoles.filter(role => role !== roleToRemove));
  };

  // NEW: Handle Enter key in input
  const handleCustomRoleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomRole();
    }
  };
// Load session from URL on page load
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const urlSessionId = params.get('session');
  const urlRole = params.get('role');

  if (urlSessionId && urlRole) {
    // Collaborator view
    setSessionId(urlSessionId);
    setMode('collaborator');
  } else if (urlSessionId) {
    // MC view - load session from Firebase with real-time updates
    setSessionId(urlSessionId);
    setMode('mc-dashboard');
    
    // Set up real-time listener
    const sessionRef = doc(db, 'sessions', urlSessionId);
    const unsubscribe = onSnapshot(sessionRef, 
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const sessionData = docSnapshot.data();
          setSession(sessionData);
          console.log('🔄 Session updated in real-time:', {
            status: sessionData.status,
            hasSynthesis: !!sessionData.synthesis,
            finalized: sessionData.status === 'finalized'
          });
        } else {
          console.error('Session not found');
          alert('Session not found');
        }
      },
      (error) => {
        console.error('Error loading session:', error);
        alert('Failed to load session');
      }
    );
    
    // Cleanup listener when component unmounts
    return () => unsubscribe();
  }
}, []);
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
  const generateAIAnalysis = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const prompt = `You are an expert strategic analyst. Provide a BRUTALLY CONCISE analysis.

CONTEXT: ${context}
QUESTION: ${title}

STRICT LIMIT: 200 words maximum (not 201, not 250 - exactly 200 or less)

Format:

KEY INSIGHTS (3 bullets max)
- [Critical finding only]

EXPERT VIEWS NEEDED (3 bullets max)
- [Specific expertise required]

CRITICAL QUESTIONS (3 questions max)
- [Must-answer questions]

MAIN RISKS (2 bullets max)
- [Highest-stakes concerns]

Every word must earn its place. Cut ruthlessly. Be specific, not generic.`;

      console.log('📡 Calling backend for analysis...');

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/generate-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          topic: title,
          uploadedDocuments: uploadedFiles,
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
    const totalRoles = selectedRoles.length + customRoles.length;
    if (!title.trim() || !context.trim() || !mcName.trim() || !mcEmail.trim() || totalRoles === 0) {
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
        selectedRoles: [...selectedRoles, ...customRoles],
        uploadedDocuments: uploadedFiles,
        createdAt: new Date().toISOString(),
	status: 'active',
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
      const allRoles = [...selectedRoles, ...customRoles];  // CHANGED: Combine both
      allRoles.forEach(role => {
        links[role] = `${baseUrl}?session=${newSessionId}&role=${encodeURIComponent(role)}`;
      });
      setInviteLinks(links);

      // Switch to dashboard view
      setMode('mc-dashboard');
      // Update URL with session ID
      window.history.pushState({}, '', `?session=${newSessionId}`);
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
    setCustomRoles([]);        // NEW
    setCustomRoleInput('');    // NEW
    setCustomRoleError('');    // NEW
    setUploadedFiles([]);
    setIsUploadingFiles(false);    
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
  // MC Dashboard view
  if (mode === 'mc-dashboard' && sessionId) {
    // Show loading if session data hasn't loaded yet
    if (!session) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">⏳</div>
            <p className="text-xl text-gray-700 font-semibold">Loading session...</p>
            <p className="text-sm text-gray-500 mt-2">Connecting to Firebase</p>
          </div>
        </div>
      );
    }

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
        {/* Header with tagline */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-3">
            ✨ CoPrompt
          </h1>
          <p className="text-xl text-slate-300 mb-2">
            Where Teams and AI Collaborate
          </p>
          <p className="text-base text-slate-400 italic">
            CoPrompt helps teams turn ideas into insight — collaboratively, instantly, and intelligently.
          </p>
        </div>
          
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

        {/* Main Form Card */}
        <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-3">Create New Session</h2>
          <p className="text-sm text-slate-400 mb-6 italic">Each session is a collaborative workspace where AI and your team analyze a project together.</p>
          <p className="text-slate-300 mb-8">Kick off with an AI analysis of your project or idea, invite collaborators for AI-enhanced insights, synthesize all perspectives, and watch insights come to life in real time.</p>

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
              What would you like to work on today?
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Example: Build an AI-powered meal planning app for diabetics..."
              rows={6}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
{/* Document Upload Section */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              Upload Documents (Optional)
            </label>
            <p className="text-xs text-slate-400 mb-3 italic">
              Add PDFs or DOCX files (resumes, job descriptions, RFPs, etc.). Max 10MB per file.
              <br/>
              <span className="text-yellow-400">💡 Tip: DOCX and XLSX files work best. Scanned/image PDFs may not extract properly.</span>
            </p>
            
            <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 bg-slate-700/30 hover:border-purple-500 transition-colors">
              <input
                type="file"
                multiple
                accept=".pdf,.docx,.doc,.xlsx,.xls"
                onChange={handleFileUpload}
                disabled={isUploadingFiles}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className={`flex flex-col items-center justify-center cursor-pointer ${
                  isUploadingFiles ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <div className="text-5xl mb-3">📄</div>
                <p className="text-slate-300 font-medium mb-1">
                  {isUploadingFiles ? 'Uploading...' : 'Click to upload documents'}
                </p>
                <p className="text-xs text-slate-400">
                  PDF or DOCX files only
                </p>
              </label>
            </div>

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-semibold text-slate-200">
                  Uploaded Files ({uploadedFiles.length}):
                </p>
                {uploadedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-slate-700 rounded-lg border border-slate-600"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {file.type === 'application/pdf' ? '📕' : 
                         file.type.includes('spreadsheet') || file.type.includes('excel') ? '📊' : '📘'}
                      </span>
                      <div>
                        <p className="text-sm text-white font-medium">{file.name}</p>
                        <p className="text-xs text-slate-400">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-red-400 hover:text-red-300 transition-colors text-xl font-bold"
                      title="Remove file"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live Mode Info */}
          {/* AI Info */}
          <div className="mb-6 p-4 bg-purple-900/30 border border-purple-700 rounded-lg">
            <p className="text-sm text-purple-200 text-center">
              Powered by Claude AI to generate deep insights from your team's expertise
            </p>
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
          {/* Role Selection */}
          {/* Role Selection */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              Select roles you would like to include
            </label>
            <p className="text-xs text-slate-400 mb-3 italic">
              Each brings a unique AI-driven perspective. ({selectedRoles.length + customRoles.length} selected)
            </p>
            
            {/* Predefined Roles Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
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

            {/* Custom Roles Section */}
            <div className="mt-6 pt-6 border-t border-slate-600">
              <label className="block text-sm font-semibold text-slate-200 mb-3">
                Add Custom Roles (Optional - Max 5)
              </label>
              
              {/* Custom Role Input */}
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={customRoleInput}
                  onChange={(e) => setCustomRoleInput(e.target.value)}
                  onKeyPress={handleCustomRoleKeyPress}
                  placeholder="e.g., Operational Risk, Chief Data Officer"
                  maxLength={50}
                  disabled={customRoles.length >= 5}
                  className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  onClick={addCustomRole}
                  disabled={!customRoleInput.trim() || customRoles.length >= 5}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  + Add
                </button>
              </div>

              {/* Error Message */}
              {customRoleError && (
                <p className="text-red-400 text-sm mb-3">{customRoleError}</p>
              )}

              {/* Custom Roles List */}
              {customRoles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-400 mb-2">Custom Roles Added:</p>
                  {customRoles.map((role, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between px-4 py-2 bg-slate-700 border border-purple-500 rounded-lg"
                    >
                      <span className="text-white font-medium">{role}</span>
                      <button
                        onClick={() => removeCustomRole(role)}
                        className="text-red-400 hover:text-red-300 transition-colors text-lg font-bold"
                        title="Remove this custom role"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Create Session Button */}
          <button
            onClick={createSession}
            disabled={!title.trim() || !context.trim() || !mcName.trim() || !mcEmail.trim() || (selectedRoles.length === 0 && customRoles.length === 0) || (mcRole === 'Other' && !mcCustomRole.trim())}
            className={`w-full py-4 rounded-lg font-bold text-lg transition-colors ${
              !title.trim() || !context.trim() || !mcName.trim() || !mcEmail.trim() || (selectedRoles.length === 0 && customRoles.length === 0) || (mcRole === 'Other' && !mcCustomRole.trim())
                ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
            }`}
          >
           ✨ Share Analysis & Invite Collaborators
          </button>
          
          {/* Footer Tagline */}
          <p className="text-center text-slate-400 text-sm mt-6 italic">
            Where collaboration meets AI
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;