const form=document.querySelector('#participant-form');
const tableBody=document.querySelector('#admin-rows');
const weekSelect=document.querySelector('#admin-week');
const message=document.querySelector('#form-message');
const yearSelect=form.elements.year;
const trackSelect=form.elements.track;
const categoryDisplay=document.querySelector('#form-category');
const loginPanel=document.querySelector('#login-panel');
const workspace=document.querySelector('#admin-workspace');
const loginMessage=document.querySelector('#login-message');
let participants=[];

function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
async function api(url,options={}){
  const response=await fetch(url,{credentials:'same-origin',...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})}});
  let data={};try{data=await response.json();}catch{}
  if(!response.ok){if(response.status===401){showLogin();}throw new Error(data.error||`Request failed (${response.status}).`);}
  return data;
}
function showLogin(){loginPanel.hidden=false;workspace.hidden=true;document.querySelector('#logout-button').hidden=true;}
function showWorkspace(){loginPanel.hidden=true;workspace.hidden=false;document.querySelector('#logout-button').hidden=false;}
function updateTrackOptions(){
  if(yearSelect.value==='Year 1')trackSelect.innerHTML='<option value="all">All</option>';
  else trackSelect.innerHTML='<option value="core">Core</option><option value="cs">CS</option>';
  categoryDisplay.value=yearSelect.value==='Year 1'?'Junior':'Senior';
}
function render(){
  document.querySelector('#participant-count').textContent=`${participants.length} participant${participants.length===1?'':'s'}`;
  const wi=Number(weekSelect.value);
  const sorted=[...participants].sort((a,b)=>a.name.localeCompare(b.name));
  tableBody.innerHTML=sorted.length?sorted.map(p=>`<tr data-id="${escapeHtml(p.id)}"><td>${escapeHtml(p.name)}<small class="admin-year">${escapeHtml(p.year)}</small></td><td>${escapeHtml(p.studentId||'—')}</td><td>${p.category==='junior'?'Junior · All':`Senior · ${p.track==='core'?'Core':'CS'}`}</td><td><label class="sr-only" for="score-${escapeHtml(p.id)}">${escapeHtml(p.name)} Week ${wi+1} points</label><input id="score-${escapeHtml(p.id)}" class="score-input" type="number" min="0" step="any" value="${Number(p.weekly[wi])||0}" inputmode="decimal"></td><td><button class="remove-button" type="button" data-remove="${escapeHtml(p.id)}" aria-label="Remove ${escapeHtml(p.name)}">Remove</button></td></tr>`).join(''):'<tr><td colspan="5" class="empty-row">No participants added yet. Add a registered student above to begin.</td></tr>';
}
async function loadParticipants(){const data=await api('/api/admin/participants');participants=data.participants;render();}
yearSelect.addEventListener('change',updateTrackOptions);
form.addEventListener('submit',async event=>{
  event.preventDefault();const data=new FormData(form),name=String(data.get('name')).trim(),studentId=String(data.get('studentId')).trim(),year=String(data.get('year')),track=String(data.get('track'));
  if(!name)return;
  if(studentId&&participants.some(p=>String(p.studentId||'').toLowerCase()===studentId.toLowerCase())){message.textContent='That student ID is already on the roster.';return;}
  const category=year==='Year 1'?'junior':'senior';
  const next=[...participants,{id:crypto.randomUUID?crypto.randomUUID():`student-${Date.now()}`,name,studentId,year,category,track:category==='junior'?'all':track,weekly:[0,0,0,0,0]}];
  try{await api('/api/admin/participants',{method:'PUT',body:JSON.stringify({participants:next})});participants=next;render();form.reset();updateTrackOptions();message.textContent=`${name} added to the roster.`;document.querySelector('#save-status').textContent='Participant saved on the server.';}
  catch(error){message.textContent=error.message;}
});
weekSelect.addEventListener('change',render);
tableBody.addEventListener('click',async event=>{
  const button=event.target.closest('[data-remove]');if(!button)return;
  const person=participants.find(p=>p.id===button.dataset.remove),next=participants.filter(p=>p.id!==button.dataset.remove);
  try{await api('/api/admin/participants',{method:'PUT',body:JSON.stringify({participants:next})});participants=next;render();document.querySelector('#save-status').textContent=`${person.name} removed from the roster.`;}
  catch(error){document.querySelector('#save-status').textContent=error.message;}
});
document.querySelector('#save-scores').addEventListener('click',async()=>{
  const wi=Number(weekSelect.value);let valid=true;
  tableBody.querySelectorAll('tr[data-id]').forEach(row=>{const input=row.querySelector('.score-input'),value=Number(input.value);if(input.value===''||!Number.isFinite(value)||value<0){input.setCustomValidity('Enter a number of zero or greater.');input.reportValidity();valid=false;}else input.setCustomValidity('');});
  if(!valid)return;
  const next=participants.map(person=>{const input=tableBody.querySelector(`tr[data-id="${CSS.escape(person.id)}"] .score-input`);return input?{...person,weekly:person.weekly.map((score,index)=>index===wi?Number(input.value):score)}:person;});
  try{await api('/api/admin/participants',{method:'PUT',body:JSON.stringify({participants:next})});participants=next;render();document.querySelector('#save-status').textContent=`Week ${String(wi+1).padStart(2,'0')} points saved on the server.`;}
  catch(error){document.querySelector('#save-status').textContent=error.message;}
});
document.querySelector('#export-button').addEventListener('click',()=>{
  const blob=new Blob([JSON.stringify({format:'AchieveX participants',version:1,exportedAt:new Date().toISOString(),participants},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='achievex-participants-backup.json';a.click();URL.revokeObjectURL(url);
});
document.querySelector('#import-input').addEventListener('change',async event=>{
  const file=event.target.files[0];if(!file)return;
  try{
    const data=JSON.parse(await file.text()),incoming=Array.isArray(data)?data:data.participants;if(!Array.isArray(incoming))throw new Error('This file does not contain a participant list.');
    const next=incoming.map((p,i)=>{if(!p||typeof p.name!=='string'||!p.name.trim()||!['junior','senior'].includes(p.category)||!['all','core','cs'].includes(p.track))throw new Error(`Participant ${i+1} has incomplete details.`);const year=String(p.year|| (p.category==='junior'?'Year 1':'Year 2')),category=year==='Year 1'?'junior':'senior';if(category==='senior'&&p.track==='all')throw new Error(`Participant ${i+1} needs a Senior Core or CS track.`);return{id:String(p.id||`import-${Date.now()}-${i}`),name:p.name.trim(),studentId:String(p.studentId||''),year,category,track:category==='junior'?'all':p.track,weekly:Array.from({length:5},(_,week)=>{const n=Number(p.weekly?.[week])||0;if(n<0)throw new Error('Scores cannot be negative.');return n;})};});
    const ids=next.filter(p=>p.studentId).map(p=>p.studentId.toLowerCase());if(new Set(ids).size!==ids.length)throw new Error('The backup contains duplicate student IDs.');
    await api('/api/admin/participants',{method:'PUT',body:JSON.stringify({participants:next})});participants=next;render();document.querySelector('#save-status').textContent='Backup imported and saved on the server.';
  }catch(error){document.querySelector('#save-status').textContent=`Import failed: ${error.message}`;}finally{event.target.value='';}
});
document.querySelector('#login-form').addEventListener('submit',async event=>{
  event.preventDefault();loginMessage.textContent='';const input=document.querySelector('#admin-password'),button=event.submitter;
  if(button)button.disabled=true;
  try{await api('/api/admin/login',{method:'POST',body:JSON.stringify({password:input.value})});input.value='';showWorkspace();await loadParticipants();}
  catch(error){loginMessage.textContent=error.message;}
  finally{if(button)button.disabled=false;}
});
document.querySelector('#logout-button').addEventListener('click',async()=>{
  try{await api('/api/admin/logout',{method:'POST',body:'{}'});}catch{}
  participants=[];showLogin();loginMessage.textContent='You have been signed out.';
});
(async()=>{
  updateTrackOptions();
  try{const session=await api('/api/admin/session');if(session.authenticated){showWorkspace();await loadParticipants();}else showLogin();}
  catch(error){showLogin();loginMessage.textContent='Cannot reach the AchieveX server. Start it with your configured admin password, then reload this page.';}
})();
