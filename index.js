import {
    jidDecode,
    makeWASocket,
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion
} from '@whiskeysockets/baileys'
import {
    Boom
} from '@hapi/boom'
import * as dotenv from 'dotenv'
import axios from 'axios'
import P from 'pino'

dotenv.config()

connect()

const getChatGPTResponse = async (text) => {
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

const getDALLEImage = async (text) => {
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

const sanitizeJids = (jid) => {
    if (/:\d+@/gi.test(jid)) {
        const decoded = jidDecode(jid)
        if (decoded?.server && decoded.user) {
            return format('%s@%s', decoded.user, decoded.server)
        }
        return jid
    } else return jid
}

const connect = async () => {
    const {
        state,
        saveCreds
    } = await useMultiFileAuthState('session')
    const socket = makeWASocket({
        version: (await fetchLatestBaileysVersion()).version,
        auth: state,
        logger: P({
            level: 'silent'
        }),
        printQRInTerminal: true
    })
    socket.ev.on('connection.update', async (update) => {
        const {
            connection,
            lastDisconnect,
            qr
        } = update
        const {
            statusCode
        } = new Boom(lastDisconnect?.error).output
        if (qr) console.log('Qr has been generated!!')

        if (connection === 'close') {
            if (statusCode !== DisconnectReason.loggedOut)
                setTimeout(() => connect(), 3000)
            else {
                console.log(
                    'Disconnected! Something went wrong during connection!'
                )
                setTimeout(() => connect(), 3000)
            }
        }
        if (connection === 'connecting') console.log('Connecting to the phone!')
        if (connection === 'open') console.log('Connected to the phone >.<!')
    })
    socket.ev.on('messages.upsert', async ({
        messages
    }) => {
        const {
            message
        } = JSON.parse(JSON.stringify(messages[0]))
        const content = (() => {
            if (message?.buttonsResponseMessage)
                return message?.buttonsResponseMessage?.selectedButtonId || ''
            if (message?.listResponseMessage)
                return (
                    message?.listResponseMessage?.singleSelectReply
                    ?.selectedRowId || ''
                )
            return message?.conversation ?
                message.conversation :
                this.supportedMediaMessages.includes(type) ?
                this.supportedMediaMessages
                .map((type) => message?.[type]?.caption)
                .filter((caption) => caption)[0] || '' :
                message?.extendedTextMessage?.text ?
                message?.extendedTextMessage.text :
                ''
        })()
        const array =
            (message?.[type]?.contextInfo?.mentionedJid ? message[type]?.contextInfo?.mentionedJid : []) || []
        const mentioned = array.filter(Boolean)
        if (quoted?.sender) M.mentioned.push(M.quoted.sender)
        if (mentioned.includes(sanitizeJid(socket.user?.id ?? '')) && !content.startsWith(process.env.PREFIX)) {
            try {
                const text = await getChatGPTResponse(content)
                return socket.sendMessage(
                    M.from, {
                        text
                    }, {
                        quoted: M
                    }
                )
            } catch (err) {
                socket.sendMessage(
                    M.from, {
                        text: err.message
                    }, {
                        quoted: M
                    }
                )
            }
        }

        const [cmd, ...args] = body.replace(process.env.PREFIX, '').split(' ')
        const arg = args.join(' ')
        switch (cmd) {
            case 'dalle':
                if (!arg)
                    return socket.sendMessage(
                        M.from, {
                            text: 'You did not provide any term!!'
                        }, {
                            quoted: M
                        }
                    )
                try {
                    const image = await getDALLEImage(arg)
                    return socket.sendMessage(
                        M.from, {
                            image
                        }, {
                            quoted: M
                        }
                    )
                } catch (err) {
                    socket.sendMessage(
                        M.from, {
                            text: err.message
                        }, {
                            quoted: M
                        }
                    )
                }
        }
    })
    socket.ev.on('creds.update', saveCreds)
}