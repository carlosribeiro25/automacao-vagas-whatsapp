import fs from 'fs'
import { openai } from '@/services/openai.services.js'
import { vagaSchema } from '../vagas/vaga.schema.js'

export async function extractJobDataFromImage(
  imagePath: string
) {

  const base64Image = fs.readFileSync(imagePath, {
    encoding: 'base64',
  })

  const response =
    await openai.chat.completions.create({

      model: 'gpt-4.1-mini',

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
  "group": string | null,
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

-Mensagens pessoais, memes, propagandas, frases motivacionais ou conversas NÃO são vagas.
 
- modality deve ser:
  "REMOTO"
  "HIBRIDO"
  "PRESENCIAL"

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

  const content = response.choices[0].message.content || '{}'

  const parsed = JSON.parse(content)

  return vagaSchema.parse(parsed)
}


// Depois você filtra antes de salvar
// Exemplo:
// const data =
//   await extractJobDataFromImage(imagePath)

// if (!data.is_job) {
//    console.log('Mensagem ignorada')
//    return
// }

// await db.insert(vagas).values(data)