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
const colors=[M.blue,M.yellow,M.purple,M.orange,M.teal,M.red];
const modes=[
 {name:'Traffic Command',ar:'التحكم في المرور',desc:'افتح مسار العبور بتحريك المركبات بالترتيب الصحيح.',icon:'🚦'},
 {name:'Bus Terminal',ar:'محطة الحافلات',desc:'حرّك الحافلات الطويلة حتى يصبح مخرج المحطة مفتوحًا.',icon:'🚌'},
 {name:'Bridge Builder',ar:'بناء الجسور',desc:'رتّب قطع الطريق لتفتح ممرًا آمنًا للعبور.',icon:'🌉'},
 {name:'Cargo Sort',ar:'فرز البضائع',desc:'حرّك شاحنات البضائع لتفتح ممر التسليم.',icon:'📦'},
 {name:'City Rescue',ar:'إنقاذ المدينة',desc:'أخلِ الطريق أمام مركبة الإنقاذ للوصول إلى موقعها.',icon:'🚒'},
 {name:'Train & Bus Connect',ar:'ربط النقل العام',desc:'نظّم الممرات لتصل وسيلة النقل إلى المخرج.',icon:'🚆'},
 {name:'Park & Flow',ar:'فكّ الاختناق',desc:'أخلِ الساحة بأقل عدد من الحركات.',icon:'🅿️'}
];
const totalLevels=30;
const levelName=i=>modes[0];
function toast(s){const el=$('#toast');el.textContent=s;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),1900);}
function save(){try{localStorage.setItem('trafficPuzzleWorld',JSON.stringify({levelIndex,coins,stars,completedLevels}))}catch{}}
try{const data=JSON.parse(localStorage.getItem('trafficPuzzleWorld')||'null');if(data){levelIndex=Math.max(0,Math.min(totalLevels-1,Number(data.levelIndex)||0));coins=Math.max(0,Number(data.coins)||0);stars=Math.max(0,Number(data.stars)||0);completedLevels=Array.isArray(data.completedLevels)?data.completedLevels.filter(n=>Number.isInteger(n)&&n>=0&&n<totalLevels):[]}}catch{}
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
 const template=templates[Math.min(3,Math.floor((difficulty-1)/3))];
 // Add only vertical blockers outside the goal row. Vary the blocking lane and theme.
 let idx=0;
 const placedCells=new Set();
 for(const v of vehicles){const d=v.userData;for(let k=0;k<d.len;k++)placedCells.add((d.row+(d.dir==='v'?k:0))+','+(d.col+(d.dir==='h'?k:0)))}
 for(const [r,c,len,dir] of template){
  if(idx>difficulty+1)break;
  if(r<0||c<0||r+(dir==='v'?len-1:0)>5||c+(dir==='h'?len-1:0)>5)continue;
  const cells=[];let collision=false;
  for(let k=0;k<len;k++){const key=(r+(dir==='v'?k:0))+','+(c+(dir==='h'?k:0));if(placedCells.has(key)){collision=true;break}cells.push(key)}
  if(collision)continue;
  const kind=mode===1&&idx%3===0?'bus':mode===3&&idx%3===0?'cargo':mode===4&&idx===0?'rescue':mode===5&&idx===0?'train':'car';
  addVehicle('v'+idx,r,c,len,dir,colors[(idx+mode)%colors.length],kind);
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
 // Make the target and pieces sit on the cell centers, with their row/col as source of truth.
 updateHUD();drawSelection();save();
}
function spendCoins(amount){if(coins<amount){toast('عملاتك غير كافية. أكمل مراحل أخرى لجمع المزيد.');return false}coins-=amount;save();updateHUD();return true}
function showStore(){openModal('🪙 متجر Traffic Command','اللعبة مجانية. اجمع العملات باللعب واستعملها للتلميحات أو لتجاوز مرحلة صعبة. الدفع الحقيقي عبر Google Play يحتاج ربط Billing واختباره قبل النشر.', '<div class="levelrow"><span>🧭 تلميح واحد<small>يساعدك على اختيار المركبة المناسبة</small></span><button id="buyHint" class="gold">15 🪙</button></div><div class="levelrow"><span>⏭️ تجاوز المرحلة<small>تجاوز المرحلة الحالية مقابل عملات اللعبة</small></span><button id="buySkip" class="gold">100 🪙</button></div><div class="levelrow"><span>💳 شراء العملات بأموال حقيقية<small>غير مفعّل في هذه النسخة؛ لن نعرض شراءً وهميًا</small></span><button disabled>قريبًا</button></div>');}
function updateHUD(){
 const mode=levelName(levelIndex),difficulty=levelIndex%10+1;
 $('#coins').textContent=coins;$('#level').textContent=(levelIndex+1)+' / '+totalLevels;
 $('#stars').textContent=stars+' ★';$('#moves').textContent=moves;
 $('#levelbar').style.width=((levelIndex+1)/totalLevels*100)+'%';
 $('#mission').textContent='🚦 '+mode.ar+' · المرحلة '+(levelIndex+1);
 $('#description').textContent=mode.desc;
 $('#next').disabled=!won;$('#hint').style.display=won?'none':'block';
 $('#hint').textContent=levelIndex===0?'اسحب المركبات التي تسدّ الطريق، ثم أخرج المركبة الحمراء من المخرج الأخضر.': 'اسحب المركبات لإخلاء الممر. كل حركة محسوبة!';
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
 if(!steps||!canMove(v,steps)){toast('هذا المسار مغلق. جرّب اتجاهًا آخر.');return}
 savedMoves.push({id:d.id,row:d.row,col:d.col});
 if(d.dir==='v')d.row+=steps;else d.col+=steps;
 v.position.x=d.col-2.5+(d.dir==='h'?(d.len-1)/2:0);v.position.z=d.row-2.5+(d.dir==='v'?(d.len-1)/2:0);moves++;selected=v;drawSelection();updateHUD();
 if(d.goal&&d.col+d.len>5)finishLevel();
}
function finishLevel(){
 won=true;
 const earned=moves<=Math.max(3,levelIndex%10+2)?3:moves<=Math.max(6,levelIndex%10+5)?2:1;
 const firstClear=!completedLevels.includes(levelIndex);
 if(firstClear){completedLevels.push(levelIndex);stars+=earned;coins+=20+earned*10;}
 save();updateHUD();
 $('#next').disabled=false;$('#mission').textContent='🎉 أحسنت! الطريق مفتوح';
 $('#description').textContent=firstClear?'+'+(20+earned*10)+' عملة · '+earned+' نجوم. أكمل الحملة!':'أعدت إكمال هذه المرحلة؛ المكافأة تُمنح مرة واحدة فقط.';
 $('#hint').style.display='block';$('#hint').textContent='مرحلة مكتملة! تابع إلى التحدي التالي.';
 toast(firstClear?'نجحت! +'+(20+earned*10)+' عملة · '+earned+' نجوم':'أُكملت المرحلة من جديد دون تكرار المكافأة.');
}
function raycast(e){
 const rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width*2-1,y=-((e.clientY-rect.top)/rect.height*2-1);
 const ray=new THREE.Raycaster();ray.setFromCamera({x,y},camera);return ray;
}
let pointerStart=null;
canvas.addEventListener('pointerdown',e=>{pointerStart={x:e.clientX,y:e.clientY,at:Date.now(),v:null};const hits=raycast(e).intersectObjects(vehicles,true);if(hits.length){let o=hits[0].object;while(o&&!vehicles.includes(o))o=o.parent;if(o){selected=o;pointerStart.v=o;drawSelection()}}});
canvas.addEventListener('pointerup',e=>{
 if(!pointerStart)return;const dx=e.clientX-pointerStart.x,dy=e.clientY-pointerStart.y;
 if(pointerStart.v&&(Math.abs(dx)+Math.abs(dy)>12)){
  const v=pointerStart.v,dir=v.userData.dir;
  let delta=dir==='h'?Math.round(dx/(innerWidth/8.2)):Math.round(dy/(innerWidth/8.2));
  if(!delta){const val=dir==='h'?dx:dy;delta=Math.sign(val);}
  moveVehicle(v,delta);
 }else if(!pointerStart.v){
  const hits=raycast(e).intersectObjects(vehicles,true);if(hits.length){let o=hits[0].object;while(o&&!vehicles.includes(o))o=o.parent;selected=o;drawSelection()}
 }
 pointerStart=null;
});
$('#undo').onclick=()=>{if(won||!savedMoves.length){toast('لا توجد حركة للتراجع عنها.');return}const last=savedMoves.pop(),v=vehicles.find(x=>x.userData.id===last.id);if(v){v.userData.row=last.row;v.userData.col=last.col;v.position.x=last.col-2.5+(v.userData.dir==='h'?(v.userData.len-1)/2:0);v.position.z=last.row-2.5+(v.userData.dir==='v'?(v.userData.len-1)/2:0);moves=Math.max(0,moves-1);selected=v;drawSelection();updateHUD()}};
$('#restart').onclick=()=>{resetBoard();toast('أُعيد ترتيب المرحلة.');};
$('#next').onclick=()=>{if(!won)return;if(levelIndex<totalLevels-1)levelIndex++;else{openModal('🏆 أكملت Traffic Command!','أكملت جميع المراحل المتاحة في هذه النسخة.','<button id="replay" class="primary">العب من البداية</button>');return}resetBoard();toast('المرحلة التالية!');};
$('#store').onclick=showStore;
$('#pause').onclick=()=>openModal('اللعبة متوقفة مؤقتًا','تقدمك محفوظ تلقائيًا على هذا الجهاز.','<button id="resume" class="primary">متابعة اللعب</button><button id="levels">خريطة الحملة</button><button id="settings">الإعدادات</button>');
function openModal(title,text,html=''){ $('#modalTitle').textContent=title;$('#modalText').textContent=text;$('#modalBody').innerHTML=html;$('#modal').classList.add('open');$('#shade').classList.add('open');}
function closeModal(){$('#modal').classList.remove('open');$('#shade').classList.remove('open')}
$('#close').onclick=closeModal;$('#shade').onclick=closeModal;
$('#modalBody').addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.id==='resume'){closeModal();return}
 if(b.id==='buyHint'){
  if(!spendCoins(15))return;
  closeModal();
  const blockers=vehicles.filter(v=>{
   const d=v.userData;if(d.goal)return false;
   for(let k=0;k<d.len;k++){const r=d.row+(d.dir==='v'?k:0),c=d.col+(d.dir==='h'?k:0);if(r===2&&c>=2&&c<=5)return true}
   return false;
  });
  let choice=null,delta=0;
  for(const v of blockers){for(const step of [-1,1]){if(canMove(v,step)){choice=v;delta=step;break}}if(choice)break}
  if(choice){selected=choice;drawSelection();const dir=choice.userData.dir==='v'?(delta<0?'للأعلى':'للأسفل'):(delta<0?'لليسار':'لليمين');toast('حرّك المركبة المحددة خطوة '+dir+' لفتح الممر.')}
  else toast('الممر يحتاج أكثر من حركة؛ حرّك المركبات القريبة أولًا.');
  return;
 }
 if(b.id==='buySkip'){if(!spendCoins(100))return;closeModal();if(levelIndex<totalLevels-1){levelIndex++;resetBoard();toast('تم تجاوز المرحلة مقابل 100 عملة.')}else{won=true;updateHUD();openModal('🏆 انتهت الحملة','أكملت جميع المراحل في هذه النسخة.','<button id="replay" class="primary">العب من البداية</button>')}return}
 if(b.id==='replay'){levelIndex=0;resetBoard();closeModal();return}
 if(b.id==='settings'){openModal('الإعدادات','الصوت والاهتزاز وحفظ التقدم ستُضاف في مرحلة تحسين الجودة.','<button id="resume" class="primary">العودة للعبة</button>');return}
 if(b.id==='levels'){
  let html='<div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px;margin-top:12px">';
  for(let i=0;i<totalLevels;i++){const completed=completedLevels.includes(i),unlocked=i<=levelIndex||completed;html+='<button data-level="'+i+'" '+(unlocked?'':'disabled')+' style="min-height:46px;padding:6px;'+(completed?'background:#245344;border-color:#4c9d7c;':i===levelIndex?'background:#77f0bd;color:#102438;border-color:#b5ffe0;':'')+'">'+(completed?'✓ ':'')+(i+1)+'</button>'}
  html+='</div><div class="muted" style="margin-top:10px">الأخضر: مكتملة · الفاتح: المرحلة الحالية · المراحل الرمادية مقفلة حتى تتقدم.</div>';
  openModal('خريطة الحملة','اختر أي مرحلة سبق أن فتحتها.',html);return;
 }
 if(b.dataset.level){const n=Number(b.dataset.level);if(n<=levelIndex){levelIndex=n;resetBoard();closeModal()}return}
});
function resize(){renderer.setSize(innerWidth,innerHeight);const aspect=innerWidth/innerHeight;const viewWidth=8.2;camera.left=-viewWidth/2;camera.right=viewWidth/2;camera.top=viewWidth/aspect/2;camera.bottom=-viewWidth/aspect/2;camera.updateProjectionMatrix();}
window.addEventListener('resize',resize);resize();
function animate(){requestAnimationFrame(animate);renderer.render(scene,camera)}
resetBoard();animate();
