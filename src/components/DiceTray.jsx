import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { D20_FACES, rollD20, isDoubleNatural } from '../dice/d20';
import { playSound } from '../audio/sound';

export function DiceTray({ onClose }) {
  const [result,setResult]=useState(null);
  const [doubleImpact,setDoubleImpact]=useState(false);
  const [impactId,setImpactId]=useState(0);
  const previousRoll=useRef(null);
  const [rolling,setRolling]=useState(false);
  const [target,setTarget]=useState(20);
  const timer=useRef();
  const rollButton=useRef();
  const busy=useRef(false);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(()=>{
    const previous=document.activeElement;
    const root=document.getElementById('root');
    const previousInert=root?.inert;
    const overflow=document.body.style.overflow;
    if(root) root.inert=true;
    document.body.style.overflow='hidden';
    rollButton.current?.focus();
    const key=e=>{
      if(e.key==='Escape') onClose();
      if(e.key==='Tab') {
        const buttons=Array.from(document.querySelectorAll('.dice-dialog button')).filter(b=>!b.disabled);
        if(e.shiftKey&&document.activeElement===buttons[0]) {e.preventDefault();buttons.at(-1)?.focus();}
        else if(!e.shiftKey&&document.activeElement===buttons.at(-1)) {e.preventDefault();buttons[0]?.focus();}
      }
    };
    document.addEventListener('keydown',key);
    return ()=>{
      document.removeEventListener('keydown',key);
      if(root) root.inert=previousInert;
      document.body.style.overflow=overflow;
      previous?.focus();
    };
  },[onClose]);
  const roll=(forcedResult)=>{
    if(busy.current) return;
    busy.current=true;
    const next=forcedResult ?? rollD20();
    setTarget(next);setResult(null);setDoubleImpact(false);setRolling(true);
    playSound('dice');
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    timer.current=setTimeout(()=>{
      setDoubleImpact(isDoubleNatural(previousRoll.current,next));
      previousRoll.current=next;
      setImpactId(id=>id+1);
      setResult(next);setRolling(false);busy.current=false;
      playSound('reveal',next===20?'legendary':'common');
    },reduced?0:1100);
  };
  return createPortal(
    <div className="dice-overlay" onClick={onClose}>
      {doubleImpact && <div className={'dice-double-impact '+(result===20?'double-gold':'double-red')} key={impactId} aria-hidden="true"><div className="double-impact-frame"/><div className="double-impact-burst"><i/><i/><i/><i/><i/><i/><i/><i/></div></div>}
      <section className="dice-dialog" role="dialog" aria-modal="true" aria-labelledby="dice-title" onClick={e=>e.stopPropagation()}>
        <header><div><p className="eyebrow">LET FATE DECIDE</p><h2 id="dice-title">Roll D20</h2></div><button className="close-control" aria-label="Close dice" onClick={onClose}><X size={20}/></button></header>
        <div className={'dice-stage '+(result===20?'dice-critical':result===1?'dice-bad-luck':'')} aria-hidden="true">
          {(result===1 || result===20) && <div className="dice-impact" key={result} aria-hidden="true"><i/><i/><i/><i/><i/><i/></div>}
          <div className={'dice-solid '+(rolling?'dice-rolling':'')} style={{'--dice-landing':D20_FACES[target-1].landing,transform:D20_FACES[target-1].landing}}>
            {D20_FACES.map(face=><div key={face.value} className="dice-face" style={{transform:face.transform,'--face-light':(face.value%4)*7+'%'}}><span>{face.value}</span></div>)}
          </div>
        </div>
        <div className={'dice-result '+(result===1?'dice-fumble':'')} role="status" aria-live="polite">{rolling?'Rolling…':result?<>You rolled <strong>{result}</strong><small>{doubleImpact?(result===20?'Double natural 20 · Fate ascends!':'Double natural 1 · Fate fractures!'):result===20?'Natural 20 · Critical!':result===1?'Natural 1 · Bad luck!':'The die has spoken.'}</small></>:'A little chance. A new possibility.'}</div>
        <button ref={rollButton} className="dice-roll-button" aria-disabled={rolling} onClick={() => roll()}>{rolling?'Rolling…':result?'Roll again':'Roll D20'}</button>
      </section>
    </div>,document.body);
}
