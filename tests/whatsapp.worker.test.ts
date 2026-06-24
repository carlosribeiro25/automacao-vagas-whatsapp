import { beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  add: vi.fn(),
}))

vi.mock('../src/modules/whatsapp/whatsapp.queue', () => ({
  mensagemQueue: {
    add: mocks.add,
  },
}))

type Handler = (msg: FakeMessage) => void | Promise<void>

class FakeClient {
  listeners = new Map<'message' | 'message_create', Handler[]>()

  on(event: 'message' | 'message_create', listener: Handler) {
    const current = this.listeners.get(event) ?? []
    current.push(listener)
    this.listeners.set(event, current)
  }

  async emit(event: 'message' | 'message_create', msg: FakeMessage) {
    const listeners = this.listeners.get(event) ?? []
    for (const listener of listeners) {
      await listener(msg)
    }
  }
}

type FakeMessage = {
  from: string
  to?: string
  author?: string
  body: string
  hasMedia: boolean
  timestamp: number
  id: { _serialized: string }
  getChat: () => Promise<{ name: string }>
  downloadMedia: () => Promise<{ data?: string; mimetype: string } | null>
}

describe('bindWhatsappMessageHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('registra handlers para message e message_create', async () => {
    const { bindWhatsappMessageHandlers } = await import(
      '../src/modules/whatsapp/whatsaap.worker'
    )
    const client = new FakeClient()

    bindWhatsappMessageHandlers(client, 10)

    expect(client.listeners.get('message')).toHaveLength(1)
    expect(client.listeners.get('message_create')).toHaveLength(1)
  })

  test('enfileira mensagem recebida de grupo com payload esperado', async () => {
    const { bindWhatsappMessageHandlers } = await import(
      '../src/modules/whatsapp/whatsaap.worker'
    )
    const client = new FakeClient()
    bindWhatsappMessageHandlers(client, 22)

    const msg: FakeMessage = {
      from: '120363111111111@g.us',
      to: '5511999999999@c.us',
      author: '5511888888888@c.us',
      body: 'Nova vaga backend',
      hasMedia: false,
      timestamp: 1_780_000_000,
      id: { _serialized: 'abc123' },
      getChat: vi.fn().mockResolvedValue({ name: 'Grupo Backend' }),
      downloadMedia: vi.fn().mockResolvedValue(null),
    }

    await client.emit('message', msg)

    expect(mocks.add).toHaveBeenCalledWith('processar', {
      connectionId: 22,
      grupoWappId: '120363111111111@g.us',
      grupoNome: 'Grupo Backend',
      autor: '5511888888888@c.us',
      conteudo: 'Nova vaga backend',
      imagemBuffer: null,
      imagemNome: null,
      dataMensagem: new Date(msg.timestamp * 1000),
    })
  })

  test('usa destino como origem quando mensagem foi enviada para grupo/canal', async () => {
    const { bindWhatsappMessageHandlers } = await import(
      '../src/modules/whatsapp/whatsaap.worker'
    )
    const client = new FakeClient()
    bindWhatsappMessageHandlers(client, 23)

    const msg: FakeMessage = {
      from: '5511999999999@c.us',
      to: 'newsletter-1@newsletter',
      body: 'Mensagem no canal',
      hasMedia: false,
      timestamp: 1_780_000_001,
      id: { _serialized: 'def456' },
      getChat: vi.fn().mockResolvedValue({ name: 'Canal Vagas' }),
      downloadMedia: vi.fn().mockResolvedValue(null),
    }

    await client.emit('message_create', msg)

    expect(mocks.add).toHaveBeenCalledWith('processar', {
      connectionId: 23,
      grupoWappId: 'newsletter-1@newsletter',
      grupoNome: 'Canal Vagas',
      autor: '5511999999999@c.us',
      conteudo: 'Mensagem no canal',
      imagemBuffer: null,
      imagemNome: null,
      dataMensagem: new Date(msg.timestamp * 1000),
    })
  })

  test('extrai midia e nome do arquivo quando a mensagem tem anexo', async () => {
    const { bindWhatsappMessageHandlers } = await import(
      '../src/modules/whatsapp/whatsaap.worker'
    )
    const client = new FakeClient()
    bindWhatsappMessageHandlers(client, 24)

    const base64 = Buffer.from('imagem-teste').toString('base64')
    const msg: FakeMessage = {
      from: '120363222222222@g.us',
      to: '5511999999999@c.us',
      body: 'Segue imagem',
      hasMedia: true,
      timestamp: 1_780_000_002,
      id: { _serialized: 'media789' },
      getChat: vi.fn().mockResolvedValue({ name: 'Grupo Design' }),
      downloadMedia: vi.fn().mockResolvedValue({
        data: base64,
        mimetype: 'image/png; charset=utf-8',
      }),
    }

    await client.emit('message', msg)

    expect(mocks.add).toHaveBeenCalledWith('processar', {
      connectionId: 24,
      grupoWappId: '120363222222222@g.us',
      grupoNome: 'Grupo Design',
      autor: '120363222222222@g.us',
      conteudo: 'Segue imagem',
      imagemBuffer: base64,
      imagemNome: 'media789.png',
      dataMensagem: new Date(msg.timestamp * 1000),
    })
  })

  test('ignora mensagens fora de grupo ou canal', async () => {
    const { bindWhatsappMessageHandlers } = await import(
      '../src/modules/whatsapp/whatsaap.worker'
    )
    const client = new FakeClient()
    bindWhatsappMessageHandlers(client, 25)

    const msg: FakeMessage = {
      from: '5511999999999@c.us',
      to: '5511888888888@c.us',
      body: 'Chat privado',
      hasMedia: false,
      timestamp: 1_780_000_003,
      id: { _serialized: 'ghi789' },
      getChat: vi.fn().mockResolvedValue({ name: 'Privado' }),
      downloadMedia: vi.fn().mockResolvedValue(null),
    }

    await client.emit('message', msg)

    expect(mocks.add).not.toHaveBeenCalled()
  })

  test('captura erro do processamento sem propagar excecao', async () => {
    const { bindWhatsappMessageHandlers } = await import(
      '../src/modules/whatsapp/whatsaap.worker'
    )
    const client = new FakeClient()
    bindWhatsappMessageHandlers(client, 26)
    const errorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)

    const msg: FakeMessage = {
      from: '120363333333333@g.us',
      to: '5511999999999@c.us',
      body: 'Mensagem com falha',
      hasMedia: false,
      timestamp: 1_780_000_004,
      id: { _serialized: 'jkl012' },
      getChat: vi.fn().mockRejectedValue(new Error('chat error')),
      downloadMedia: vi.fn().mockResolvedValue(null),
    }

    await expect(client.emit('message', msg)).resolves.toBeUndefined()
    expect(mocks.add).not.toHaveBeenCalled()
    expect(errorSpy).toHaveBeenCalled()
  })
})
