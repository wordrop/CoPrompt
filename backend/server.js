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
      max_tokens: 1200,
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
    let synthesisPrompt = `STRATEGIC QUESTION: ${topic}

EXPERT INPUTS:
`;
    
    analyses.forEach((analysis, index) => {
      synthesisPrompt += `\n[${analysis.collaboratorName}]:\n${analysis.text}\n`;
    });

    synthesisPrompt += `

Create an EXECUTIVE BRIEF (MAXIMUM 400 words - count them):

## RECOMMENDATION (3 sentences max)
What should be done? Be decisive.

## CONVERGING INSIGHTS (3 bullets)
Where experts agree = high confidence

## CRITICAL CONCERNS (3 bullets)
What could go wrong?

## ACTION PLAN (4-5 items)
1. [Specific action + owner]
2. [Specific action + owner]
etc.

RULES:
- Maximum 400 words total (not 401)
- No fluff or repetition
- No background/context setting
- Cut anything not decision-critical
- Board-level brevity`;

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