import CoPromptLogo from './CoPromptLogo';
import React, { useState, useEffect } from 'react';

const Landing = ({ onStartSession }) => {
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const scrollToSection = (sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    setShowMobileMenu(false);
  };

useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, []);

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
            <div className="flex items-center gap-2">
  <CoPromptLogo size={28} />
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
              <button onClick={() => scrollToSection('pricing-section')} className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
                PRICING
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
              <button onClick={() => scrollToSection('pricing-section')} className="block w-full text-left px-4 py-2 text-slate-600 hover:bg-slate-50">
                PRICING
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
            <div className="flex items-center justify-center gap-4 mb-6">
  <CoPromptLogo size={72} />
  <h2 className="text-5xl md:text-6xl font-bold text-slate-900 leading-tight">
    CoPrompt
  </h2>
</div>
{/* Benefit-focused tagline */}
            <p className="text-lg md:text-xl text-slate-600 font-medium mb-4">
              Make confident decisions faster with your team's collective intelligence.
            </p>
            <p className="text-3xl md:text-4xl font-semibold text-blue-600 mb-8">
             Collaboration Reimagined
            </p>
            <p className="text-xl text-slate-600 mb-12 leading-relaxed max-w-3xl mx-auto">
              CoPrompt is an AI facilitator designed for how real teams collaborate and decide. Unlike chat-based AI, one persistent intelligence facilitates your entire team—engaging every stakeholder, challenging assumptions, strengthening viewpoints, and synthesizing shared intelligence into clear outcomes. This is collaboration, reimagined.
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
      <p className="text-xl text-slate-600">One AI. Five Steps. Complete Understanding.</p>
    </div>

    <div className="space-y-16">
      {/* Step 1: Set the Context */}
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-4">
            STEP 1
          </div>
          <h4 className="text-2xl font-bold text-slate-900 mb-4">Set the Context</h4>
          <p className="text-lg text-slate-600 leading-relaxed">
            Describe what you’re working on—hiring, an RFP response, vendor evaluation, a strategic decision, or a risk review. CoPrompt analyzes the context, asks clarifying questions, and helps surface what matters most. Upload supporting material — job descriptions, candidate profiles, RFPs, risk framework, budgets — and CoPrompt extracts the signal and incorporates it into deeper, shared analysis.
          </p>
        </div>
        <div className="bg-white rounded-xl p-8 shadow-lg">
          <div className="space-y-3">
            <div className="h-3 bg-slate-200 rounded w-3/4"></div>
            <div className="h-3 bg-slate-200 rounded w-full"></div>
            <div className="h-3 bg-slate-200 rounded w-5/6"></div>
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
              <div className="text-sm font-semibold text-blue-900">AI Analysis</div>
              <div className="text-xs text-slate-600 mt-1">Understanding your context...</div>
            </div>
          </div>
        </div>
      </div>

      {/* Step 2: Invite Stakeholders */}
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div className="order-2 md:order-1">
          <div className="bg-white rounded-xl p-8 shadow-lg">
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <div className="w-8 h-8 bg-blue-500 rounded-full"></div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">HR</div>
                  <div className="text-xs text-slate-500">Culture & fit</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                <div className="w-8 h-8 bg-green-500 rounded-full"></div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">Finance</div>
                  <div className="text-xs text-slate-500">Budget impact</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                <div className="w-8 h-8 bg-purple-500 rounded-full"></div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">Engineering</div>
                  <div className="text-xs text-slate-500">Technical review</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="order-1 md:order-2">
          <div className="inline-block px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-semibold mb-4">
            STEP 2
          </div>
          <h4 className="text-2xl font-bold text-slate-900 mb-4">Invite Stakeholders</h4>
          <p className="text-lg text-slate-600 leading-relaxed">
            Select roles—HR, Finance, Engineering, Risk (1LOD and Controls Team), Legal—or create custom ones. Each collaborator receives your AI-enhanced framing and gets their own workspace. The same AI that helped you now works with them.
          </p>
        </div>
      </div>

      {/* Step 3: Gather Perspectives */}
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-block px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold mb-4">
            STEP 3
          </div>
          <h4 className="text-2xl font-bold text-slate-900 mb-4">Gather Perspectives</h4>
          <p className="text-lg text-slate-600 leading-relaxed">
            Each team member contributes their analysis. The persistent AI challenges assumptions, asks follow-up questions, and strengthens their thinking—ensuring every input is thorough, specific, and valuable.
          </p>
        </div>
        <div className="bg-white rounded-xl p-8 shadow-lg">
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-blue-500 rounded-full"></div>
                <div className="text-sm font-semibold text-slate-900">HR Input</div>
              </div>
              <div className="text-xs text-slate-600">AI: "Can you provide specific examples of culture fit?"</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-green-500 rounded-full"></div>
                <div className="text-sm font-semibold text-slate-900">Finance Input</div>
              </div>
              <div className="text-xs text-slate-600">AI: "What's the 3-year cost projection?"</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-500">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-purple-500 rounded-full"></div>
                <div className="text-sm font-semibold text-slate-900">Engineering Input</div>
              </div>
              <div className="text-xs text-slate-600">AI: "Have you considered scalability?"</div>
            </div>
          </div>
        </div>
      </div>

      {/* Step 4: One Intelligence Synthesizes */}
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div className="order-2 md:order-1">
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-8 shadow-lg border-2 border-blue-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                AI
              </div>
              <div className="text-lg font-bold text-slate-900">Synthesis Complete</div>
            </div>
            <div className="space-y-3 text-sm text-slate-700">
              <div className="font-semibold text-slate-900">Integrated Analysis:</div>
              <div>✓ All perspectives considered</div>
              <div>✓ Full context maintained</div>
              <div>✓ Conflicts reconciled</div>
              <div>✓ Recommendations balanced</div>
              <div className="mt-4 pt-4 border-t border-blue-200">
                <span className="font-semibold text-blue-900">Result:</span>
                <span className="ml-2">One clear, actionable recommendation</span>
              </div>
            </div>
          </div>
        </div>
        <div className="order-1 md:order-2">
          <div className="inline-block px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold mb-4">
            STEP 4
          </div>
          <h4 className="text-2xl font-bold text-slate-900 mb-4">One Intelligence Synthesizes</h4>
          <p className="text-lg text-slate-600 leading-relaxed">
            The same AI that guided every conversation now synthesizes with complete context—not summarizing separate opinions, but integrating everything it witnessed into one clear, balanced recommendation.
          </p>
        </div>
      </div>

      {/* Step 5: Refine Together */}
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-block px-4 py-2 bg-pink-100 text-pink-700 rounded-full text-sm font-semibold mb-4">
            STEP 5
          </div>
          <h4 className="text-2xl font-bold text-slate-900 mb-4">Refine Together</h4>
          <p className="text-lg text-slate-600 leading-relaxed">
            Share the synthesis with your team. Collaborators provide feedback, rate the recommendation, and suggest improvements. AI helps you incorporate feedback and re-synthesize. When everyone's aligned, finalize your decision.
          </p>
        </div>
        <div className="bg-white rounded-xl p-8 shadow-lg">
          <div className="space-y-4">
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="text-sm font-semibold text-green-900 mb-1">✓ HR Approved</div>
              <div className="text-xs text-slate-600">"Great culture fit analysis"</div>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-sm font-semibold text-yellow-900 mb-1">⚠ Finance Feedback</div>
              <div className="text-xs text-slate-600">"Consider longer-term costs"</div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm font-semibold text-blue-900 mb-1">🔄 AI Re-synthesis</div>
              <div className="text-xs text-slate-600">Incorporating feedback...</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div className="mt-16 text-center">
      <p className="text-2xl font-bold text-slate-900">
        One workspace. <span className="text-blue-600">One AI.</span> Complete collaboration.
      </p>
    </div>
  </div>
</section>

      {/* Why Teams Choose CoPrompt - Benefits Focus */}
      <section className="py-20 bg-white px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-slate-900 mb-4">
              Why Teams Choose CoPrompt
            </h3>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Not just another collaboration tool. CoPrompt delivers outcomes that traditional workflows can't match.
            </p>
          </div>

          {/* Three Value Props - Benefits First */}
          <div className="grid md:grid-cols-3 gap-8">
            
            {/* Benefit 1: Better Decisions from Better Input */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-xl border border-blue-100">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-3">
                Better Decisions from Better Input
              </h4>
              <p className="text-slate-700 mb-4">
                CoPrompt's AI doesn't just collect opinions—it strengthens each perspective before synthesis. Every stakeholder is challenged, clarified, and elevated.
              </p>
              <p className="text-sm text-slate-600 italic">
                Result: Decisions based on thoroughly-vetted viewpoints, not surface-level reactions.
              </p>
            </div>

            {/* Benefit 2: Never Repeat Yourself */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-xl border border-purple-100">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-3">
                Never Repeat Yourself. Never Lose Context.
              </h4>
              <p className="text-slate-700 mb-4">
                One persistent AI participates in every conversation—from initial context to final synthesis. No information loss, no re-explaining, seamless continuity.
              </p>
              <p className="text-sm text-slate-600 italic">
                Result: Hours saved on "bringing people up to speed" and "what did they mean by that?"
              </p>
            </div>

            {/* Benefit 3: Catch Blind Spots */}
            <div className="bg-gradient-to-br from-green-50 to-teal-50 p-8 rounded-xl border border-green-100">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-3">
                Catch Blind Spots Before They Cost You
              </h4>
              <p className="text-slate-700 mb-4">
                Domain-specific guidance embedded in every module. For hiring: bias detection. For risk: root cause analysis. For strategy: assumption testing.
              </p>
              <p className="text-sm text-slate-600 italic">
                Result: The AI asks the critical questions you forgot to ask—before you commit.
              </p>
            </div>

          </div>

          {/* Bottom Reinforcement */}
          <div className="text-center mt-12 pt-8 border-t border-slate-200">
            <p className="text-lg text-slate-600">
              Unlike chat-based AI that responds to prompts, CoPrompt facilitates your entire decision process.
            </p>
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
{/* Built for Enterprise Trust */}
<section className="py-20 bg-slate-900 px-4 sm:px-6 lg:px-8">
  <div className="max-w-6xl mx-auto">
    {/* Section Header */}
    <div className="text-center mb-16">
      <h3 className="text-4xl font-bold text-white mb-4">
        Built for Enterprise Trust
      </h3>
      <p className="text-xl text-slate-300 max-w-3xl mx-auto">
        Security, transparency, and reliability at every step.
      </p>
    </div>

    {/* Four Trust Pillars */}
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
      
      {/* Trust Signal 1: Honest AI */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-slate-600 transition-colors">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h4 className="text-lg font-bold text-white mb-3">
          Honest AI
        </h4>
        <p className="text-sm text-slate-300 leading-relaxed">
          Our AI explicitly states when it's uncertain or lacks information. No hallucinations, no made-up facts—just clear, reliable analysis you can trust.
        </p>
      </div>

      {/* Trust Signal 2: Complete Audit Trail */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-slate-600 transition-colors">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h4 className="text-lg font-bold text-white mb-3">
          Full Audit Trail
        </h4>
        <p className="text-sm text-slate-300 leading-relaxed">
          Every input, every perspective, every synthesis iteration is preserved. Defend your decisions with complete documentation and traceability.
        </p>
      </div>

      {/* Trust Signal 3: Your Data, Your Control */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-slate-600 transition-colors">
        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h4 className="text-lg font-bold text-white mb-3">
          Your Data, Your Control
        </h4>
        <p className="text-sm text-slate-300 leading-relaxed">
          We never train AI models on your data. Your decisions, documents, and conversations remain private and confidential. You own your data, period.
        </p>
      </div>

      {/* Trust Signal 4: Enterprise Security */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-slate-600 transition-colors">
        <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-600 rounded-lg flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h4 className="text-lg font-bold text-white mb-3">
          Enterprise Security
        </h4>
        <p className="text-sm text-slate-300 leading-relaxed">
          Data encryption in transit and at rest. Role-based access controls. SOC 2 Type II compliance in progress. Built for organizations that take security seriously.
        </p>
      </div>

    </div>

    {/* Additional Trust Elements */}
    <div className="mt-12 grid md:grid-cols-3 gap-6">
      
      {/* Trust Element 1: No Lock-in */}
      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
        <div className="flex items-start">
          <div className="text-2xl mr-3">📤</div>
          <div>
            <h5 className="font-semibold text-white mb-2">Export Anytime</h5>
            <p className="text-sm text-slate-400">
              Download all your sessions, analyses, and documents. No lock-in, no proprietary formats.
            </p>
          </div>
        </div>
      </div>

      {/* Trust Element 2: Transparent AI */}
      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
        <div className="flex items-start">
          <div className="text-2xl mr-3">🔍</div>
          <div>
            <h5 className="font-semibold text-white mb-2">See How AI Thinks</h5>
            <p className="text-sm text-slate-400">
              AI explains its reasoning at every step. No black box decisions—you understand how conclusions are reached.
            </p>
          </div>
        </div>
      </div>

      {/* Trust Element 3: Human in Control */}
      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
        <div className="flex items-start">
          <div className="text-2xl mr-3">🎯</div>
          <div>
            <h5 className="font-semibold text-white mb-2">You Decide, AI Assists</h5>
            <p className="text-sm text-slate-400">
              CoPrompt facilitates and strengthens your team's thinking—it doesn't replace human judgment.
            </p>
          </div>
        </div>
      </div>

    </div>

    {/* Bottom Statement */}
    <div className="mt-12 text-center">
      <p className="text-slate-400 text-sm">
        Questions about security, compliance, or data handling? <a href="/contact" className="text-indigo-400 hover:text-indigo-300 underline">Contact us</a> for detailed documentation.
      </p>
    </div>
  </div>
</section>
{/* Pricing Section */}
      <section id="pricing-section" className="py-20 bg-white px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-slate-900 mb-4">Simple, Session-Based Pricing</h3>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Pay per session, not per seat. Your organisation buys credits — every team member can collaborate.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 items-stretch">

            {/* Starter */}
            <div className="border-2 border-slate-200 rounded-2xl p-8 flex flex-col">
              <div className="mb-6">
                <h4 className="text-xl font-bold text-slate-900 mb-1">Starter</h4>
                <p className="text-slate-500 text-sm">For small teams getting started</p>
              </div>
              <div className="mb-6">
                <span className="text-5xl font-bold text-slate-900">$200</span>
                <span className="text-slate-500 ml-2">/ pack</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-center gap-3 text-slate-600">
                  <span className="text-green-500 font-bold">✓</span>
                  20 sessions
                </li>
                
                <li className="flex items-center gap-3 text-slate-600">
                  <span className="text-green-500 font-bold">✓</span>
                  All modules included
                </li>
                <li className="flex items-center gap-3 text-slate-600">
                  <span className="text-green-500 font-bold">✓</span>
                  Unlimited collaborators per session
                </li>
                <li className="flex items-center gap-3 text-slate-600">
                  <span className="text-green-500 font-bold">✓</span>
                  Full synthesis & export
                </li>
              </ul>
              
                <a href="mailto:hello@coprompt.net?subject=Starter Plan Enquiry"
                className="block text-center py-3 px-6 border-2 border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
               Get Started
              </a>
            </div>

            {/* Growth - Highlighted */}
            <div className="border-2 border-blue-600 rounded-2xl p-8 flex flex-col relative shadow-xl">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  MOST POPULAR
                </span>
              </div>
              <div className="mb-6">
                <h4 className="text-xl font-bold text-slate-900 mb-1">Growth</h4>
                <p className="text-slate-500 text-sm">For teams running regular decision cycles</p>
              </div>
              <div className="mb-6">
                <span className="text-5xl font-bold text-blue-600">$500</span>
                <span className="text-slate-500 ml-2">/ pack</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-center gap-3 text-slate-600">
                  <span className="text-green-500 font-bold">✓</span>
                  60 sessions
                </li>
                
                <li className="flex items-center gap-3 text-slate-600">
                  <span className="text-green-500 font-bold">✓</span>
                  All modules included
                </li>
                <li className="flex items-center gap-3 text-slate-600">
                  <span className="text-green-500 font-bold">✓</span>
                  Unlimited collaborators per session
                </li>
                <li className="flex items-center gap-3 text-slate-600">
                  <span className="text-green-500 font-bold">✓</span>
                  Full synthesis & export
                </li>
                <li className="flex items-center gap-3 text-slate-600">
                  <span className="text-green-500 font-bold">✓</span>
                  Priority support
                </li>
              </ul>
              
                <a href="mailto:hello@coprompt.net?subject=Growth Plan Enquiry"
                className="block text-center py-3 px-6 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Get Started
              </a>
            </div>

            {/* Enterprise */}
            <div className="border-2 border-slate-200 rounded-2xl p-8 flex flex-col bg-slate-900">
              <div className="mb-6">
                <h4 className="text-xl font-bold text-white mb-1">Enterprise</h4>
                <p className="text-slate-400 text-sm">For organisations running at scale</p>
              </div>
              <div className="mb-6">
                <span className="text-5xl font-bold text-white">Custom</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-center gap-3 text-slate-300">
                  <span className="text-green-400 font-bold">✓</span>
                  Pooled credits across teams
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <span className="text-green-400 font-bold">✓</span>
                  Admin dashboard
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <span className="text-green-400 font-bold">✓</span>
                  SSO / identity management
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <span className="text-green-400 font-bold">✓</span>
                  Volume pricing
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <span className="text-green-400 font-bold">✓</span>
                  Dedicated onboarding
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <span className="text-green-400 font-bold">✓</span>
                  SLA & compliance support
                </li>
              </ul>
              
               <a href="mailto:hello@coprompt.net?subject=Enterprise Plan Enquiry"
                className="block text-center py-3 px-6 border-2 border-slate-500 text-white rounded-lg font-semibold hover:border-slate-300 transition-colors"
              >
                Contact Us
              </a>
            </div>

          </div>

          {/* Free tier note */}
          <div className="mt-12 text-center p-6 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-blue-900 font-semibold text-lg mb-1">🎁 First 10 sessions are free</p>
            <p className="text-blue-700 text-sm">No credit card required. Experience CoPrompt with your team before committing.</p>
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
            No signup required • First 10 sessions free
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
        <div className="flex items-center gap-2 mb-4">
  <CoPromptLogo size={24} />
  <h3 className="text-xl font-bold">CoPrompt</h3>
</div>
        <p className="text-slate-400">
          Collaboration Reimagined
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