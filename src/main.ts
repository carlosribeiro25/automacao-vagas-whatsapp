import pkg from 'whatsapp-web.js'
import type { Message } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal'
import { executablePath } from 'puppeteer'
import fs from 'fs';
import path from 'path';

const { Client, LocalAuth, MessageMedia } = pkg 



const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: false,
        executablePath: executablePath(),
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote',
        ]
    }
});

client.once('ready', () => {
    console.log('Client is ready!');
});

client.on('qr', (qr: string) => {
    qrcode.generate(qr, { small: true});
    console.log('QR recebido, gerando...');
});

client.on('auth_failure', (msg: string) => {
    console.error('Falha de autenticação:', msg);
});

client.on('change_state', (state: string) => {
    console.log('Estado mudou:', state);
});

client.on('message', async (msg: Message) => {
    if (msg.body === '!send-media') {
        const imagePath = path.join(__dirname, 'image.png')
        const base64Image = fs.readFileSync(imagePath, { encoding: 'base64' });
        const media = new MessageMedia('image.png', base64Image);
        await client.sendMessage(msg.from, media);
    }
});

client.on('message_create', (message: Message) => {
	console.log(message.body);
});


client.initialize().catch( (err: Error)=> console.error('Erro ao inicializar:', err))
console.log('Inicializando cliente WhatsApp...')

