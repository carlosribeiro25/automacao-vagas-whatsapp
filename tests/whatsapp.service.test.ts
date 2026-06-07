// Teste UNITÁRIO com mocks — não usa banco real, OpenAI nem Cloudinary.
//
// ESTRATÉGIA DE MOCK DO DRIZZLE:
// O Drizzle usa uma API fluente encadeada: db.select().from().where().then()
// Para mockar isso, cada método precisa retornar um objeto com o próximo
// método da cadeia. Usamos vi.fn() para cada elo da cadeia.
//
// IMPORTANTE: vi.mock() é hoistado pelo Vitest para ANTES de qualquer import,
// então os imports abaixo já recebem as versões mockadas automaticamente.

import { vi, test, expect, beforeEach } from 'vitest'

vi.mock('../src/db/index.js', () => ({
  db: {
    // SELECT: db.select().from().where().then()
    select: vi.fn(),
    // INSERT: db.insert().values().onConflictDoNothing().returning()
    //         db.insert().values().returning()
    insert: vi.fn(),
    // UPDATE: db.update().set().where()
    update: vi.fn(),
  },
}))

vi.mock('../src/modules/vision/vision.service.js', () => ({
  extractJobDataFromImage: vi.fn(),
  extractJobDataFromText: vi.fn(),
}))

vi.mock('../src/services/cloudinary/cloudinary.service.js', () => ({
  uploadImagemCloudinary: vi.fn(),
}))

// fs é usado para salvar/deletar imagem em disco — mockamos para não tocar no sistema de arquivos
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    unlinkSync: vi.fn(),
    readFileSync: vi.fn().mockReturnValue('base64content'),
  },
}))

import { db } from '../src/db/index.js'
import { extractJobDataFromImage, extractJobDataFromText } from '../src/modules/vision/vision.service.js'
import { uploadImagemCloudinary } from '../src/services/cloudinary/cloudinary.service.js'
import { processarMensagemWhatsapp } from '../src/modules/whatsapp/whatsapp.service.js'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const grupoExistente = { id: 1, name: 'Grupo Vagas TI', whatsaapId: 'grupo-001' }
const mensagemInserida = { id: 42 }

const vagaExtraida = {
  is_job: true,
  title: 'Dev Frontend',
  messagem: 'Vaga frontend remoto',
  tipo_vaga: 'CLT',
  description: 'Descrição da vaga',
  category: 'Tecnologia',
  company: 'Tech Corp',
  texto_extraido: 'Dev Frontend Tech Corp',
  requirements: 'React',
  modality: 'Remoto',
  salary: 5000,
  benefits: 'VR VT',
  group_name: null,
  contact: 'rh@tech.com',
  link: 'https://tech.com/vagas',
  location: 'São Paulo',
}

const naoEVaga = { ...vagaExtraida, is_job: false }

// Dados de entrada válidos para todos os testes
const dadosTexto = {
  grupoWappId: 'grupo-001',
  grupoNome: 'Grupo Vagas TI',
  autor: '5511999999999',
  conteudo: 'Vaga de desenvolvedor frontend remoto na Tech Corp',
  imagemBuffer: null,
  imagemNome: null,
  dataMensagem: new Date('2024-01-15T10:00:00Z'),
}

// ─── Helper: configura o mock do db para o fluxo padrão ─────────────────────
// Precisamos recriar os mocks encadeados antes de cada teste porque
// vi.clearAllMocks() apaga as implementações junto com os estados.

function setupDbMocks({
  grupoExiste = true,
  grupoInserido = grupoExistente,
}: { grupoExiste?: boolean; grupoInserido?: typeof grupoExistente } = {}) {
  const mocked = vi.mocked(db)

  // db.select().from().where().then(r => r[0])
  // Retorna o grupo se existir, undefined se não
  const thenSelectMock = vi.fn().mockImplementation((fn: (r: typeof grupoExistente[]) => typeof grupoExistente) =>
    Promise.resolve(fn(grupoExiste ? [grupoExistente] : []))
  )
  const whereMock = vi.fn().mockReturnValue({ then: thenSelectMock })
  const fromMock = vi.fn().mockReturnValue({ where: whereMock })
  mocked.select.mockReturnValue({ from: fromMock } as any)

  // db.insert(grupos_whatsapp).values().onConflictDoNothing().returning()
  // db.insert(mensagens).values().returning()
  // db.insert(vagas).values()
  // Cada chamada ao insert precisa retornar a cadeia correta.
  // Usamos mockReturnValueOnce em ordem de chamada:

  const insertGrupoReturning = vi.fn().mockResolvedValue(grupoExiste ? [] : [grupoInserido])
  const insertGrupoOnConflict = vi.fn().mockReturnValue({ returning: insertGrupoReturning })
  const insertGrupoValues = vi.fn().mockReturnValue({ onConflictDoNothing: insertGrupoOnConflict })

  const insertMensagemReturning = vi.fn().mockResolvedValue([mensagemInserida])
  const insertMensagemValues = vi.fn().mockReturnValue({ returning: insertMensagemReturning })

  const insertVagasValues = vi.fn().mockResolvedValue([])

  // insert é chamado na ordem: grupos_whatsapp (se grupo não existe), mensagens, vagas
  // Como não sabemos a ordem exata sem inspecionar o argumento, usamos mockImplementation
  // que verifica qual tabela está sendo inserida pelo argumento recebido.
  mocked.insert.mockImplementation((table: any) => {
    // A tabela é o objeto exportado do schema — verificamos pela presença de colunas únicas
    if (table?.whatsaapId !== undefined) {
      // tabela grupos_whatsapp
      return { values: insertGrupoValues } as any
    }
    if (table?.conteudo !== undefined) {
      // tabela mensagens
      return { values: insertMensagemValues } as any
    }
    // tabela vagas
    return { values: insertVagasValues } as any
  })

  // db.update(mensagens).set().where()
  const updateWhere = vi.fn().mockResolvedValue([])
  const updateSet = vi.fn().mockReturnValue({ where: updateWhere })
  mocked.update.mockReturnValue({ set: updateSet } as any)

  return { insertVagasValues, insertMensagemValues, updateSet }
}

// ─── Limpar mocks entre testes ───────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks()
})

// ════════════════════════════════════════════════════════════════════════════
// BLOCO 1 — Validação de input (Zod)
// ════════════════════════════════════════════════════════════════════════════

test('input inválido (sem grupoWappId) → lança ZodError', async () => {
  // Não precisamos configurar db: o erro deve ser lançado antes de qualquer
  // chamada ao banco
  const dadosInvalidos = { grupoNome: 'Grupo', autor: '55119', conteudo: 'texto' }

  await expect(processarMensagemWhatsapp(dadosInvalidos)).rejects.toThrow()

  expect(db.select).not.toHaveBeenCalled()
})

// ════════════════════════════════════════════════════════════════════════════
// BLOCO 2 — Grupo
// ════════════════════════════════════════════════════════════════════════════

test('grupo inexistente → cria automaticamente na tabela grupos_whatsapp', async () => {
  setupDbMocks({ grupoExiste: false, grupoInserido: grupoExistente })

  vi.mocked(extractJobDataFromText).mockResolvedValueOnce(naoEVaga)

  await processarMensagemWhatsapp(dadosTexto)

  // insert deve ter sido chamado pelo menos para grupos_whatsapp e mensagens
  expect(db.insert).toHaveBeenCalled()
})

// ════════════════════════════════════════════════════════════════════════════
// BLOCO 3 — Mensagem de TEXTO
// ════════════════════════════════════════════════════════════════════════════

test('mensagem de texto que NÃO é vaga → marca processed:true, NÃO insere em vagas', async () => {
  const { insertVagasValues, updateSet } = setupDbMocks()

  vi.mocked(extractJobDataFromText).mockResolvedValueOnce(naoEVaga)

  await processarMensagemWhatsapp(dadosTexto)

  // A IA foi chamada com o texto
  expect(extractJobDataFromText).toHaveBeenCalledWith(dadosTexto.conteudo)

  // mensagens.processed foi atualizado para true
  expect(updateSet).toHaveBeenCalledWith({ processed: true, is_job: false })

  // NÃO inseriu na tabela vagas
  expect(insertVagasValues).not.toHaveBeenCalled()
})

test('mensagem de texto que É vaga → marca processed:true e insere em vagas', async () => {
  const { insertVagasValues, updateSet } = setupDbMocks()

  vi.mocked(extractJobDataFromText).mockResolvedValueOnce(vagaExtraida)

  await processarMensagemWhatsapp(dadosTexto)

  expect(extractJobDataFromText).toHaveBeenCalledWith(dadosTexto.conteudo)

  // Marcou como processado e is_job: true
  expect(updateSet).toHaveBeenCalledWith({ processed: true, is_job: true })

  // Inseriu na tabela vagas com os dados corretos
  expect(insertVagasValues).toHaveBeenCalledWith(
    expect.objectContaining({
      title: 'Dev Frontend',
      category: 'Tecnologia',
      modality: 'Remoto',       // passou por normalizeModality
      salary: '5000',           // convertido para string
      is_job: true,
      processed_by_ai: true,
      group_name: dadosTexto.grupoNome,
    })
  )
})

// ════════════════════════════════════════════════════════════════════════════
// BLOCO 4 — Mensagem com IMAGEM
// ════════════════════════════════════════════════════════════════════════════

test('mensagem com imagem → faz upload no Cloudinary e chama extractJobDataFromImage', async () => {
  const { insertVagasValues } = setupDbMocks()

  vi.mocked(uploadImagemCloudinary).mockResolvedValueOnce('https://fake-cdn.com/img.png')
  vi.mocked(extractJobDataFromImage).mockResolvedValueOnce(vagaExtraida)

  const dadosImagem = {
    ...dadosTexto,
    imagemBuffer: Buffer.from('fake-image'),
    imagemNome: 'vaga.png',
  }

  await processarMensagemWhatsapp(dadosImagem)

  // Cloudinary foi chamado (caminho do arquivo local)
  expect(uploadImagemCloudinary).toHaveBeenCalledOnce()

  // Vision foi chamado com o caminho local (não cloudinary — o service lê do disco)
  expect(extractJobDataFromImage).toHaveBeenCalledOnce()
  expect(extractJobDataFromText).not.toHaveBeenCalled()

  // Como é vaga, inseriu em vagas com a URL do cloudinary
  expect(insertVagasValues).toHaveBeenCalledWith(
    expect.objectContaining({
      imagem_original_url: 'https://fake-cdn.com/img.png',
      is_job: true,
    })
  )
})

test('mensagem com imagem que NÃO é vaga → NÃO insere em vagas', async () => {
  const { insertVagasValues } = setupDbMocks()

  vi.mocked(uploadImagemCloudinary).mockResolvedValueOnce('https://fake-cdn.com/img.png')
  vi.mocked(extractJobDataFromImage).mockResolvedValueOnce(naoEVaga)

  const dadosImagem = {
    ...dadosTexto,
    imagemBuffer: Buffer.from('fake-image'),
    imagemNome: 'foto.png',
  }

  await processarMensagemWhatsapp(dadosImagem)

  expect(uploadImagemCloudinary).toHaveBeenCalledOnce()
  expect(insertVagasValues).not.toHaveBeenCalled()
})
