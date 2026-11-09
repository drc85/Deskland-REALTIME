const assert=require('node:assert/strict');
const sun=require('../prototype/living-sun.js');
const at=value=>Date.parse(value),c=sun.defaults;
// Berlin solstice: approx 04:43 / 21:33 CEST, tolerance for the
// documented compact NOAA approximation and atmospheric variation.
const summer=sun.calculate(at('2026-06-21T10:00:00Z'),c);
assert.ok(Math.abs(summer.rise-at('2026-06-21T02:43:00Z'))<6*60000);
assert.ok(Math.abs(summer.set-at('2026-06-21T19:33:00Z'))<6*60000);
assert.ok(summer.altitude>55&&summer.altitude<65);
const morning=sun.calculate(summer.rise+30*60000,c),evening=sun.calculate(summer.set-30*60000,c);
assert.ok(morning.shadow[0]>0);assert.ok(evening.shadow[0]<0);
assert.ok(Math.hypot(...morning.shadow.slice(0,2))>Math.hypot(...summer.shadow.slice(0,2)));
assert.equal(sun.calculate(at('2026-06-21T23:00:00Z'),c).shadow[2],0);
assert.equal(sun.calculate(at('2026-06-21T10:00:00Z'),{...c,shadows:false}).shadow[2],0);
for(const [date,polar]of [['2026-06-21T12:00:00Z','day'],['2026-12-21T12:00:00Z','night']]){
 const s=sun.calculate(at(date),{...c,latitude:78.22,longitude:15.65,timezone:'Arctic/Longyearbyen'});
 assert.equal(s.polar,polar);assert.equal(s.rise,null);assert.equal(s.set,null);assert.ok(s.shadow.every(Number.isFinite));
}
assert.ok(Number.isNaN(sun.fromLocal('2026-03-29T02:30','Europe/Berlin')));
assert.equal(sun.fromLocal('2026-10-25T02:30','Europe/Berlin'),at('2026-10-25T00:30:00Z'));
assert.equal(sun.fromLocal('2026-06-21T12:00','Europe/Berlin'),at('2026-06-21T10:00:00Z'));
assert.equal(sun.fromLocal('2026-06-21T12:00','America/New_York'),at('2026-06-21T16:00:00Z'));
const local=sun.localParts(at('2026-01-01T23:30:00Z'),'Asia/Tokyo');assert.equal(local.day,'02');
for(const lat of [-90,-78,-52,0,52,78,90])for(let month=0;month<12;month++){
 const s=sun.calculate(Date.UTC(2026,month,15,12),{...c,latitude:lat});
 assert.ok([...s.shadow,...s.light,s.altitude,s.azimuth].every(Number.isFinite));
}
console.log('Solar checks passed: sunrise/set, screen directions, night, polar regions, DST, time zones and finite projection.');
