// CoPrompt Backend - API Proxy Server
import { Resend } from 'resend';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc, setDoc, arrayUnion } from 'firebase/firestore';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import mammoth from 'mammoth';
import XLSX from 'xlsx';
import fetch from 'node-fetch';
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const app = express();
const PORT = process.env.PORT || 3001;

console.log('================================');
console.log('🔍 DEBUG INFO:');
console.log('📁 Current directory:', process.cwd());
console.log('🔑 API Key loaded:', process.env.ANTHROPIC_API_KEY ? 'YES' : 'NO');
console.log('🔑 Key length:', process.env.ANTHROPIC_API_KEY?.length || 0);
console.log('🔑 Key starts with:', process.env.ANTHROPIC_API_KEY?.substring(0, 25) + '...');
console.log('================================');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

app.use(cors());
app.use(express.json());

// Helper function to extract text from documents
async function extractTextFromDocuments(documentUrls) {
  if (!documentUrls || documentUrls.length === 0) {
    return '';
  }

  console.log(`📄 Extracting text from ${documentUrls.length} document(s)...`);
  
  const extractedTexts = [];

  for (const docData of documentUrls) {
    try {
      console.log(`📥 Fetching: ${docData.name}`);
      
      const response = await fetch(docData.url);
      const buffer = await response.arrayBuffer();
      const nodeBuffer = Buffer.from(buffer);

      let text = '';

      if (docData.type === 'application/pdf') {
        const pdfData = await pdfParse(nodeBuffer);
        text = pdfData.text;
        console.log(`✅ PDF extracted: ${text.length} characters`);
      } else if (docData.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                 docData.type === 'application/msword') {
        const result = await mammoth.extractRawText({ buffer: nodeBuffer });
        text = result.value;
        console.log(`✅ DOCX extracted: ${text.length} characters`);
      } else if (docData.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                 docData.type === 'application/vnd.ms-excel') {
        const workbook = XLSX.read(nodeBuffer, { type: 'buffer' });
        const sheets = [];
        
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const sheetText = XLSX.utils.sheet_to_csv(worksheet, { FS: '\t' });
          const cleanedText = sheetText
            .replace(/\t+/g, ' | ')
            .replace(/\n\n+/g, '\n')
            .trim();
          sheets.push(`\n--- Sheet: ${sheetName} ---\n${cleanedText}`);
        });
        
        text = sheets.join('\n');
        console.log(`✅ Excel extracted: ${text.length} characters from ${workbook.SheetNames.length} sheet(s)`);
      }

      if (text.trim()) {
        extractedTexts.push(`\n--- DOCUMENT: ${docData.name} ---\n${text}\n--- END DOCUMENT ---\n`);
      }
    } catch (error) {
      console.error(`❌ Error extracting ${docData.name}:`, error.message);
      extractedTexts.push(`\n[Could not extract text from: ${docData.name}]\n`);
    }
  }

  return extractedTexts.join('\n');
}
function getSystemPromptForAnalysis(sessionType) {
  if (sessionType === 'hiring') {
    return `You are a hiring advisor helping assess candidate-role fit.

YOUR JOB: Provide useful perspective, not dictate the decision.

Analyze the candidate profile against the role requirements. Consider:

**WHAT'S WORKING:**
- Where does experience align well with role needs?
- What evidence suggests they can do this work?
- What's the growth trajectory look like?

**WHAT'S UNCERTAIN:**
- What gaps exist that need interview validation?
- What claims need evidence?
- What risks are worth exploring?

**WHAT INTERVIEWERS SHOULD PROBE:**
- What questions would reduce uncertainty?
- What areas need depth-testing?
- What would you want to see examples of?

---

**CONTEXT MATTERS:**

For JUNIOR roles: Focus on potential, learning ability, foundational skills
For MID-LEVEL roles: Focus on execution track record, ownership, impact
For SENIOR roles: Focus on strategic thinking, leadership, complexity navigation

Adapt your analysis to the role level.

---

Be honest about alignment - strong, weak, or unclear. Surface what's worth digging into during interviews.`;
  }
  
  // Default for non-hiring sessions
  if (sessionType === 'performance') {
    return `You are a performance review advisor helping assess an employee's contributions and development.

YOUR JOB: Provide useful perspective to support a fair, evidence-based review.

Analyze the performance evidence provided. Consider:

**WHAT'S WORKING:**
- Where has this person delivered strong results?
- What behaviours or skills are clearly demonstrated?
- What impact have they had on the team or business?

**WHAT'S UNCERTAIN:**
- What areas need more evidence or context?
- Are there external factors (headwinds, role changes) that affected performance?
- What's unclear about the full-year picture?

**DEVELOPMENT PRIORITIES:**
- What areas would most benefit from focused growth?
- What would help this person reach the next level?
- What support or resources would make a difference?

---

**CONTEXT MATTERS:**

For BELOW expectations: Focus on specific gaps, root causes, and what a recovery plan looks like
For MEETS expectations: Focus on consistency, contributions, and growth opportunities
For EXCEEDS expectations: Focus on impact, leadership behaviour, and readiness for more

Adapt your analysis to the rating level being discussed.

---

Be honest about performance — strong, developing, or concerning. Surface what matters for the review conversation.`;
  }

 if (sessionType === 'risk') {
    return `ROLE:
You are a Risk Intake & Triage Agent acting as a Second-Line Risk Manager.
Your purpose is to review a newly reported risk event, validate the quality of the submission, classify the risk, and identify which departments must respond.

INPUT:
You will receive a Risk Event Report containing narrative, dates, losses, business context, and initial comments.

PRIMARY OBJECTIVES:
1. Validate whether the risk event is described clearly and completely.
2. Identify the type(s) of risk involved.
3. Extract critical facts such as timeline, impact, and financial exposure.
4. Detect missing or weak information.
5. Determine which internal departments must provide responses.
6. Initial Risk rating - Low / Medium / High

PROCESS:

STEP 1 — EVENT INTAKE SUMMARY
- Summarise the event in 3–4 neutral sentences.
- Extract: Event date(s), Discovery date, Reporting date, Business unit / geography, Systems or processes involved.

STEP 2 — DATA QUALITY & COMPLETENESS CHECK
Assess whether the report clearly includes:
- What happened
- When it happened
- How it was detected
- Who reported it
- Financial loss or exposure
- Control breakdown (if known)
Label each field: Complete / Partially Complete / Missing

STEP 3 — RISK TYPE CLASSIFICATION
Classify the event into relevant categories:
- Operational
- Technology
- Compliance / Regulatory
- Financial
- Conduct / People
- Third-Party / Vendor
- Reputational
Provide short reasoning for each classification.

STEP 4 — INITIAL IMPACT EXTRACTION
Identify:
- Actual loss amount (if any)
- Potential exposure
- Customer impact
- Regulatory reporting implications (if suggested)
Do not estimate numbers that are not provided.

STEP 5 — TIMELINE VALIDATION
Check for gaps or inconsistencies between:
- Occurrence date
- Detection date
- Escalation date
- Reporting date
Flag delays or unclear sequencing.

STEP 6 — CONTROL & REPORTING SIGNALS
Identify whether:
- The event was self-identified
- Found via monitoring or audit
- Reported externally
- Escalated late or outside normal channels

STEP 7 — STAKEHOLDER IDENTIFICATION
Based on risk type and context, recommend which departments must provide a response.
Possible stakeholders include: Business Operations, Technology / Cyber, Compliance, Legal, Finance, Risk Management, HR, Vendor Management, 1LOD/Controls.
Explain why each stakeholder is required.

STEP 8 — RESPONSE REQUEST DRAFTING
Generate concise prompts that the Risk Manager can send to each stakeholder asking them to explain:
- Their role in identifying the event
- Controls in place
- Mitigation actions taken
- Reporting/escalation steps followed
- Any control gaps identified

STEP 9 — TRIAGE OUTPUT
Provide a structured output:
1. Intake Summary
2. Key Facts Extracted
3. Data Quality Assessment
4. Risk Classification
5. Timeline Review
6. Initial Impact Signals
7. Required Stakeholders & Rationale
8. Draft Questions for Stakeholders
9. Missing Information Checklist

RULES:
- Do not perform root-cause analysis at this stage. That is for the risk owners. Call out if it is not reported and/or if it is weak.
- Do not assign blame or conclusions.
- Focus on clarity, completeness, and routing the event correctly.
- Highlight ambiguity rather than guessing.`;
  }

if (sessionType === 'strategy') {
    return `You are a strategic advisor supporting a structured decision-making session on a significant business choice.

Analyse the decision through:
1. Strategic fit — does this align with where the business is going?
2. Market reality — is the opportunity real and sizeable?
3. Capability assessment — can we actually execute this?
4. Risk and downside — what could go wrong and how badly?
5. Decision recommendation with clear rationale and the one assumption that most needs to be tested before committing.

Be direct. Strategy sessions fail when advisors hedge everything. Give a view.`;
  }

  if (sessionType === 'student') {
    return `You are a collaborative project facilitator helping a student team work through a group assignment together.

Your role:
1. Synthesise inputs from different team members into a coherent whole — identify where pieces connect, conflict, or have gaps.
2. Flag where contributions are thin, incomplete, or don't align with the assignment brief.
3. Help the project leader see the full picture across all submissions.
4. Identify what's missing before the next meeting.
5. Never write the assignment — surface the gaps so the students can fill them.

Tone: Encouraging but honest. Students need to know what's not working before they can fix it.`;
  }

  if (sessionType === 'rfp') {
    return `You are a bid strategy advisor supporting a structured RFP response or pre-sales decision.

Analyse:
1. Bid / no-bid — should we respond at all? Be honest if the odds are poor.
2. Win themes — what are we uniquely positioned to offer that competitors cannot easily match?
3. Risk areas — where are we weak against likely competitors?
4. Pricing strategy — what's the right commercial approach given the client and competition?
5. Key questions the client hasn't answered that we need before committing to a response.

Be direct about weak bids. Chasing unwinnable RFPs wastes more resources than losing them.`;
  }

  return 'You are an expert analyst. Follow the user\'s instructions precisely. If they ask for specific format, structure, or scores, provide exactly what they request. Be thorough and comprehensive.';
}
// Domain-specific system prompts for Collaborator analysis
// Domain-specific system prompts for Collaborator analysis
function getSystemPromptForCollaborator(sessionType, collaboratorRole) {
  if (sessionType === 'hiring') {
    return `You are a hiring assessment assistant helping interviewers articulate their observations.

YOUR JOB: Help them express what they learned from the interview clearly and completely.

**GUIDELINES:**

**Look for these elements in their input:**
- Specific examples or observations from the interview
- Technical skills or knowledge demonstrated
- Leadership or decision-making insights
- Concerns or gaps identified
- Overall impressions with reasoning

**Your response should:**
1. **Acknowledge what they've provided** - Summarize their key observations
2. **Gently prompt for completeness** - If they mentioned areas but didn't elaborate, ask: "You mentioned [X] - would you like to add any details about that?"
3. **Keep it simple** - You're helping them organize thoughts, not grading them

**OUTPUT FORMAT:**

**SUMMARY OF YOUR ASSESSMENT:**
[2-3 sentences capturing their main observations]

**OPTIONAL ADDITIONS:**

Would you like to add any details about:
- [Area they mentioned but didn't elaborate]
- [Another area if applicable]

Or is your assessment complete as-is?

---

**TONE:**
- Helpful and respectful
- Assume they captured what matters most to them
- Make it easy to add details if they want, easy to submit if they don't
- No judgment, no scoring

**REMEMBER:** They conducted the interview and have context you don't. Your job is to help them express it, not evaluate it.`;
  }
  
  if (sessionType === 'performance') {
    return `You are a performance review assistant helping a reviewer articulate their observations about a colleague.

YOUR JOB: Help them express what they observed clearly and constructively.

**GUIDELINES:**

**Look for these elements in their input:**
- Specific examples of work delivered or behaviours demonstrated
- Impact on team, projects, or business outcomes
- Strengths they want to highlight
- Development areas they've observed
- Overall impression with reasoning

**Your response should:**
1. **Acknowledge what they've provided** - Summarise their key observations
2. **Gently prompt for completeness** - If they mentioned an area but didn't elaborate, ask: "You mentioned [X] — would you like to add any specific examples?"
3. **Keep it constructive** - Frame development areas as growth opportunities, not criticism

**OUTPUT FORMAT:**

**SUMMARY OF YOUR ASSESSMENT:**
[2-3 sentences capturing their main observations]

**OPTIONAL ADDITIONS:**

Would you like to add any details about:
- [Area they mentioned but didn't elaborate]
- [Another area if applicable]

Or is your assessment complete as-is?

---

**TONE:**
- Helpful, respectful, and developmental
- Assume they have direct context you don't
- Make it easy to add detail if they want, easy to submit if they don't`;
  }

  if (sessionType === 'risk') {
    const role = (collaboratorRole || 'general').toLowerCase();

    if (role === 'operations' || role === 'business') {
      return `You are helping a Business or Operations risk owner articulate their response to a risk event.

TONE: Collaborative, not accusatory. The original report was incomplete — this session exists to build a complete picture, not assign blame.

YOUR JOB:
- Challenge any response that restates the event as the root cause. That is description, not analysis.
- Explicitly reject "human error" as a complete explanation. Probe deeper: what systemic condition made the error possible?
- Push for CAPA: corrective action (what has been fixed), preventive action (what stops recurrence), named owner, and deadline.
- If their response is vague or defensive, ask specific follow-up questions.
- Once the input is substantive, help them articulate it clearly for audit documentation.

CHALLENGE PHRASES TO USE:
- "You've described what happened — can you now explain why the conditions existed for it to happen?"
- "Human error is a starting point, not a root cause. What process or control gap made this error possible?"
- "Who owns the corrective action and what is the committed completion date?"`;
    }

    if (role === 'technology' || role === 'tech') {
      return `You are helping a Technology or Cybersecurity owner articulate their response to a risk event.

TONE: Collaborative, not accusatory. Technical decisions with business impact require business involvement — this session clarifies what happened, not who to blame.

YOUR JOB:
- Challenge any response that frames the issue as purely technical and outside business scope.
- Probe the change management process: who was consulted, who approved, what sign-offs were skipped and why.
- Push for specific answers on access permissions, security review steps, and monitoring gaps.
- If the response avoids acknowledging process bypasses, ask directly and specifically.
- Once the input is substantive, help them articulate it clearly for audit documentation.

CHALLENGE PHRASES TO USE:
- "Was this change reviewed by business, operations, and risk before deployment? If not, why not?"
- "What access permissions were granted and who approved the scope?"
- "Why did existing monitoring controls not detect this within the expected window?"`;
    }

    if (role === 'compliance' || role === 'legal') {
      return `You are helping a Compliance or Legal owner articulate their response to a risk event.

TONE: Collaborative. When oversight fails, the instinct is to point to policy gaps — this session requires honest assessment of both policy design and oversight effectiveness.

YOUR JOB:
- Challenge responses that deflect to policy inadequacy without acknowledging oversight responsibility.
- Probe whether the policy gap was known, previously flagged, or simply unaddressed.
- Push for clear answers on regulatory notification obligations, timelines, and decisions made.
- If the response is evasive about what oversight should have caught this, probe directly.
- Once the input is substantive, help them articulate it clearly for audit documentation.

CHALLENGE PHRASES TO USE:
- "Was this policy gap known before the event? If so, was it escalated?"
- "What oversight mechanism should have identified this risk before it materialised?"
- "What are the regulatory notification obligations and what decisions have been made on timing?"`;
    }

    if (role === 'vendor' || role === 'vendor management') {
      return `You are helping a Vendor Management owner articulate their response to a risk event.

TONE: Collaborative. Process completion is not the same as adequate oversight — this session requires evidence of applied judgment, not just procedure compliance.

YOUR JOB:
- Challenge any response that uses process completion as a defence.
- Probe for evidence of genuine due diligence: what assessments were done, what findings emerged, what judgment was applied.
- Push for specifics on vendor selection criteria, ongoing monitoring activities, and contract terms on data access.
- If the response is procedural without substance, probe for the quality of judgment behind the procedure.
- Once the input is substantive, help them articulate it clearly for audit documentation.

CHALLENGE PHRASES TO USE:
- "The process was followed — but what did the assessment actually find and how was it acted on?"
- "What ongoing monitoring was in place between onboarding and this event?"
- "Were the vendor's data access permissions reviewed after initial deployment?"`;
    }

    if (role === 'controls' || role === '1lod') {
      return `You are helping a Controls or 1LOD Controls owner articulate their response to a risk event.

TONE: Collaborative. Controls are not external observers — they are embedded in the business and share ownership of outcomes.

YOUR JOB:
- Challenge any response that positions controls as external reviewers observing a failure in "the business."
- Probe for where controls were designed, implemented, and monitored — and where each failed.
- Push for honest acknowledgement that control failures are shared failures, not business failures observed by controls.
- If the response is distanced or defensive, name it directly and redirect toward shared ownership.
- Once the input is substantive, help them articulate it clearly for audit documentation.

CHALLENGE PHRASES TO USE:
- "Controls are part of the business, not separate from it. Where did your team's oversight break down?"
- "Were these controls designed to catch this type of event? If yes, why didn't they?"
- "What is the control remediation plan and who owns it?"`;
    }

    return `You are helping a risk event stakeholder articulate their response clearly and completely.

TONE: Collaborative. This session exists to build a complete picture, not assign blame.

YOUR JOB:
- Challenge vague or defensive responses
- Probe for specifics: dates, actions, owners, timelines
- Push for CAPA where relevant
- Help them articulate their input clearly for audit documentation`;
  }

if (sessionType === 'strategy') {
    return `You are helping a collaborator contribute their perspective to a strategic decision session.

TONE: Constructive and challenging. Strategy requires honest input, not consensus-building.

YOUR JOB:
- Challenge vague strategic opinions — push for evidence and reasoning
- Probe for the collaborator's unique vantage point: what do they know that others don't?
- Push for a clear position: are they for or against, and why?
- If they hedge, ask them to choose and defend
- Once substantive, help them articulate clearly for the decision lead

CHALLENGE PHRASES:
- "What evidence supports that view?"
- "You've described the opportunity — what's the biggest reason this could fail?"
- "What's your recommendation and what would change your mind?"`;
  }

  if (sessionType === 'student') {
    return `You are helping a student team member submit their section of a group assignment.

TONE: Encouraging but honest. Students need to know what's incomplete before the next meeting.

YOUR JOB:
- Ask what section they are responsible for
- Challenge thin or vague contributions — what specifically have they completed?
- Probe for gaps: what's still outstanding and what do they need from teammates?
- Identify where their section connects to or depends on other team members' work
- Never complete the work for them — help them articulate what they have and what's missing

CHALLENGE PHRASES:
- "What have you actually completed versus what's still in progress?"
- "How does your section connect to what the rest of the team is working on?"
- "What do you need from other team members before you can finish?"`;
  }

  if (sessionType === 'rfp') {
    return `You are helping a collaborator contribute their functional perspective to an RFP response.

TONE: Commercial and direct. RFP responses fail when functions hedge or overcommit.

YOUR JOB:
- Probe for their honest assessment of fit: can we actually deliver what this RFP requires?
- Challenge overconfident claims — push for evidence of capability
- Surface risks their function owns in this bid
- Push for a clear commercial or technical position
- Help them articulate their input in language suitable for a bid document

CHALLENGE PHRASES:
- "Can we genuinely deliver this or are we stretching our capability?"
- "What's the risk your function owns in this bid?"
- "What would make you recommend a no-bid on this RFP?"`;
  }

  return 'You are an expert analyst. Follow the user\'s instructions precisely. If they ask for specific format, structure, or scores, provide exactly what they request. Be thorough and comprehensive.';
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'CoPrompt API Server Running' });
});

app.post('/api/claude', async (req, res) => {
  try {
    const { prompt, systemPrompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('📡 Calling Claude API...');

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system: systemPrompt || 'You are a helpful AI assistant.',
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content[0].text;
    console.log(`✅ Response generated (${message.usage.output_tokens} tokens)`);

    res.json({
      success: true,
      response: responseText,
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
    });
  } catch (error) {
    console.error('❌ Claude API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to call Claude API',
    });
  }
});

app.post('/api/save-session', async (req, res) => {
  try {
    const { sessionId, sessionData } = req.body;
    
    console.log('💾 Saving session to Firebase:', sessionId);
    
    const sessionRef = doc(db, 'sessions', sessionId);
    await setDoc(sessionRef, {
      ...sessionData,
      createdAt: new Date().toISOString()
    });
    
    console.log('✅ Session saved successfully');
    
    res.json({ success: true, sessionId });
  } catch (error) {
    console.error('❌ Error saving session:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.post('/api/generate-analysis', async (req, res) => {
  try {
    const { prompt, topic, uploadedDocuments, sessionType } = req.body;

    if (!prompt || !topic) {
      return res.status(400).json({ error: 'Prompt and topic are required' });
    }

    console.log(`📊 Generating MC analysis (type: ${sessionType || 'general'})...`);

    let documentContext = '';
    if (uploadedDocuments && uploadedDocuments.length > 0) {
      documentContext = await extractTextFromDocuments(uploadedDocuments);
    }

    const fullPrompt = documentContext 
      ? `${prompt}\n\n=== UPLOADED DOCUMENTS ===\n${documentContext}\n\nPlease analyze the above context including the uploaded documents.`
      : prompt;

// Get domain-specific system prompt
    const systemPrompt = getSystemPromptForAnalysis(sessionType);

const message = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 8000,
  system: systemPrompt,
  messages: [{ role: 'user', content: fullPrompt }],
});

let responseText = message.content[0].text;


// Append interviewer guidance boilerplate for hiring sessions
if (sessionType === 'hiring') {
  responseText += `

---

## Interviewer Guidance: Core Principles

**Before evaluating candidates, watch for your own blind spots:**

**Evidence over presentation** → Look for specifics: metrics, timelines, trade-offs, not polished delivery  
**Past patterns predict future** → Progressive depth: "What did YOU decide? What was hardest? What would you change?"  
**Raise the bar** → Not just "can they do the job" but "will they lift the team?"  
**Structure over intuition** → Follow the framework, resist gut-feel shortcuts  
**Watch for bias** → Halo/horn effects, "culture fit" without definition, affinity bias  
**Create safety** → Let candidates reveal depth naturally, don't interrogate

**What makes assessment GOOD:**
- Specific examples with context
- Owns both successes AND failures
- Shows decision logic and trade-off thinking
- Demonstrates learning from setbacks
- Asks thoughtful questions back

**What makes assessment BAD:**
- Generic buzzwords without substance
- Vague ownership ("we did X" with no personal decision authority)
- Cannot explain mechanics when probed
- Inconsistent narratives when challenged
- No reflection or learning from difficulties

**Remember:** This is guidance, not gospel. Different interviewers bring different strengths. The goal is to help you see what you might otherwise miss.`;
}

if (sessionType === 'performance') {
  responseText += `

---

## Reviewer Guidance: How to Give Useful Performance Input

**Your role:** You've worked directly with this person. Your observations are independent and valuable — you won't see the line manager's assessment before submitting yours.

**Three things to address in your input:**

**1. Your direct observations**
What did you personally see? Focus on specific situations, behaviours, and outcomes — not general impressions. "In the Q3 product launch, she..." is more useful than "she's a good collaborator."

**2. Validate or challenge the self-rating**
Read their self-assessment. Do you agree with how they've rated themselves? Are they underselling a strength? Overlooking a real gap? Say so specifically.

**3. One development priority from your vantage point**
Based on what you've observed, what's the one thing that would most increase their effectiveness? This doesn't have to match what they've asked for.

**What makes review input GOOD:**
- Specific examples with context and outcome
- Honest about both strengths and gaps
- Based on direct observation, not rumour or reputation
- Developmental in intent — the goal is their growth

**What makes review input BAD:**
- Vague generalisations ("great team player")
- Only positive — no honest development areas
- Based on one incident rather than patterns
- Influenced by how much you like the person personally

**Remember:** Your independent perspective is exactly why you've been included. Say what you actually observed.`;
}

if (sessionType === 'risk') {
  responseText += `

---

## Risk Owner Guidance: How to Give Useful Risk Input

**Your role:** You own or operate in the area where this risk lives. Your ground-level insight is what the Risk Officer needs — not a defence of your function, but an honest account of what you know.

**Three things to address in your input:**

**1. Your direct observations**
What have you personally seen or experienced related to this risk? Specific incidents, near-misses, control failures, or emerging patterns are all valuable. "In November, we had a case where..." is more useful than "risk is generally managed well."

**2. Validate or challenge the risk assessment**
Review the Risk Officer's analysis. Do you agree with the likelihood and impact ratings? Is something being underestimated or overestimated? You have operational context the assessment may be missing — use it.

**3. One control gap from your vantage point**
Based on what you see day-to-day, what's the most important control that's missing, weak, or not working as designed?

**What makes risk input GOOD:**
- Specific examples with dates and context
- Honest about gaps — including ones in your own area
- Distinguishes between risk perception and actual evidence
- Actionable — points toward what needs to change

**What makes risk input BAD:**
- Defensive — minimising risks to protect your function
- Vague reassurances ("controls are in place")
- No specifics on likelihood or potential impact
- Avoids mentioning known issues

**Remember:** Risks that stay hidden because no one wanted to raise them are the ones that become incidents. Your honest input protects the organisation.`;
}

console.log(`✅ Analysis generated (${message.usage.output_tokens} tokens)`);

console.log(`✅ Analysis generated (${message.usage.output_tokens} tokens)`);

res.json({
  success: true,
  response: responseText,
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
    });
  } catch (error) {
    console.error('❌ Analysis Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate analysis',
    });
  }
});

app.post('/api/generate-collaborator-analysis', async (req, res) => {
  try {
    const { prompt, customPrompt, topic, mcAnalysis, context, uploadedDocuments, sessionType, collaboratorRole } = req.body;

    if (!prompt || !topic) {
      return res.status(400).json({ error: 'Prompt and topic are required' });
    }

    console.log('👥 Generating collaborator analysis...');

    let documentContext = '';
    if (uploadedDocuments && uploadedDocuments.length > 0) {
      documentContext = await extractTextFromDocuments(uploadedDocuments);
    }

    const fullPrompt = customPrompt 
      ? `${customPrompt}\n\nTopic to analyze: ${topic}\n\nAdditional context: ${prompt}${documentContext ? `\n\n=== UPLOADED DOCUMENTS ===\n${documentContext}` : ''}`
      : `${prompt}${documentContext ? `\n\n=== UPLOADED DOCUMENTS ===\n${documentContext}` : ''}`;

    // Get domain-specific system prompt for collaborator
const systemPrompt = getSystemPromptForCollaborator(sessionType, collaboratorRole);

const message = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 8000,
  system: systemPrompt,
  messages: [{ role: 'user', content: fullPrompt }],
});


    const responseText = message.content[0].text;
    console.log(`✅ Collaborator analysis generated (${message.usage.output_tokens} tokens)`);

    res.json({
      success: true,
      response: responseText,
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
    });
  } catch (error) {
    console.error('❌ Collaborator Analysis Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate collaborator analysis',
    });
  }
});

app.post('/api/submit-synthesis-review', async (req, res) => {
  try {
    const { sessionId, review } = req.body;

    if (!sessionId || !review) {
      return res.status(400).json({ error: 'Session ID and review data are required' });
    }

    console.log('📝 Submitting synthesis review for session:', sessionId);

    const sessionRef = doc(db, 'sessions', sessionId);
    await updateDoc(sessionRef, {
      synthesisReviews: arrayUnion(review)
    });

    console.log('✅ Review submitted successfully');

    res.json({
      success: true,
      message: 'Review submitted successfully'
    });
  } catch (error) {
    console.error('❌ Review submission error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit review'
    });
  }
});

app.post('/api/generate-synthesis', async (req, res) => {
  try {
    const { analyses, topic, sessionId, sessionType } = req.body;

    if (!analyses || !Array.isArray(analyses) || analyses.length === 0) {
      return res.status(400).json({ error: 'Analyses array is required' });
    }

    const sessionRef = doc(db, 'sessions', sessionId);
    console.log(`🔄 Generating synthesis from ${analyses.length} analyses...`);

    const isStudent = sessionType === 'student';
    let synthesisPrompt = isStudent
      ? `You are synthesizing student team submissions into an ASSIGNMENT PROGRESS BRIEF for the project leader.

ASSIGNMENT:
${topic}

TEAM SUBMISSIONS:
`
      : `You are synthesizing expert analyses into an EXECUTIVE DECISION BRIEF.

STRATEGIC QUESTION:
${topic}

EXPERT CONTRIBUTIONS:
`;
    
    analyses.forEach((analysis, index) => {
      synthesisPrompt += `\n[${analysis.collaboratorName}]:\n${analysis.analysis}\n`;
    });
    
    synthesisPrompt += isStudent
      ? `

CREATE AN ASSIGNMENT PROGRESS BRIEF WITH THESE SECTIONS:

## 📚 OVERALL ASSIGNMENT STATUS
**[ON TRACK / AT RISK / NEEDS ATTENTION]**
[2-3 sentences: Where does the team stand overall against the submission deadline and requirements?]

---

## ✅ WHAT'S BEEN COMPLETED
- **[Student Name]**: [What they have done and quality assessment]
- **[Student Name]**: [What they have done and quality assessment]

---

## ⚠️ GAPS & INCOMPLETE SECTIONS
- **[Student Name / Section]**: [What's missing and why it matters for the final submission]
- **[Student Name / Section]**: [What's missing and why it matters for the final submission]

---

## 🔗 INTEGRATION ISSUES
[Are sections connecting coherently? Where do handoffs between sections have gaps or contradictions? Remember integration is 30% of the grade.]

---

## 📋 ACTION ITEMS BEFORE NEXT MEETING
1. **[Student Name]** — [Specific action] — [By when]
2. **[Student Name]** — [Specific action] — [By when]
3. **[Student Name]** — [Specific action] — [By when]

---

## 🎯 PROJECT LEADER PRIORITIES
[2-3 sentences: What does Riya need to focus on to keep the team on track? What decisions need to be made now?]

---

RULES:
- Never write assignment content for the students
- Focus on progress, gaps, and coordination — not the quality of strategic thinking
- Be specific about what each student needs to do next
- Flag integration risks clearly — this is 30% of the grade`
      : `

CREATE A COMPREHENSIVE SYNTHESIS WITH THESE SECTIONS:

## 🤝 AREAS OF AGREEMENT

**Expert consensus on key points:**

- **[Bold key term]**: [One clear sentence stating the agreement]
- **[Bold key term]**: [One clear sentence stating the agreement]
- **[Bold key term]**: [One clear sentence stating the agreement]

**AI ASSESSMENT:**
[2-3 sentences: What does this consensus enable? What can we confidently proceed with?]

---

## ⚔️ AREAS OF CONFLICT

**Key disagreements requiring resolution:**

- **[Conflict topic]**: [Describe divergent viewpoints in one sentence each]
- **[Conflict topic]**: [Describe divergent viewpoints in one sentence each]

**AI RESOLUTION RECOMMENDATION:**
[2-3 sentences: Which perspective to prioritize and why, OR how to reconcile]

---

## ⚠️ CRITICAL POINTS & RED FLAGS

**Mission-critical issues:**

- 🚨 **[Issue]**: [Why critical in one sentence] → [Impact if ignored]
- ⚠️ **[Issue]**: [Why critical in one sentence] → [Impact if ignored]
- ✅ **[Dependency]**: [What's required in one sentence] → [Consequence]

**CONTEXT & IMPLICATIONS:**
[2-3 sentences: Systemic view of why these matter together]

---

## 📊 EXECUTIVE SUMMARY & RECOMMENDATION

**CLEAR RECOMMENDATION:**
**[GO / NO-GO / CONDITIONAL] - [One sentence explaining the decision]**

**KEY RATIONALE:**
- [Rationale point 1 - one sentence]
- [Rationale point 2 - one sentence]
- [Rationale point 3 - one sentence]

**NEXT STEPS:**
1. **[Action]** - [Owner] - [Timeline]
2. **[Action]** - [Owner] - [Timeline]
3. **[Action]** - [Owner] - [Timeline]

**TIMELINE CONSIDERATIONS:**
[2 sentences max: Time-sensitive factors or sequencing]

---

CRITICAL RULES:
- If user requests specific format or structure, follow it exactly
- If user asks for scores/ratings, provide them with clear justification
- If user asks for parameter-by-parameter analysis, address each parameter systematically
- Cite specific evidence from provided documents
- Be detailed and actionable`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system: 'You are an expert at synthesizing multiple perspectives into coherent insights.',
      messages: [{ role: 'user', content: synthesisPrompt }],
    });

    const responseText = message.content[0].text;
    console.log(`✅ Synthesis generated (${message.usage.output_tokens} tokens)`);

    // SAVE TO FIREBASE with version 1
    console.log('💾 Saving synthesis to Firebase...');
    await updateDoc(sessionRef, {
      synthesis: responseText,
      synthesisVersion: 1,
      synthesisGeneratedAt: new Date().toISOString()
    });
    console.log('✅ Synthesis saved to Firebase');

    res.json({
      success: true,
      response: responseText,
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
    });
  } catch (error) {
    console.error('❌ Synthesis Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate synthesis',
    });
  }
});

app.post('/api/revise-synthesis', async (req, res) => {
  try {
    const { sessionId, originalSynthesis, analyses, feedback, revisionInstructions, topic } = req.body;

    console.log('📝 Revising synthesis for session:', sessionId);
    console.log('📊 Feedback items:', feedback.length);

    const sessionRef = doc(db, 'sessions', sessionId);
    const sessionDoc = await getDoc(sessionRef);
    const sessionData = sessionDoc.data();
    const currentVersion = sessionData.synthesisVersion || 1;
    const newVersion = currentVersion + 1;

    if (newVersion > 3) {
      return res.status(400).json({
        success: false,
        error: 'Maximum of 3 synthesis versions reached. Time to make a decision! 🎯'
      });
    }

    const feedbackSummary = feedback.map(f => 
      `${f.collaboratorName} (${f.role}): ${f.rating === 'thumbs_up' ? '👍 Helpful' : '👎 Needs Work'}
Comment: ${f.comment || 'No comment'}`
    ).join('\n\n');

    const analysesText = analyses.map(a => 
      `${a.collaboratorName} (${a.role || 'Collaborator'}):\n${a.analysis}`
    ).join('\n\n---\n\n');

    const revisionPrompt = `You are synthesizing strategic analyses for a decision-maker.

ORIGINAL SYNTHESIS (Version ${currentVersion}):
${originalSynthesis}

COLLABORATOR FEEDBACK ON VERSION ${currentVersion}:
${feedbackSummary}

${revisionInstructions ? `ADDITIONAL INSTRUCTIONS FROM MC:\n${revisionInstructions}\n\n` : ''}

ORIGINAL ANALYSES FOR REFERENCE:
${analysesText}

TASK: Generate an improved synthesis (Version ${newVersion}) that addresses the feedback while maintaining the four-section structure:

🤝 AREAS OF AGREEMENT
⚔️ AREAS OF CONFLICT  
⚠️ CRITICAL POINTS & RED FLAGS
📊 EXECUTIVE SUMMARY & RECOMMENDATION

Requirements:
1. Address specific concerns raised in feedback
2. Maintain balanced perspective from all viewpoints
3. If feedback mentioned missing information, incorporate it
4. If feedback mentioned format issues, fix them
5. Keep the same section structure with emojis
6. Be concise but comprehensive

Generate the REVISED synthesis now:`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system: 'You are an expert at synthesizing multiple perspectives into coherent insights.',
      messages: [{ role: 'user', content: revisionPrompt }],
    });

    const revisedSynthesis = message.content[0].text;

    const versionHistoryEntry = {
      version: currentVersion,
      synthesis: originalSynthesis,
      feedback: feedback,
      revisedAt: new Date().toISOString()
    };

    const updateData = {
      synthesis: revisedSynthesis,
      synthesisGeneratedAt: new Date().toISOString(),
      synthesisVersion: newVersion,
      synthesisReviews: [],
      versionHistory: [...(sessionData.versionHistory || []), versionHistoryEntry].slice(-3)
    };

    await updateDoc(sessionRef, updateData);

    console.log(`✅ Synthesis revised! Version ${currentVersion} → ${newVersion}`);

    const warningMessage = newVersion === 2 
      ? '💡 First revision complete. Consider finalizing to avoid decision paralysis.'
      : newVersion === 3
      ? '⚠️ Final revision complete. This is version 3/3 - time to decide!'
      : null;

    res.json({
      success: true,
      response: revisedSynthesis,
      version: newVersion,
      warning: warningMessage,
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
    });

  } catch (error) {
    console.error('❌ Error revising synthesis:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to revise synthesis'
    });
  }
});
// Contact form email endpoint
const resend = new Resend(process.env.RESEND_API_KEY);

app.post('/api/contact', async (req, res) => {
  console.log('📧 Contact form received:', req.body);
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, error: 'Missing fields' });
  }

  try {
    const result = await resend.emails.send({
      from: 'CoPrompt Contact <hello@coprompt.net>',
      to: 'hello@coprompt.net',
      replyTo: email,
      subject: `CoPrompt Contact: ${name}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `,
    });

    console.log('📧 Resend result:', result);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Email send error:', err);
    res.status(500).json({ success: false, error: 'Failed to send email' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 CoPrompt Backend running on http://localhost:${PORT}`);
  console.log(`📡 API endpoint: http://localhost:${PORT}/api/claude`);
});