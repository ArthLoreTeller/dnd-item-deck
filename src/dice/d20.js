const subtract = (a,b) => a.map((v,i)=>v-b[i]);
const dot = (a,b) => a.reduce((s,v,i)=>s+v*b[i],0);
const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit = a => a.map(v=>v/Math.hypot(...a));
const phi = (1+Math.sqrt(5))/2;
const vertices=[];
for(const a of [-1,1]) for(const b of [-phi,phi]) vertices.push([0,a,b],[a,b,0],[b,0,a]);
const faces=[];
for(let i=0;i<12;i++) for(let j=i+1;j<12;j++) for(let k=j+1;k<12;k++) {
  let [a,b,c]=[vertices[i],vertices[j],vertices[k]];
  const normal=unit(cross(subtract(b,a),subtract(c,a)));
  const sides=vertices.map(v=>dot(normal,subtract(v,a)));
  if(sides.some(v=>v>1e-6)&&sides.some(v=>v< -1e-6)) continue;
  const center=a.map((v,l)=>(v+b[l]+c[l])/3*60);
  // The local triangle has its third vertex at the top.
  let x=unit(subtract(b,a));
  let y=unit(subtract(a.map((v,l)=>(v+b[l])/2),c));
  let n=cross(x,y);
  if(dot(n,center)<0) { [a,b]=[b,a]; x=unit(subtract(b,a)); n=cross(x,y); }
  const matrix=[...x,0,...y,0,...n,0,...center,1];
  const landing=[x[0],y[0],n[0],0,x[1],y[1],n[1],0,x[2],y[2],n[2],0,0,0,0,1];
  faces.push({value:faces.length+1,normal:n,center,transform:'matrix3d('+matrix.join(',')+')',landing:'matrix3d('+landing.join(',')+')'});
}
export const D20_FACES=faces;
export function rollD20(nextWord=()=>crypto.getRandomValues(new Uint32Array(1))[0]) {
  // Rejection sampling avoids modulo bias.
  let word;
  do { word=nextWord(); } while(word>=4294967280);
  return word%20+1;
}
export function isDoubleNatural(previous, next) {
  return previous === next && (next === 1 || next === 20);
}
