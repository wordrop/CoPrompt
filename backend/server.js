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
      model: 'claude-3-haiku-20240307',
      max_tokens: 4096,
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

app.listen(PORT, () => {
  console.log(`🚀 CoPrompt Backend running on http://localhost:${PORT}`);
  console.log(`📡 API endpoint: http://localhost:${PORT}/api/claude`);
});