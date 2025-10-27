import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: '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',
});

async function test() {
  const testModels = [
    // Try newest naming format
    { name: 'claude-3-5-sonnet-20241022', desc: 'Latest Sonnet' },
    { name: 'claude-3-5-sonnet-20240620', desc: 'June Sonnet' },
    
    // Try without date suffix
    { name: 'claude-3-5-sonnet', desc: 'Generic Sonnet' },
    { name: 'claude-3-opus', desc: 'Generic Opus' },
    { name: 'claude-3-sonnet', desc: 'Generic Sonnet 3' },
    { name: 'claude-3-haiku', desc: 'Generic Haiku' },
    
    // Try older versions
    { name: 'claude-3-opus-20240229', desc: 'Opus Feb' },
    { name: 'claude-3-sonnet-20240229', desc: 'Sonnet Feb' },
    { name: 'claude-3-haiku-20240307', desc: 'Haiku Mar' },
  ];

  for (const { name, desc } of testModels) {
    try {
      console.log(`\n🧪 Testing: ${name} (${desc})...`);
      
      const message = await client.messages.create({
        model: name,
        max_tokens: 50,
        messages: [{ role: 'user', content: 'Say hi' }]
      });
      
      console.log(`✅ SUCCESS! Model "${name}" works!`);
      console.log(`📝 Response: ${message.content[0].text}`);
      console.log(`\n🎯 USE THIS MODEL IN YOUR SERVER.JS: ${name}\n`);
      return; // Stop after first success
      
    } catch (error) {
      console.log(`❌ Failed: ${error.status} - ${error.message}`);
    }
  }
  
  console.log('\n❌ None of the models worked. This is an account access issue.');
}

test();
