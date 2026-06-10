import { mensagemQueue } from './whatsapp.queue.js';
export function bindWhatsappMessageHandlers(client, connectionId) {
    const handler = async (msg) => {
        console.log('[Worker] Mensagem recebida de:', msg.from, '→', msg.to);
        try {
            const origem = msg.from.endsWith('@g.us') || msg.from.endsWith('@newsletter')
                ? msg.from
                : msg.to?.endsWith('@g.us') || msg.to?.endsWith('@newsletter')
                    ? msg.to
                    : null;
            if (!origem)
                return;
            const chat = await msg.getChat();
            const grupoNome = chat.name;
            let imagemBuffer = null;
            let imagemNome = null;
            if (msg.hasMedia) {
                const midia = await msg.downloadMedia();
                if (midia?.data) {
                    imagemBuffer = Buffer.from(midia.data, 'base64');
                    const extrair = midia.mimetype.split('/')[1]?.split(';')[0] ?? 'jpg';
                    imagemNome = `${msg.id._serialized}.${extrair}`;
                }
            }
            await mensagemQueue.add('processar', {
                connectionId,
                grupoWappId: origem,
                grupoNome,
                autor: msg.author ?? msg.from,
                conteudo: msg.body,
                imagemBuffer: imagemBuffer?.toString('base64') ?? null,
                imagemNome,
                dataMensagem: new Date(msg.timestamp * 1000),
            });
        }
        catch (error) {
            console.error('[Worker] Erro ao processar mensagem:', JSON.stringify(error, null, 2), error);
        }
    };
    client.on('message', handler);
    client.on('message_create', handler);
}
