// CoPrompt Backend - API Proxy Server
import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3001;
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
// Endpoint for MC's initial analysis generation
app.post('/api/generate-analysis', async (req, res) => {
  try {
    const { prompt, topic } = req.body;

    if (!prompt || !topic) {
      return res.status(400).json({ error: 'Prompt and topic are required' });
    }

    console.log('📊 Generating MC analysis...');

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: 'You are an expert analyst helping to facilitate collaborative research.',
      messages: [{ role: 'user', content: prompt }],
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
    const { prompt, customPrompt, topic } = req.body;

    if (!prompt || !topic) {
      return res.status(400).json({ error: 'Prompt and topic are required' });
    }

    console.log('👥 Generating collaborator analysis...');

    const fullPrompt = customPrompt 
      ? `${customPrompt}\n\nTopic to analyze: ${topic}\n\nAdditional context: ${prompt}`
      : prompt;

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
    const { analyses, topic } = req.body;

    if (!analyses || !Array.isArray(analyses) || analyses.length === 0) {
      return res.status(400).json({ error: 'Analyses array is required' });
    }

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
      synthesisPrompt += `\n[${analysis.collaboratorName}]:\n${analysis.text}\n`;
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
      max_tokens: 1800,
      system: 'You are an expert at synthesizing multiple perspectives into coherent insights.',
      messages: [{ role: 'user', content: synthesisPrompt }],
    });

    const responseText = message.content[0].text;
    console.log(`✅ Synthesis generated (${message.usage.output_tokens} tokens)`);

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