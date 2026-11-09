// Separate local-only layer: exports of the WebGL canvas cannot contain masks.
(function(){
  'use strict';
  const canvas=document.createElement('canvas');canvas.id='living-icon-shadows';
  Object.assign(canvas.style,{position:'fixed',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'1'});
  document.body.appendChild(canvas);
  const ctx=canvas.getContext('2d'),cache=new Map();let list=[],previous=0,signature='';
  window.LivingIconShadows={update(m){
    list=m.vis&&Array.isArray(m.s)?m.s:[];
    const needed=new Set(list.map(v=>v[4]));
    for(const key of cache.keys())if(!needed.has(key))cache.delete(key);
    for(const item of list)if(!cache.has(item[4])&&/^data:image\/png;base64,/.test(item[4])){const image=new Image();image.src=item[4];cache.set(item[4],image);}
    signature='';
  },get count(){return list.length;}};
  function frame(at){
    requestAnimationFrame(frame);if(at-previous<66)return;previous=at;
    const s=LivingSun.current(),dpr=devicePixelRatio||1;
    const key=[innerWidth,innerHeight,dpr,...s.shadow.map(v=>v.toFixed(3)),list.map(v=>v.slice(0,4).join(',')).join(';'),[...cache.values()].filter(i=>i.complete&&i.naturalWidth).length].join('|');
    if(key===signature)return;signature=key;
    const scale=Math.min(dpr,1.5),w=Math.round(innerWidth*scale),h=Math.round(innerHeight*scale);
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,w,h);
    if(s.shadow[2]===0)return;
    ctx.setTransform(scale,0,0,scale,0,0);ctx.globalAlpha=.18*s.shadow[2];ctx.filter='blur(2.5px)';
    // A short flattened silhouette remains recognizable while its top follows
    // the sun projection. These are Shell masks, not captured Explorer pixels.
    for(const [l,t,r,b,key] of list){
      const image=cache.get(key);if(!image||!image.complete||!image.naturalWidth)continue;
      // Explorer's LVIR_ICON includes the full cell width and vertical padding.
      const height=(b-t)/dpr*.8,width=Math.min((r-l)/dpr,height),x=(l+r)/dpr/2-width/2,y=t/dpr+(b-t)/dpr*.1;
      if(x+width<0||x>innerWidth||y+height<0||y>innerHeight)continue;
      ctx.save();ctx.translate(x+width/2,y+height);
      ctx.transform(1,0,-s.shadow[0]*.65,-.12-s.shadow[1]*.65,0,0);
      ctx.drawImage(image,-width/2,-height,width,height);ctx.restore();
    }
    ctx.globalAlpha=1;ctx.filter='none';
  }
  requestAnimationFrame(frame);
})();
