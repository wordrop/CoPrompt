import React, { useState } from 'react';

const Landing = ({ onStartSession }) => {
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const scrollToSection = (sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    setShowMobileMenu(false);
  };

  const goToApp = () => {
    window.open('/?create=true', '_blank');
  };

  const goToDemo = () => {
    scrollToSection('demo-section');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation - Ribbn Style */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-sm border-b border-slate-200 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-slate-800">CoPrompt</h1>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <button onClick={() => scrollToSection('why-section')} className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
                WHY COPROMPT
              </button>
              <button onClick={() => scrollToSection('how-section')} className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
                HOW IT WORKS
              </button>
              <button onClick={() => scrollToSection('use-cases-section')} className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
                USE CASES
              </button>
              <button onClick={goToDemo} className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
                TRY DEMO
              </button>
              <button 
                onClick={goToApp}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                START FREE
              </button>
            </div>

            {/* Mobile menu button */}
            <button 
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 text-slate-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Mobile menu */}
          {showMobileMenu && (
            <div className="md:hidden py-4 border-t border-slate-200">
              <button onClick={() => scrollToSection('why-section')} className="block w-full text-left px-4 py-2 text-slate-600 hover:bg-slate-50">
                WHY COPROMPT
              </button>
              <button onClick={() => scrollToSection('how-section')} className="block w-full text-left px-4 py-2 text-slate-600 hover:bg-slate-50">
                HOW IT WORKS
              </button>
              <button onClick={() => scrollToSection('use-cases-section')} className="block w-full text-left px-4 py-2 text-slate-600 hover:bg-slate-50">
                USE CASES
              </button>
              <button onClick={goToDemo} className="block w-full text-left px-4 py-2 text-slate-600 hover:bg-slate-50">
                TRY DEMO
              </button>
              <button 
                onClick={goToApp}
                className="mt-2 w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold"
              >
                START FREE
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <h2 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
              CoPrompt
            </h2>
            <p className="text-3xl md:text-4xl font-semibold text-blue-600 mb-8">
             Collaboration Reimagined
            </p>
            <p className="text-xl text-slate-600 mb-12 leading-relaxed max-w-3xl mx-auto">
              For the first time, AI doesn't just respond—it facilitates an entire team. One persistent intelligence that participates with every stakeholder, challenges their thinking, strengthens every perspective, and synthesizes all inputs with complete understanding. This is collaboration reimagined.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={goToApp}
                className="px-10 py-4 bg-blue-600 text-white rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
              >
                Start a Session
              </button>
              <button 
                onClick={goToDemo}
                className="px-10 py-4 bg-white text-slate-700 rounded-lg text-lg font-semibold border-2 border-slate-200 hover:border-slate-300 transition-colors"
              >
                Try a Hiring Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Why CoPrompt Exists Section */}
      <section id="why-section" className="py-20 bg-white px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-4xl font-bold text-slate-900 mb-6">Why CoPrompt Exists</h3>
            <p className="text-2xl font-semibold text-slate-700 mb-8">Decision-making is broken.</p>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Teams rely on scattered emails, meetings, and documents across discrete systems and applications. Everyone has opinions — but no system brings them together cleanly.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="text-center p-6">
              <div className="text-5xl mb-4">🐌</div>
              <h4 className="text-xl font-semibold text-slate-900 mb-2">Slow Decisions</h4>
              <p className="text-slate-600">Waiting for alignment across teams and time zones</p>
            </div>
            
            <div className="text-center p-6">
              <div className="text-5xl mb-4">👁️</div>
              <h4 className="text-xl font-semibold text-slate-900 mb-2">Missing Perspectives</h4>
              <p className="text-slate-600">Key stakeholders left out of the conversation</p>
            </div>
            
            <div className="text-center p-6">
              <div className="text-5xl mb-4">⚖️</div>
              <h4 className="text-xl font-semibold text-slate-900 mb-2">Bias & No Audit Trail</h4>
              <p className="text-slate-600">Managers acting without full context or documentation</p>
            </div>
          </div>

          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600 mb-4">CoPrompt fixes this.</p>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              It unifies humans and AI into a structured, repeatable decision workflow.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-section" className="py-20 bg-slate-50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-slate-900 mb-4">How It Works</h3>
            <p className="text-xl text-slate-600">Four simple steps to better decisions</p>
          </div>

          <div className="space-y-16">
            {/* Step 1 */}
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-4">
                  STEP 1
                </div>
                <h4 className="text-2xl font-bold text-slate-900 mb-4">Start a Session</h4>
                <p className="text-lg text-slate-600 leading-relaxed">
                  Describe what you're working on — hiring a PM, evaluating a vendor, reviewing a risk event, or any complex decision requiring multiple perspectives.
                </p>
              </div>
              <div className="bg-white rounded-xl p-8 shadow-lg">
                <div className="space-y-3">
                  <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-200 rounded w-full"></div>
                  <div className="h-3 bg-slate-200 rounded w-5/6"></div>
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <div className="text-sm font-semibold text-blue-900">Decision Context</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="order-2 md:order-1">
                <div className="bg-white rounded-xl p-8 shadow-lg">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                      <div className="w-8 h-8 bg-blue-500 rounded-full"></div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">HR</div>
                        <div className="text-xs text-slate-500">Culture fit assessment</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                      <div className="w-8 h-8 bg-green-500 rounded-full"></div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">Finance</div>
                        <div className="text-xs text-slate-500">Budget impact analysis</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                      <div className="w-8 h-8 bg-purple-500 rounded-full"></div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">Engineering</div>
                        <div className="text-xs text-slate-500">Technical evaluation</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="order-1 md:order-2">
                <div className="inline-block px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-semibold mb-4">
                  STEP 2
                </div>
                <h4 className="text-2xl font-bold text-slate-900 mb-4">Add Collaborators & Roles</h4>
                <p className="text-lg text-slate-600 leading-relaxed">
                  Invite HR, Finance, Engineering, Risk, Legal — or create custom roles. Each collaborator gets a structured space to submit their input, assisted by the same AI.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-block px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold mb-4">
                  STEP 3
                </div>
                <h4 className="text-2xl font-bold text-slate-900 mb-4">Upload Documents (Optional)</h4>
                <p className="text-lg text-slate-600 leading-relaxed">
                  Resumes, job descriptions, RFPs, financials, board packs — PDF, DOCX, or XLSX. AI automatically extracts context from all uploaded materials.
                </p>
              </div>
              <div className="bg-white rounded-xl p-8 shadow-lg">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-2xl">📕</div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Resume_Candidate.pdf</div>
                      <div className="text-xs text-slate-500">245 KB</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-2xl">📘</div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Job_Description.docx</div>
                      <div className="text-xs text-slate-500">89 KB</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-2xl">📊</div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Salary_Budget.xlsx</div>
                      <div className="text-xs text-slate-500">156 KB</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="order-2 md:order-1">
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-8 shadow-lg border-2 border-blue-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                      AI
                    </div>
                    <div className="text-lg font-bold text-slate-900">Synthesis Generated</div>
                  </div>
                  <div className="space-y-3 text-sm text-slate-700">
                    <div className="font-semibold text-slate-900">Decision Summary:</div>
                    <div>✓ All documents analyzed</div>
                    <div>✓ All stakeholder inputs considered</div>
                    <div>✓ Criteria evaluated</div>
                    <div>✓ Role-based insights integrated</div>
                    <div className="mt-4 pt-4 border-t border-blue-200">
                      <span className="font-semibold text-blue-900">Result:</span>
                      <span className="ml-2">Single, balanced, audit-ready decision summary</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="order-1 md:order-2">
                <div className="inline-block px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold mb-4">
                  STEP 4
                </div>
                <h4 className="text-2xl font-bold text-slate-900 mb-4">AI Synthesis</h4>
                <p className="text-lg text-slate-600 leading-relaxed mb-4">
                  CoPrompt's AI Agent analyzes all documents, stakeholder inputs, your criteria, and role-based insights...
                </p>
                <p className="text-lg font-semibold text-blue-600">
                  ...and produces a single, balanced, audit-ready decision summary.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-16 text-center">
            <p className="text-2xl font-bold text-slate-900">
              One workspace. <span className="text-blue-600">Many perspectives.</span> One synthesis.
            </p>
          </div>
        </div>
      </section>

      {/* What Makes CoPrompt Different */}
      <section className="py-20 bg-white px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-slate-900 mb-4">What Makes CoPrompt Different</h3>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-white border border-blue-100">
              <div className="text-4xl mb-4">✨</div>
              <h4 className="text-xl font-bold text-slate-900 mb-3">AI-Powered</h4>
              <p className="text-slate-600">
                Your shared AI agent analyzes documents, inputs, and perspectives — not just prompts.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-gradient-to-br from-green-50 to-white border border-green-100">
              <div className="text-4xl mb-4">🔄</div>
              <h4 className="text-xl font-bold text-slate-900 mb-3">Real-Time Collaboration</h4>
              <p className="text-slate-600">
                Live updates as collaborators contribute their analysis.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-gradient-to-br from-purple-50 to-white border border-purple-100">
              <div className="text-4xl mb-4">👥</div>
              <h4 className="text-xl font-bold text-slate-900 mb-3">Role-Based Inputs</h4>
              <p className="text-slate-600">
                Each collaborator brings domain expertise — HR, Risk, Product, Legal, Finance, Engineering.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-gradient-to-br from-orange-50 to-white border border-orange-100">
              <div className="text-4xl mb-4">📄</div>
              <h4 className="text-xl font-bold text-slate-900 mb-3">Document Intelligence</h4>
              <p className="text-slate-600">
                Upload PDFs, DOCX, XLSX, resumes, JDs, RFPs — AI extracts context automatically.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-gradient-to-br from-red-50 to-white border border-red-100">
              <div className="text-4xl mb-4">📋</div>
              <h4 className="text-xl font-bold text-slate-900 mb-3">Structured Decisions</h4>
              <p className="text-slate-600">
                No more unstructured notes and long meetings. Clear, defendable outcomes.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-gradient-to-br from-indigo-50 to-white border border-indigo-100">
              <div className="text-4xl mb-4">🔍</div>
              <h4 className="text-xl font-bold text-slate-900 mb-3">Full Audit Trail</h4>
              <p className="text-slate-600">
                Every input, every perspective, every version — preserved and traceable.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section id="use-cases-section" className="py-20 bg-slate-50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-slate-900 mb-4">Use Cases</h3>
            <p className="text-xl text-slate-600">From hiring to risk management, CoPrompt structures the decisions that matter</p>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl p-8 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className="text-4xl">🎯</div>
                <div>
                  <h4 className="text-2xl font-bold text-slate-900 mb-3">Hiring Decisions</h4>
                  <p className="text-lg text-slate-600">
                    Upload JD + resume → gather panel input → AI synthesis → final hiring recommendation.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className="text-4xl">📊</div>
                <div>
                  <h4 className="text-2xl font-bold text-slate-900 mb-3">Performance Reviews</h4>
                  <p className="text-lg text-slate-600">
                    Collect manager inputs → gather peer reviews → AI consolidates → draft evaluation report.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className="text-4xl">🏢</div>
                <div>
                  <h4 className="text-2xl font-bold text-slate-900 mb-3">Vendor / RFP Evaluation</h4>
                  <p className="text-lg text-slate-600">
                    Upload proposals → stakeholders add scoring + concerns → AI produces comparison & recommendation.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className="text-4xl">⚠️</div>
                <div>
                  <h4 className="text-2xl font-bold text-slate-900 mb-3">Risk Event Review</h4>
                  <p className="text-lg text-slate-600">
                    Risk, Ops, Controls, Business provide assessments → AI consolidates into root cause + controls + next steps.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className="text-4xl">📑</div>
                <div>
                  <h4 className="text-2xl font-bold text-slate-900 mb-3">Board Decision Packs</h4>
                  <p className="text-lg text-slate-600">
                    Upload documents → gather views → AI drafts a concise board-ready summary.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Output Section */}
      <section className="py-20 bg-white px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-4xl font-bold text-slate-900 mb-4">The Output</h3>
            <p className="text-xl text-slate-600">What you get from every CoPrompt session</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 md:p-12 border-2 border-blue-200">
            <h4 className="text-2xl font-bold text-slate-900 mb-6">A typical CoPrompt synthesis includes:</h4>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-1">1</div>
                <div>
                  <div className="font-semibold text-slate-900">Summary of Problem</div>
                  <div className="text-slate-600">Clear articulation of the decision at hand</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-1">2</div>
                <div>
                  <div className="font-semibold text-slate-900">Consolidated Stakeholder Insights</div>
                  <div className="text-slate-600">All perspectives synthesized by role and expertise</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-1">3</div>
                <div>
                  <div className="font-semibold text-slate-900">Risks & Trade-offs</div>
                  <div className="text-slate-600">What could go wrong and what you're giving up</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-1">4</div>
                <div>
                  <div className="font-semibold text-slate-900">Recommendation</div>
                  <div className="text-slate-600">AI-powered recommendation based on all inputs</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-1">5</div>
                <div>
                  <div className="font-semibold text-slate-900">Rationale</div>
                  <div className="text-slate-600">Why this decision makes sense given the context</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-1">6</div>
                <div>
                  <div className="font-semibold text-slate-900">Next Steps</div>
                  <div className="text-slate-600">Actionable items to move forward</div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-blue-200">
              <p className="text-center text-lg font-semibold text-blue-900">
                All generated instantly from real human inputs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Demo CTA Section */}
      <section id="demo-section" className="py-20 bg-gradient-to-br from-blue-600 to-blue-700 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-6xl mb-6">🎯</div>
          <h3 className="text-4xl font-bold text-white mb-6">Try It in 30 Seconds</h3>
          <p className="text-xl text-blue-100 mb-12">
            Experience a live hiring decision example — no signup required.
          </p>

          <div className="bg-white rounded-2xl p-8 md:p-12 shadow-2xl mb-8">
            <div className="mb-8">
              <div className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-4">
                SAMPLE SESSION
              </div>
              <h4 className="text-2xl font-bold text-slate-900 mb-3">
                Hire Senior Engineer: Speed vs. Experience?
              </h4>
              <p className="text-slate-600">
                Three domain experts have provided input. See how CoPrompt synthesizes their perspectives.
              </p>
            </div>

            <div className="space-y-4 mb-8 text-left">
              <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded-r-lg">
                <div className="font-semibold text-slate-900 mb-1">Engineering Lead</div>
                <p className="text-sm text-slate-600">
                  "Strong technical skills but gaps in our specific stack. Would need 3-month ramp-up..."
                </p>
              </div>
              
              <div className="border-l-4 border-green-500 bg-green-50 p-4 rounded-r-lg">
                <div className="font-semibold text-slate-900 mb-1">HR Director</div>
                <p className="text-sm text-slate-600">
                  "Excellent culture fit. Team collaboration scores high. Salary expectations within range..."
                </p>
              </div>
              
              <div className="border-l-4 border-purple-500 bg-purple-50 p-4 rounded-r-lg">
                <div className="font-semibold text-slate-900 mb-1">Finance Manager</div>
                <p className="text-sm text-slate-600">
                  "Budget allows hiring but training costs would impact Q1. Consider contractor bridge..."
                </p>
              </div>
            </div>

            <button 
              onClick={goToApp}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-colors shadow-lg"
            >
              Create Your Own Decision Session →
            </button>
          </div>

          <p className="text-blue-100 text-sm">
            No signup required • First 3 sessions free
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-white px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            Ready to Make Better Decisions?
          </h3>
          <p className="text-xl text-slate-600 mb-12">
            Start your first session today — no credit card required
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button 
              onClick={goToApp}
              className="px-12 py-5 bg-blue-600 text-white rounded-lg text-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
            >
              Start Free Session
            </button>
            <button 
              onClick={goToDemo}
              className="px-12 py-5 bg-white text-slate-700 rounded-lg text-xl font-semibold border-2 border-slate-200 hover:border-slate-300 transition-colors"
            >
              Watch Demo First
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
<footer className="bg-slate-900 text-white py-12 px-4 sm:px-6 lg:px-8">
  <div className="max-w-7xl mx-auto">
    <div className="grid md:grid-cols-3 gap-8">
      
      <div>
        <h3 className="text-xl font-bold mb-4">CoPrompt</h3>
        <p className="text-slate-400">
          Where Teams and AI Decide Together
        </p>
      </div>

      <div>
        <h4 className="font-semibold mb-4">Resources</h4>
        <ul className="space-y-2">
          <li>
            <a href="/contact" className="text-slate-400 hover:text-white transition-colors">
              Contact Us
            </a>
          </li>
          <li>
            <a href="/privacy" className="text-slate-400 hover:text-white transition-colors">
              Privacy Policy
            </a>
          </li>
        </ul>
      </div>

      <div>
        <h4 className="font-semibold mb-4">Get in Touch</h4>
        <p className="text-slate-400 mb-2">
          Questions? We'd love to hear from you.
        </p>
        <a 
          href="mailto:hello@coprompt.net" 
          className="text-blue-400 hover:text-blue-300 transition-colors"
        >
          hello@coprompt.net
        </a>
      </div>
      
    </div>

    <div className="mt-8 pt-8 border-t border-slate-800">
      <div className="flex flex-col md:flex-row justify-between items-center">
        <p className="text-slate-400 text-sm">
          &copy; 2025 CoPrompt. All rights reserved.
        </p>
        <div className="flex space-x-6 mt-4 md:mt-0">
          <a href="/privacy" className="text-slate-400 hover:text-white text-sm">Privacy</a>
          <a href="/contact" className="text-slate-400 hover:text-white text-sm">Contact</a>
        </div>
      </div>
    </div>
  </div>
</footer>
    </div>
  );
};

export default Landing;