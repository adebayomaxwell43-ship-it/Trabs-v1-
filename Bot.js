const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage } = require('@whiskeysockets/baileys')
const express = require('express')
const pino = require('pino')
const yts = require('yt-search')
const ytdl = require('@distube/ytdl-core')
const axios = require('axios')
const fs = require('fs')
const { Sticker, StickerTypes } = require('wa-sticker-formatter')

const BOT_NAME = "Trabs v1"
const BOT_DESC = "invented by Maxwell (pain. Or trabs)"
const BOT_PIC = "https://i.ibb.co/0jZ3Q0Y/batman.jpg"
const PREFIX = "."
const OWNER_NUMBER = "2348132616834"
const OWNER_JID = OWNER_NUMBER + "@s.whatsapp.net"

const app = express()
app.use(express.json())

let sockInstance;
let antilinkGroups = []

app.get('/', (req, res) => {
  res.send(`
  <html><head><title>${BOT_NAME} - Pair</title>
  <style>body{font-family:Arial;background:#0a0a0a;color:#fff;text-align:center;padding:40px} input{padding:14px;width:260px;border-radius:10px;border:none} button{padding:14px 22px;background:#ff0040;color:#fff;border:none;border-radius:10px} .box{border:1px solid #333;padding:25px;border-radius:20px;display:inline-block}</style>
  </head><body>
    <div class="box"><h1>🦇 ${BOT_NAME}</h1><p>${BOT_DESC}</p><p>Owner: ${OWNER_NUMBER}</p>
    <h3>🔗 Link Device</h3><input id="num" placeholder="2348132616834"/><button onclick="getCode()">Get Pair Code</button><p id="res"></p></div>
    <script>async function getCode(){const n=document.getElementById('num').value;if(!n)return alert('Enter number');document.getElementById('res').innerHTML='Loading...';const r=await fetch('/pair?number='+n);const d=await r.json();document.getElementById('res').innerHTML=d.code?'<h2 style=color:lime>'+d.code+'</h2>':'<p style=color:red>'+d.error+'</p>'}</script>
  </body></html>`)
})

app.get('/pair', async (req, res) => {
  const num = req.query.number
  if(!num) return res.json({ error: 'Add ?number=234...' })
  try {
    if(!sockInstance) return res.json({ error: 'Bot starting, wait 15s' })
    const code = await sockInstance.requestPairingCode(num.replace(/[^0-9]/g,''))
    res.json({ code })
  } catch(e){ res.json({ error: e.message }) }
})

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
  const sock = makeWASocket({ auth: state, logger: pino({ level: 'silent' }), printQRInTerminal: false, browser: [BOT_NAME, 'Chrome', '1.0'] })
  sockInstance = sock
  sock.ev.on('creds.update', saveCreds)
  sock.ev.on('connection.update', (u) => {
    const { connection, lastDisconnect } = u
    if(connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
      if(shouldReconnect) startBot()
    }
  })

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0]
    if(!m.message || m.key.fromMe) return
    const jid = m.key.remoteJid
    const sender = m.key.participant || jid
    const isGroup = jid.endsWith('@g.us')
    const isOwner = sender === OWNER_JID || jid === OWNER_JID

    const viewOnce = m.message.viewOnceMessageV2 || m.message.viewOnceMessage
    if(viewOnce) {
      await sock.sendMessage(jid, { forward: m }, { quoted: m })
    }
    if(jid === 'status@broadcast') {
      await sock.sendMessage(OWNER_JID, { forward: m })
    }

    const msgType = Object.keys(m.message)[0]
    let body = ""
    if(msgType === 'conversation') body = m.message.conversation
    else if(msgType === 'extendedTextMessage') body = m.message.extendedTextMessage.text
    else if(msgType === 'imageMessage' || msgType === 'videoMessage') body = m.message[msgType].caption || ""
    if(!body.startsWith(PREFIX)) return

    const args = body.slice(1).trim().split(/ +/)
    const cmd = args.shift().toLowerCase()

    if(cmd === 'menu' || cmd === 'help') {
      const menu = `
*╭───🦇 ${BOT_NAME} ───╮*
*│* Owner: ${OWNER_NUMBER}
*│* ${BOT_DESC}
*╰────────────────╯*

*🔥 OWNER CONTACT = .owner*
*🎵 MUSIC = .play*
*😎 STICKER = .sticker*
*👥 GROUP = .tagall .kick*

*FULL COMMANDS:*
• .menu • .ping • .alive
• .owner • .ai • .play
• .sticker • .tagall
• .kick • .promote
• .antilink on/off

*Real Owner: ${OWNER_NUMBER}*
`
      await sock.sendMessage(jid, { image: { url: BOT_PIC }, caption: menu }, { quoted: m })
    }

    if(cmd === 'ping') {
      const t = Date.now()
      await sock.sendMessage(jid, { text: `*Pong!* 🏓 ${Date.now()-t}ms\n${BOT_NAME}` }, { quoted: m })
    }

    if(cmd === 'alive') {
      await sock.sendMessage(jid, { text: `*${BOT_NAME} ALIVE* ✅\nOwner: ${OWNER_NUMBER}\nDesc: ${BOT_DESC}` }, { quoted: m })
    }

    // === REAL OWNER CONTACT CARD ===
    if(cmd === 'owner') {
      const vcard = 'BEGIN:VCARD\n' +
                    'VERSION:3.0\n' +
                    'FN:Maxwell - Trabs v1 Owner\n' +
                    'ORG:Trabs v1;\n' +
                    `TEL;type=CELL;type=VOICE;waid=${OWNER_NUMBER}:+${OWNER_NUMBER}\n` +
                    'END:VCARD'
      
      await sock.sendMessage(jid, { 
        contacts: { 
          displayName: 'Maxwell - Trabs v1 Owner', 
          contacts: [{ vcard }] 
        } 
      }, { quoted: m })
      
      await sock.sendMessage(jid, { 
        text: `*👑 REAL OWNER CONTACT* 👑\n\n*Name:* Maxwell (pain. Or trabs)\n*Bot:* ${BOT_NAME}\n*Number:* +${OWNER_NUMBER}\n*Link:* wa.me/${OWNER_NUMBER}\n\n*Description:* ${BOT_DESC}\n\n_Tap the contact card above to message owner directly - na him get Trabs v1 legit!_ ✅`
      })
    }

    if(cmd === 'sticker' || cmd === 's') {
      const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage
      const mediaMsg = quoted ? Object.keys(quoted)[0] : msgType
      const actualMsg = quoted ? quoted : m.message
      if(mediaMsg === 'imageMessage' || mediaMsg === 'videoMessage') {
        const buffer = await downloadMediaMessage({ message: actualMsg, key: m.key }, 'buffer', {}, { logger: pino({level:'silent'}), reuploadRequest: sock.updateMediaMessage })
        const sticker = new Sticker(buffer, { pack: BOT_NAME, author: OWNER_NUMBER, type: StickerTypes.FULL, quality: 70 })
        const stickerBuffer = await sticker.toBuffer()
        await sock.sendMessage(jid, { sticker: stickerBuffer }, { quoted: m })
      } else {
        await sock.sendMessage(jid, { text: 'Reply image/video with .sticker' }, { quoted: m })
      }
    }

    if(cmd === 'play') {
      if(!args[0]) return sock.sendMessage(jid, { text: '*Usage:* .play Asake' }, { quoted: m })
      const query = args.join(' ')
      await sock.sendMessage(jid, { text: `*🔍 Searching:* ${query}` }, { quoted: m })
      try {
        const search = await yts(query)
        const video = search.videos[0]
        if(!video) return
        await sock.sendMessage(jid, { image: { url: video.thumbnail }, caption: `*${BOT_NAME} Music*\n*${video.title}*\n${video.timestamp}` })
        const stream = ytdl(video.url, { filter: 'audioonly', quality: 'highestaudio' })
        const file = './song.mp3'
        const write = fs.createWriteStream(file)
        stream.pipe(write)
        write.on('finish', async () => {
          await sock.sendMessage(jid, { audio: { url: file }, mimetype: 'audio/mpeg', fileName: video.title+'.mp3' }, { quoted: m })
          fs.unlinkSync(file)
        })
      } catch(e){ await sock.sendMessage(jid, { text: 'Error: '+e.message }) }
    }

    if(cmd === 'ai') {
      const q = args.join(' ')
      if(!q) return
      try {
        const res = await axios.get(`https://api.simsimi.vn/v1/simtalk?text=${encodeURIComponent(q)}&lc=en`)
        await sock.sendMessage(jid, { text: `*${BOT_NAME} AI* 🤖\n\n${res.data.message}` }, { quoted: m })
      } catch { await sock.sendMessage(jid, { text: `*AI:* ${q}\nI'm ${BOT_NAME}!` }) }
    }

    if(cmd === 'tagall' && isGroup) {
      const meta = await sock.groupMetadata(jid)
      let txt = `*TagAll: ${meta.subject}*\n`
      for(let p of meta.participants) txt+=`@${p.id.split('@')[0]} `
      await sock.sendMessage(jid, { text: txt, mentions: meta.participants.map(a=>a.id) })
    }
    if(cmd === 'kick' && isGroup) {
      const mentioned = m.message.extendedTextMessage?.contextInfo?.mentionedJid
      if(mentioned) await sock.groupParticipantsUpdate(jid, mentioned, 'remove')
    }
  })
}

app.listen(process.env.PORT || 10000, () => {
  console.log('Server running')
  startBot()
})
