import React, { useState, useEffect } from 'react';
import { Users, GitBranch, Sparkles, ArrowRight, Lock, Eye, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react';

// Firebase imports
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';
import { createSession, getSession, addParticipant, subscribeToSession } from './sessionManager';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function App() {
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

  // Session management states
  const [sessionId, setSessionId] = useState(null);
  const [sessionMode, setSessionMode] = useState('create');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [sessionName, setSessionName] = useState('');

  const rooms = [
    { id: 'marketing', name: 'Marketing Strategy', icon: '📊', user: 'Sarah Chen', email: 'sarah.chen@company.com' },
    { id: 'risk', name: 'Risk & Compliance', icon: '⚖️', user: 'James Wilson', email: 'james.wilson@company.com' },
    { id: 'tech', name: 'Technical Architecture', icon: '⚙️', user: 'Priya Kumar', email: 'priya.kumar@company.com' },
    { id: 'finance', name: 'Financial Model', icon: '💰', user: 'Marcus Lee', email: 'marcus.lee@company.com' },
    { id: 'legal', name: 'Legal Affairs', icon: '⚖️', user: 'Diana Torres', email: 'diana.torres@company.com' },
    { id: 'operations', name: 'Operations', icon: '🔧', user: 'Kevin Zhang', email: 'kevin.zhang@company.com' }
  ];

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
          
          // If overloaded (529), retry after delay
          if (response.status === 529 && i < retries - 1) {
            console.log(`⏳ API overloaded, retrying in ${(i + 1) * 2}s... (attempt ${i + 2}/${retries})`);
            await new Promise(resolve => setTimeout(resolve, (i + 1) * 2000));
            lastError = new Error(errorData.error || 'API overloaded');
            // Try again in next iteration
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
          console.log(`⏳ Retrying... (attempt ${i + 2}/${retries})`);
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
      // Validate inputs
      if (!ownerName.trim() || !ownerEmail.trim() || !sessionName.trim()) {
        setError('Please provide your name, email, and session name');
        setLoading(false);
        return;
      }

      // Generate AI analysis
      const response = await callClaude(
        mainPrompt,
        'You are a strategic advisor analyzing a product or business idea. Provide a comprehensive initial analysis covering: key features, main challenges, target market, and monetization opportunities. Be detailed but concise (300-400 words).'
      );
      
      setMainResponse(response);

      // Create session in Firebase
      const newSessionId = await createSession({
        ownerName,
        ownerEmail,
        sessionName,
        mainPrompt,
        mainResponse: response
      });

      setSessionId(newSessionId);
      console.log('✅ Session created:', newSessionId);
      console.log('🔗 Share link:', `${window.location.origin}?session=${newSessionId}`);
      
      setPhase('review');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoomAnalysis = async (roomId) => {
    setLoading(true);
    setError('');
    try {
      const room = rooms.find(r => r.id === roomId);
      const domainPrompts = {
        marketing: 'As a marketing strategist, analyze the target markets, go-to-market strategy, customer segments, and competitive positioning. Include specific numbers (TAM/SAM/SOM, CAC targets, conversion rates).',
        risk: 'As a risk officer, identify all critical risks (regulatory, legal, operational, security) and propose mitigation strategies with estimated costs.',
        tech: 'As a technical architect, recommend the technology stack, infrastructure requirements, critical integrations, and implementation timeline with milestones.',
        finance: 'As a financial analyst, create a financial model including revenue strategy, cost projections, break-even analysis, unit economics (CAC/LTV), and funding requirements.',
        legal: 'As legal counsel, analyze intellectual property strategy, required contracts, litigation risks with insurance recommendations, and regulatory compliance pathways.',
        operations: 'As an operations manager, assess operational readiness including customer support, technology operations, scaling plans, and critical dependencies with mitigations.'
      };

      const prompt = `Context: ${mainResponse}\n\nYour role: ${room.name}\n\n${domainPrompts[roomId]}\n\nProvide detailed analysis (300-400 words).`;

      const response = await callClaude(prompt);
      setRoomResponses({...roomResponses, [roomId]: response});
      setCompletedRooms([...completedRooms, roomId]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSynthesis = async () => {
    setLoading(true);
    setError('');
    try {
      const allAnalyses = invitedParticipants.map(id => {
        const room = rooms.find(r => r.id === id);
        return `${room.name}:\n${roomResponses[id]}`;
      }).join('\n\n---\n\n');

      const prompt = `Original Context: ${mainResponse}\n\n${allAnalyses}\n\nAs a strategic synthesizer, create a balanced recommendation:\n\n1. Identify 3 key trade-offs where domains conflict\n2. For each, present both options with pros/cons\n3. Make clear recommendations balancing all perspectives\n4. Provide integrated strategy\n5. List 6-8 concrete next steps\n\nRespond ONLY with valid JSON (no markdown):\n{\n  "recommendation": "title",\n  "reasoning": "brief explanation",\n  "tradeoffs": [\n    {\n      "dimension": "name",\n      "option1": {"choice": "...", "pros": "...", "cons": "..."},\n      "option2": {"choice": "...", "pros": "...", "cons": "..."},\n      "recommendation": "which and why"\n    }\n  ],\n  "synthesis": "integrated strategy",\n  "nextSteps": ["step1", "step2", ...]\n}`;

      const response = await callClaude(prompt, 'You are a strategic synthesizer. Respond ONLY with valid JSON, no markdown formatting.');

      let jsonText = response.trim();
      if (jsonText.includes('```json')) {
        jsonText = jsonText.split('```json')[1].split('```')[0].trim();
      } else if (jsonText.includes('```')) {
        jsonText = jsonText.split('```')[1].split('```')[0].trim();
      }

      // Clean up JSON
      jsonText = jsonText
        .replace(/,(\s*[}\]])/g, '$1')
        .replace(/\n/g, ' ')
        .replace(/\r/g, '');

      let parsed;
      try {
        parsed = JSON.parse(jsonText);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError.message);
        console.error('Attempted to parse:', jsonText.substring(0, 500));
        throw new Error('AI returned invalid JSON format. Please try again.');
      }

      setSynthesisOutput(parsed);
      setPhase('synthesis');
    } catch (err) {
      setError(err.message || 'Failed to parse synthesis');
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

  const allRoomsComplete = invitedParticipants.length > 0 && invitedParticipants.every(id => completedRooms.includes(id));

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
              <span className="text-sm">Studio</span>
              <ArrowRight className="w-4 h-4 text-slate-500" />
              <div className={`w-2 h-2 rounded-full ${phase === 'invite' ? 'bg-orange-500 animate-pulse' : 'bg-slate-600'}`} />
              <span className="text-sm">Invite</span>
              <ArrowRight className="w-4 h-4 text-slate-500" />
              <div className={`w-2 h-2 rounded-full ${phase === 'fork' ? 'bg-purple-500 animate-pulse' : 'bg-slate-600'}`} />
              <span className="text-sm">Fork</span>
              <ArrowRight className="w-4 h-4 text-slate-500" />
              <div className={`w-2 h-2 rounded-full ${phase === 'synthesis' ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`} />
              <span className="text-sm">Synthesis</span>
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

        {phase === 'review' && (
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold">AI Initial Analysis</h2>
              <span className="text-sm text-slate-400 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Product Owner Review
              </span>
            </div>

            <div className="bg-slate-900/50 rounded-xl p-6 mb-6 border border-violet-500/20">
              <div className="flex items-start gap-3">
                <div className="bg-violet-500/20 p-2 rounded-lg">
                  <Sparkles className="w-5 h-5 text-violet-400" />
                </div>
                <p className="text-slate-300 leading-relaxed whitespace-pre-line">{mainResponse}</p>
              </div>
            </div>

            {sessionId && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-400 mb-1">🔗 Shareable Session Link</p>
                    <p className="text-xs text-slate-400">Share this link with your collaborators</p>
                  </div>
                  <button
                    onClick={() => {
                      const link = `${window.location.origin}?session=${sessionId}`;
                      navigator.clipboard.writeText(link);
                      alert('✅ Link copied to clipboard!');
                    }}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  >
                    Copy Link
                  </button>
                </div>
                <div className="mt-3 bg-slate-900/50 rounded p-2">
                  <code className="text-xs text-slate-300 break-all">
                    {window.location.origin}?session={sessionId}
                  </code>
                </div>
              </div>
            )}

            <button
              onClick={() => setPhase('invite')}
              className="bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-3 rounded-lg font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all flex items-center gap-2"
            >
              <Users className="w-5 h-5" />
              Invite Domain Experts
            </button>
          </div>
        )}

        {phase === 'invite' && (
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Invite Domain Experts</h2>
              <p className="text-slate-400">Select participants for domain analysis</p>
            </div>

            <div className="bg-slate-900/50 rounded-lg p-4 mb-6 border border-slate-600">
              <div className="flex items-start gap-3">
                <div className="bg-violet-500/20 p-2 rounded-lg">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-400 mb-2"><strong className="text-slate-300">Context they'll receive:</strong></p>
                  <p className="text-xs text-slate-500 line-clamp-3">{mainResponse}</p>
                </div>
              </div>
            </div>

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
                  <p className="text-sm text-slate-300 mb-1">{room.user}</p>
                  <p className="text-xs text-slate-500">{room.email}</p>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-600">
              <div className="text-sm text-slate-400">
                <span className="font-medium text-white text-lg">{invitedParticipants.length}</span> participant{invitedParticipants.length !== 1 ? 's' : ''} selected
              </div>
              <button
                onClick={() => setPhase('fork')}
                disabled={invitedParticipants.length === 0}
                className="bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-3 rounded-lg font-medium hover:shadow-lg hover:shadow-violet-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <GitBranch className="w-5 h-5" />
                Fork to Selected Rooms
              </button>
            </div>
          </div>
        )}

        {phase === 'fork' && (
          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-4">
              <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Active Rooms ({invitedParticipants.length})
                </h3>

                {rooms.filter(room => invitedParticipants.includes(room.id)).map(room => (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoom(room.id)}
                    className={`w-full text-left p-3 rounded-lg mb-2 transition-all ${
                      selectedRoom === room.id
                        ? 'bg-gradient-to-r from-violet-500/20 to-purple-500/20 border-2 border-violet-500'
                        : 'bg-slate-900/50 border border-slate-600 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{room.icon}</span>
                        <div>
                          <div className="font-medium text-sm">{room.name}</div>
                          <div className="text-xs text-slate-400">{room.user}</div>
                        </div>
                      </div>
                      {completedRooms.includes(room.id) && (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
                <div className="flex items-center gap-2 text-amber-500 mb-2">
                  <Lock className="w-4 h-4" />
                  <span className="text-sm font-medium">Blind Process</span>
                </div>
                <p className="text-xs text-slate-400">Rooms work independently</p>
              </div>

              {allRoomsComplete && (
                <button
                  onClick={handleSynthesis}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-3 rounded-lg font-medium hover:shadow-lg hover:shadow-green-500/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Synthesizing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Generate Synthesis
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="col-span-2">
              {selectedRoom ? (
                <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl">{rooms.find(r => r.id === selectedRoom)?.icon}</span>
                      <div>
                        <h2 className="text-xl font-bold">{rooms.find(r => r.id === selectedRoom)?.name}</h2>
                        <p className="text-sm text-slate-400">{rooms.find(r => r.id === selectedRoom)?.user}</p>
                      </div>
                    </div>

                    <div className="bg-slate-900/50 rounded-lg p-4 mb-4 border border-slate-600">
                      <p className="text-sm text-slate-300 mb-2"><strong>Original Context:</strong></p>
                      <p className="text-xs text-slate-400 line-clamp-3">{mainResponse}</p>
                    </div>
                  </div>

                  {completedRooms.includes(selectedRoom) ? (
                    <div className="bg-slate-900/50 rounded-lg p-6 border border-green-500/30">
                      <div className="flex items-center gap-2 text-green-500 mb-4">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="font-medium">Analysis Complete</span>
                      </div>
                      <div className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                        {roomResponses[selectedRoom]}
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleRoomAnalysis(selectedRoom)}
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-3 rounded-lg font-medium hover:shadow-lg hover:shadow-violet-500/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Generating Analysis...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Generate Domain Analysis
                        </>
                      )}
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-12 flex items-center justify-center h-full">
                  <div className="text-center text-slate-400">
                    <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Select a room to generate analysis</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {phase === 'synthesis' && synthesisOutput && (
          <div className="bg-slate-800/50 rounded-2xl border border-slate-600 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-3 rounded-xl shadow-lg">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{synthesisOutput.recommendation}</h2>
                <p className="text-slate-400">{synthesisOutput.reasoning}</p>
              </div>
            </div>

            <div className="space-y-6 mb-8">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Key Trade-offs
              </h3>

              {synthesisOutput.tradeoffs.map((t, i) => (
                <div key={i} className="bg-slate-900/50 rounded-lg p-6 border border-slate-600">
                  <h4 className="font-bold text-lg mb-4 text-violet-400">{t.dimension}</h4>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <div className="font-medium mb-2 text-sm">{t.option1.choice}</div>
                      <div className="text-xs text-green-400 mb-1">✓ {t.option1.pros}</div>
                      <div className="text-xs text-red-400">✗ {t.option1.cons}</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <div className="font-medium mb-2 text-sm">{t.option2.choice}</div>
                      <div className="text-xs text-green-400 mb-1">✓ {t.option2.pros}</div>
                      <div className="text-xs text-red-400">✗ {t.option2.cons}</div>
                    </div>
                  </div>

                  <div className="bg-violet-500/10 border border-violet-500/30 rounded-lg p-3">
                    <div className="text-sm"><strong>Recommendation:</strong> {t.recommendation}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-slate-900 rounded-lg p-6 border border-violet-500/30 mb-6">
              <h3 className="font-bold text-lg mb-3 text-violet-400">Integrated Recommendation</h3>
              <p className="text-slate-300 mb-4 whitespace-pre-line">{synthesisOutput.synthesis}</p>

              <h4 className="font-bold mb-2">Next Steps:</h4>
              <ul className="space-y-2">
                {synthesisOutput.nextSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setPhase('input');
                  setMainPrompt('');
                  setMainResponse('');
                  setSelectedRoom(null);
                  setRoomResponses({});
                  setCompletedRooms([]);
                  setInvitedParticipants([]);
                  setSynthesisOutput(null);
                  setError('');
                  setSessionId(null);
                  setSessionName('');
                  setOwnerName('');
                  setOwnerEmail('');
                }}
                className="flex-1 bg-slate-700 px-6 py-3 rounded-lg font-medium hover:bg-slate-600 transition-all"
              >
                New Session
              </button>
              <button
                onClick={() => {
                  const doc = `# ${synthesisOutput.recommendation}\n\n${synthesisOutput.reasoning}\n\n## Trade-offs\n\n${synthesisOutput.tradeoffs.map(t => `### ${t.dimension}\n\n**Option 1:** ${t.option1.choice}\n- ✓ ${t.option1.pros}\n- ✗ ${t.option1.cons}\n\n**Option 2:** ${t.option2.choice}\n- ✓ ${t.option2.pros}\n- ✗ ${t.option2.cons}\n\n**Recommendation:** ${t.recommendation}\n\n`).join('')}## Synthesis\n\n${synthesisOutput.synthesis}\n\n## Next Steps\n\n${synthesisOutput.nextSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
                  const blob = new Blob([doc], { type: 'text/markdown' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'decision-document.md';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex-1 bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-3 rounded-lg font-medium hover:shadow-lg hover:shadow-violet-500/50 transition-all"
              >
                Export Document
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;