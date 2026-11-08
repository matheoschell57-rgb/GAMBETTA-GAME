/* Test rapide de tout Gambetta Game avant une mise en ligne.
   Usage : node tools/smoke.js <fichier-maitre.html> [dossier-leaflet]
   Lance chaque mini-jeu quelques secondes avec des touches au hasard, ouvre chaque écran et onglet,
   et signale toute erreur JavaScript. Code de sortie 1 s'il y a une erreur. */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),os=require('os');
const SRC=process.argv[2],LF=process.argv[3]||'';
(async()=>{
  let s=fs.readFileSync(SRC,'utf8');const k='function startGame(k){';if(!s.includes(k))throw new Error('startGame introuvable');
  s=s.replace(k,'window.__T={ORDER:()=>ORDER,startGame:x=>startGame(x),stopGame:()=>stopGame(),show:x=>show(x),hubGo:x=>hubGo(x),openHub:()=>openHub(),openMoi:()=>{try{openMoi()}catch(e){show("moi")}},COL:()=>COL,CHARS:()=>CHARS};'+k);
  const tmp=path.join(os.tmpdir(),'gg-smoke.html');fs.writeFileSync(tmp,s);
  const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},geolocation:{latitude:49.104,longitude:6.2,accuracy:10},permissions:['geolocation']});
  const p=await ctx.newPage();let errs=[],where='chargement';p.on('pageerror',e=>errs.push(where+' : '+e.message));
  await p.route(/cdnjs\.cloudflare\.com\/ajax\/libs\/leaflet\/.*leaflet\.min\.(js|css)/,r=>{const css=r.request().url().endsWith('.css');const f=LF&&path.join(LF,'leaflet'+(css?'.css':'.js'));if(f&&fs.existsSync(f))r.fulfill({body:fs.readFileSync(f),contentType:css?'text/css':'application/javascript'});else r.abort();});
  await p.route(/tile\.openstreetmap\.org|firebase|gstatic|googleapis|onesignal/i,r=>r.abort());
  await p.goto('file://'+tmp);await p.waitForTimeout(2500);
  await p.evaluate(()=>{document.querySelectorAll('.giftpop,.toast,.ggpop').forEach(x=>x.remove());const C=__T.COL();C.rul=C.rul||{};__T.ORDER().forEach(k=>C.rul[k]=1);C.goTut=1;});
  const games=await p.evaluate(()=>__T.ORDER());const bad={};
  for(const g of games){where='mini-jeu '+g;const n0=errs.length;
    await p.evaluate(g=>__T.startGame(g),g);await p.waitForTimeout(300);
    /* vérifié juste après le lancement : ensuite, les touches au hasard peuvent finir la partie et quitter l'écran */
    const live=await p.evaluate(()=>{const st=document.querySelector('#stage');return !!(st&&st.childElementCount)&&document.querySelector('#game').classList.contains('active');});if(!live)bad[g]=(bad[g]||'')+' (ne démarre pas)';
    for(let i=0;i<14;i++){const x=40+Math.random()*310,y=150+Math.random()*560;await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x+(Math.random()-.5)*120,y+(Math.random()-.5)*120,{steps:3});await p.mouse.up();
      await p.keyboard.press(['ArrowLeft','ArrowRight','ArrowUp','Space'][i%4]);await p.waitForTimeout(110);}
    await p.evaluate(()=>{__T.stopGame();document.querySelectorAll('.rulesov').forEach(x=>x.remove());});if(errs.length>n0)bad[g]=errs.length-n0;}
  where='écrans';
  for(const h of ['select','bataille','fighter','pixel','manager','go','party','qq']){where='écran '+h;await p.evaluate(()=>__T.openHub());await p.waitForTimeout(200);await p.evaluate(h=>__T.hubGo(h),h);await p.waitForTimeout(h==='go'?1500:500);
    await p.evaluate(()=>document.querySelectorAll('.sheet,.gocatch,.gotuto').forEach(x=>x.remove()));}
  where='Gambetta-dex';await p.evaluate(()=>__T.hubGo('go'));await p.waitForTimeout(800);await p.evaluate(()=>{const d=document.querySelector('#goDexBtn');d&&d.click();});await p.waitForTimeout(300);
  await p.evaluate(()=>{const f=document.querySelector('#goFlt');if(f){f.value='miss';f.dispatchEvent(new Event('change'));}});await p.waitForTimeout(300);
  where='classements';await p.evaluate(()=>__T.show('ranks'));for(const t of await p.$$eval('.tab.rt',x=>x.map(e=>e.dataset.r))){where='classement '+t;await p.evaluate(()=>document.querySelectorAll('.giftpop,.toast,.ggpop,.sheet').forEach(x=>x.remove()));await p.click('.tab.rt[data-r="'+t+'"]');await p.waitForTimeout(400);}
  where='Moi';await p.evaluate(()=>__T.openMoi());await p.waitForTimeout(500);
  where='Jouer';await p.evaluate(()=>__T.openHub());await p.waitForTimeout(800);
  console.log('Mini-jeux testés :',games.length,'· avec erreur :',Object.keys(bad).length?JSON.stringify(bad):'aucun');
  console.log('Erreurs :',errs.length?'\n - '+[...new Set(errs)].slice(0,20).join('\n - '):'0');
  await b.close();process.exit(errs.length||Object.keys(bad).length?1:0);})().catch(e=>{console.error('ÉCHEC DU TEST',e.message);process.exit(2);});
