import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlayerProfile, validateProfile } from '../src/data/player.js';
import { checkBonus, finishRest, spendHitDie, hasSheetData, emptySheet } from '../src/data/character-sheet.js';
import * as characterSheet from '../src/data/character-sheet.js';
import { normalizePdfFields } from '../src/import/pdf-fields.js';
import { mergeCharacterDraft } from '../src/data/character-import.js';
import { serializeBackup, parseBackup } from '../src/data/backup.js';
const character=()=>({...createPlayerProfile(),classes:[{name:'Fighter',level:6}],abilities:{...createPlayerProfile().abilities,con:16,dex:14},hp:{current:8,max:40,temp:5}});
test('character stats derive table values and show only the first hit-die pool',()=>{
  const p=character();p.ac=17;p.speed=30;p.sheet.hitDice=[{name:'Fighter',die:10,max:6,current:2},{name:'Wizard',die:6,max:1,current:1}];
  assert.equal(typeof characterSheet.characterStats,'function');
  assert.deepEqual(characterSheet.characterStats(p),{hp:8,maxHp:40,tempHp:5,hitDie:'d10 · 2/6',proficiencyBonus:3,speed:30,initiative:2,ac:17});
});
test('stat overrides take precedence including zero and negative initiative',()=>{
  const p=character();p.sheet.proficiencyBonusOverride=0;p.sheet.initiativeOverride=-1;
  assert.equal(typeof characterSheet.characterStats,'function');
  assert.equal(characterSheet.characterStats(p).proficiencyBonus,0);assert.equal(characterSheet.characterStats(p).initiative,-1);
  p.sheet.proficiencyBonusOverride=7;p.sheet.initiativeOverride=0;
  assert.equal(characterSheet.characterStats(p).proficiencyBonus,7);assert.equal(characterSheet.characterStats(p).initiative,0);
});
test('unknown stats remain unknown and no hit-die pool displays an em dash',()=>{
  assert.equal(typeof characterSheet.characterStats,'function');
  assert.deepEqual(characterSheet.characterStats(createPlayerProfile()),{hp:null,maxHp:null,tempHp:null,hitDie:'—',proficiencyBonus:null,speed:null,initiative:null,ac:null});
});
test('skill bonuses distinguish unknown, proficiency, expertise, and overrides',()=>{const p=character();assert.equal(checkBonus(p,'dex',null),null);assert.equal(checkBonus(p,'dex',0),2);assert.equal(checkBonus(p,'dex',1),5);assert.equal(checkBonus(p,'dex',2),8);assert.equal(checkBonus(p,'dex',.5),3);assert.equal(checkBonus(p,'dex',null,9),9);});
test('2024 long rest restores all hit dice and configured resources; short rest does not autoheal',()=>{const p=character();p.sheet.hitDice=[{name:'Fighter',die:10,max:6,current:2}];p.sheet.resources=[{name:'Second Wind',max:3,current:1,recovery:'short'},{name:'Slots',max:2,current:0,recovery:'long'},{name:'Manual',max:1,current:0,recovery:'manual'}];p.sheet.exhaustion=2;const s=finishRest(p,'short');assert.equal(s.hp.current,8);assert.deepEqual(s.sheet.resources.map(r=>r.current),[3,0,0]);const l=finishRest(p,'long');assert.equal(l.hp.current,40);assert.equal(l.hp.temp,0);assert.equal(l.sheet.hitDice[0].current,6);assert.equal(l.sheet.exhaustion,1);assert.deepEqual(l.sheet.resources.map(r=>r.current),[3,2,0]);assert.equal(p.hp.current,8);assert.throws(()=>finishRest({...p,hp:{...p.hp,current:0}},'long'));});
test('short-rest hit dice consume one die per reviewed roll and cap healing',()=>{const p=character();p.sheet.hitDice=[{name:'Fighter',die:10,max:6,current:2}];assert.equal(spendHitDie(p,0,10).hp.current,21);assert.equal(spendHitDie(p,0,10).sheet.hitDice[0].current,1);assert.throws(()=>spendHitDie(p,0,11));});
test('old profiles receive sheet defaults and invalid resources cannot persist',()=>{const p=character();delete p.sheet;assert.equal(validateProfile(p).sheet.exhaustion,0);p.sheet={resources:[{name:'Slots',max:2,current:3,recovery:'long'}]};assert.throws(()=>validateProfile(p));});
test('recognized PDF check fields preserve signed bonuses and portrait review can be saved',()=>{const draft=normalizePdfFields({CharacterName:'Hero',Stealth:'+7',StealthProficiency:'Expertise',DEXSave:'+5',ProficiencyBonus:'+3',Initiative:'+2'});assert.equal(draft.profile.sheet.skills.Stealth.override,7);assert.equal(draft.profile.sheet.skills.Stealth.proficiency,2);assert.equal(draft.profile.sheet.savingThrows.dex.override,5);draft.profile.portraitUrl='data:image/png;base64,aGVsbG8=';const state={profile:character(),equipment:[]};const merged=mergeCharacterDraft(state,draft,{profileFields:['portraitUrl','sheet'],equipmentIds:[]});assert.equal(merged.profile.portraitUrl,draft.profile.portraitUrl);assert.equal(merged.profile.sheet.skills.Stealth.override,7);assert.throws(()=>validateProfile({...state.profile,portraitUrl:'data:image/svg+xml;base64,aGVsbG8='}));});
test('blank sheet defaults do not hide imported skills',()=>{assert.equal(hasSheetData(emptySheet()),false);const sheet=emptySheet();sheet.skills.Stealth.override=0;assert.equal(hasSheetData(sheet),true);});
test('backup roundtrip retains portrait and core sheet data',()=>{const profile=character();profile.portraitUrl='data:image/png;base64,aGVsbG8=';profile.sheet.skills.Stealth.proficiency=2;profile.sheet.resources=[{name:'Slots',max:2,current:1,recovery:'long'}];const result=parseBackup(serializeBackup({profile,equipment:[],inventory:[],deck:[]}));assert.equal(result.profile.portraitUrl,profile.portraitUrl);assert.deepEqual(result.profile.sheet,profile.sheet);});
