import fs from 'fs'
import { openai } from '@/services/openai.services.js'
import { vagaSchema } from '../vagas/vaga.schema.js'
export async function extractJobDataFromImage(imagePath: string) {
  const base64Image = fs.readFileSync(imagePath, {
    encoding: 'base64',
  })

  const response = await openai.chat.completions.create({
    model: 'gpt-5',

    messages: [
      {
        role: 'system',

        content: `
Você é um sistema especialista em análise de mensagens e imagens de vagas de emprego.

Sua tarefa é:

1. Identificar se o conteúdo enviado é realmente uma vaga de emprego/estágio.
2. Caso seja uma vaga:
    - extrair os dados estruturados.
3. Caso Não seja:
   - retornar "is_job": false
   - e todos os outros campos null.

Retorne SOMENTE JSON válido.

Se houver dúvida, priorize precisão ao invés de inventar informações.


Extrutura obriatória:

{
  "is_job": boolean,

  "title": string | null,
  "messagem": string | null,
  "tipo_vaga": string | null,
  "description": string | null,
  "category": string | null,
  "company": string | null,
  "texto_extraido": string | null,
  "requirements": string | null,
  "modality": string | null,
  "salary": number | null,
  "benefits": string | null,
  "group_name": string | null,
  "contact": string | null,
  "link": string | null,
  "location": string | null
}

REGRAS IMPORTANTES:

- Retorne APENAS JSON.
- NÃO use markdown.
- NÃO invente informações.
- Se não encontrar um campo, retorne null.
- salary deve ser número.
- Considere vaga somente se houver context claro de:
    emprego,
    estagio,
    trainee,
    contratação,
    oportunidade profissional,
    recrutamento.

- texto_extraido deve conter TODO o texto identificado na imagem.

-Mensagens pessoais, memes, propagandas, frases motivacionais ou conversas NÃO são vagas.
 
- modality deve ser:
  "Remoto"
  "Hibrido"
  "Presencial"
  "Home Office"

EXEMPLO:

Entrada:
Imagem de vaga de estágio frontend remoto.

Saída:
{
  "is_job": true,
  "title": "Estágio Frontend",
  "tipo_vaga": "Estagio",
  "category": "Tecnologia",
  "modality": "Remoto"
}

- category deve ser curta:
  "Tecnologia"
  "Saúde"
  "Administração"
  "Educação"
  "Marketing"
  etc.
          `,
      },

      {
        role: 'user',

        content: [
          {
            type: 'text',
            text: 'Extraia os dados dessa vaga',
          },

          {
            type: 'image_url',

            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
            },
          },
        ],
      },
    ],

    response_format: {
      type: 'json_object',
    },
  })

  if (!fs.existsSync(imagePath)) {
    throw new Error('Image not found!')
  }

  const content = response.choices[0].message.content || '{}'

  let parsed
  try {
    parsed = JSON.parse(content)
  } catch (error) {
    console.error('Erro in parser JSON from AI')

    return null
  }

  return vagaSchema.parse(parsed)
}
