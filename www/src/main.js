import * as THREE from 'three';

const $ = s => document.querySelector(s);
const canvas = $('#world');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:false});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#9adcf3');
scene.fog = new THREE.Fog('#9adcf3', 25, 55);
const camera = new THREE.OrthographicCamera(-7,7,10,-10,.1,100);
camera.position.set(0,18,.001);
camera.up.set(0,0,-1);
camera.lookAt(0,0,0);
scene.add(new THREE.HemisphereLight('#ffffff','#7894aa',2.0));
const sun = new THREE.DirectionalLight('#fff1d1',2.4);
sun.position.set(-8,16,10); sun.castShadow=true; sun.shadow.mapSize.set(1024,1024); scene.add(sun);
const mat = c => new THREE.MeshStandardMaterial({color:c,roughness:.5});
const M = {
 grass:mat('#66cf91'), road:mat('#42556b'), cell:mat('#52687d'), edge:mat('#dce8ed'),
 white:mat('#ffffff'), mint:mat('#4df2ad'), target:mat('#ff5368'), blue:mat('#4c9dff'),
 yellow:mat('#ffcb52'), purple:mat('#a67cff'), orange:mat('#ff974f'), teal:mat('#39d6cc'),
 red:mat('#ff5266'), glass:mat('#c8f5ff'), rubber:mat('#263647'), wood:mat('#bd8750'),
 steel:mat('#aab8c6'), water:mat('#3aaee6'), fire:mat('#ff794f'), rail:mat('#e4edf4')
};
const boxGeo = new THREE.BoxGeometry(1,1,1);
function cube(parent,x,y,z,sx,sy,sz,material,cast=true){
 const o=new THREE.Mesh(boxGeo,material);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=cast;o.receiveShadow=true;parent.add(o);return o;
}
function group(parent,x=0,y=0,z=0){const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g;}
const floor = cube(scene,0,-.6,0,20,.5,24,M.grass,false);
const board = group(scene);
const decor = group(scene);
let objects=[], vehicles=[], selected=null, levelIndex=0, moves=0, coins=120, stars=0, completedLevels=[], won=false, savedMoves=[], levelState=null, toastTimer;
let settings={sound:true,vibration:true};
let restoredBoardState=null;
try{const prefs=JSON.parse(localStorage.getItem('trafficPuzzleSettings')||'null');if(prefs)settings={sound:prefs.sound!==false,vibration:prefs.vibration!==false}}catch{}
function saveSettings(){try{localStorage.setItem('trafficPuzzleSettings',JSON.stringify(settings))}catch{}}
function feedback(kind='tap'){if(settings.vibration&&typeof navigator!=='undefined'&&navigator.vibrate)navigator.vibrate(kind==='win'?[35,45,70]:kind==='error'?35:12);if(!settings.sound)return;try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const ctx=new C(),osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.value=kind==='win'?740:kind==='error'?180:440;gain.gain.setValueAtTime(.045,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.09);osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.1);osc.onended=()=>ctx.close()}catch{}}
const colors=[M.blue,M.yellow,M.purple,M.orange,M.teal,M.red];
const modes=[
 {name:'Traffic Command',ar:'Traffic Control',desc:'Clear the exit by moving vehicles in the right order.',icon:'🚦'},
 {name:'Bus Terminal',ar:'Bus Terminal',desc:'Move the long buses to clear the terminal exit.',icon:'🚌'},
 {name:'Bridge Builder',ar:'Bridge Builder',desc:'Arrange the road pieces to open a safe crossing.',icon:'🌉'},
 {name:'Cargo Sort',ar:'Cargo Sort',desc:'Move cargo trucks to open the delivery lane.',icon:'📦'},
 {name:'City Rescue',ar:'City Rescue',desc:'Clear the road for the rescue vehicle.',icon:'🚒'},
 {name:'Train & Bus Connect',ar:'Transit Link',desc:'Clear the lanes to reach the exit.',icon:'🚆'},
 {name:'Park & Flow',ar:'Traffic Jam',desc:'أخلِ الساحة بأقل عدد من الحركات.',icon:'🅿️'}
];
const totalLevels=30;
const levelName=i=>modes[0];
function toast(s){const el=$('#toast');el.textContent=s;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),1900);}
function save(){try{localStorage.setItem('trafficPuzzleWorld',JSON.stringify({levelIndex,coins,stars,completedLevels,boardState:{levelIndex,moves,won,positions:vehicles.map(v=>({id:v.userData.id,row:v.userData.row,col:v.userData.col})),savedMoves}}))}catch{}}
try{const data=JSON.parse(localStorage.getItem('trafficPuzzleWorld')||'null');if(data){levelIndex=Math.max(0,Math.min(totalLevels-1,Number(data.levelIndex)||0));coins=Math.max(0,Number(data.coins)||0);stars=Math.max(0,Number(data.stars)||0);completedLevels=Array.isArray(data.completedLevels)?data.completedLevels.filter(n=>Number.isInteger(n)&&n>=0&&n<totalLevels):[];restoredBoardState=data.boardState&&data.boardState.levelIndex===levelIndex?data.boardState:null}}catch{}
function clearGroup(g){while(g.children.length)g.remove(g.children[g.children.length-1]);}
function resetBoard(){
 clearGroup(board);clearGroup(decor);objects=[];vehicles=[];selected=null;moves=0;won=false;savedMoves=[];
 const mode=0, difficulty=levelIndex%10+1;
 const ground=mode===2?M.water:M.road;
 cube(board,0,-.22,0,6.65,.38,6.65,ground,false);
 for(let r=0;r<6;r++)for(let c=0;c<6;c++){
  cube(board,c-2.5,-.015,r-2.5,.96,.045,.96,mat(mode===2?'#5abce8':mode===3?'#60758a':'#5b6e81'),false);
  if((r+c)%2===0)cube(board,c-2.5,.012,r-2.5,.88,.025,.88,mat(mode===2?'#4eb2df':'#607488'),false);
 }
 // Miniature city dressing: sidewalks, low-rise blocks, trees and traffic lights around the puzzle.
 const buildingColors=['#f2bd86','#d8e2ef','#c4d6e7','#f3d7a5','#b6d9d0'];
 for(let side of [-1,1]){
  for(let k=0;k<3;k++){
   const z=-2.6+k*2.55, x=side*4.05;
   cube(decor,x,-.03,z,.62,.16,1.9,mat('#d7e0e8'),false);
   const h=1.15+(k%2)*.55;
   cube(decor,x,.05+h/2,z,.5,h,1.18,mat(buildingColors[(k+(side===1?2:0))%buildingColors.length]),false);
   for(let wz=-.35;wz<=.4;wz+=.38)for(let wy=.28;wy<h-.12;wy+=.36){
    cube(decor,x-side*.06,.05+wy,z+wz,.025,.12,.13,M.glass,false);
   }
  }
  for(let k=0;k<3;k++){
   const z=-2.7+k*2.6,x=side*3.65;
   const trunk=cube(decor,x,.24,z,.12,.48,.12,M.wood,false);
   const crown=new THREE.Mesh(new THREE.SphereGeometry(.31,10,8),mat('#3ba96c'));
   crown.position.set(x,.62,z);crown.castShadow=true;decor.add(crown);
  }
 }
 // Traffic signal posts at the exit make the goal feel like a real city crossing.
 for(const x of [-3.55,3.55]){
  cube(decor,x,.48,-.8,.09,.96,.09,M.rubber,false);
  cube(decor,x,.9,-.8,.24,.42,.18,M.rubber,false);
  cube(decor,x,.98,-.8,.1,.09,.07,M.red,false);
  cube(decor,x,.83,-.8,.1,.07,.07,M.yellow,false);
  cube(decor,x,.69,-.8,.1,.07,.07,M.mint,false);
 }
 // Exit lane and goal marker
 cube(board,3.52,.02,0,.75,.08,1.0,M.mint,false);
 for(let a=0;a<3;a++)cube(board,3.4,.08,(a-1)*.23,.28,.025,.08,M.white,false);
 // Light boundary posts
 for(let r=0;r<6;r++)for(let c=0;c<6;c++)if(r===0||r===5||c===0||c===5){
  if(!(r===2&&c===5))cube(board,c-2.5,.05,r-2.5,.08,.08,.08,M.edge,false);
 }
 const addVehicle=(id,row,col,len,dir,color,kind='car')=>{
  const v=group(board);v.userData={id,row,col,len,dir,color,kind,goal:false};
  const width=dir==='h'?len:.72,depth=dir==='v'?len:.72;
  const material=kind==='cargo'?M.orange:kind==='bus'?M.yellow:kind==='rescue'?M.red:kind==='train'?M.teal:color;
  cube(v,0,.24,0,width*.87,.42,depth*.87,material);
  cube(v,0,.49,0,width*.7,.12,depth*.7,kind==='cargo'?M.wood:M.glass);
  if(dir==='h'){
   cube(v,width*.25,.22,0,.09,.16,depth*.92,M.rubber);
   cube(v,-width*.25,.22,0,.09,.16,depth*.92,M.rubber);
   cube(v,width*.29,.33,-depth*.24,.08,.09,.08,M.white,false);
  }else{
   cube(v,0,.22,depth*.25,width*.92,.16,.09,M.rubber);
   cube(v,0,.22,-depth*.25,width*.92,.16,.09,M.rubber);
  }
  const label=kind==='cargo'?M.white:kind==='rescue'?M.white:kind==='train'?M.white:null;
  if(label)cube(v,0,.57,0,.12,.04,.12,label,false);
  v.position.set(col-2.5+(dir==='h'?(len-1)/2:0),.08,row-2.5+(dir==='v'?(len-1)/2:0));v.userData.baseY=.08;
  board.add(v);vehicles.push(v);objects.push(v);return v;
 };
 // Hand-authored solvable base layout, gradually adds blockers and new visual themes.
 const goalRow=2, goalCol=0;
 const goal=addVehicle('goal',goalRow,goalCol,2,'h',M.red,mode===1?'bus':mode===3?'cargo':mode===4?'rescue':mode===5?'train':'car');
 goal.userData.goal=true;
 // These vehicles block the goal lane; moving them vertically creates the opening.
 const templates=[
  [[1,2,2,'v'],[1,4,2,'v'],[1,5,2,'v'],[3,0,2,'v'],[3,1,2,'v'],[3,3,2,'v'],[4,4,2,'v'],[4,2,2,'v']],
  [[1,2,2,'v'],[1,3,2,'v'],[1,5,2,'v'],[3,0,2,'v'],[3,1,2,'v'],[3,4,2,'v'],[4,2,2,'v'],[4,4,2,'v'],[0,0,2,'v']],
  [[1,2,2,'v'],[1,4,3,'v'],[3,0,2,'v'],[3,1,2,'v'],[3,3,2,'v'],[4,2,2,'v'],[4,4,2,'v'],[0,0,2,'v']],
  [[1,2,2,'v'],[1,4,2,'v'],[1,5,3,'v'],[3,0,2,'v'],[3,1,2,'v'],[3,3,2,'v'],[4,2,2,'v'],[4,4,2,'v'],[0,0,2,'v']]
 ];
 const template=templates[levelIndex%templates.length];
 const mirrorTemplate=Math.floor(levelIndex/templates.length)%2===1;
 const queueCol=(levelIndex%3)*2;
 // Keep each board within the validated blocker budget so the generated campaign layouts remain solvable.
 let idx=0;
 const placedCells=new Set();
 for(const v of vehicles){const d=v.userData;for(let k=0;k<d.len;k++)placedCells.add((d.row+(d.dir==='v'?k:0))+','+(d.col+(d.dir==='h'?k:0)))}
 // Two horizontal traffic queues protect the central blocker, so early stages teach the player to clear a lane before moving the red car.
 const addHorizontalQueue=(id,row,col,len,color)=>{
  const cells=[];for(let k=0;k<len;k++)cells.push(row+','+(col+k));
  if(cells.some(key=>placedCells.has(key)))return false;
  addVehicle(id,row,col,len,'h',color,'car');for(const key of cells)placedCells.add(key);return true;
 };
 addHorizontalQueue('queueTop',0,queueCol,2,M.yellow);
 for(const [r,c,len,dir] of template){
  if(idx>5)break;
  const actualCol=mirrorTemplate?(dir==='v'?5-c:6-c-len):c;
  if(r<0||actualCol<0||r+(dir==='v'?len-1:0)>5||actualCol+(dir==='h'?len-1:0)>5)continue;
  const cells=[];let collision=false;
  for(let k=0;k<len;k++){const key=(r+(dir==='v'?k:0))+','+(actualCol+(dir==='h'?k:0));if(placedCells.has(key)){collision=true;break}cells.push(key)}
  if(collision)continue;
  const kind=mode===1&&idx%3===0?'bus':mode===3&&idx%3===0?'cargo':mode===4&&idx===0?'rescue':mode===5&&idx===0?'train':'car';
  addVehicle('v'+idx,r,actualCol,len,dir,colors[(idx+mode)%colors.length],kind);
  for(const key of cells)placedCells.add(key);
  idx++;
 }
 // For bridge stages, add visible bridge beams alongside the board; they are part of the same campaign puzzle theme.
 if(mode===2){
  cube(decor,0,-.12,-3.65,6.8,.12,.42,M.wood,false);
  for(let c=-2;c<=2;c++)cube(decor,c,-.02,-3.65,.14,.45,.14,M.steel);
 }
 // Cargo / terminal scenery makes the mode legible without leaving the campaign.
 if(mode===3){for(let c=-2;c<=2;c+=2)cube(decor,c,.02,3.55,.62,.16,.62,M.wood,false)}
 if(mode===5){for(let c=-2;c<=2;c++)cube(decor,c,.02,3.58,.08,.1,.7,M.rail,false)}
 // Restore the in-progress board after app restarts, only when it belongs to this level.
 if(restoredBoardState&&restoredBoardState.levelIndex===levelIndex){
  for(const p of restoredBoardState.positions||[]){const v=vehicles.find(x=>x.userData.id===p.id);if(!v)continue;v.userData.row=p.row;v.userData.col=p.col;v.position.x=p.col-2.5+(v.userData.dir==='h'?(v.userData.len-1)/2:0);v.position.z=p.row-2.5+(v.userData.dir==='v'?(v.userData.len-1)/2:0)}
  moves=Math.max(0,Number(restoredBoardState.moves)||0);won=Boolean(restoredBoardState.won);savedMoves=Array.isArray(restoredBoardState.savedMoves)?restoredBoardState.savedMoves:[];restoredBoardState=null;
 }
 // Make the target and pieces sit on the cell centers, with their row/col as source of truth.
 updateHUD();drawSelection();save();
}
function spendCoins(amount){if(coins<amount){toast('Not enough coins. Complete more levels to earn coins.');return false}coins-=amount;save();updateHUD();return true}
function showStore(){openModal('🪙 Traffic Command Store','The game is free. Earn coins by playing and spend them on hints or skipping a difficult level. Real-money purchases are not enabled in this build.', '<div class="levelrow"><span>🧭 One hint<small>Helps you choose the right vehicle</small></span><button id="buyHint" class="gold">15 🪙</button></div><div class="levelrow"><span>⏭️ Skip level<small>Skip the current level using in-game coins</small></span><button id="buySkip" class="gold">100 🪙</button></div><div class="levelrow"><span>💳 Real-money coin purchases<small>Not available in this build</small></span><button disabled>Coming soon</button></div>');}
function updateHUD(){
 const mode=levelName(levelIndex),difficulty=levelIndex%10+1;
 $('#coins').textContent=coins;$('#level').textContent=(levelIndex+1)+' / '+totalLevels;
 $('#stars').textContent=stars+' ★';$('#moves').textContent=moves;
 $('#levelbar').style.width=((levelIndex+1)/totalLevels*100)+'%';
 $('#mission').textContent='🚦 '+mode.ar+' · Level '+(levelIndex+1);
 $('#description').textContent=mode.desc;
 $('#next').disabled=!won;$('#hint').style.display=(won||moves>0)?'none':'block';
 $('#hint').textContent='Move blocking vehicles to clear the middle lane, then drag the red vehicle to the green exit.';
}
function drawSelection(){for(const v of vehicles){v.scale.setScalar(v===selected?1.055:1);}}
function occupiedCells(ignore=null){
 const map=new Set();
 for(const v of vehicles){if(v===ignore)continue;const d=v.userData;for(let n=0;n<d.len;n++){const r=d.row+(d.dir==='v'?n:0),c=d.col+(d.dir==='h'?n:0);map.add(r+','+c)}}
 return map;
}
function canMove(v,delta){
 const d=v.userData, occ=occupiedCells(v), steps=Math.round(delta);
 if(!steps)return false;
 for(let n=1;n<=Math.abs(steps);n++){
  const s=Math.sign(steps)*n;
  const r=d.row+(d.dir==='v'?s:0),c=d.col+(d.dir==='h'?s:0);
  for(let k=0;k<d.len;k++){
   const rr=r+(d.dir==='v'?k:0),cc=c+(d.dir==='h'?k:0);
   if(rr<0||rr>5||cc<0||(!d.goal&&cc>5))return false;
   if(cc<=5&&occ.has(rr+','+cc))return false;
  }
 }
 return true;
}
function moveVehicle(v,delta){
 if(!v||won)return;
 const d=v.userData,steps=Math.round(delta);
 if(!steps||!canMove(v,steps)){feedback('error');toast('That path is blocked. Try another direction.');return}
 savedMoves.push({id:d.id,row:d.row,col:d.col});
 if(d.dir==='v')d.row+=steps;else d.col+=steps;
 v.position.x=d.col-2.5+(d.dir==='h'?(d.len-1)/2:0);v.position.z=d.row-2.5+(d.dir==='v'?(d.len-1)/2:0);moves++;selected=v;feedback('tap');drawSelection();updateHUD();
 if(d.goal&&d.col+d.len>5)finishLevel();else save();
}
function finishLevel(){
 won=true;
 const earned=moves<=Math.max(3,levelIndex%10+2)?3:moves<=Math.max(6,levelIndex%10+5)?2:1;
 const firstClear=!completedLevels.includes(levelIndex);
 if(firstClear){completedLevels.push(levelIndex);stars+=earned;coins+=20+earned*10;}
 save();updateHUD();
 $('#next').disabled=false;$('#mission').textContent='🎉 Great job! The exit is clear';
 $('#description').textContent=firstClear?'+'+(20+earned*10)+' coins · '+earned+' stars. Keep going!':'You replayed this level. Rewards are only granted once.';
 $('#hint').style.display='block';$('#hint').textContent='Level complete! Continue to the next challenge.';
 toast(firstClear?'Solved! +'+(20+earned*10)+' coins · '+earned+' stars':'Level replayed; no duplicate reward.');
}
function raycast(e){
 const rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width*2-1,y=-((e.clientY-rect.top)/rect.height*2-1);
 const ray=new THREE.Raycaster();ray.setFromCamera({x,y},camera);return ray;
}
let pointerStart=null;
canvas.style.touchAction='none';
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointerdown',e=>{
 e.preventDefault();
 try{canvas.setPointerCapture(e.pointerId)}catch{}
 pointerStart={x:e.clientX,y:e.clientY,at:Date.now(),v:null,pointerId:e.pointerId};
 const hits=raycast(e).intersectObjects(vehicles,true);
 if(hits.length){let o=hits[0].object;while(o&&!vehicles.includes(o))o=o.parent;if(o){selected=o;pointerStart.v=o;drawSelection()}}
});
canvas.addEventListener('pointerup',e=>{
 if(!pointerStart)return;
 const start=pointerStart;pointerStart=null;
 const dx=e.clientX-start.x,dy=e.clientY-start.y;
 if(start.v&&(Math.abs(dx)+Math.abs(dy)>8)){
  const v=start.v,dir=v.userData.dir;
  const cellPixels=innerWidth/8.2;
  const val=dir==='h'?dx:dy;
  let delta=Math.round(val/cellPixels);
  if(!delta&&Math.abs(val)>8)delta=Math.sign(val);
  moveVehicle(v,delta);
 }else if(!start.v){
  const hits=raycast(e).intersectObjects(vehicles,true);
  if(hits.length){let o=hits[0].object;while(o&&!vehicles.includes(o))o=o.parent;selected=o;drawSelection()}
 }
});
canvas.addEventListener('pointercancel',()=>{pointerStart=null;});
canvas.addEventListener('lostpointercapture',()=>{pointerStart=null;});
$('#undo').onclick=()=>{if(won||!savedMoves.length){toast('Nothing to undo.');return}const last=savedMoves.pop(),v=vehicles.find(x=>x.userData.id===last.id);if(v){v.userData.row=last.row;v.userData.col=last.col;v.position.x=last.col-2.5+(v.userData.dir==='h'?(v.userData.len-1)/2:0);v.position.z=last.row-2.5+(v.userData.dir==='v'?(v.userData.len-1)/2:0);moves=Math.max(0,moves-1);selected=v;drawSelection();updateHUD();save()}};
$('#restart').onclick=()=>{resetBoard();toast('Level restarted.');};
$('#next').onclick=()=>{if(!won)return;if(levelIndex<totalLevels-1)levelIndex++;else{openModal('🏆 أكملت Traffic Command!','You completed all available levels in this build.','<button id="replay" class="primary">Play again</button>');return}resetBoard();toast('Next level!');};
$('#store').onclick=showStore;
$('#pause').onclick=()=>openModal('Game paused','Your progress is saved automatically on this device.','<button id="resume" class="primary">Resume</button><button id="levels">Campaign map</button><button id="settings">Settings</button>');
function openModal(title,text,html=''){ $('#modalTitle').textContent=title;$('#modalText').textContent=text;$('#modalBody').innerHTML=html;$('#modal').classList.add('open');$('#shade').classList.add('open');}
function closeModal(){$('#modal').classList.remove('open');$('#shade').classList.remove('open')}
$('#close').onclick=closeModal;$('#shade').onclick=closeModal;
$('#modalBody').addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.id==='resume'){saveSettings();closeModal();return}
 if(b.id==='toggleSound'){settings.sound=!settings.sound;saveSettings();openModal('Settings','Customize your game. Your settings are saved on this device.','<div class="levelrow"><span>🔊 Sound effects<small>Simple sounds for moves, errors, and wins</small></span><button id="toggleSound" class="'+(settings.sound?'primary':'')+'">'+(settings.sound?'On':'Off')+'</button></div><div class="levelrow"><span>📳 Vibration<small>Light vibration for moves and alerts (if supported)</small></span><button id="toggleVibration" class="'+(settings.vibration?'primary':'')+'">'+(settings.vibration?'On':'Off')+'</button></div><div class="levelrow"><span>💾 Save progress<small>Levels, coins, and stars save automatically on this device</small></span><button disabled>Automatic</button></div><button id="resume" class="primary" style="width:100%;margin-top:12px">Save & return</button>');return}
 if(b.id==='toggleVibration'){settings.vibration=!settings.vibration;saveSettings();openModal('Settings','Customize your game. Your settings are saved on this device.','<div class="levelrow"><span>🔊 Sound effects<small>Simple sounds for moves, errors, and wins</small></span><button id="toggleSound" class="'+(settings.sound?'primary':'')+'">'+(settings.sound?'On':'Off')+'</button></div><div class="levelrow"><span>📳 Vibration<small>Light vibration for moves and alerts (if supported)</small></span><button id="toggleVibration" class="'+(settings.vibration?'primary':'')+'">'+(settings.vibration?'On':'Off')+'</button></div><div class="levelrow"><span>💾 Save progress<small>Levels, coins, and stars save automatically on this device</small></span><button disabled>Automatic</button></div><button id="resume" class="primary" style="width:100%;margin-top:12px">Save & return</button>');return}
 if(b.id==='buyHint'){
  if(coins<15){toast('You need 15 coins to buy a hint.');return;}
  closeModal();
  const findHintMove=()=>{
   const meta=vehicles.map(v=>({id:v.userData.id,row:v.userData.row,col:v.userData.col,len:v.userData.len,dir:v.userData.dir,goal:v.userData.goal}));
   const keyState=state=>state.map(p=>p.row+','+p.col).join('|');
   const initial=meta.map(v=>({row:v.row,col:v.col}));
   const queue=[{state:initial,first:null}],seen=new Set([keyState(initial)]);
   const cellKeys=(v,p)=>Array.from({length:v.len},(_,k)=>(p.row+(v.dir==='v'?k:0))+','+(p.col+(v.dir==='h'?k:0)));
   for(let head=0;head<queue.length;head++){
    const node=queue[head],occupied=new Set();
    node.state.forEach((p,i)=>cellKeys(meta[i],p).forEach(k=>occupied.add(k)));
    for(let i=0;i<meta.length;i++){
     const v=meta[i],p=node.state[i],own=new Set(cellKeys(v,p)),others=new Set([...occupied].filter(k=>!own.has(k)));
     for(const sign of [-1,1]){
      for(let distance=1;distance<=6;distance++){
       const delta=sign*distance,next={row:p.row+(v.dir==='v'?delta:0),col:p.col+(v.dir==='h'?delta:0)};
       if(next.row<0||next.row+(v.dir==='v'?v.len-1:0)>5||next.col<0||(!v.goal&&next.col+(v.dir==='h'?v.len-1:0)>5))break;
       const keys=cellKeys(v,next);
       if(keys.some(k=>others.has(k)))break;
       if(v.goal&&next.col+v.len>5)return node.first||{id:v.id,delta};
       const state=node.state.map(q=>({...q}));state[i]=next;
       const sig=keyState(state);if(seen.has(sig))continue;seen.add(sig);
       queue.push({state,first:node.first||{id:v.id,delta}});
      }
     }
    }
   }
   return null;
  };
  const hint=findHintMove();
  if(hint){
   const choice=vehicles.find(v=>v.userData.id===hint.id);
   if(!choice){toast('Could not identify the suggested move.');return;}
   if(!spendCoins(15))return;
   selected=choice;drawSelection();
   const dir=choice.userData.dir==='v'?(hint.delta<0?'up':'down'):(hint.delta<0?'left':'right');
   toast('Hint: Move the highlighted vehicle '+Math.abs(hint.delta)+'  spaces '+dir+'.');
  }else toast('No solution was found for this board. Restart without spending coins.');

  return;
 }
 if(b.id==='buySkip'){if(!spendCoins(100))return;closeModal();if(levelIndex<totalLevels-1){levelIndex++;resetBoard();toast('تم Skip level مقابل 100 عملة.')}else{won=true;updateHUD();openModal('🏆 Campaign complete','You completed all levels in this build.','<button id="replay" class="primary">Play again</button>')}return}
 if(b.id==='replay'){levelIndex=0;resetBoard();closeModal();return}
 if(b.id==='settings'){openModal('Settings','Customize your game. Your settings are saved on this device.','<div class="levelrow"><span>🔊 Sound effects<small>Simple sounds for moves, errors, and wins</small></span><button id="toggleSound" class="'+(settings.sound?'primary':'')+'">'+(settings.sound?'On':'Off')+'</button></div><div class="levelrow"><span>📳 Vibration<small>Light vibration for moves and alerts (if supported)</small></span><button id="toggleVibration" class="'+(settings.vibration?'primary':'')+'">'+(settings.vibration?'On':'Off')+'</button></div><div class="levelrow"><span>💾 Save progress<small>Levels, coins, and stars save automatically on this device</small></span><button disabled>Automatic</button></div><button id="resume" class="primary" style="width:100%;margin-top:12px">Save & return</button>');return}
 if(b.id==='levels'){
  let html='<div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px;margin-top:12px">';
  for(let i=0;i<totalLevels;i++){const completed=completedLevels.includes(i),unlocked=i<=levelIndex||completed;html+='<button data-level="'+i+'" '+(unlocked?'':'disabled')+' style="min-height:46px;padding:6px;'+(completed?'background:#245344;border-color:#4c9d7c;':i===levelIndex?'background:#77f0bd;color:#102438;border-color:#b5ffe0;':'')+'">'+(completed?'✓ ':'')+(i+1)+'</button>'}
  html+='</div><div class="muted" style="margin-top:10px">Green: completed · Light: current level · Grey: locked</div>';
  openModal('Campaign map','Choose any level you have already unlocked.',html);return;
 }
 if(b.dataset.level){const n=Number(b.dataset.level);if(n<=levelIndex||completedLevels.includes(n)){levelIndex=n;resetBoard();closeModal()}return}
});
function resize(){renderer.setSize(innerWidth,innerHeight);const aspect=innerWidth/innerHeight;const viewWidth=8.2;camera.left=-viewWidth/2;camera.right=viewWidth/2;camera.top=viewWidth/aspect/2;camera.bottom=-viewWidth/aspect/2;camera.updateProjectionMatrix();}
window.addEventListener('resize',resize);resize();
function animate(){requestAnimationFrame(animate);renderer.render(scene,camera)}
resetBoard();animate();
