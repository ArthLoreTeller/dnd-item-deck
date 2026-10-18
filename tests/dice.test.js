import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rollD20, D20_FACES } from '../src/dice/d20.js';
test('D20 maps twenty equally spaced accepted values to all twenty results', () => {
  assert.deepEqual(Array.from({length:20},(_,i)=>rollD20(()=>i)),Array.from({length:20},(_,i)=>i+1));
});
test('D20 rejects biased tail values before choosing a result', () => {
  const words=[4294967295,4294967280,19];
  assert.equal(rollD20(()=>words.shift()),20);
});
test('D20 has twenty distinct numbered faces and unit outward normals', () => {
  assert.equal(D20_FACES.length,20);
  assert.equal(new Set(D20_FACES.map(f=>f.value)).size,20);
  for(const face of D20_FACES) {
    assert.ok(Math.abs(Math.hypot(...face.normal)-1)<1e-8);
    assert.ok(face.normal.reduce((s,v,i)=>s+v*face.center[i],0)>0);
  }
});
test('landing transform points the selected face toward the viewer', () => {
  for(const face of D20_FACES) {
    const m=face.landing.slice(9,-1).split(',').map(Number);
    const n=face.normal;
    assert.ok(Math.abs(m[0]*n[0]+m[4]*n[1]+m[8]*n[2])<1e-8);
    assert.ok(Math.abs(m[1]*n[0]+m[5]*n[1]+m[9]*n[2])<1e-8);
    assert.ok(Math.abs(m[2]*n[0]+m[6]*n[1]+m[10]*n[2]-1)<1e-8);
  }
});
test('double impacts require consecutive matching natural extremes', async () => {
  const { isDoubleNatural } = await import('../src/dice/d20.js');
  assert.equal(isDoubleNatural(20,20),true);
  assert.equal(isDoubleNatural(1,1),true);
  for(const [a,b] of [[20,1],[1,20],[19,19],[null,20],[20,17]]) assert.equal(isDoubleNatural(a,b),false);
});
