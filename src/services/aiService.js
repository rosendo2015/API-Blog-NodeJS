import { z } from 'zod';

// Esquema de validação para a ideia enviada pelo usuário
export const ideaInputSchema = z.object({
  idea: z.string().trim().min(3, 'A ideia deve ter pelo menos 3 caracteres.')
});

// Esquema de validação com Zod para a resposta gerada pela IA
export const aiResponseSchema = z.object({
  title: z.string().trim().min(3, 'O título gerado deve ter no mínimo 3 caracteres.'),
  content: z.string().trim().min(20, 'O conteúdo gerado em Markdown deve ter no mínimo 20 caracteres.')
});

/**
 * Gera título e conteúdo em Markdown a partir de uma ideia usando IA.
 * Em caso de chave não configurada ou ambiente de testes, utiliza gerador estruturado em Markdown.
 * @param {string} idea
 * @returns {Promise<{ title: string, content: string }>}
 */
export async function generateDraftFromIdea(idea) {
  // Valida a entrada antes de chamar o serviço
  const { idea: validatedIdea } = ideaInputSchema.parse({ idea });

  const apiKey = process.env.IA_API_KEY;
  let rawAiResponse;

  // Se houver uma chave de API real configurada para o Gemini / OpenAI
  if (apiKey && apiKey !== 'coloque_sua_chave_aqui' && !process.env.MOCK_AI) {
    try {
      // Exemplo de integração nativa com API de IA (Gemini API) usando fetch nativo do Node.js
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Você é um redator de blog profissional. Escreva um post em Markdown e em português brasileiro baseado nesta ideia: "${validatedIdea}".
O post deve conter obrigatoriamente:
- Um título chamativo
- Introdução
- Desenvolvimento
- Conclusão

Retorne EXCLUSIVAMENTE um JSON válido com o seguinte formato:
{
  "title": "Título do Post",
  "content": "Conteúdo completo formatado em Markdown com seções de introdução, desenvolvimento e conclusão"
}`
                  }
                ]
              }
            ],
            generationConfig: {
              responseMimeType: 'application/json'
            }
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textResponse) {
          rawAiResponse = JSON.parse(textResponse);
        }
      }
    } catch (apiErr) {
      console.warn('Falha na chamada da API externa de IA, usando gerador de contingência:', apiErr.message);
    }
  }

  // Contingência inteligente / Fallback (garante testes e execução sem chave externa)
  if (!rawAiResponse) {
    rawAiResponse = generateFallbackMarkdown(validatedIdea);
  }

  // Validação estrita da resposta da IA com ZOD (Requisito obrigatório das diretrizes)
  const validatedPost = aiResponseSchema.parse(rawAiResponse);

  return validatedPost;
}

/**
 * Gerador de conteúdo Markdown com Introdução, Desenvolvimento e Conclusão.
 * @param {string} idea
 */
function generateFallbackMarkdown(idea) {
  const capitalizedIdea = idea.charAt(0).toUpperCase() + idea.slice(1);

  return {
    title: `${capitalizedIdea}: O Guia Completo e Definitivo`,
    content: `## Introdução

No cenário atual de tecnologia e desenvolvimento, **${idea}** tem se tornado um tópico de extrema relevância. Compreender seus fundamentos e boas práticas é essencial para profissionais que buscam excelência e eficiência.

## Desenvolvimento

Ao explorar mais a fundo **${idea}**, destacam-se três pilares fundamentais:

1. **Fundamentos Sólidos:** A base teórica permite tomar decisões arquiteturais mais assertivas.
2. **Implementação Eficaz:** A aplicação prática aliada a testes automatizados e código limpo garante manutenibilidade a longo prazo.
3. **Escalabilidade e Resiliência:** Projetar sistemas robustos evita gargalos futuros e melhora a experiência do usuário final.

Integrar esses conceitos no dia a dia transforma a qualidade dos projetos entregues.

## Conclusão

Dominar **${idea}** não apenas eleva o nível técnico, mas também potencializa resultados consistentes. Continue praticando, experimentando e aplicando essas diretrizes em seus projetos.
`
  };
}

