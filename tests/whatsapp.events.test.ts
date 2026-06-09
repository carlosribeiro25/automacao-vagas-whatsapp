import { describe, expect, test, vi } from 'vitest'
import {
  emitWhatsappRuntimeEvent,
  subscribeWhatsappRuntimeEvents,
} from '../src/modules/whatsapp/whatsapp.events'

describe('whatsapp.events', () => {
  test('entrega evento ao listener inscrito no connectionId correto', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeWhatsappRuntimeEvents(10, listener)

    emitWhatsappRuntimeEvent(10, {
      type: 'status',
      payload: { status: 'ready' },
    })

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith({
      type: 'status',
      payload: { status: 'ready' },
    })

    unsubscribe()
  })

  test('não entrega evento de outro connectionId', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeWhatsappRuntimeEvents(11, listener)

    emitWhatsappRuntimeEvent(12, {
      type: 'qr',
      payload: { status: 'qr_ready', qr: 'abc' },
    })

    expect(listener).not.toHaveBeenCalled()
    unsubscribe()
  })

  test('unsubscribe remove o listener do canal', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeWhatsappRuntimeEvents(13, listener)

    unsubscribe()
    emitWhatsappRuntimeEvent(13, {
      type: 'error',
      payload: { status: 'failed', message: 'boom' },
    })

    expect(listener).not.toHaveBeenCalled()
  })
})
