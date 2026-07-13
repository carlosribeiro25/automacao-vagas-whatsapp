import { EventEmitter } from 'node:events'
const whatsappEvents = new EventEmitter()
function getChannel(connectionId) {
  return `whatsapp:connection:${connectionId}`
}
export function emitWhatsappRuntimeEvent(connectionId, event) {
  whatsappEvents.emit(getChannel(connectionId), event)
}
export function subscribeWhatsappRuntimeEvents(connectionId, listener) {
  const channel = getChannel(connectionId)
  whatsappEvents.on(channel, listener)
  return () => {
    whatsappEvents.off(channel, listener)
  }
}
