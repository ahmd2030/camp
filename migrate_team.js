const fs = require('fs');
let code = fs.readFileSync('app/actions/team.ts', 'utf8');

code = code.replace(/https:\/\/openrouter\.ai\/api\/v1\/chat\/completions/g, 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');
code = code.replace(/"openai\/gpt-4o-mini"/g, '"gemini-1.5-flash"');
code = code.replace(/"openai\/gpt-4o"/g, '"gemini-1.5-pro"');
code = code.replace(/process\.env\.OPENROUTER_API_KEY/g, 'process.env.GEMINI_API_KEY');

fs.writeFileSync('app/actions/team.ts', code);
console.log('Migrated team.ts to Gemini OpenAI compatibility API');
