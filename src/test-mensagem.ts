import { processarMensagemWhatsapp } from './modules/whatsaap/whatsaap.service.js'

await processarMensagemWhatsapp({
  grupoWappId: '5511999999999-1234567890@g.us',
  grupoNome: 'Grupo Teste Vagas',
  autor: '5511999999999@c.us',
  conteudo: 'Vaga de teste de backend Node.js',
  imagemBuffer: null,
  imagemNome: null,
  dataMensagem: new Date(),
})

console.log('✅ Mensagem processada!')
