export function portraitFromImage(image) {
  if (typeof document === 'undefined' || !image || image.width < 64 || image.height < 64 || image.width * image.height > 4000000) return null;
  const source=document.createElement('canvas');source.width=image.width;source.height=image.height;
  const context=source.getContext('2d');
  if(image.bitmap) context.drawImage(image.bitmap,0,0);
  else if(image.data && [2,3].includes(image.kind)) {
    const rgba=new Uint8ClampedArray(image.width*image.height*4),stride=image.kind===2?3:4;
    for(let i=0,j=0;i<rgba.length;i+=4,j+=stride){rgba[i]=image.data[j];rgba[i+1]=image.data[j+1];rgba[i+2]=image.data[j+2];rgba[i+3]=stride===4?image.data[j+3]:255;}
    context.putImageData(new ImageData(rgba,image.width,image.height),0,0);
  } else return null;
  const canvas=document.createElement('canvas'),scale=Math.min(1,512/Math.max(image.width,image.height));canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);
  canvas.getContext('2d').drawImage(source,0,0,canvas.width,canvas.height);
  const url=canvas.toDataURL('image/png');return url.length<=750000?url:null;
}
export async function extractPortraitCandidates(page, pdfjs) {
  if(typeof document==='undefined')return [];
  const ops=await page.getOperatorList(),result=[];
  const seen=new Set();
  for(let i=0;i<ops.fnArray.length&&result.length<32;i++) {
    let image;
    if([pdfjs.OPS.paintImageXObject,pdfjs.OPS.paintImageXObjectRepeat].includes(ops.fnArray[i])){const id=ops.argsArray[i][0];if(seen.has(id))continue;seen.add(id);const objects=id.startsWith('g_')?page.commonObjs:page.objs;
      image=await new Promise(resolve=>{const timer=setTimeout(()=>resolve(null),1500);objects.get(id,value=>{clearTimeout(timer);resolve(value);});});
    } else if(ops.fnArray[i]===pdfjs.OPS.paintInlineImageXObject) image=ops.argsArray[i][0];
    if(image){const url=portraitFromImage(image);if(url&&!result.some(entry=>entry.url===url))result.push({url,area:image.width*image.height});}
  }
  return result;
}
