// Living Desktop: shared, offline solar model. GPL-3.0.
// NOAA fractional-year equations: https://gml.noaa.gov/grad/solcalc/solareqns.PDF
(function (root) {
  'use strict';
  const rad = Math.PI / 180, day = 86400000;
  const formatters=new Map();
  function formatter(zone){if(!formatters.has(zone))formatters.set(zone,new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}));return formatters.get(zone);}
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (a, b, v) => { const t = clamp((v-a)/(b-a),0,1); return t*t*(3-2*t); };
  const defaults = {name:'Berlin',latitude:52.52,longitude:13.405,timezone:'Europe/Berlin',mode:'live',previewUtc:0,speed:1,shadows:true,shadowSize:.25};
  function normalize(v) {
    const c = Object.assign({},defaults,v);
    c.latitude = clamp(Number(c.latitude)||0,-90,90); c.longitude = clamp(Number(c.longitude)||0,-180,180);
    try { formatter(c.timezone); } catch (_) { c.timezone='UTC'; }
    c.mode = c.mode==='preview'?'preview':'live'; c.speed=clamp(Number(c.speed)||0,0,3600);
    c.previewUtc = Number.isFinite(Number(c.previewUtc))?Number(c.previewUtc):0;
    c.shadows = c.shadows!==false;
    c.shadowSize=clamp(Number(c.shadowSize)||.25,.05,1);
    return c;
  }
  function terms(ms) {
    const d=new Date(ms), y=d.getUTCFullYear(), start=Date.UTC(y,0,1);
    const days=(Date.UTC(y+1,0,1)-start)/day;
    const g=2*Math.PI/days*((ms-start)/day-.5);
    return {eq:229.18*(.000075+.001868*Math.cos(g)-.032077*Math.sin(g)-.014615*Math.cos(2*g)-.040849*Math.sin(2*g)),
      dec:.006918-.399912*Math.cos(g)+.070257*Math.sin(g)-.006758*Math.cos(2*g)+.000907*Math.sin(2*g)-.002697*Math.cos(3*g)+.00148*Math.sin(3*g)};
  }
  function position(ms,lat,lon) {
    const d=new Date(ms), t=terms(ms), phi=lat*rad;
    const minutes=d.getUTCHours()*60+d.getUTCMinutes()+d.getUTCSeconds()/60+d.getUTCMilliseconds()/60000;
    const h=(((minutes+t.eq+4*lon)%1440+1440)%1440/4-180)*rad;
    const altitude=Math.asin(clamp(Math.sin(phi)*Math.sin(t.dec)+Math.cos(phi)*Math.cos(t.dec)*Math.cos(h),-1,1))/rad;
    const azimuth=(Math.atan2(Math.sin(h),Math.cos(h)*Math.sin(phi)-Math.tan(t.dec)*Math.cos(phi))/rad+180)%360;
    return {altitude,azimuth,hourAngle:h/rad};
  }
  function localParts(ms,zone) {
    return Object.fromEntries(formatter(zone).formatToParts(ms).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  }
  // Converts a wall-clock input to UTC. Rejects nonexistent DST times; chooses the
  // earlier instant for an ambiguous autumn hour, consistently in both views.
  function fromLocal(value,zone) {
    const m=/^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)$/.exec(value);
    if(!m) return NaN;
    const target=Date.UTC(+m[1],+m[2]-1,+m[3],+m[4],+m[5]);
    const offsets=new Set();
    for(const shift of [-day,0,day]) { const at=target+shift,p=localParts(at,zone); offsets.add(Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second)-at); }
    const candidates=[...offsets].map(o=>target-o).filter(at=>{const p=localParts(at,zone);return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`===value;});
    return candidates.length?Math.min(...candidates):NaN;
  }
  let eventCache=null;
  function events(ms,lat,lon,zone) {
    const p=localParts(ms,zone),key=[p.year,p.month,p.day,lat,lon,zone].join('|');
    if(eventCache&&eventCache.key===key)return eventCache.value;
    const midnight=Date.UTC(+p.year,+p.month-1,+p.day), noon=midnight+(720-4*lon)*60000;
    const t=terms(noon),phi=lat*rad;
    const cosH=(Math.cos(90.833*rad)-Math.sin(phi)*Math.sin(t.dec))/(Math.cos(phi)*Math.cos(t.dec));
    const polar=cosH>1?'night':cosH< -1?'day':null;
    let rise=null,set=null;
    if(!polar) {
      const h=Math.acos(clamp(cosH,-1,1))/rad;
      const refine=sign=>{let at=midnight+(720-4*lon-t.eq+sign*4*h)*60000;
        for(let i=0;i<3;i++){const q=terms(at),c=(Math.cos(90.833*rad)-Math.sin(phi)*Math.sin(q.dec))/(Math.cos(phi)*Math.cos(q.dec));if(Math.abs(c)>1)break;at=midnight+(720-4*lon-q.eq+sign*4*Math.acos(c)/rad)*60000;}return at;};
      rise=refine(-1);set=refine(1);
      // longitude and civil timezone need not share the same calendar day.
      const dateOf=at=>{const q=localParts(at,zone);return q.year+q.month+q.day;};
      const wanted=p.year+p.month+p.day;
      if(dateOf(rise)!==wanted){const shifted=rise+(dateOf(rise)<wanted?day:-day);rise=shifted;}
      if(dateOf(set)!==wanted){const shifted=set+(dateOf(set)<wanted?day:-day);set=shifted;}
    }
    const value={rise,set,polar};eventCache={key,value};return value;
  }
  function calculate(ms,config) {
    const c=normalize(config),pos=position(ms,c.latitude,c.longitude),e=events(ms,c.latitude,c.longitude,c.timezone);
    // Screen direction is an artistic east-to-west arc, independent of azimuth.
    const progress=e.rise!==null&&e.set>e.rise?clamp((ms-e.rise)/(e.set-e.rise),0,1):clamp((pos.hourAngle+180)/360,0,1);
    const sx=-Math.cos(progress*Math.PI),sy=-(.35+.65*Math.sin(progress*Math.PI)),n=Math.hypot(sx,sy);
    const length=clamp(1/Math.tan(Math.max(3,pos.altitude)*rad),.12,3)*c.shadowSize;
    const strength=c.shadows?smooth(-.833,5,pos.altitude):0;
    const daylight=smooth(-8,12,pos.altitude),warm=smooth(-3,3,pos.altitude)*(1-smooth(3,25,pos.altitude));
    return Object.assign({utc:ms,progress,daylight,shadow:[-sx/n*length,-sy/n*length,strength],
      light:[.22+.78*daylight,.29+.71*daylight-warm*.12,.46+.54*daylight-warm*.22]},pos,e);
  }
  let config=normalize({}), revision=0, cachedAt=-Infinity, cached=null;
  function setConfig(v){config=normalize(v);revision++;cachedAt=-Infinity;}
  function now(){return config.mode==='preview'?config.previewUtc+(Date.now()-(config.anchorUtc||Date.now()))*config.speed:Date.now();}
  function current(){const at=now();if(!cached||Math.abs(at-cachedAt)>250){cached=calculate(at,config);cachedAt=at;}return cached;}
  function uniforms(gl,U){const s=current();if(U.uSunShadow!=null)gl.uniform3f(U.uSunShadow,...s.shadow);if(U.uSunLight!=null)gl.uniform3f(U.uSunLight,...s.light);}
  const api={defaults,normalize,position,events,calculate,localParts,fromLocal,setConfig,current,now,uniforms,get config(){return config;},get revision(){return revision;}};
  if(typeof module!=='undefined')module.exports=api;else root.LivingSun=api;
})(typeof window!=='undefined'?window:globalThis);
