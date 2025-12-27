const DEFAULT_FALLBACK = 'Resumo indisponível no momento.';

function fallbackSummary({ title, description }) {
  const safeTitle = title || 'o livro';
  const parts = [
    `Este é um resumo breve de ${safeTitle}.`,
    description ? `Notas principais: ${description.slice(0, 200)}...` : 'O livro explora temas centrais para o leitor.',
    'Pontos-chave são destacados para leitura rápida e contexto imediato.'
  ];
  return parts.join(' ');
}

export async function generateBookSummary({ title, description }) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  // Without API key, return deterministic fallback to keep feature usable offline.
  if (!apiKey) return fallbackSummary({ title, description });

  try {
    const controller = new AbortController();
    const timeoutMs = Number(process.env.AI_TIMEOUT_MS || 10000);
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const payload = {
      model,
      temperature: 0.3,
      max_tokens: 240,
      messages: [
        { role: 'system', content: 'Você é um assistente que resume livros em 3 a 5 frases claras e concisas.' },
        {
          role: 'user',
          content: `Resuma o livro em português. Forneça 3 a 5 frases.
Título: ${title || 'Desconhecido'}
Descrição: ${description || 'Sem descrição fornecida.'}`,
        },
      ],
    };

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AI request failed: ${res.status} ${errText}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error('Resposta da IA vazia');
    return content;
  } catch (err) {
    console.warn('[aiService] falling back to heuristic summary:', err?.message || err);
    return fallbackSummary({ title, description }) || DEFAULT_FALLBACK;
  }
}
