import { useState } from 'react';
export function PortraitPicker({value,onChange,candidates=[],showPreview=true}) {
  const [error,setError]=useState('');
  const choose=async event=>{const file=event.target.files?.[0];event.target.value='';if(!file)return;
    try{if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024)throw new Error('Choose a PNG, JPEG, or WebP smaller than 5 MB.');
      const image=await createImageBitmap(file),canvas=document.createElement('canvas'),scale=Math.min(1,512/Math.max(image.width,image.height));canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);image.close();const url=canvas.toDataURL('image/jpeg',.85);if(url.length>750000)throw new Error('This portrait is too large to save.');onChange(url);setError('');
    }catch(err){setError(err.message);}};
  return <div className="portrait-picker">{value&&showPreview&&<img className="portrait-preview" src={value} alt="Selected character portrait"/>}{candidates.length>0&&<><p>Choose the portrait embedded in your PDF:</p><div className="portrait-candidates">{candidates.map((url,index)=><button type="button" key={index} aria-label={`Use PDF image ${index+1} as portrait`} aria-pressed={value===url} onClick={()=>onChange(url)}><img src={url} alt={`PDF image ${index+1}`}/></button>)}</div></>}<label>Upload portrait<input type="file" accept="image/png,image/jpeg,image/webp" onChange={choose}/></label>{value&&<button type="button" className="text-link" onClick={()=>onChange('')}>Remove portrait</button>}{error&&<p role="alert">{error}</p>}</div>;
}
