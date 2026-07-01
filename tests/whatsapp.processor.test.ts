import { beforeEach, describe, expect, test, vi } from 'vitest'

type JobLike = {
  id: string | number
  data: {
    connectionId: number
    grupoWappId: string
    grupoNome: string
    autor: string
    conteudo: string
    imagemBuffer: string | null
    imagemNome: string | null
    dataMensagem: Date | string
  }
}

const mocks = vi.hoisted(() => {
  const processarMensagemWhatsapp = vi.fn()
  const workerCtor = vi.fn()
  let processor: ((job: JobLike) => Promise<void>) | null = null

  class MockWorker {
    constructor(
      public queueName: string,
      handler: (job: JobLike) => Promise<void>,
      public options: unknown,
    ) {
      processor = handler
      workerCtor(queueName, handler, options)
    }
  }

  return {
    processarMensagemWhatsapp,
    workerCtor,
    MockWorker,
    getProcessor: () => processor,
  }
})

vi.mock('bullmq', () => ({
  Worker: mocks.MockWorker,
}))

vi.mock('../src/modules/whatsapp/whatsapp.service', () => ({
  processarMensagemWhatsapp: mocks.processarMensagemWhatsapp,
}))

vi.mock('../src/lib/queue-redis', () => ({
  queueRedisUrl: 'redis://localhost:6379',
}))

describe('startProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('cria Worker com a fila e opções esperadas', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379'
    const { startProcessor } = await import(
      '../src/modules/whatsapp/whatsapp.processor'
    )

    startProcessor()

    expect(mocks.workerCtor).toHaveBeenCalledTimes(1)
    expect(mocks.workerCtor).toHaveBeenCalledWith(
      'mensagem-whatsaap',
      expect.any(Function),
      {
        connection: { url: 'redis://localhost:6379' },
        skipVersionCheck: true,
        concurrency: 3,
      },
    )
  })

  test('converte base64 em Buffer e dataMensagem em Date antes de chamar o service', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379'
    const { startProcessor } = await import(
      '../src/modules/whatsapp/whatsapp.processor'
    )

    startProcessor()

    const processor = mocks.getProcessor()
    expect(processor).toBeTruthy()

    const base64 = Buffer.from('imagem-teste').toString('base64')
    const isoDate = '2026-06-08T21:00:00.000Z'

    await processor!({
      id: 'job-1',
      data: {
        connectionId: 99,
        grupoWappId: '120363000000000@g.us',
        grupoNome: 'Grupo QA',
        autor: '5511999999999@c.us',
        conteudo: 'Vaga com imagem',
        imagemBuffer: base64,
        imagemNome: 'vaga.png',
        dataMensagem: isoDate,
      },
    })

    expect(mocks.processarMensagemWhatsapp).toHaveBeenCalledWith({
      connectionId: 99,
      grupoWappId: '120363000000000@g.us',
      grupoNome: 'Grupo QA',
      autor: '5511999999999@c.us',
      conteudo: 'Vaga com imagem',
      imagemBuffer: Buffer.from(base64, 'base64'),
      imagemNome: 'vaga.png',
      dataMensagem: new Date(isoDate),
    })
  })

  test('mantém imagemBuffer nulo quando o job não possui mídia', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379'
    const { startProcessor } = await import(
      '../src/modules/whatsapp/whatsapp.processor'
    )

    startProcessor()

    const processor = mocks.getProcessor()
    expect(processor).toBeTruthy()

    const originalDate = new Date('2026-06-08T21:05:00.000Z')

    await processor!({
      id: 'job-2',
      data: {
        connectionId: 100,
        grupoWappId: 'newsletter-1@newsletter',
        grupoNome: 'Canal Vagas',
        autor: '5511888888888@c.us',
        conteudo: 'Vaga sem imagem',
        imagemBuffer: null,
        imagemNome: null,
        dataMensagem: originalDate,
      },
    })

    expect(mocks.processarMensagemWhatsapp).toHaveBeenCalledWith({
      connectionId: 100,
      grupoWappId: 'newsletter-1@newsletter',
      grupoNome: 'Canal Vagas',
      autor: '5511888888888@c.us',
      conteudo: 'Vaga sem imagem',
      imagemBuffer: null,
      imagemNome: null,
      dataMensagem: new Date(originalDate),
    })
  })
})
