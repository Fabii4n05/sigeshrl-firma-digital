import {spawn} from 'node:child_process';
const url='http://localhost:5173';
async function ready(){try{const r=await fetch(url+'/api/health',{signal:AbortSignal.timeout(900)});const data=await r.json();return data.ok&&data.mode==='academic-demo';}catch{return false;}}
function open(){if(process.platform==='win32')spawn('explorer.exe',[url],{windowsHide:true,stdio:'ignore'}).on('error',()=>console.log('Abre '+url+' en tu navegador.'));else console.log('Abre '+url+' en tu navegador.');}
if(await ready()){console.log('SIGESHRL ya se está ejecutando.');open();}
else {
  const child=spawn(process.execPath,['dist/local/server.mjs'],{stdio:'inherit',windowsHide:true});
  let exited=false;child.on('exit',code=>{exited=true;process.exitCode=code??0;});
  for(let i=0;i<40&&!exited;i++){if(await ready()){open();break;}await new Promise(resolve=>setTimeout(resolve,250));}
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill());
}
