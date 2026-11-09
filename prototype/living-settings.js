// Global controls, shared by both designs. No automatic location lookup.
'use strict';
let locationRequest=0;
let locationTimer;
let locationQuery='';
const locationCountries={DE:'Germany',AT:'Austria',CH:'Switzerland',FR:'France',NL:'Netherlands',BE:'Belgium',LU:'Luxembourg',GB:'United Kingdom',US:'United States',CA:'Canada',ES:'Spain',IT:'Italy',PL:'Poland',DK:'Denmark',SE:'Sweden',NO:'Norway',FI:'Finland',CZ:'Czechia',PT:'Portugal',AU:'Australia',NZ:'New Zealand',JP:'Japan',IN:'India',BR:'Brazil',ZA:'South Africa'};
$('openSun').onclick=()=>{$('sunModal').hidden=false;renderSunControls();$('sunSearch').focus();};
$('closeSun').onclick=()=>{$('sunModal').hidden=true;$('openSun').focus();};
$('sunModal').onclick=e=>{if(e.target===$('sunModal'))$('closeSun').click();};
document.addEventListener('keydown',e=>{
  if($('sunModal').hidden)return;
  if(e.key==='Escape')$('closeSun').click();
  if(e.key==='Tab'){
    const items=[...$('sunModal').querySelectorAll('button,input,select,summary')].filter(v=>!v.disabled&&v.getClientRects().length);
    const first=items[0],last=items[items.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }
});
function renderSunControls(){
  const zh=lang==='zh-CN',c=state.environment||LivingSun.normalize({});
  const text=(en,cn)=>zh?cn:en,box=$('sunControls');
  box.innerHTML=`<h3>${text('Sun & location','太阳与位置')}</h3>
    <label for="sunSearch">${text('City or postal code','城市或邮政编码')}</label>
    <div class="sun-row"><input id="sunSearch" maxlength="120" autocomplete="off" placeholder="10115"><select id="sunCountry" aria-label="${text('Country','国家')}">${Object.entries(locationCountries).map(([code,name])=>`<option value="${code}">${name} (${code})</option>`).join('')}</select></div>
    <button class="ghost-btn" id="sunFind">${text('Find location','查找位置')}</button>
    <div class="sun-results" id="sunResults" aria-live="polite"></div>
    <p id="sunPlace"></p>
    <details><summary>${text('Coordinates / offline','坐标 / 离线')}</summary>
      <div class="sun-row"><label>${text('Latitude','纬度')}<input id="sunLat" type="number" min="-90" max="90" step="any"></label><label>${text('Longitude','经度')}<input id="sunLon" type="number" min="-180" max="180" step="any"></label></div>
      <label>${text('Time zone','时区')}<input id="sunZone" placeholder="Europe/Berlin"></label>
      <button class="ghost-btn" id="sunCoords">${text('Apply coordinates','应用坐标')}</button>
    </details>
    <label for="sunMode">${text('Time','时间')}</label><select id="sunMode"><option value="live">${text('Live local time','实时当地时间')}</option><option value="preview">${text('Preview / time lapse','预览 / 延时')}</option></select>
    <div id="sunPreview"><label for="sunDate">${text('Date & time at selected location','所选位置的日期与时间')}</label><input id="sunDate" type="datetime-local">
    <label for="sunSpeed">${text('Playback speed','播放速度')}</label><select id="sunSpeed"><option value="0">${text('Still','静止')}</option><option value="1">1×</option><option value="60">60×</option><option value="600">600×</option><option value="3600">3600×</option></select><button class="ghost-btn" id="sunApplyTime">${text('Apply preview','应用预览')}</button></div>
    <label><input id="sunShadows" type="checkbox"> ${text('Sun shadows','太阳阴影')}</label>
    <label for="sunShadowSize">${text('Shadow size · small & soft','阴影大小 · 小而柔和')}</label><input id="sunShadowSize" type="range" min="0.05" max="1" step="0.05">
    <p id="sunStatus" role="status"></p><p>${text('Search: Open-Meteo & Zippopotam.us / GeoNames. Select the country for postal codes. Only a search sends text, country and lookup coordinates. Solar calculations work offline.','搜索：Open-Meteo 和 Zippopotam.us / GeoNames。搜索邮编时请选择国家。仅在搜索时发送文本、国家和查询坐标。太阳计算可离线运行。')}</p>`;
  $('sunCountry').value=c.searchCountry in locationCountries?c.searchCountry:'DE';$('sunSearch').value=locationQuery;
  $('sunPlace').textContent=`${c.name} · ${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)} · ${c.timezone}`;
  $('sunLat').value=c.latitude;$('sunLon').value=c.longitude;$('sunZone').value=c.timezone;
  $('sunMode').value=c.mode;$('sunPreview').hidden=c.mode!=='preview';$('sunShadows').checked=c.shadows;
  $('sunShadowSize').value=c.shadowSize;$('openSun').textContent=text('Location & sun','位置与太阳');
  const p=LivingSun.localParts(LivingSun.now(),c.timezone);$('sunDate').value=`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
  $('sunSpeed').value=String(c.mode==='preview'?c.speed:0);
  $('sunFind').onclick=searchSunLocation;
  $('sunSearch').onkeydown=e=>{if(e.key==='Enter')searchSunLocation();};
  $('sunCoords').onclick=()=>{
    const lat=Number($('sunLat').value),lon=Number($('sunLon').value),zone=$('sunZone').value.trim();
    try{new Intl.DateTimeFormat('en',{timeZone:zone});if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180||!zone)throw Error();}
    catch(_){$('sunStatus').textContent=text('Enter valid coordinates and an IANA time zone.','请输入有效坐标和 IANA 时区。');return;}
    saveSun({...c,name:text('Custom location','自定义位置'),latitude:lat,longitude:lon,timezone:zone});renderSunControls();
  };
  $('sunMode').onchange=()=>{
    const at=LivingSun.now();saveSun({...state.environment,mode:$('sunMode').value,previewUtc:at,anchorUtc:Date.now(),speed:0});renderSunControls();
  };
  $('sunApplyTime').onclick=()=>{
    const at=LivingSun.fromLocal($('sunDate').value,state.environment.timezone);
    if(!Number.isFinite(at)){$('sunStatus').textContent=text('This local time does not exist. Check the date and daylight-saving change.','此当地时间不存在，请检查日期和夏令时。');return;}
    saveSun({...state.environment,mode:'preview',previewUtc:at,anchorUtc:Date.now(),speed:Number($('sunSpeed').value)});
  };
  $('sunShadows').onchange=()=>saveSun({...state.environment,shadows:$('sunShadows').checked});
  $('sunShadowSize').oninput=()=>saveSun({...state.environment,shadowSize:Number($('sunShadowSize').value)});
  sunStatus();
}
function saveSun(c){
  state.environment=LivingSun.normalize(c);LivingSun.setConfig(state.environment);
  toPreview({t:'environment',v:state.environment});send({t:'environment',v:state.environment});
  if(!host)localStorage.setItem('living-environment',JSON.stringify(state.environment));sunStatus();
}
function sunStatus(){
  if(!$('sunStatus'))return;
  const s=LivingSun.current(),c=LivingSun.config,zh=lang==='zh-CN';
  const time=at=>at==null?'—':new Intl.DateTimeFormat(zh?'zh-CN':'en-GB',{timeZone:c.timezone,hour:'2-digit',minute:'2-digit'}).format(at);
  const current=new Intl.DateTimeFormat(zh?'zh-CN':'en-GB',{timeZone:c.timezone,dateStyle:'medium',timeStyle:'medium'}).format(s.utc);
  $('sunStatus').textContent=`${current} · ${s.altitude.toFixed(1)}°\n${zh?'日出':'Sunrise'} ${time(s.rise)} · ${zh?'日落':'Sunset'} ${time(s.set)}${s.polar?' · '+(s.polar==='day'?(zh?'极昼':'Polar day'):(zh?'极夜':'Polar night')):''}`;
  $('sunStatus').style.whiteSpace='pre-line';
}
setInterval(sunStatus,1000);
async function searchSunLocation(){
  let query=$('sunSearch').value.trim();const country=$('sunCountry').value||'DE';
  if(country==='DE')query=query.replace(/^(?:DE|D)[-\s]*(?=\d)/i,'');
  if(/^[\d\s]+$/.test(query))query=query.replace(/\s/g,'');
  locationQuery=query;
  if(query.length<2){$('sunResults').textContent=lang==='zh-CN'?'请输入城市或邮编。':'Enter a city or postal code.';return;}
  if(country==='DE'&&/^\d+$/.test(query)&&query.length!==5){$('sunResults').textContent=lang==='zh-CN'?'德国邮编需要五位数字。':'German postal codes need five digits, including any leading zero.';return;}
  const request=++locationRequest;$('sunFind').disabled=true;$('sunResults').textContent=lang==='zh-CN'?'搜索中…':'Searching…';
  clearTimeout(locationTimer);locationTimer=setTimeout(()=>LivingLocationResults({request,error:'The search timed out. Please try again.'}),15000);
  if(host){send({t:'locationSearch',query,country,request});return;}
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  try{
    if(country&&/\d/.test(query)) {
      const postal=await fetch('https://api.zippopotam.us/'+encodeURIComponent(country.toLowerCase())+'/'+encodeURIComponent(query),{signal:controller.signal});
      if(postal.ok){const data=await postal.json(),results=[];
        for(const p of data.places.slice(0,5)){let timezone={DE:'Europe/Berlin',AT:'Europe/Vienna',CH:'Europe/Zurich'}[country];if(!timezone){const tz=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.latitude}&longitude=${p.longitude}&timezone=auto`,{signal:controller.signal}).then(r=>r.json());timezone=tz.timezone;}results.push({name:p['place name'],admin1:p.state,country:data.country,latitude:Number(p.latitude),longitude:Number(p.longitude),timezone});}
        LivingLocationResults({request,results});return;}
    }
    const url=new URL('https://geocoding-api.open-meteo.com/v1/search');url.search=new URLSearchParams({name:query,count:10,language:'en',...(country?{countryCode:country}:{})});
    const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw Error();const data=await response.json();LivingLocationResults({request,results:data.results});
  }catch(_){LivingLocationResults({request,error:'Location search unavailable. Try again or enter coordinates.'});}finally{clearTimeout(timer);}
}
window.LivingLocationResults=function(m){
  if(m.request!==locationRequest)return;
  clearTimeout(locationTimer);
  $('sunFind').disabled=false;const box=$('sunResults');box.textContent='';
  if(m.error){box.textContent=lang==='zh-CN'?'搜索不可用，请检查网络或输入坐标。':m.error;return;}
  if(!m.results||!m.results.length){box.textContent=lang==='zh-CN'?'未找到位置，请检查邮编和国家。':'No matching location. Check the postal code and selected country.';return;}
  for(const place of m.results){
    const button=document.createElement('button');button.className='ghost-btn';button.textContent=[place.name,place.admin1,place.country].filter(Boolean).join(', ');
    button.onclick=()=>{saveSun({...state.environment,name:place.name,latitude:place.latitude,longitude:place.longitude,timezone:place.timezone||'UTC',searchCountry:$('sunCountry').value});renderSunControls();$('sunResults').textContent=lang==='zh-CN'?'位置已应用。':'Location applied.';};box.appendChild(button);
  }
};
