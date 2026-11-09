// Living Desktop original procedural designs, GPL-3.0.
// A shared field follows icon rectangles; rendering never restarts on updates.
'use strict';
const WALL=new URLSearchParams(location.search).has('wallpaper');
const PREVIEW=new URLSearchParams(location.search).has('preview');
const STYLE={lagoon:0,sky:1,colors:2}[document.body.dataset.design]||0;
const cv=document.getElementById('art'),gl=cv.getContext('webgl2',{antialias:false,alpha:false});
let W=innerWidth,H=innerHeight,icons=[],frameN=0,paused=false;
const TASKBAR=48,GRID_X0=4,GRID_Y0=6,CELL_W=76,CELL_H=100;
const DEFAULTS={sigma:95,speed:1,detail:.65,palette:0,adaptive:1,seed:42};
let P={...DEFAULTS},lastT=0,animationTime=0,fieldA=null,fieldB=null,gridW=1,gridH=1,morphT0=-Infinity;
const MORPH_MS=1500,STEP=10;
const VS=`#version 300 es
void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.-1.,0.,1.);}`;
const FS=`#version 300 es
precision highp float;
uniform sampler2D uA,uB;
uniform vec2 uRes;
uniform float uScale,uTime,uMix,uDetail,uSeed;
uniform int uStyle,uPalette;
uniform vec3 uSunShadow,uSunLight;
out vec4 o;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7))+uSeed*.17)*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
float fbm(vec2 p){return noise(p)*.57+noise(p*2.03)*.28+noise(p*4.11)*.15;}
float field(vec2 p){vec2 uv=clamp(p/uRes,vec2(0),vec2(1));return mix(texture(uA,uv).r,texture(uB,uv).r,uMix);}
float shape(vec2 p){vec2 warp=vec2(fbm(p*.006),fbm(p*.006+47.))*2.-1.;return field(p+warp*28.);}
void main(){
 vec2 p=vec2(gl_FragCoord.x,uRes.y*uScale-gl_FragCoord.y)/uScale;
 vec2 uv=p/uRes;float t=uTime;
 float grain=(hash(p)-.5)*.009;
 float f=shape(p);
 vec3 col;
 if(uStyle==0){
   // Lagoon: shallow luminous water, slowly traveling caustics and soft sand.
   float island=smoothstep(.29,.43,f);
   float shoal=smoothstep(.03,.33,f);
   vec3 deep=uPalette==1?vec3(.05,.22,.38):vec3(.018,.31,.39);
   vec3 shallow=uPalette==1?vec3(.22,.64,.78):vec3(.20,.76,.70);
   col=mix(deep,shallow,shoal);
   vec2 q=p*.018+vec2(t*.025,-t*.016);
   float caustic=pow(max(0.,1.-abs(sin(q.x+sin(q.y*1.4+t*.15))*cos(q.y+sin(q.x*.7-t*.12)))),13.);
   float glimmer=pow(max(0.,sin(p.x*.042+p.y*.027+t*.8+fbm(p*.008)*5.)),18.);
   col+=vec3(.22,.30,.23)*(caustic*.15+glimmer*.045)*uDetail;
   float shore=sin(f*65.-t*1.1+noise(p*.009)*2.);
   float foam=pow(max(0.,shore),16.)*smoothstep(.15,.28,f)*(1.-smoothstep(.31,.43,f));
   col=mix(col,vec3(.88,.97,.89),foam*.48);
   vec3 sand=mix(vec3(.80,.72,.53),vec3(.96,.90,.73),smoothstep(.35,.55,f));
   sand+=(fbm(p*.025)-.5)*.035;
   col=mix(col,sand,island);
   float wet=smoothstep(.28,.33,f)*(1.-smoothstep(.37,.46,f));
   col=mix(col,col*vec3(.83,.90,.85),wet*.22);
 }else if(uStyle==1){
   // Cloud banks follow icons. Smaller independent wisps cross the open sky.
   vec3 top=uPalette==1?vec3(.27,.26,.56):vec3(.12,.40,.73);
   vec3 bottom=uPalette==1?vec3(.93,.59,.52):vec3(.45,.73,.91);
   col=mix(top,bottom,uv.y*.75);
   float wisps=fbm(vec2(p.x*.002-t*.012,p.y*.004));
   float drift=smoothstep(.64,.86,wisps)*uDetail*.46;
   float edge=(fbm(p*.018+vec2(t*.015,0))-.5)*.13;
   float clouds=smoothstep(.21,.37,f+edge);
   float shadow=smoothstep(.21,.40,shape(p-uSunShadow.xy*38.)+edge);
   col*=1.-shadow*.18*uSunShadow.z;
   col=mix(col,vec3(.87,.94,.98),drift);
   float billow=fbm(p*.014+vec2(t*.007,0));
   float rim=clamp((shape(p-uSunShadow.xy*10.)-f)*3.,0.,1.);
   vec3 cloud=mix(vec3(.76,.85,.93),vec3(.99,.99,.97),billow*.65+.3-rim*.25);
   col=mix(col,cloud,clouds);
 }else{
   // Liquid colour: two organic surfaces; four deliberately different palettes.
   vec3 a=vec3(.045,.24,.29),b=vec3(.65,.81,.70);
   if(uPalette==1){a=vec3(.21,.15,.40);b=vec3(.88,.65,.70);}
   if(uPalette==2){a=vec3(.64,.21,.15);b=vec3(.97,.77,.46);}
   if(uPalette==3){a=vec3(.11,.17,.28);b=vec3(.54,.69,.88);}
   vec2 flow=p*.003+vec2(t*.015,-t*.011);
   float n=fbm(flow+vec2(fbm(flow+9.),fbm(flow+38.))*2.);
   float boundary=clamp(f+(n-.5)*.18,0.,1.);
   float pool=smoothstep(.14,.47,boundary);
   col=mix(a,b,pool);
   float ribbon=pow(max(0.,1.-abs(sin((n+f*.7)*19.+t*.10))),20.);
   col+=ribbon*.045*uDetail;
   float bevel=smoothstep(.22,.32,boundary)*(1.-smoothstep(.32,.39,boundary));
   col+=bevel*vec3(.06,.06,.04);
   col*=.94+.06*fbm(p*.008+vec2(t*.02,0));
 }
 float vignette=1.-.10*dot(uv-.5,uv-.5);
 o=vec4((col*vignette+grain)*uSunLight,1.);
}`;
let program,U={},textures=[];
function compile(type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));return shader;}
function mixAmount(at){const t=Math.min(1,Math.max(0,(at-morphT0)/MORPH_MS));return t*t*(3-2*t);}
function upload(index,data){gl.activeTexture(gl.TEXTURE0+index);gl.bindTexture(gl.TEXTURE_2D,textures[index]);gl.texImage2D(gl.TEXTURE_2D,0,gl.R8,gridW,gridH,0,gl.RED,gl.UNSIGNED_BYTE,data);}
function buildField(){
 const sums=new Float32Array(gridW*gridH),r=Math.max(30,P.sigma),radius=r*3.5;
 for(const ic of P.adaptive===0?[]:icons){
  const cx=ic.x+ic.w*.5,cy=ic.y+ic.h*.5,hw=Math.max(0,ic.w*.36),hh=Math.max(0,ic.h*.36);
  const x0=Math.max(0,Math.floor((cx-radius-hw)/STEP)),x1=Math.min(gridW-1,Math.ceil((cx+radius+hw)/STEP));
  const y0=Math.max(0,Math.floor((cy-radius-hh)/STEP)),y1=Math.min(gridH-1,Math.ceil((cy+radius+hh)/STEP));
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const dx=Math.max(0,Math.abs(x*STEP-cx)-hw),dy=Math.max(0,Math.abs(y*STEP-cy)-hh);sums[y*gridW+x]+=Math.exp(-(dx*dx+dy*dy)/(r*r));}
 }
 return Uint8Array.from(sums,v=>Math.round((1-Math.exp(-v))*255));
}
function commit(instant=false){
 const next=buildField(),at=performance.now();
 if(!fieldB||instant){fieldA=next;fieldB=next;morphT0=-Infinity;}
 else{const t=mixAmount(at);fieldA=Uint8Array.from(fieldB,(v,i)=>Math.round(fieldA[i]*(1-t)+v*t));fieldB=next;morphT0=at;}
 upload(0,fieldA);upload(1,fieldB);if(paused)draw(at);
}
function resize(){
 W=innerWidth;H=innerHeight;const scale=PREVIEW?.65:Math.min(devicePixelRatio||1,1.5);
 cv.width=Math.round(W*scale);cv.height=Math.round(H*scale);cv._scale=scale;
 gridW=Math.ceil(W/STEP)+1;gridH=Math.ceil(H/STEP)+1;fieldA=fieldB=null;commit(true);
}
function applySettings(values){
 let field=false;
 for(const key of Object.keys(DEFAULTS))if(Number.isFinite(values[key])){
  let value=values[key];
  if(key==='sigma')value=Math.min(180,Math.max(35,value));
  if(key==='speed')value=Math.min(3,Math.max(0,value));
  if(key==='detail')value=Math.min(1,Math.max(0,value));
  if(key==='palette')value=Math.min(STYLE===2?3:1,Math.max(0,Math.round(value)));
  if(key==='adaptive')value=value===0?0:1;
  if(P[key]!==value){P[key]=value;if(key==='sigma'||key==='adaptive')field=true;}
 }
 if(field)commit();if(paused)draw(performance.now());
}
function draw(now){
 gl.useProgram(program);gl.viewport(0,0,cv.width,cv.height);
 gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,textures[0]);gl.uniform1i(U.uA,0);
 gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,textures[1]);gl.uniform1i(U.uB,1);
 gl.uniform2f(U.uRes,cv.width/cv._scale,cv.height/cv._scale);gl.uniform1f(U.uScale,cv._scale);
 gl.uniform1f(U.uTime,animationTime);gl.uniform1f(U.uMix,mixAmount(now));gl.uniform1f(U.uDetail,P.detail);
 gl.uniform1f(U.uSeed,P.seed);gl.uniform1i(U.uStyle,STYLE);gl.uniform1i(U.uPalette,P.palette);
 LivingSun.uniforms(gl,U);gl.drawArrays(gl.TRIANGLES,0,3);
}
function frame(at){requestAnimationFrame(frame);if(paused){lastT=0;return;}if(at-lastT<32)return;const dt=lastT?Math.min(.1,(at-lastT)/1000):0;lastT=at;animationTime+=dt*P.speed;draw(at);frameN++;}
function ghosts(){
 if(!PREVIEW)return;
 document.getElementById('ghosts').replaceChildren(...icons.map(ic=>{const el=document.createElement('div');el.className='ghost';Object.assign(el.style,{left:ic.x+'px',top:ic.y+'px',width:ic.w+'px',height:ic.h+'px'});const glyph=document.createElement('i'),label=document.createElement('b');el.append(glyph,label);return el;}));
}
function handle(m){
 if(!m||typeof m!=='object')return;
 if(m.t==='settings'){if(m.environment)LivingSun.setConfig(m.environment);applySettings(m.v||{});}
 if(m.t==='reset')applySettings({...DEFAULTS,...m.v});
 if(m.t==='environment')LivingSun.setConfig(m.v);
 if(m.t==='pause'){paused=PREVIEW?false:!!m.v;if(paused){morphT0=-Infinity;draw(performance.now());}}
 if(m.t==='icons'){
  const k=devicePixelRatio||1;icons=m.vis?m.r.map(([l,t,r,b])=>({x:l/k,y:t/k,w:(r-l)/k,h:(b-t)/k})):[];
  ghosts();if(window.LivingIconShadows)LivingIconShadows.update(m);commit(paused);
 }
 if(paused)draw(performance.now());
}
try{
 if(!gl)throw Error('WebGL2 unavailable');
 program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,VS));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,FS));gl.linkProgram(program);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
 for(let i=0;i<gl.getProgramParameter(program,gl.ACTIVE_UNIFORMS);i++){const name=gl.getActiveUniform(program,i).name;U[name]=gl.getUniformLocation(program,name);}
 gl.bindVertexArray(gl.createVertexArray());gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);
 textures=[0,1].map(()=>{const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return tex;});
 if(!WALL&&!PREVIEW)icons=[{x:60,y:60,w:76,h:90},{x:150,y:60,w:76,h:90},{x:500,y:380,w:76,h:90}];
 resize();draw(performance.now());addEventListener('resize',resize);requestAnimationFrame(frame);
 if(PREVIEW){addEventListener('message',e=>{if(e.source===parent){try{handle(typeof e.data==='string'?JSON.parse(e.data):e.data);}catch(error){console.error(error);}}});parent.postMessage(JSON.stringify({t:'ready'}),'*');}
 else if(WALL&&window.chrome?.webview){chrome.webview.addEventListener('message',e=>{try{handle(JSON.parse(e.data));}catch(error){console.error(error);}});chrome.webview.postMessage('ready');}
}catch(error){console.error(error);document.getElementById('nogl').hidden=false;}
