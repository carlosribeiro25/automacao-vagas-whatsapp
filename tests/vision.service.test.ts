import { beforeEach, describe, expect, it, vi } from 'vitest'
import { extractJobDataFromImage } from '../src/modules/vision/vision.service.js'
import { openai } from '../src/services/openai.services.js'

vi.mock('../src/services/openai.services.js', () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  },
}))

describe('extractJobDataFromImage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('downloads remote image URLs before sending them to OpenAI', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) => (name === 'content-type' ? 'image/jpeg' : null),
      },
      arrayBuffer: async () => Buffer.from('fake-image-bytes'),
    })

    vi.stubGlobal('fetch', fetchMock)

    vi.mocked(openai.chat.completions.create).mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              is_job: true,
              title: 'Desenvolvedor Frontend',
              messagem: 'Vaga de frontend',
              tipo_vaga: 'CLT',
              description: 'Desenvolvimento web',
              category: 'Tecnologia',
              company: 'Tech Corp',
              texto_extraido: 'Vaga frontend',
              requirements: 'React',
              modality: 'Remoto',
              salary: 5000,
              benefits: 'VR',
              group_name: null,
              contact: 'rh@techcorp.com',
              link: 'https://techcorp.com',
              location: 'São Paulo',
            }),
          },
        },
      ],
    } as never)

    const result = await extractJobDataFromImage(
      'https://res.cloudinary.com/example/image.jpg',
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://res.cloudinary.com/example/image.jpg',
    )
    expect(result?.is_job).toBe(true)
    expect(result?.title).toBe('Desenvolvedor Frontend')
  })
})
