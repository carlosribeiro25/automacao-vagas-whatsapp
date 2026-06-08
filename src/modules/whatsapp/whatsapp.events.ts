import { EventEmitter } from 'node:events'

export type WhatsappRuntimeEvent = {
  type: 'status' | 'qr' | 'error'
  payload: Record<string, unknown>
}

const whatsappEvents = new EventEmitter()

function getChannel(connectionId: number) {
  return `whatsapp:connection:${connectionId}`
}

export function emitWhatsappRuntimeEvent(
  connectionId: number,
  event: WhatsappRuntimeEvent,
) {
  whatsappEvents.emit(getChannel(connectionId), event)
}

export function subscribeWhatsappRuntimeEvents(
  connectionId: number,
  listener: (event: WhatsappRuntimeEvent) => void,
) {
  const channel = getChannel(connectionId)
  whatsappEvents.on(channel, listener)

  return () => {
    whatsappEvents.off(channel, listener)
  }
}