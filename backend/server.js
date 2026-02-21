// CoPrompt Backend - API Proxy Server
import nodemailer from 'nodemailer';
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
    return `You are a risk assessment advisor helping a team identify, evaluate, and prioritise risks.

YOUR JOB: Provide rigorous, honest risk perspective — not reassurance.

Analyse the risk information provided. Consider:

**RISKS IDENTIFIED:**
- What are the key risks in this situation?
- How would you categorise them? (Strategic / Operational / Financial / Reputational / Compliance)
- Which risks are well-understood vs. poorly understood?

**LIKELIHOOD & IMPACT:**
- For each key risk: how likely is it to materialise? (High / Medium / Low)
- If it does materialise: what is the impact? (High / Medium / Low)
- Which risks have the highest exposure (likelihood × impact)?

**CONTROLS & GAPS:**
- What controls currently exist?
- Where are the gaps?
- What risks are effectively unmitigated?

**RECOMMENDED ACTIONS:**
- What are the top 3 priority risks to address?
- What mitigations would reduce exposure most?
- What needs an owner and a deadline?

---

Be direct about uncomfortable risks. A risk assessment that only surfaces comfortable findings is not useful.`;
  }

  return 'You are an expert analyst. Follow the user\'s instructions precisely. If they ask for specific format, structure, or scores, provide exactly what they request. Be thorough and comprehensive.';
}
// Domain-specific system prompts for Collaborator analysis
// Domain-specific system prompts for Collaborator analysis
function getSystemPromptForCollaborator(sessionType) {
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
    return `You are a risk assessment assistant helping a contributor articulate their risk observations.

YOUR JOB: Help them express what they know about the risks clearly and completely.

**GUIDELINES:**

**Look for these elements in their input:**
- Specific risks they've identified or experienced
- Likelihood and impact assessments with reasoning
- Controls they know about — and gaps they've observed
- Concerns they want the team to take seriously

**Your response should:**
1. **Acknowledge what they've provided** - Summarise the risks and concerns they've raised
2. **Gently prompt for completeness** - If they flagged a risk but didn't elaborate, ask: "You mentioned [X] — can you add anything about likelihood or potential impact?"
3. **Encourage specificity** - Vague risk concerns are hard to act on; help them be concrete

**OUTPUT FORMAT:**

**SUMMARY OF YOUR RISK INPUT:**
[2-3 sentences capturing their key risk observations]

**OPTIONAL ADDITIONS:**

Would you like to add any details about:
- [Risk they mentioned but didn't elaborate]
- [Another area if applicable]

Or is your input complete as-is?

---

**TONE:**
- Take their concerns seriously — they have operational context you don't
- Don't minimise risks; help them surface them clearly
- Make it easy to add detail, easy to submit if they're done`;
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
    const { prompt, customPrompt, topic, mcAnalysis, context, uploadedDocuments, sessionType } = req.body;

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
const systemPrompt = getSystemPromptForCollaborator(sessionType);

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
    const { analyses, topic, sessionId } = req.body;

    if (!analyses || !Array.isArray(analyses) || analyses.length === 0) {
      return res.status(400).json({ error: 'Analyses array is required' });
    }

    const sessionRef = doc(db, 'sessions', sessionId);
    console.log(`🔄 Generating synthesis from ${analyses.length} analyses...`);

    let synthesisPrompt = `You are synthesizing expert analyses into an EXECUTIVE DECISION BRIEF.

STRATEGIC QUESTION:
${topic}

EXPERT CONTRIBUTIONS:
`;
    
    analyses.forEach((analysis, index) => {
      synthesisPrompt += `\n[${analysis.collaboratorName}]:\n${analysis.analysis}\n`;
    });
    
    synthesisPrompt += `

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

const transporter = nodemailer.createTransport({
  host: 'smtpout.secureserver.net',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, error: 'Missing fields' });
  }

  try {
    await transporter.sendMail({
      from: `"CoPrompt Contact" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      replyTo: email,
      subject: `CoPrompt Contact: ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `,
    });

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