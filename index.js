import ws from '@whiskeysockets/baileys'
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = ws
import { remove } from 'fs-extra'
import { serialize } from './lib/waClient.js'
import * as dotenv from 'dotenv'
import axios from 'axios'
import P from 'pino'
import { Boom } from '@hapi/boom'

dotenv.config()

const start = async () => {
    const { state, saveCreds } = await useMultiFileAuthState("session")
    const client = makeWASocket({
        version: (await fetchLatestBaileysVersion()).version,
        auth: state,
        logger: P({ level: 'silent' }),
        printQRInTerminal: true
    })

    //connection updates
    client.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update
        if (update.qr) console.log(`Scan the QR code!!`)
        if (connection === 'close') {
            const { statusCode } = new Boom(lastDisconnect?.error).output
            if (statusCode !== DisconnectReason.loggedOut) setTimeout(() => start(), 3000)
            else {
                console.log('Disconnected :"(')
                await remove("session")
                console.log('Starting...')
                setTimeout(() => start(), 3000)
            }
        }
        if (connection === 'connecting') console.log('Connecting to WhatsApp!!')
        if (connection === 'open') console.log('Connected to WhatsApp')
        
    })
    client.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return
        const M = serialize(JSON.parse(JSON.stringify(messages[0])), client)
        if (M.quoted?.participant) M.mentions.push(M.quoted.participant)
        console.log(M.body)
        if (
            M.mentions.includes(client.user.id.split(':')[0] + '@s.whatsapp.net')
        ) {
            const text = await axios.get(`https://oni-chan-unique-api.vercel.app/gpt4?text=${M.body}`)
            M.reply(text.data.result)
        }


    })
    client.ev.on('creds.update', saveCreds)
}

start()
