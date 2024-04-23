import { makeWASocket } from '@whiskeysockets/baileys';
import pino from 'pino';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const CHATGPT_API_URL = process.env.CHATGPT_API_URL;
const DALLE_API_URL = process.env.DALLE_API_URL;

const logger = pino({ level: 'silent' });

const client = makeWASocket({
    logger: logger 
});

client.ev.on('conn', async (status) => {
    logger.info('📱 Scan the QR code below to log in:');
    logger.info(status.qrCode);
});

client.ev.on('open', () => {
    logger.info('✅ Authentication complete');
});

client.ev.on('message-new', async (message) => {
    const sender = message.key.remoteJid;
    const messageContent = message.message.conversation;

    logger.info(`👤 From: ${sender}`);
    logger.info(`💬 Message: ${messageContent}`);

    // Handle message content and respond accordingly
    // Example:
    if (messageContent.startsWith('/dalle')) {
        const text = messageContent.replace('/dalle', '').trim();
        try {
            const imageBase64 = await getDALLEImage(text);

            if (imageBase64) {
                const media = {
                    key: {
                        fromMe: true,
                        participant: '0@s.whatsapp.net',
                        remoteJid: sender
                    },
                    message: {
                        imageMessage: {
                            url: `data:image/jpeg;base64,${imageBase64}`,
                            mimetype: 'image/jpeg',
                            caption: 'DALL·E generated image'
                        }
                    }
                };

                logger.info('📸 Sending DALL·E generated image');
                client.interface.send('sendMessage', { ...media });
            } else {
                throw new Error('Failed to generate DALL·E image');
            }
        } catch (dalleError) {
            logger.error(`❌ ${dalleError.message}`);
            client.interface.send('sendMessage', {
                key: {
                    fromMe: true,
                    participant: '0@s.whatsapp.net',
                    remoteJid: sender
                },
                message: {
                    conversation: '❌ Failed to generate DALL·E image'
                }
            });
        }
    } else {
        const response = await getChatGPTResponse(messageContent);
        const emojiResponse = addEmojis(response);

        logger.info(`✉️ Response: ${emojiResponse}`);
        client.interface.send('sendMessage', {
            key: {
                fromMe: true,
                participant: '0@s.whatsapp.net',
                remoteJid: sender
            },
            message: {
                conversation: emojiResponse
            }
        });
    }
});

async function getChatGPTResponse(text) {
    const apiUrl = `${process.env.CHATGPT_API_URL}?prompt=${encodeURIComponent(text)}`
    try {
        const response = await axios.get(apiUrl)
        if (response.data.status) {
            return response.data.result.reply
        } else {
            throw new Error('API error')
        }
    } catch (error) {
        console.error(
            chalk.red(`❌ Error calling ChatGPT API: ${error.message}`)
        )
        throw new Error('Error calling ChatGPT API')
    }
}

async function getDALLEImage(text) {
    const apiUrl = `${process.env.DALLE_API_URL}?q=${encodeURIComponent(text)}`
    try {
        const response = await axios.get(apiUrl)
        const buffer = (
            await axios.get(response.data.result, {
                responseType: 'arraybuffer'
            })
        ).data
        return buffer
    } catch (error) {
        console.error(
            chalk.red(`❌ Error calling DALL·E API: ${error.message}`)
        )
        throw new Error('Error calling DALL·E API')
    }
}

function addEmojis(response) {
    // Add emojis based on conditions or keywords in the response
    let emojiResponse = '*🤖 Response:* ' + response;

    if (response.toLowerCase().includes('hello')) {
        emojiResponse += ' 👋';
    } else if (response.toLowerCase().includes('thank you')) {
        emojiResponse += ' 🙏';
    } else if (response.toLowerCase().includes('good morning')) {
        emojiResponse += ' 🌅';
    } else if (response.toLowerCase().includes('good night')) {
        emojiResponse += ' 🌃';
    } else if (response.toLowerCase().includes('good evening')) {
        emojiResponse += ' 🌆';
    } else if (response.toLowerCase().includes('good afternoon')) {
        emojiResponse += ' ☀️';
    } else if (response.toLowerCase().includes('good day')) {
        emojiResponse += ' 🌤️';
    }

    return emojiResponse;
}

async function main() {
    await client.connect();
}

main().catch((error) => {
    logger.error(`❗️ ${error.message}`);
    process.exit(1);
});
