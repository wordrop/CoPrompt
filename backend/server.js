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

// DEBUG: Check if API key is loaded
console.log('================================');
// DEBUG: Check if API key is loaded
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
      
      // Fetch the document
      const response = await fetch(docData.url);
      const buffer = await response.arrayBuffer();
      const nodeBuffer = Buffer.from(buffer);

      let text = '';

      if (docData.type === 'application/pdf') {
        // Extract from PDF
        const pdfData = await pdfParse(nodeBuffer);
        text = pdfData.text;
        console.log(`✅ PDF extracted: ${text.length} characters`);
      } else if (docData.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                 docData.type === 'application/msword') {
        // Extract from DOCX
        const result = await mammoth.extractRawText({ buffer: nodeBuffer });
        text = result.value;
        console.log(`✅ DOCX extracted: ${text.length} characters`);
      } else if (docData.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                 docData.type === 'application/vnd.ms-excel') {
        // Extract from Excel
        const workbook = XLSX.read(nodeBuffer, { type: 'buffer' });
        const sheets = [];
        
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const sheetText = XLSX.utils.sheet_to_csv(worksheet, { FS: '\t' });
          // Clean the text: remove excessive whitespace and special characters
          const cleanedText = sheetText
            .replace(/\t+/g, ' | ')  // Replace tabs with pipes
            .replace(/\n\n+/g, '\n')  // Remove multiple newlines
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
      max_tokens: 2500,
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
// Save session to Firebase
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
// Endpoint for MC's initial analysis generation
app.post('/api/generate-analysis', async (req, res) => {
  try {
    const { prompt, topic, uploadedDocuments } = req.body;

    if (!prompt || !topic) {
      return res.status(400).json({ error: 'Prompt and topic are required' });
    }

    console.log('📊 Generating MC analysis...');

    // Extract document text if documents exist
    let documentContext = '';
    if (uploadedDocuments && uploadedDocuments.length > 0) {
      documentContext = await extractTextFromDocuments(uploadedDocuments);
    }

    // Build prompt with document context
    const fullPrompt = documentContext 
      ? `${prompt}\n\n=== UPLOADED DOCUMENTS ===\n${documentContext}\n\nPlease analyze the above context including the uploaded documents.`
      : prompt;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: 'You are an expert analyst helping to facilitate collaborative research.',
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
// Endpoint for collaborator custom analysis
app.post('/api/generate-collaborator-analysis', async (req, res) => {
  try {
    const { prompt, customPrompt, topic, mcAnalysis, context, uploadedDocuments } = req.body;

    if (!prompt || !topic) {
      return res.status(400).json({ error: 'Prompt and topic are required' });
    }

    console.log('👥 Generating collaborator analysis...');

    // Extract document text if documents exist
    let documentContext = '';
    if (uploadedDocuments && uploadedDocuments.length > 0) {
      documentContext = await extractTextFromDocuments(uploadedDocuments);
    }

    const fullPrompt = customPrompt 
      ? `${customPrompt}\n\nTopic to analyze: ${topic}\n\nAdditional context: ${prompt}${documentContext ? `\n\n=== UPLOADED DOCUMENTS ===\n${documentContext}` : ''}`
      : `${prompt}${documentContext ? `\n\n=== UPLOADED DOCUMENTS ===\n${documentContext}` : ''}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: 'You are an expert analyst providing detailed analysis based on specific instructions.',
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

// Endpoint for MC synthesis generation
app.post('/api/generate-synthesis', async (req, res) => {
  try {
    const { analyses, topic, sessionId } = req.body;

    if (!analyses || !Array.isArray(analyses) || analyses.length === 0) {
      return res.status(400).json({ error: 'Analyses array is required' });
    }
    const sessionRef = doc(db, 'sessions', sessionId);
    console.log(`🔄 Generating synthesis from ${analyses.length} analyses...`);

    // Build the synthesis prompt
    // Build the synthesis prompt - EXECUTIVE BRIEF FORMAT
    // Build the synthesis prompt - RESTORE ORIGINAL 4-SECTION STRUCTURE
    let synthesisPrompt = `You are synthesizing expert analyses into a structured decision brief.

STRATEGIC QUESTION:
${topic}

EXPERT CONTRIBUTIONS:
`;
    
    analyses.forEach((analysis, index) => {
      synthesisPrompt += `\n[${analysis.collaboratorName}]:\n${analysis.analysis}\n`;
    });

    synthesisPrompt += `

Create a comprehensive synthesis with FOUR CLEARLY LABELED SECTIONS:

## 🤝 AREAS OF AGREEMENT

List the key points where experts converge (3-5 main areas of consensus):
- [Agreement point 1]
- [Agreement point 2]
- [Agreement point 3]

AI ASSESSMENT:
Provide your interpretation of what this consensus means for the decision. What strengths does this agreement reveal? What can we confidently move forward with based on expert convergence?

---

## ⚔️ AREAS OF CONFLICT

List the disagreements or divergent perspectives between experts (2-4 conflicts):
- [Conflict 1: Describe the different viewpoints]
- [Conflict 2: Describe the different viewpoints]

AI RESOLUTION RECOMMENDATION:
For each major conflict, suggest how to resolve it or which perspective to prioritize. Explain your reasoning. If the conflict reveals important trade-offs, highlight them clearly.

---

## ⚠️ CRITICAL POINTS & RED FLAGS

Highlight the most important issues that could make or break this decision (3-5 items):
- [Critical issue 1]
- [Critical issue 2]
- [Critical issue 3]

CONTEXT & IMPLICATIONS:
Explain why each point is critical. What happens if these are ignored? What dependencies or risks do they create?

---

## 📊 EXECUTIVE SUMMARY & RECOMMENDATION

CLEAR RECOMMENDATION:
[State your Go/No-Go recommendation or specific path forward - be decisive]

KEY RATIONALE:
[Explain why this recommendation, drawing from expert consensus and your conflict resolution]

NEXT STEPS:
1. [Specific action with owner/timeline]
2. [Specific action with owner/timeline]
3. [Specific action with owner/timeline]

TIMELINE CONSIDERATIONS:
[Any time-sensitive factors or sequencing requirements]

---

Aim for 800-1000 words total. Use the section structure exactly as shown. Be thorough in each section - this is a strategic decision that deserves comprehensive synthesis.`;

    const message = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 5000,  // Changed from 1800 for comprehensive synthesis
  system: 'You are an expert at synthesizing multiple perspectives into coherent insights.',
  messages: [{ role: 'user', content: synthesisPrompt }],
});
// NEW: Phase 1B - Revise synthesis with feedback
app.post('/api/revise-synthesis', async (req, res) => {
  try {
    const { sessionId, originalSynthesis, analyses, feedback, revisionInstructions, topic } = req.body;

    console.log('📝 Revising synthesis for session:', sessionId);
    console.log('📊 Feedback items:', feedback.length);

    // Get session to check version history
    const sessionRef = doc(db, 'sessions', sessionId);
    const sessionDoc = await getDoc(sessionRef);
    const sessionData = sessionDoc.data();
    const currentVersion = sessionData.synthesisVersion || 1;
    const newVersion = currentVersion + 1;

    // Check if we've hit the 3-version limit
    if (newVersion > 3) {
      return res.status(400).json({
        success: false,
        error: 'Maximum of 3 synthesis versions reached. Time to make a decision! 🎯'
      });
    }

    // Format feedback for the prompt
    const feedbackSummary = feedback.map(f => 
      `${f.collaboratorName} (${f.role}): ${f.rating === 'thumbs_up' ? '👍 Helpful' : '👎 Needs Work'}
Comment: ${f.comment || 'No comment'}`
    ).join('\n\n');

    // Format analyses for context
    const analysesText = analyses.map(a => 
      `${a.collaboratorName} (${a.role || 'Collaborator'}):\n${a.analysis}`
    ).join('\n\n---\n\n');

    // Build the revision prompt
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

    console.log('🤖 Calling Claude API for synthesis revision...');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 5000,
        messages: [{
          role: 'user',
          content: revisionPrompt
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Claude API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const revisedSynthesis = data.content[0].text;

    // Prepare version history entry
    const versionHistoryEntry = {
      version: currentVersion,
      synthesis: originalSynthesis,
      feedback: feedback,
      revisedAt: new Date().toISOString()
    };

    // Update session in Firebase
    const updateData = {
      synthesis: revisedSynthesis,
      synthesisGeneratedAt: new Date().toISOString(),
      synthesisVersion: newVersion,
      synthesisReviews: [], // Clear current reviews for fresh round
      versionHistory: [...(sessionData.versionHistory || []), versionHistoryEntry].slice(-3) // Keep last 3
    };

    await updateDoc(sessionRef, updateData);

    console.log(`✅ Synthesis revised! Version ${currentVersion} → ${newVersion}`);
    console.log(`📚 Version history entries: ${updateData.versionHistory.length}`);

    // Show warning if approaching limit
    const warningMessage = newVersion === 2 
      ? '💡 First revision complete. Consider finalizing to avoid decision paralysis.'
      : newVersion === 3
      ? '⚠️ Final revision complete. This is version 3/3 - time to decide!'
      : null;

    res.json({
      success: true,
      response: revisedSynthesis,
      version: newVersion,
      warning: warningMessage
    });

  } catch (error) {
    console.error('❌ Error revising synthesis:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to revise synthesis'
    });
  }
});
const responseText = message.content[0].text;
console.log(`✅ Synthesis generated (${message.usage.output_tokens} tokens)`);

// SAVE TO FIREBASE (ADD THIS!)
console.log('💾 Saving synthesis to Firebase...');
await updateDoc(sessionRef, {
  synthesis: responseText,
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

app.listen(PORT, () => {
  console.log(`🚀 CoPrompt Backend running on http://localhost:${PORT}`);
  console.log(`📡 API endpoint: http://localhost:${PORT}/api/claude`);
});