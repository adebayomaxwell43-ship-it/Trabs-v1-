const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const express = require('express');
const pino = require('pino');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const BATMAN_PIC = './batman.jpg'; // your uploaded pic

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html><html><head><title>TRABS-V1 PAIR</title><meta name="viewport" content="width=device-width, initial-scale=1">
<style>body{background:#0a0a0a;color:#fff;font-family:sans-serif;text-align:center;padding:20px}.card{background:#1a1a1a;padding:30px;border-radius:20px;max-width:400px;margin:auto;border:1px solid #333}input{width:90%;padding:15px;border-radius:10px;border:none;margin:15px 0;font-size:16px}button{background:#25D366;color:#fff;padding:15px 30px;border:none;border-radius:10px;font-size:18px;font-weight:bold;cursor:pointer;width:100%}h1{color:#25D366}.code{font-size:32px;letter-spacing:5px;background:#000;padding:15px;border-radius:10px;margin:15px 0;font-weight:bold;color:#25D366}img{width:100%;border-radius:15px;margin-bottom:15px}</style></head><body>
<div class="card"><img src="https://i.ibb.co/7J7GvQqT/batman.jpg" style="display:none" onerror="this.style.display='none'"><h1>TRABS-V1 🔥🦇</h1><p>Anti-Ban | Batman Edition | By Maxwell</p>
<input id="num" placeholder="2348132616834" type="text"><button onclick="getCode()">Get Pair Code</button><div id="result"></div></div>
<script>async function getCode(){let n=document.getElementById('num').value;if(!n){alert('Enter number');return}document.getElementById('result').innerHTML='Generating...';let res=await fetch('/pair?number='+n);let data=await res.json();if(data.code){document.getElementById('result').innerHTML='<p>Your Code:</p><div class=code>'+data.code+'</div><p>WhatsApp > Linked Devices > Link with phone number</p>';}else{document.getElementById('result').innerHTML='<p style=color:red>'+(data.error||'Failed')+'</p>';}}</script></body></html>
`);
});

app.get('/pair', async (req, res) => {
  let num = req.query.number; if(!num) return res.json({error:'No number'});
  num = num.replace(/[^0-9]/g,'');
  try {
    if(!global.sock || !global.sock.requestPairingCode) return res.json({error:'Bot starting... wait 10s'});
    let code = await global.sock.requestPairingCode(num);
    res.json({code});
  } catch(e){ console.log(e); res.json({error: e.message}); }
});

app.listen(PORT, ()=> console.log('Server running on '+PORT));

async function startBot(){
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  const sock = makeWASocket({
    logger: pino({level:'silent'}),
    printQRInTerminal: false,
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level:'silent'})) },
    browser: ["Trabs-V1-Batman", "Chrome", "1.0.0"]
  });
  global.sock = sock;
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', (update)=>{
    const { connection, lastDisconnect } = update;
    if(connection === 'close'){
      const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      if(shouldReconnect) startBot();
    } else if(connection === 'open'){ console.log('TRABS-V1 BATMAN Connected 🔥🦇'); }
  });
  sock.ev.on('messages.upsert', async (m)=>{
    try{
      const msg = m.messages[0]; if(!msg.message || msg.key.fromMe) return;
      const from = msg.key.remoteJid;
      const body = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
      if(!body.startsWith('.')) return;
      const args = body.slice(1).trim().split(/ +/); const command = args.shift().toLowerCase();
      
      const hasBatman = fs.existsSync(BATMAN_PIC);
      
      if(command === 'alive' || command === 'menu' || command === 'batman'){
        const caption = `*TRABS-V1 ALIVE 🔥🦇*\n\n*Owner:* Maxwell (Trabs)\n*Edition:* Batman - Vengeance\n*Bot:* Anti-Ban Active\n*Status:* Online\n\n*Commands:*\n.alive - this card\n.ping - speed\n.owner - owner\n.batman - batman pic\n\n_🦇 I am vengeance!_`;
        if(hasBatman){
          await sock.sendMessage(from, { image: fs.readFileSync(BATMAN_PIC), caption });
        } else {
          await sock.sendMessage(from, { text: caption });
        }
      }
      if(command === 'ping'){ const s=Date.now(); await sock.sendMessage(from,{text:'Pinging... 🦇'}); await sock.sendMessage(from,{text:`*Pong!* ${Date.now()-s}ms ⚡🦇`}); }
      if(command === 'owner'){
        const cap = `*TRABS-V1 OWNER 🦇*\n\n*Name:* Maxwell (Trabs)\n*Number:* 2348132616834\n*Theme:* Batman\n*Bot:* Trabs-V1 Anti-Ban\n\n_The Dark Knight of Bots_`;
        if(hasBatman){
          await sock.sendMessage(from, { image: fs.readFileSync(BATMAN_PIC), caption: cap });
        } else {
          await sock.sendMessage(from, { text: cap });
        }
      }
    }catch(e){ console.log(e) }
  });
}
startBot();
