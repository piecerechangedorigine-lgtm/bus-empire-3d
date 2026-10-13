import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const canvas=document.querySelector('#world');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6)); renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap; renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.15;
const scene=new THREE.Scene(); scene.background=new THREE.Color('#72caff'); scene.fog=new THREE.Fog('#a6e4ff',45,110);
const camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,.1,180); camera.position.set(0,23,29);
const controls=new OrbitControls(camera,renderer.domElement); controls.enableDamping=true; controls.minDistance=15; controls.maxDistance=44; controls.maxPolarAngle=Math.PI*.48; controls.minPolarAngle=.2; controls.enablePan=false; controls.target.set(0,0,0);
scene.add(new THREE.HemisphereLight('#ffffff','#8298c0',2.1)); const sun=new THREE.DirectionalLight('#fff0c8',3); sun.position.set(-12,28,18); sun.castShadow=true; sun.shadow.mapSize.set(1024,1024); scene.add(sun);
const mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.5});
const m={grass:mat('#57d879'),road:mat('#515f7d'),line:mat('#fff3cf'),pavement:mat('#e2f4ff'),white:mat('#fffdf6'),glass:mat('#a5edff'),rubber:mat('#263148'),yellow:mat('#ffe52b'),cyan:mat('#15d8f4'),pink:mat('#ff42b7'),blue:mat('#2675ff'),green:mat('#27e653'),orange:mat('#ff9419'),purple:mat('#a238ff'),red:mat('#ff3655'),gold:mat('#ffca30'),build:[mat('#ffb26e'),mat('#65c8ff'),mat('#d19aff'),mat('#72e5d0')]};
const box=new THREE.BoxGeometry(1,1,1);
function cube(parent,x,y,z,sx,sy,sz,material,cast=true){const o=new THREE.Mesh(box,material);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=cast;o.receiveShadow=true;parent.add(o);return o}
function group(parent,x=0,y=0,z=0){const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g}
function cyl(parent,x,y,z,r,h,material,n=14){const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,n),material);o.position.set(x,y,z);o.castShadow=true;parent.add(o);return o}
cube(scene,0,-.75,0,100,.6,100,m.grass,false); cube(scene,0,-.39,0,12,.22,60,m.road,false);
cube(scene,-6.3,-.25,0,.45,.2,60,m.pavement,false);cube(scene,6.3,-.25,0,.45,.2,60,m.pavement,false);
for(let z=-28;z<30;z+=3.2)cube(scene,0,-.26,z,.16,.04,1.45,m.line,false);
function tree(x,z){const g=group(scene,x,0,z);cyl(g,0,.65,0,.18,1.3,mat('#9b603c'));cyl(g,0,1.65,0,.72,1.25,mat('#22ce75'));cyl(g,-.25,1.95,.05,.47,.75,mat('#63f06e'));cyl(g,.27,1.85,-.05,.48,.8,mat('#13bb83'))}
for(let side of [-1,1])for(let z=-24;z<=24;z+=6)tree(side*7.6,z);
const plots=[];for(let side of [-1,1])for(let i=0;i<6;i++){let z=-24+i*9;cube(scene,side*10,-.38,z,7,.25,7,m.pavement,false);plots.push({side,z,x:side*10,mesh:null})}
function building(p,level=0){if(p.mesh)scene.remove(p.mesh);const g=group(scene,p.x,0,p.z);const h=level?4+level*1.7:4+(Math.abs(p.z)+2)%3*1.5;cube(g,0,h/2,0,4.4,h,4.4,m.build[(Math.floor(Math.abs(p.z/3))+(p.side>0?1:0))%4]);cube(g,0,h+.1,0,4.6,.22,4.6,m.white);for(let y=1;y<h-.5;y+=1.35)for(let x of [-1.25,0,1.25])cube(g,x,y,2.22,.55,.72,.06,m.glass,false);p.mesh=g}
plots.forEach(p=>building(p));
cube(scene,0,-.05,14,23,.22,10,m.pavement,false);cube(scene,0,.08,14,19,.16,7,m.road,false);
for(let x=-7;x<=7;x+=3.5){cube(scene,x,.2,14,2.7,.15,4,m.white);cube(scene,x,.35,12.1,2.5,.18,.25,m.gold)}
const colors=[m.yellow,m.cyan,m.pink,m.blue,m.green,m.orange,m.purple,m.red],buses=[];
function makeBus(i){const g=group(scene);const color=colors[i%colors.length];cube(g,0,.72,0,1.6,1.1,3.35,color);cube(g,0,1.3,-.15,1.42,.48,2.4,m.glass);cube(g,0,.26,0,1.7,.18,3.4,m.white);cube(g,0,.78,1.7,1.05,.53,.05,m.white);cube(g,0,.85,1.74,.52,.12,.06,m.yellow);for(let z of [-1.12,1.12])for(let x of [-.84,.84]){const w=cyl(g,x,.32,z,.24,.15,m.rubber);w.rotation.z=Math.PI/2}g.userData={id:i+1,route:null,driver:false};scene.add(g);return g}
function placeBus(b,i){b.position.set(-6.7+(i%5)*3.35,.05,12.8+Math.floor(i/5)*2.5);b.rotation.y=Math.PI}
const state={money:350,level:1,passengers:0,drivers:0,completed:0,active:0,routes:[{name:'Centre-ville',cost:0,earning:45,passengers:18,unlocked:true},{name:'Quartier des affaires',cost:450,earning:85,passengers:32,unlocked:false},{name:'Front de mer',cost:900,earning:145,passengers:55,unlocked:false},{name:'Aéroport',cost:1800,earning:260,passengers:90,unlocked:false}]};
try{const s=JSON.parse(localStorage.getItem('busEmpireSave')||'null');if(s){Object.assign(state,{money:s.money??350,level:s.level??1,passengers:s.passengers??0,drivers:s.drivers??0,completed:s.completed??0,active:s.active??0});state.routes.forEach((r,i)=>r.unlocked=s.routes?.[i]?.unlocked??r.unlocked)}}catch{}
function addBus(){const b=makeBus(buses.length);placeBus(b,buses.length);buses.push(b);return b}addBus();
function save(){try{localStorage.setItem('busEmpireSave',JSON.stringify({...state,busCount:buses.length}))}catch{}}
function toast(s){const e=document.querySelector('#toast');e.textContent=s;e.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('show'),1800)}
function update(){document.querySelector('#money').textContent=Math.floor(state.money).toLocaleString('fr-FR');document.querySelector('#fleet').textContent=buses.length+' bus';document.querySelector('#passengers').textContent=state.passengers.toLocaleString('fr-FR');document.querySelector('#level').textContent='Niv. '+state.level;document.querySelector('#routeName').textContent=state.routes[state.active].name;document.querySelector('#routeState').textContent=state.completed+' trajets • '+state.routes[state.active].passengers+' passagers';document.querySelector('#buy').innerHTML='🚌 ACHETER UN BUS<br><small>'+(250+buses.length*180)+' 🪙</small>';document.querySelector('#hire').innerHTML='👨‍✈️ EMBAUCHER<br><small>'+(100+state.drivers*80)+' 🪙</small>';save()}
function modal(title,html){document.querySelector('#modalTitle').textContent=title;document.querySelector('#modalBody').innerHTML=html;document.querySelector('#modal').classList.add('open')}
function close(){document.querySelector('#modal').classList.remove('open')}
document.querySelector('#close').onclick=close;
document.querySelector('#buy').onclick=()=>{const cost=250+buses.length*180;if(state.money<cost)return toast('Pas assez de pièces !');state.money-=cost;addBus();update();toast('Nouveau bus acheté !')};
document.querySelector('#hire').onclick=()=>{const cost=100+state.drivers*80;if(state.money<cost)return toast('Pas assez de pièces !');state.money-=cost;state.drivers++;update();toast('Conducteur embauché !')};
document.querySelector('#run').onclick=()=>{const route=state.routes[state.active],bus=buses.find(b=>!b.userData.driver)||buses[0];if(state.drivers>0){bus.userData.driver=true;bus.userData.route=state.active}state.money+=route.earning;state.passengers+=route.passengers;state.completed++;bus.position.x+=.25;update();toast('Trajet terminé : +'+route.earning+' pièces !')};
document.querySelector('#routes').onclick=()=>{modal('🗺️ Lignes de transport',state.routes.map((r,i)=>'<div class="item"><div><b>'+r.name+'</b><br>'+r.passengers+' passagers • '+r.earning+' pièces/trajet</div><button data-route="'+i+'">'+(r.unlocked?(state.active===i?'ACTIVE':'CHOISIR'):r.cost+' 🪙')+'</button></div>').join(''));document.querySelectorAll('[data-route]').forEach(b=>b.onclick=()=>{const i=+b.dataset.route,r=state.routes[i];if(!r.unlocked){if(state.money<r.cost)return toast('Pas assez de pièces !');state.money-=r.cost;r.unlocked=true}state.active=i;close();update()})};
document.querySelector('#city').onclick=()=>{const cost=400*state.level;modal('🏙️ Développer la ville','<div class="item"><div><b>Améliorer la ville</b><br>Niveau '+(state.level+1)+' • coût '+cost+' pièces</div><button id="upgrade">AMÉLIORER</button></div>');document.querySelector('#upgrade').onclick=()=>{if(state.money<cost)return toast('Pas assez de pièces !');state.money-=cost;state.level++;plots.forEach((p,i)=>building(p,i<state.level?state.level:0));close();update();toast('Ville améliorée !')}};
document.querySelector('#camera').onclick=()=>{camera.position.set(0,18+Math.random()*8,24+Math.random()*10);controls.target.set(0,0,0);toast('Caméra réinitialisée')};
let down=null;renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY}});renderer.domElement.addEventListener('pointerup',e=>{if(!down)return;const dx=e.clientX-down.x,dy=e.clientY-down.y;if(Math.abs(dx)+Math.abs(dy)<8){const ray=new THREE.Raycaster();ray.setFromCamera({x:e.clientX/innerWidth*2-1,y:-(e.clientY/innerHeight)*2+1},camera);const hits=ray.intersectObjects(buses,true);if(hits.length){const b=buses.find(v=>{let o=hits[0].object;while(o&&o.parent!==scene)o=o.parent;return o===v});if(b)toast('Bus #'+b.userData.id+(b.userData.driver?' • conducteur affecté':' • en attente'))}}down=null});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera)}update();animate();
