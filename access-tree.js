(function(){
'use strict';
async function loadCatalog(){const r=await fetch('./data/access-catalog.json',{cache:'no-store'});if(!r.ok)throw Error('تعذر تحميل دليل الصلاحيات');return r.json();}
function createTree(catalog,policy=window.SeviatAccessGuard.getPolicy()){
 if(policy.error)throw Error(policy.error);
 const root=document.createElement('div');root.id='seviat-access-tree';root.dir='rtl';
 root.style.cssText='padding:12px;border:1px solid #7995af;border-radius:12px';
 function group(parent,title){const d=document.createElement('details'),s=document.createElement('summary');s.textContent=title;d.append(s);parent.append(d);d.style.padding='8px';return d;}
 for(const unit of catalog.units){
 const u=group(root,unit.title);
 for(const l of unit.letters){
 const letter=group(u,'حرف '+l);
 for(const skill of catalog.skills){
 const s=group(letter,skill.title);
 for(const sub of skill.subskills?.length?skill.subskills:[{id:'all',title:'المهارة كاملة'}]){
 const subroot=group(s,sub.title);
 for(const mode of catalog.activityModes){
 const label=document.createElement('label'),input=document.createElement('input');
 input.type='checkbox';input.dataset.accessId=window.SeviatAccessGuard.accessId(l,skill.id,sub.id,mode.id,unit.id);
 input.checked=policy.detailed.mode==='all'||policy.detailed.allowed.includes(input.dataset.accessId)||policy.detailed.allowed.includes(window.SeviatAccessGuard.accessId(l,skill.id,'all',mode.id,unit.id));
 label.style.cssText='display:flex;align-items:center;gap:10px;min-height:44px';
 label.append(input,document.createTextNode(/writing/.test(skill.id)&&mode.id==='assessment'?'تقييم المعلم للكتابة':mode.title));
 subroot.append(label);
 }
 }
 }
 }
 }
 return root;
}
function readTree(root,previous){
 const inputs=[...root.querySelectorAll('input[data-access-id]')],visible=new Set(inputs.map(i=>i.dataset.accessId));
 // Preserve unknown future grants; replace known skill-wide grants with explicit children.
 const expanded=new Set(inputs.map(i=>{const p=i.dataset.accessId.split('/');p[3]='all';return p.join('/');}));
 const preserved=previous.allowed.filter(id=>!visible.has(id)&&!expanded.has(id));
 return {...previous,mode:'custom',allowed:[...new Set([...preserved,...inputs.filter(i=>i.checked).map(i=>i.dataset.accessId)])]};
}
window.SeviatAccessTree={loadCatalog,createTree,readTree};
})();
