import { abilityModifier } from './weight.js';
import { SRD_SPELLS, spellById } from './srd/spells.js';
const spellNameKey = name => name.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const canonicalSpellNames = new Map(SRD_SPELLS.map(spell => [spellNameKey(spell.name), spell.name]));
export const SKILLS = { Acrobatics:'dex', 'Animal Handling':'wis', Arcana:'int', Athletics:'str', Deception:'cha', History:'int', Insight:'wis', Intimidation:'cha', Investigation:'int', Medicine:'wis', Nature:'int', Perception:'wis', Performance:'cha', Persuasion:'cha', Religion:'int', 'Sleight of Hand':'dex', Stealth:'dex', Survival:'wis' };
export const CONDITIONS = ['Blinded','Charmed','Deafened','Frightened','Grappled','Incapacitated','Invisible','Paralyzed','Petrified','Poisoned','Prone','Restrained','Stunned','Unconscious'];
const abilities = ['str','dex','con','int','wis','cha'];
export function emptySheet() {
  return { skills:Object.fromEntries(Object.keys(SKILLS).map(name=>[name,{proficiency:null,override:null}])), savingThrows:Object.fromEntries(abilities.map(key=>[key,{proficient:null,override:null}])), hitDice:[], resources:[], attacks:[], spells:[], learnedSpellIds:[], conditions:[], exhaustion:0, inspiration:false, deathSaves:{successes:0,failures:0}, spellcastingAbility:null, proficiencyBonusOverride:null, initiativeOverride:null, features:'', languages:'' };
}
export function hasSheetData(sheet) {
  if (!sheet) return false;
  return Boolean(sheet.features || sheet.languages || sheet.inspiration || sheet.exhaustion || sheet.deathSaves?.successes || sheet.deathSaves?.failures || sheet.spellcastingAbility || sheet.proficiencyBonusOverride != null || sheet.initiativeOverride != null || ['hitDice','resources','attacks','spells','learnedSpellIds','conditions'].some(key=>sheet[key]?.length) || Object.values(sheet.skills??{}).some(entry=>entry.proficiency!=null||entry.override!=null) || Object.values(sheet.savingThrows??{}).some(entry=>entry.proficient!=null||entry.override!=null));
}
export function validateSheet(input) {
  const sheet = { ...emptySheet(), ...input };
  const num=(value,min,max,nullable=false)=>{if(nullable&&value==null)return null;if(!Number.isInteger(value)||value<min||value>max)throw new Error('Invalid character-sheet number.');return value;};
  const text=value=>{if(typeof value!=='string'||value.length>20000)throw new Error('Invalid character-sheet text.');return value;};
  sheet.skills=Object.fromEntries(Object.keys(SKILLS).map(name=>{const value=sheet.skills?.[name]??{};if(![null,0,.5,1,2].includes(value.proficiency??null))throw new Error('Invalid skill proficiency.');return[name,{proficiency:value.proficiency??null,override:num(value.override,-100,100,true)}];}));
  sheet.savingThrows=Object.fromEntries(abilities.map(key=>{const value=sheet.savingThrows?.[key]??{};if(![null,true,false].includes(value.proficient??null))throw new Error('Invalid saving throw proficiency.');return[key,{proficient:value.proficient??null,override:num(value.override,-100,100,true)}];}));
  const list=(value,max=200)=>{if(!Array.isArray(value)||value.length>max)throw new Error('Too many character-sheet entries.');return value;};
  sheet.hitDice=list(sheet.hitDice).map(entry=>{const max=num(entry.max,0,100),current=num(entry.current,0,max);if(![6,8,10,12].includes(entry.die))throw new Error('Choose d6, d8, d10, or d12.');return{name:text(entry.name),die:entry.die,max,current};});
  sheet.resources=list(sheet.resources).map(entry=>{if(!['short','long','manual'].includes(entry.recovery))throw new Error('Invalid recovery rule.');const max=num(entry.max,0,999);return{name:text(entry.name),max,current:num(entry.current,0,max),recovery:entry.recovery};});
  sheet.attacks=list(sheet.attacks).map(entry=>({name:text(entry.name),bonus:num(entry.bonus,-100,100,true),damage:text(entry.damage),notes:text(entry.notes)}));
  sheet.spells=list(sheet.spells).map(entry=>({name:text(entry.name),level:num(entry.level,0,9),prepared:Boolean(entry.prepared),concentration:Boolean(entry.concentration),notes:text(entry.notes)}));
  sheet.learnedSpellIds=[...new Set(list(sheet.learnedSpellIds,500).map(id=>{
    if(typeof id!=='string'||!id.trim()||id.length>500)throw new Error('Invalid learned spell ID.');
    const spell=spellById(id);
    if(!spell)throw new Error(`Unsupported learned spell ID "${id}". Choose a spell from the SRD Spell Tome; keep custom spells in spell notes.`);
    return spell.id;
  }))];
  if(list(sheet.conditions).some(name=>!CONDITIONS.includes(name)))throw new Error('Invalid condition.');sheet.conditions=[...new Set(sheet.conditions)];
  sheet.exhaustion=num(sheet.exhaustion,0,6);sheet.inspiration=Boolean(sheet.inspiration);
  sheet.deathSaves={successes:num(sheet.deathSaves?.successes,0,3),failures:num(sheet.deathSaves?.failures,0,3)};
  if(sheet.spellcastingAbility!==null&&!abilities.includes(sheet.spellcastingAbility))throw new Error('Invalid spellcasting ability.');
  sheet.proficiencyBonusOverride=num(sheet.proficiencyBonusOverride,0,20,true);sheet.initiativeOverride=num(sheet.initiativeOverride,-100,100,true);
  sheet.features=text(sheet.features);sheet.languages=text(sheet.languages);
  return sheet;
}
export function migrateLearnedSpells(input, findSpellByName) {
  const sheet = validateSheet(input);
  const learnedSpellIds = new Set(sheet.learnedSpellIds);
  const spells = sheet.spells.filter(entry => {
    const canonicalName = canonicalSpellNames.get(spellNameKey(entry.name));
    const spell = findSpellByName(entry.name) ?? (canonicalName ? findSpellByName(canonicalName) : undefined);
    if (!spell) return true;
    learnedSpellIds.add(spell.id);
    return false;
  });
  return validateSheet({ ...sheet, spells, learnedSpellIds: [...learnedSpellIds] });
}
export function proficiencyBonus(profile) { const level=profile.classes.reduce((total,entry)=>total+entry.level,0);return profile.sheet?.proficiencyBonusOverride??(level?2+Math.floor((level-1)/4):null); }
export function characterStats(profile) {
  const pool = profile.sheet?.hitDice[0];
  return {
    hp: profile.hp.current,
    maxHp: profile.hp.max,
    tempHp: profile.hp.temp,
    hitDie: pool ? `d${pool.die} · ${pool.current}/${pool.max}` : '—',
    proficiencyBonus: proficiencyBonus(profile),
    speed: profile.speed,
    initiative: profile.sheet?.initiativeOverride ?? abilityModifier(profile.abilities.dex),
    ac: profile.ac,
  };
}
export function checkBonus(profile, ability, proficiency, override=null) { if(override!==null)return override;const mod=abilityModifier(profile.abilities[ability]),pb=proficiencyBonus(profile);return mod===null||proficiency===null||(proficiency!==0&&pb===null)?null:mod+Math.floor((pb??0)*proficiency); }
export function finishRest(profile, kind) {
  if(!['short','long'].includes(kind))throw new Error('Invalid rest.');
  if(profile.hp.current===null||profile.hp.current<1)throw new Error('At least 1 current HP is required to start a rest.');
  if(kind==='long'&&profile.hp.max===null)throw new Error('Set maximum HP before finishing a long rest.');
  const sheet=validateSheet(profile.sheet);
  return {...profile,hp:kind==='long'?{...profile.hp,current:profile.hp.max,temp:0}:profile.hp,sheet:{...sheet,hitDice:sheet.hitDice.map(pool=>kind==='long'?{...pool,current:pool.max}:pool),resources:sheet.resources.map(resource=>resource.recovery===kind||(kind==='long'&&resource.recovery==='short')?{...resource,current:resource.max}:resource),exhaustion:kind==='long'?Math.max(0,sheet.exhaustion-1):sheet.exhaustion,deathSaves:kind==='long'?{successes:0,failures:0}:sheet.deathSaves}};
}
export function spendHitDie(profile,index,roll) {
  const sheet=validateSheet(profile.sheet),pool=sheet.hitDice[index],con=abilityModifier(profile.abilities.con);
  if(!pool||pool.current<1||!Number.isInteger(roll)||roll<1||roll>pool.die)throw new Error('Enter a valid roll for an available Hit Die.');
  if(con===null||profile.hp.current===null||profile.hp.max===null||profile.hp.current<1)throw new Error('Set Constitution and current/maximum HP (at least 1 current HP).');
  return {...profile,hp:{...profile.hp,current:Math.min(profile.hp.max,profile.hp.current+Math.max(1,roll+con))},sheet:{...sheet,hitDice:sheet.hitDice.map((entry,i)=>i===index?{...entry,current:entry.current-1}:entry)}};
}
