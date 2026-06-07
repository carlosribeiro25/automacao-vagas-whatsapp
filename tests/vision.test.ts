import { vi, test, expect, beforeEach } from 'vitest'

// 1. vi.mock() é hoistado pelo Vitest acima de qualquer import.
//    Usamos caminhos relativos ao arquivo de teste — o Vitest resolve para o
//    mesmo caminho absoluto que o controller usa via alias @/, garantindo
//    que o mock intercepte os imports do production code.
vi.mock('../src/services/cloudinary/cloudinary.service.js', () => ({
  uploadImagemCloudinary: vi.fn(),
}))

vi.mock('../src/modules/vision/vision.service.js', () => ({
  extractJobDataFromImage: vi.fn(),
  extractJobDataFromText: vi.fn(),
}))

// 2. Os imports abaixo já recebem as versões mockadas (vi.fn()).
import request from 'supertest'
import { server } from '../src/app'
import { uploadImagemCloudinary } from '../src/services/cloudinary/cloudinary.service.js'
import { extractJobDataFromImage } from '../src/modules/vision/vision.service.js'

// Fixture reutilizável: retorno da IA quando a imagem É uma vaga
const vagaExtraida = {
  is_job: true,
  title: 'Desenvolvedor Frontend',
  messagem: 'Vaga de desenvolvedor frontend remoto',
  tipo_vaga: 'CLT',
  description: 'Desenvolvimento de interfaces modernas',
  category: 'Tecnologia',
  company: 'Tech Corp',
  texto_extraido: 'Vaga desenvolvedor frontend Tech Corp',
  requirements: 'React, TypeScript',
  modality: 'Remoto',
  salary: 5000,
  benefits: 'VR, VT',
  group_name: null,
  contact: 'rh@techcorp.com',
  link: 'https://techcorp.com/vagas',
  location: 'São Paulo',
}

// Fixture reutilizável: retorno da IA quando NÃO é uma vaga
const naoEVaga = {
  is_job: false,
  title: null,
  messagem: null,
  tipo_vaga: null,
  description: null,
  category: null,
  company: null,
  texto_extraido: null,
  requirements: null,
  modality: null,
  salary: null,
  benefits: null,
  group_name: null,
  contact: null,
  link: null,
  location: null,
}

// 3. Limpar todos os mocks entre cada teste para evitar vazamento de estado
beforeEach(() => {
  vi.clearAllMocks()
})

// ─── TESTE 1 ────────────────────────────────────────────────────────────────
// Sem imagem no body: o controller retorna 400 antes de chamar qualquer serviço.
// Nota: enviar sem Content-Type multipart causaria 406 (lançado pelo plugin
// @fastify/multipart antes do handler rodar). Por isso usamos .field() para
// forçar Content-Type multipart/form-data sem nenhum arquivo — aí
// request.file() retorna undefined e o controller responde 400.
test('sem imagem no body → 400', async () => {
  await server.ready()

  const response = await request(server.server)
    .post('/vision/test')
    .field('dummy', 'value') // multipart sem arquivo → request.file() === undefined

  expect(response.status).toBe(400)
  expect(response.body).toEqual({ error: 'Imagem obrigatoria' })

  // Confirma que os serviços externos NÃO foram chamados
  expect(uploadImagemCloudinary).not.toHaveBeenCalled()
  expect(extractJobDataFromImage).not.toHaveBeenCalled()
})

// ─── TESTE 2 ────────────────────────────────────────────────────────────────
// Imagem enviada, mas a IA decide que NÃO é uma vaga
test('imagem não é uma vaga → { success: false }', async () => {
  await server.ready()

  // Cloudinary mock: retorna URL falsa sem fazer upload real
  vi.mocked(uploadImagemCloudinary).mockResolvedValueOnce(
    'https://fake-cloudinary.com/foto.jpg',
  )
  // OpenAI mock: retorna is_job: false
  vi.mocked(extractJobDataFromImage).mockResolvedValueOnce(naoEVaga)

  const response = await request(server.server)
    .post('/vision/test')
    .attach('imagem', Buffer.from('fake-image-bytes'), {
      filename: 'foto.png',
      contentType: 'image/png',
    })

  expect(response.status).toBe(200)
  expect(response.body).toEqual({ success: false, message: 'Não é vaga' })

  expect(uploadImagemCloudinary).toHaveBeenCalledOnce()
  expect(extractJobDataFromImage).toHaveBeenCalledOnce()
})

// ─── TESTE 3 ────────────────────────────────────────────────────────────────
// Imagem enviada e a IA identifica como vaga → insere no banco e retorna dados
test('imagem é uma vaga → insere no banco e retorna { success: true }', async () => {
  await server.ready()

  vi.mocked(uploadImagemCloudinary).mockResolvedValueOnce(
    'https://fake-cloudinary.com/vaga.jpg',
  )
  vi.mocked(extractJobDataFromImage).mockResolvedValueOnce(vagaExtraida)

  const response = await request(server.server)
    .post('/vision/test')
    .attach('imagem', Buffer.from('fake-image-bytes'), {
      filename: 'vaga.png',
      contentType: 'image/png',
    })

  expect(response.status).toBe(200)
  expect(response.body).toMatchObject({
    success: true,
    data: expect.objectContaining({
      is_job: true,
      title: 'Desenvolvedor Frontend',
      category: 'Tecnologia',
    }),
  })

  expect(uploadImagemCloudinary).toHaveBeenCalledOnce()
  expect(extractJobDataFromImage).toHaveBeenCalledOnce()
})
