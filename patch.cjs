const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const t1 = "const ai = getGeminiClient();";
const idx1 = code.indexOf(t1);
const end1 = code.indexOf("      // Fetch dynamic AI customization", idx1);
if(idx1 !== -1 && end1 !== -1) {
  const replacement1 = `const openRouterApiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;
      if (!openRouterApiKey) {
        return res.json({
          success: true,
          response: generateSmartFallback(mode, payload, userPrompt)
        });
      }
`;
  code = code.substring(0, idx1) + replacement1 + code.substring(end1);
}

const t2 = "const response = await ai.models.generateContent({";
const idx2 = code.indexOf(t2);
const end2 = code.indexOf("app.get('/api/search-ticker'", idx2);

if (idx2 !== -1 && end2 !== -1) {
    // We need to keep some ending part. Let's find the closing brace before `app.get`
    const end2_proper = code.lastIndexOf("  // API Route: Search Ticker", end2);
    
    const replacement2 = `// 4. Tambahkan cache di backend sebelum panggil OpenRouter (Supabase/PostgreSQL)
      const cacheString = systemInstruction + prompt;
      const cacheHash = crypto.createHash('sha256').update(cacheString).digest('hex');
      const cacheKey = \`ai_cache_\${cacheHash}\`;

      try {
        const cacheRes = await pool.query('SELECT data FROM app_state WHERE id = $1', [cacheKey]);
        if (cacheRes.rows.length > 0) {
          const cachedOutput = cacheRes.rows[0].data.response;
          return res.json({ success: true, response: cachedOutput });
        }
      } catch (err) {
        console.error('Cache read error', err);
      }

      // 1. Buat Custom Endpoint ke OpenRouter
      // 3. Di backend, selalu kirim system message di setiap request
      const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${openRouterApiKey}\`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://portaluang.id',
          'X-Title': 'Portal Uang',
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat',
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7
        })
      });

      if (!orRes.ok) {
        throw new Error(\`OpenRouter API Error: \${orRes.statusText}\`);
      }

      const orData = await orRes.json();
      const textOutput = orData.choices?.[0]?.message?.content || 'No response generated.';

      // Save response to cache
      try {
        await pool.query(
          'INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()',
          [cacheKey, JSON.stringify({ response: textOutput })]
        );
      } catch (err) {
        console.error('Cache write error', err);
      }

      res.json({ success: true, response: textOutput });
    } catch (err: any) {
      console.error('OpenRouter API Error:', err);
      
      // HYBRID FALLBACK: If AI API fails
      // we silently switch to the smart algorithmic engine so the user still gets a response.
      return res.json({
        success: true,
        response: generateSmartFallback(mode, payload, userPrompt)
      });
    }
  });

`;
  code = code.substring(0, idx2) + replacement2 + code.substring(end2_proper);
}

fs.writeFileSync('server.ts', code);
console.log('Patched server.ts with substring logic');
