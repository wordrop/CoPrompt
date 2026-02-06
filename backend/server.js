// CoPrompt Backend - API Proxy Server
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
    const { prompt, topic, uploadedDocuments } = req.body;

    if (!prompt || !topic) {
      return res.status(400).json({ error: 'Prompt and topic are required' });
    }

    console.log('📊 Generating MC analysis...');

    let documentContext = '';
    if (uploadedDocuments && uploadedDocuments.length > 0) {
      documentContext = await extractTextFromDocuments(uploadedDocuments);
    }

    const fullPrompt = documentContext 
      ? `${prompt}\n\n=== UPLOADED DOCUMENTS ===\n${documentContext}\n\nPlease analyze the above context including the uploaded documents.`
      : prompt;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system: 'You are an expert analyst. Follow the user\'s instructions precisely. If they ask for specific format, structure, or scores, provide exactly what they request. Be thorough and comprehensive.',
      messages: [{ role: 'user', content: fullPrompt }],
    });

    const responseText = message.content[0].text;
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
    const { prompt, customPrompt, topic, mcAnalysis, context, uploadedDocuments } = req.body;

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

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system: 'You are an expert analyst. Follow the user\'s instructions precisely. If they ask for specific format, structure, or scores, provide exactly what they request. Be thorough and comprehensive.',
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

app.listen(PORT, () => {
  console.log(`🚀 CoPrompt Backend running on http://localhost:${PORT}`);
  console.log(`📡 API endpoint: http://localhost:${PORT}/api/claude`);
});