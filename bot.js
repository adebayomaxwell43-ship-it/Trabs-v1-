const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const express = require('express');
const pino = require('pino');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html><html><head><title>TRABS-V1 PAIR</title><meta name="viewport" content="width=device-width, initial-scale=1">
<style>body{background:#0a0a0a;color:#fff;font-family:sans-serif;text-align:center;padding:20px}.card{background:#1a1a1a;padding:30px;border-radius:20px;max-width:400px;margin:auto;border:1px solid #333}input{width:90%;padding:15px;border-radius:10px;border:none;margin:15px 0;font-size:16px}button{background:#25D366;color:#fff;padding:15px 30px;border:none;border-radius:10px;font-size:18px;font-weight:bold;cursor:pointer;width:100%}h1{color:#25D366}.code{font-size:28px;letter-spacing:4px;background:#000;padding:15px;border-radius:10px;margin:15px 0;font-weight:bold;color:#25D366;word-break:break-all}</style></head><body>
<div class="card"><h1>TRABS-V1 🔥🦇</h1><p>Anti-Ban | Batman | By Maxwell</p><p style="color:#888;font-size:13px">Enter number without +</p>
<input id="num" placeholder="2348132616834" type="text"><button onclick="getCode()">Get Pair Code</button><div id="result"></div></div>
<script>async function getCode(){let n=document.getElementById('num').value.trim();if(!n){alert('Enter number');return}document.getElementById('result').innerHTML='Generating... please wait';try{let res=await fetch('/pair?number='+n);let data=await res.json();if(data.code){document.getElementById('result').innerHTML='<p>✅ Your Code (60sec):</p><div class=code>'+data.code+'</div><p style=font-size:14px>WhatsApp > Linked Devices > Link with phone number</p>';}else{document.getElementById('result').innerHTML='<p style=color:red>❌ '+(data.error||'Failed')+'</p><p style=font-size:12px>Wait 10sec and try again</p>';}}catch(e){document.getElementById('result').innerHTML='<p style=color:red>Server waking up... wait 15sec & try again</p>';}}</script></body></html>`);
});

async function getPairCode(number){
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');
  const sock = makeWASocket({ logger: pino({level:'silent'}), printQRInTerminal:false, auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level:'silent'})) }, browser: ["Trabs-V1-Batman", "Chrome", "1.0.0"] });
  sock.ev.on('creds.update', saveCreds);
  await new Promise(r=>setTimeout(r,3000));
  const code = await sock.requestPairingCode(number);
  return code;
}

app.get('/pair', async (req, res) => {
  let num = (req.query.number||'').replace(/[^0-9]/g,'');
  if(!num) return res.json({error:'Enter number'});
  try{ let code = await getPairCode(num); res.json({code}); }
  catch(e){ console.log('Pair error', e.message); res.json({error: 'Failed, try again in 10s - '+e.message}); }
});

app.listen(PORT, ()=> console.log('TRABS-V1 Pair Server Running on '+PORT));

async function startBot(){
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  const sock = makeWASocket({
    logger: pino({level:'silent'}), printQRInTerminal:false,
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level:'silent'})) },
    browser: ["Trabs-V1-Batman", "Chrome", "1.0.0"]
  });
  global.sock = sock;
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', (u)=>{
    const { connection, lastDisconnect } = u;
    if(connection === 'close'){
      if((lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut) startBot();
    } else if(connection === 'open'){ console.log('TRABS-V1 CONNECTED 🦇'); }
  });
  sock.ev.on('messages.upsert', async (m)=>{
    try{
      const msg=m.messages[0]; if(!msg.message||msg.key.fromMe) return;
      const from=msg.key.remoteJid;
      const body=msg.message.conversation||msg.message.extendedTextMessage?.text||"";
      if(!body.startsWith('.')) return;
      const args=body.slice(1).trim().split(/ +/); const cmd=args.shift().toLowerCase();
      const hasPic=fs.existsSync('./batman.jpg');
      const sendBat = async (cap)=>{
        if(hasPic) await sock.sendMessage(from,{image:fs.readFileSync('./batman.jpg'),caption:cap});
        else await sock.sendMessage(from,{text:cap});
      };
      if(cmd==='alive'||cmd==='menu'||cmd==='batman'){
        await sendBat(`*TRABS-V1 ALIVE 🔥🦇*\n\nOwner: Maxwell\nEdition: Batman\nStatus: Online\nAnti-Ban: Active\n\n.cmds: .alive .ping .owner .batman\n\n_🦇 I am vengeance!_`);
      }
      if(cmd==='ping'){ const s=Date.now(); await sock.sendMessage(from,{text:'Pinging... 🦇'}); await sock.sendMessage(from,{text:`*Pong!* ${Date.now()-s}ms ⚡`}); }
      if(cmd==='owner'){ await sendBat(`*TRABS-V1 OWNER 🦇*\nName: Maxwell (Trabs)\nNum: 2348132616834\nBot: Trabs-V1 Batman`); }
    }catch(e){ console.log(e) }
  });
}
startBot();
