const https = require('https');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

function requestGemini(prompt) {
  if (!GEMINI_API_KEY) {
    return Promise.reject(new Error('GEMINI_API_KEY не задан'));
  }

  const payload = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2 }
  });

  const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: `/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${GEMINI_API_KEY}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`Gemini error ${res.statusCode}: ${data}`));
        }
        try {
          const parsed = JSON.parse(data);
          const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) {
            return reject(new Error('Gemini пустой ответ'));
          }
          return resolve(text);
        } catch (error) {
          return reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function extractJson(text) {
  if (!text) return null;
  const match = String(text).match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch (error) {
    return null;
  }
}

async function getIntentFromGemini({ message, candidates, known }) {
  const prompt = [
    'Ты — помощник поиска товаров. Отвечай ТОЛЬКО валидным JSON.',
    'Доступные товары (карточки):',
    JSON.stringify(candidates),
    'Известные слоты:',
    JSON.stringify(known),
    'Сообщение пользователя:',
    JSON.stringify(message),
    'Если данных недостаточно, верни:',
    '{"action":"ASK_CLARIFICATION","questions":["..."],"quickReplies":["..."]}',
    'Если можно искать, верни:',
    '{"action":"READY_TO_SEARCH","intent":{"brand":null,"type":null,"packageInfo":null}}'
  ].join('\n');

  const text = await requestGemini(prompt);
  const parsed = extractJson(text);
  if (!parsed || !parsed.action) {
    throw new Error('Некорректный ответ Gemini');
  }
  return parsed;
}

async function transcribeAudio({ buffer, mimeType }) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY не задан');
  }
  if (!buffer || !mimeType) {
    throw new Error('Отсутствуют данные для транскрипции');
  }

  const payload = JSON.stringify({
    contents: [
      {
        parts: [
          { text: 'Сделай транскрипцию аудио. Верни только текст без пояснений.' },
          {
            inline_data: {
              mime_type: mimeType,
              data: buffer.toString('base64')
            }
          }
        ]
      }
    ],
    generationConfig: { temperature: 0.1 }
  });

  const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: `/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${GEMINI_API_KEY}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`Gemini error ${res.statusCode}: ${data}`));
        }
        try {
          const parsed = JSON.parse(data);
          const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) {
            return reject(new Error('Gemini пустой ответ'));
          }
          return resolve(text.trim());
        } catch (error) {
          return reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

module.exports = { getIntentFromGemini, transcribeAudio };

