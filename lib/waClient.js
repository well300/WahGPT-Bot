import { getContentType, jidDecode } from '@whiskeysockets/baileys'

export const decodeJid = (jid) => {
    const { user, server } = jidDecode(jid) || {}
    return user && server ? `${user}@${server}`.trim() : jid
}

export const serialize = (messages, client) => {
    if (messages.key) {
        messages.id = messages.key.id
        messages.isSelf = messages.key.fromMe
        messages.from = decodeJid(messages.key.remoteJid)
        messages.isGroup = messages.from.endsWith('@g.us')
        messages.sender = messages.isGroup
            ? decodeJid(messages.key.participant)
            : messages.isSelf
              ? decodeJid(client.user.id)
              : messages.from
    }
    if (messages.message) {
        messages.type = getContentType(messages.message)
        if (messages.type === 'ephemeralMessage') {
            messages.message = messages.message[messages.type].message
            const tipe = Object.keys(messages.message)[0]
            messages.type = tipe
            if (tipe === 'viewOnceMessageV2') {
                messages.message = messages.message[messages.type].message
                messages.type = getContentType(messages.message)
            }
        }
        if (messages.type === 'viewOnceMessageV2') {
            messages.message = messages.message[messages.type].message
            messages.type = getContentType(messages.message)
        }
        messages.messageTypes = (type) => ['videoMessage', 'imageMessage'].includes(type)
        try {
            const quoted = messages.message[messages.type]?.contextInfo
            if (quoted.quotedMessage['ephemeralMessage']) {
                const tipe = Object.keys(quoted.quotedMessage.ephemeralMessage.message)[0]
                if (tipe === 'viewOnceMessageV2') {
                    messages.quoted = {
                        type: 'view_once',
                        stanzaId: quoted.stanzaId,
                        participant: decodeJid(quoted.participant),
                        message: quoted.quotedMessage.ephemeralMessage.message.viewOnceMessage.message
                    }
                } else {
                    messages.quoted = {
                        type: 'ephemeral',
                        stanzaId: quoted.stanzaId,
                        participant: decodeJid(quoted.participant),
                        message: quoted.quotedMessage.ephemeralMessage.message
                    }
                }
            } else if (quoted.quotedMessage['viewOnceMessageV2']) {
                messages.quoted = {
                    type: 'view_once',
                    stanzaId: quoted.stanzaId,
                    participant: decodeJid(quoted.participant),
                    message: quoted.quotedMessage.viewOnceMessage.message
                }
            } else {
                messages.quoted = {
                    type: 'normal',
                    stanzaId: quoted.stanzaId,
                    participant: decodeJid(quoted.participant),
                    message: quoted.quotedMessage
                }
            }
            messages.quoted.isSelf = messages.quoted.participant === decodeJid(client.user.id)
            messages.quoted.mtype = Object.keys(messages.quoted.message).filter(
                (v) => v.includes('Message') || v.includes('conversation')
            )[0]
            messages.quoted.text =
                messages.quoted.message[messages.quoted.mtype]?.text ||
                messages.quoted.message[messages.quoted.mtype]?.description ||
                messages.quoted.message[messages.quoted.mtype]?.caption ||
                messages.quoted.message[messages.quoted.mtype]?.hydratedTemplate?.hydratedContentText ||
                messages.quoted.message[messages.quoted.mtype] ||
                ''
            messages.quoted.key = {
                id: messages.quoted.stanzaId,
                fromMe: messages.quoted.isSelf,
                remoteJid: messages.from
            }
            messages.quoted.download = () => downloadMedia(messages.quoted.message)
        } catch {
            messages.quoted = null
        }
        messages.body =
            messages.message?.conversation ||
            messages.message?.[messages.type]?.text ||
            messages.message?.[messages.type]?.caption ||
            (messages.type === 'listResponseMessage' &&
                messages.message?.[messages.type]?.singleSelectReply?.selectedRowId) ||
            (messages.type === 'buttonsResponseMessage' && messages.message?.[messages.type]?.selectedButtonId) ||
            (messages.type === 'templateButtonReplyMessage' && messages.message?.[messages.type]?.selectedId) ||
            ''
        messages.reply = (text) =>
            client.sendMessage(
                messages.from,
                {
                    text
                },
                {
                    quoted: messages
                }
            )
        messages.mentions = []
        if (messages.quoted?.participant) messages.mentions.push(messages.quoted.participant)
        const array = messages?.message?.[messages.type]?.contextInfo?.mentionedJid || []
        messages.mentions.push(...array.filter(Boolean))
    }
    return messages
}
