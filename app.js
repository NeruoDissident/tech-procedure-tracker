'use strict';
const PREFIX = 'tph:v1:';
const DEFAULT_TECHS = ['Jack','Steve','Carl','Fabian','Elvis','Tlyar','Romwell','Brandon','David','Josh'];
const SERVICES = ['Upper bay','Lower bay','Tire','TPMS','Battery','Service writer'];
const $ = id => document.getElementById(id);
const sortNames = names => [...names].sort((a,b) => a.localeCompare(b, undefined, {sensitivity:'base'}));
let activeId = null, selectedRecord = null, listMode = 'completed', toastTimer;
let techs = sortNames(DEFAULT_TECHS);
const error = message => { $('storage-error').textContent = message; $('storage-error').hidden = false; };
function write(key, value) {
  try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); $('storage-error').hidden = true; return true; }
  catch { error('This browser could not save your changes. Keep this page open and copy your details. Free up browser storage or allow storage, then try again.'); $('save-status').textContent = 'Not saved'; return false; }
}
function read(key) { const value = localStorage.getItem(PREFIX + key); return value === null ? null : JSON.parse(value); }
function validRecord(r) {
  return r && typeof r.id === 'string' && /^[a-zA-Z0-9-]{1,100}$/.test(r.id) && ['draft','completed'].includes(r.status) &&
    ['technician','ticket','service','notes','updatedAt','createdAt'].every(k => typeof r[k] === 'string') &&
    r.ticket.length <= 30 && /^\d*$/.test(r.ticket) && (r.service === '' || SERVICES.includes(r.service)) && ['', 'yes','no'].includes(r.correct) &&
    Number.isFinite(Date.parse(r.updatedAt)) && Number.isFinite(Date.parse(r.createdAt)) &&
    (r.status !== 'completed' || (r.technician.trim() && r.ticket && r.service && r.correct && (r.correct !== 'no' || r.notes.trim()) && Number.isFinite(Date.parse(r.completedAt))));
}
function records() {
  try {
    const result = [];
    for (let i=0; i<localStorage.length; i++) { const key=localStorage.key(i); if(key.startsWith(PREFIX+'record:')) { const r=JSON.parse(localStorage.getItem(key)); if(!validRecord(r)) throw new Error('Invalid record'); result.push(r); } }
    return result.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  } catch { error('Some saved data could not be read. Do not clear browser data. Download a backup from Options before continuing.'); return []; }
}
function toast(message) { clearTimeout(toastTimer); $('toast').textContent=message; $('toast').hidden=false; toastTimer=setTimeout(()=>$('toast').hidden=true,3500); }
function renderTechOptions(value=$('technician').value) {
  $('technician').replaceChildren(new Option('Choose a technician',''));
  const choices=value && !techs.includes(value) ? sortNames([...techs,value]) : techs;
  choices.forEach(name=>$('technician').add(new Option(name,name)));
  $('technician').value=value;
}
function fields() { return {technician:$('technician').value,ticket:$('ticket').value,service:$('service').value,correct:document.querySelector('input[name=correct]:checked')?.value || '',notes:$('notes').value}; }
function saveDraft() {
  const data=fields(); if(!Object.values(data).some(Boolean) && !activeId) return true;
  const id=activeId || crypto.randomUUID();
  let prior;
  try { prior=read('record:'+id); } catch { error('Your saved draft could not be read. Keep this page open and copy your details.'); return false; }
  if(prior?.status==='completed') { error('This checklist was completed in another tab. Start a new checklist from Options.'); return false; }
  const now=new Date().toISOString();
  if(!write('record:'+id,{...data,id,status:'draft',createdAt:prior?.createdAt || now,updatedAt:now})) return false;
  activeId=id; $('save-status').textContent='✓ Saved on this device'; updateSummary(); return true;
}
function updateNotes() { const no=fields().correct==='no'; $('notes-wrap').hidden=!no; $('notes').required=no; if(!no)$('notes').setCustomValidity(''); }
function updateSummary() {
  const all=records(), drafts=all.filter(r=>r.status==='draft' && r.id!==activeId);
  $('today-count').textContent=all.filter(r=>r.status==='completed' && new Date(r.completedAt).toDateString()===new Date().toDateString()).length;
  $('resume-banner').hidden=!drafts.length;
  $('resume-banner').textContent=`${drafts.length} unfinished checklist${drafts.length===1?'':'s'} saved · Resume →`;
}
function show(view) { ['checklist','list','tech'].forEach(v=>$(v+'-view').hidden=v!==view); window.scrollTo(0,0); }
function fresh() { activeId=null; $('checklist').reset(); renderTechOptions(''); updateNotes(); $('recent-tickets').hidden=true; $('tickets-toggle').setAttribute('aria-expanded','false'); $('form-title').textContent='New checklist'; $('save-status').textContent='Saved as you go'; updateSummary(); show('checklist'); }
function resume(record) {
  activeId=record.id; renderTechOptions(record.technician); $('ticket').value=record.ticket; $('service').value=record.service; $('notes').value=record.notes;
  document.querySelectorAll('input[name=correct]').forEach(el=>el.checked=el.value===record.correct);
  updateNotes(); $('form-title').textContent='Resumed checklist'; $('save-status').textContent='✓ Saved on this device'; updateSummary(); show('checklist');
}
function node(tag, className, text) { const el=document.createElement(tag); if(className) el.className=className; if(text!==undefined) el.textContent=text; return el; }
const dateText = iso => new Date(iso).toLocaleString(undefined,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});
function renderList() {
  const query=$('search').value.trim().toLowerCase();
  const filtered=records().filter(r=>r.status===(listMode==='drafts'?'draft':'completed') && [r.technician,r.ticket,r.service,r.notes].join(' ').toLowerCase().includes(query));
  $('records-list').replaceChildren();
  if(!filtered.length) $('records-list').append(node('div','empty',query?'No matching checklists.':listMode==='drafts'?'No unfinished checklists. You’re all caught up.':'Your completed checklists will appear here.'));
  filtered.forEach(r=>{
    const button=node('button','record'), top=node('div','record-top'); button.type='button';
    top.append(node('strong','',r.technician || 'Technician not selected'),node('span','badge '+(r.status==='draft'?'draft':r.correct==='no'?'issue':''),r.status==='draft'?'Unfinished':r.correct==='no'?'Needs attention':'All correct'));
    button.append(top,node('p','',`Ticket ${r.ticket ? '#'+r.ticket : 'not entered'} · ${r.service || 'Service not selected'}`),node('p','record-date',dateText(r.completedAt || r.updatedAt)));
    if(r.transferred) button.append(node('p','transferred','✓ Transferred to dashboard'));
    button.addEventListener('click',()=>r.status==='draft'?resume(r):openDetail(r)); $('records-list').append(button);
  });
}
function openList(mode) { listMode=mode; $('search').value=''; $('list-title').textContent=mode==='drafts'?'Unfinished checklists':'Completed forms'; $('list-subtitle').textContent=mode==='drafts'?'Pick up exactly where you left off.':'Ready when it’s time to update the dashboard.'; $('export-csv').hidden=mode==='drafts'; renderList(); show('list'); }
function recordText(r) { return `Technician: ${r.technician}\nTicket: ${r.ticket}\nService: ${r.service}\nAll procedures performed correctly: ${r.correct==='yes'?'Yes':'No'}${r.correct==='no'?'\nDetails: '+r.notes:''}\nCompleted: ${dateText(r.completedAt)}`; }
function openDetail(r) {
  selectedRecord=r; const content=$('detail-content'); content.replaceChildren(); const dl=node('dl');
  [['Technician',r.technician],['Ticket number','#'+r.ticket],['Service type',r.service],['All procedures performed correctly',r.correct==='yes'?'Yes — all correct':'No — needs attention'],['Completed',dateText(r.completedAt)]].forEach(([label,value])=>{const row=node('div','detail-row');row.append(node('dt','',label),node('dd','',value));dl.append(row);});
  content.append(dl); if(r.correct==='no')content.append(node('p','detail-note',r.notes));
  $('mark-transferred').textContent=r.transferred?'Mark as not transferred':'Mark as transferred'; $('detail').showModal();
}
function renderTechs() {
  $('tech-list').replaceChildren();
  techs.forEach(name=>{const row=node('div','tech-row'),remove=node('button','remove','Remove');remove.setAttribute('aria-label','Remove '+name);remove.onclick=()=>{if(!confirm(`Remove ${name} from the dropdown? Existing checklists will be kept.`))return;const next=techs.filter(t=>t!==name);if(write('techs',next)){techs=next;renderTechs();renderTechOptions();}};row.append(node('span','',name),remove);$('tech-list').append(row);});
  if(!techs.length)$('tech-list').append(node('p','empty','Add your first technician above.'));
}
function download(filename, data, type) { const url=URL.createObjectURL(new Blob([data],{type})); const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000); }
function csvCell(value) { let text=String(value ?? ''); if(/^[=+\-@\t\r]/.test(text))text="'"+text; return '"'+text.replaceAll('"','""')+'"'; }
$('checklist').addEventListener('input',event=>{ if(event.target.id==='ticket')event.target.value=event.target.value.replace(/\D/g,''); updateNotes(); saveDraft(); });
$('checklist').addEventListener('change',()=>{updateNotes();saveDraft();});
$('checklist').addEventListener('submit',event=>{
  event.preventDefault(); if(!saveDraft())return;
  const data=fields(); if(data.correct==='no' && !data.notes.trim()){$('notes').setCustomValidity('Please describe what wasn’t done correctly.');$('notes').reportValidity();return;}
  const prior=read('record:'+activeId), now=new Date().toISOString();
  if(!write('record:'+activeId,{...prior,...data,notes:data.correct==='yes'?'':data.notes,status:'completed',completedAt:now,updatedAt:now,transferred:false}))return;
  fresh();toast('Checklist completed and saved. Ready for the next one.');
});
$('notes').addEventListener('input',()=>$('notes').setCustomValidity(''));
$('tickets-toggle').onclick=()=>{
  const area=$('recent-tickets'),open=area.hidden; area.hidden=!open;$('tickets-toggle').setAttribute('aria-expanded',String(open)); area.replaceChildren();
  const tickets=[...new Set(records().map(r=>r.ticket).filter(Boolean))].slice(0,20);
  if(!tickets.length)area.append(node('p','','No recent tickets yet. Enter a number above.'));
  tickets.forEach(ticket=>{const button=node('button','','#'+ticket);button.type='button';button.onclick=()=>{$('ticket').value=ticket;area.hidden=true;$('tickets-toggle').setAttribute('aria-expanded','false');saveDraft();};area.append(button);});
};
$('menu-button').onclick=()=>$('options').showModal();
document.querySelectorAll('[data-close]').forEach(button=>button.onclick=()=>button.closest('dialog').close());
document.querySelectorAll('[data-home]').forEach(button=>button.onclick=()=>{if(saveDraft())fresh();});
document.querySelectorAll('[data-nav]').forEach(button=>button.onclick=()=>{
  if(!saveDraft())return; $('options').close(); const nav=button.dataset.nav;
  if(nav==='home')fresh();else if(nav==='techs'){renderTechs();show('tech');}else openList(nav);
});
$('view-completed').onclick=()=>{if(saveDraft())openList('completed');};
$('resume-banner').onclick=()=>{if(saveDraft())openList('drafts');};
$('search').oninput=renderList;
$('add-tech').onsubmit=event=>{event.preventDefault();const name=$('new-tech').value.trim().replace(/\s+/g,' ');if(!name)return;if(techs.some(t=>t.toLowerCase()===name.toLowerCase())){toast('That technician is already in the list.');return;}const next=sortNames([...techs,name]);if(write('techs',next)){techs=next;$('new-tech').value='';renderTechs();renderTechOptions();}};
$('copy-record').onclick=async()=>{try{await navigator.clipboard.writeText(recordText(selectedRecord));toast('Copied. Ready to paste into your dashboard.');}catch{const area=node('textarea');area.value=recordText(selectedRecord);area.readOnly=true;$('detail-content').append(area);area.focus();area.select();toast('Press and hold the selected text to copy.');}};
$('mark-transferred').onclick=()=>{const r={...selectedRecord,transferred:!selectedRecord.transferred};if(write('record:'+r.id,r)){selectedRecord=r;$('mark-transferred').textContent=r.transferred?'Mark as not transferred':'Mark as transferred';renderList();}};
$('export-csv').onclick=()=>{const rows=records().filter(r=>r.status==='completed');if(!rows.length){toast('No completed forms to export yet.');return;}const csv=[['Technician','Ticket number','Service type','All correct','Details','Completed at','Transferred'],...rows.map(r=>[r.technician,r.ticket,r.service,r.correct,r.notes,r.completedAt,r.transferred?'Yes':'No'])].map(row=>row.map(csvCell).join(',')).join('\r\n');download('technician-checklists.csv','\uFEFF'+csv,'text/csv;charset=utf-8');};
$('backup').onclick=()=>{try{const raw={};for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key.startsWith(PREFIX))raw[key]=localStorage.getItem(key);}download('technician-helper-backup.json',JSON.stringify({version:1,exportedAt:new Date().toISOString(),techs,records:records(),raw},null,2),'application/json');}catch{error('Browser storage is unavailable. Please copy any visible checklist details.');}};
$('restore').onclick=()=>$('restore-file').click();
$('restore-file').onchange=async event=>{
  const file=event.target.files[0];if(!file)return;
  try{
    if(file.size>10000000)throw new Error('Backup is too large (maximum 10 MB).');
    const data=JSON.parse(await file.text());
    if(data.version!==1 || !Array.isArray(data.techs) || !data.techs.every(t=>typeof t==='string' && t.trim() && t.length<=80) || !Array.isArray(data.records) || !data.records.every(validRecord))throw new Error('This is not a valid Technician Procedure Helper backup.');
    const existing=new Set(records().map(r=>r.id));const additions=data.records.filter(r=>!existing.has(r.id));
    if(!confirm(`Restore ${additions.length} checklists and merge the technician list? Existing checklists will stay unchanged.`))return;
    const merged=sortNames([...new Map([...techs,...data.techs].map(t=>[t.toLowerCase(),t])).values()]);
    if(!write('techs',merged))return;techs=merged;
    for(const r of additions){if(!write('record:'+r.id,r))return;}
    renderTechOptions();updateSummary();renderList();renderTechs();toast('Backup restored.');
  }catch(e){toast(e.message || 'Could not restore this backup.');}finally{event.target.value='';}
};
try { const saved=read('techs'); if(saved!==null){if(!Array.isArray(saved)||!saved.every(t=>typeof t==='string'))throw new Error();techs=sortNames(saved);}else write('techs',techs); }catch{error('Browser storage could not be read. Keep this page open until your details are backed up.');}
renderTechOptions();updateSummary();
window.addEventListener('storage',event=>{if(event.key?.startsWith(PREFIX)){try{const saved=read('techs');if(Array.isArray(saved)){techs=sortNames(saved);renderTechOptions();renderTechs();}}catch{}updateSummary();if(!$('list-view').hidden)renderList();}});
// Saving happens synchronously on every input, not on unload (which mobile browsers may skip).
if('serviceWorker' in navigator && location.protocol!=='file:') navigator.serviceWorker.register('./sw.js').catch(()=>{});
if(navigator.storage?.persist) navigator.storage.persist().catch(()=>{});
