const BASE_FOODS = [
  {cat:'Protein', name:'Chicken breast (6 oz)', kcal:280, p:40, c:0, f:4},
  {cat:'Protein', name:'Lean ground turkey (5 oz)', kcal:250, p:35, c:0, f:8},
  {cat:'Protein', name:'Eggs (3 large)', kcal:210, p:18, c:2, f:14},
  {cat:'Protein', name:'Greek yogurt (¾ cup)', kcal:150, p:20, c:8, f:0},
  {cat:'Protein', name:'Whey protein (1 scoop)', kcal:120, p:25, c:2, f:2},
  {cat:'Protein', name:'Medium ground beef (5 oz)', kcal:300, p:33, c:0, f:20},
  {cat:'Protein', name:'Lean ground beef (5 oz)', kcal:250, p:35, c:0, f:10},
  {cat:'Protein', name:'Egg whites (¾ cup / 175 mL)', kcal:125, p:26, c:2, f:0},
  {cat:'Carbohydrate', name:'Brown rice (1 cup cooked)', kcal:215, p:5, c:45, f:0},
  {cat:'Carbohydrate', name:'Sweet potato (1 medium)', kcal:120, p:3, c:27, f:0},
  {cat:'Carbohydrate', name:'Oats (½ cup dry)', kcal:150, p:5, c:27, f:3},
  {cat:'Carbohydrate', name:'Whole-grain bread (2 slices)', kcal:160, p:6, c:28, f:2},
  {cat:'Fat', name:'Olive oil (1 tbsp)', kcal:120, p:0, c:0, f:14},
  {cat:'Fat', name:'Avocado (½ medium)', kcal:120, p:1, c:6, f:11},
  {cat:'Fat', name:'Almonds (¼ cup)', kcal:160, p:6, c:6, f:14},
  {cat:'Fat', name:'Peanut butter (1 tbsp)', kcal:90, p:4, c:3, f:8},
  {cat:'Vegetables', name:'Broccoli (1 cup)', kcal:30, p:3, c:5, f:0},
  {cat:'Vegetables', name:'Spinach (2 cups)', kcal:25, p:3, c:4, f:0},
  {cat:'Vegetables', name:'Zucchini (1 cup)', kcal:25, p:2, c:4, f:0},
  {cat:'Vegetables', name:'Peppers (1 cup)', kcal:30, p:2, c:5, f:0},
];

const MEALS = ['Breakfast','Snack 1','Lunch','Snack 2','Dinner'];
const KEY_STATE = 'mealplanner.v1';
const KEY_CUSTOM = 'mealplanner.custom.v1';

const $ = (sel,root=document)=>root.querySelector(sel);
const $$ = (sel,root=document)=>Array.from(root.querySelectorAll(sel));
const uid = () => Math.random().toString(36).slice(2,9);
const todayStr = () => {
  const d = new Date();
  const pad = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
};
function downloadJSON(obj, prefix){
  const blob = new Blob([JSON.stringify(obj, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${prefix}-${todayStr()}.json`;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 0);
}

function getCustomFoods(){ try { return JSON.parse(localStorage.getItem(KEY_CUSTOM)) || []; } catch { return []; } }
function setCustomFoods(arr){ localStorage.setItem(KEY_CUSTOM, JSON.stringify(arr)); }
function allFoods(){ return [...BASE_FOODS.map(f=>({...f, _id: 'base_'+f.name})), ...getCustomFoods()]; }

function calcTotals(state){
  let sums = {kcal:0,p:0,c:0,f:0};
  for(const meal of MEALS){
    for(const item of (state[meal]||[])){
      const f = allFoods()[item.idx];
      const qty = Number(item.qty)||0;
      sums.kcal += f.kcal*qty; sums.p += f.p*qty; sums.c += f.c*qty; sums.f += f.f*qty;
    }
  }
  return sums;
}
function fmt(n){return Math.round(Number(n)||0);}
function badge(val,goal){
  const diff = goal - val;
  const cls = diff < 0 ? 'danger' : diff <= (goal*0.05) ? 'warn' : 'ok';
  const label = diff < 0 ? `${fmt(-diff)} over` : `${fmt(diff)} left`;
  return `<span class="pill ${cls}">${label}</span>`;
}
function loadState(){ try{ return JSON.parse(localStorage.getItem(KEY_STATE)) || {}; }catch{ return {}; } }
function saveState(s){ localStorage.setItem(KEY_STATE, JSON.stringify(s)); }

function renderMeals(){
  const wrap = $('#meals'); wrap.innerHTML = '';
  const state = loadState(); const FOODS = allFoods();
  for(const meal of MEALS){
    const card = document.createElement('div'); card.className = 'card meal-card';
    card.innerHTML = `
      <div class="row" style="align-items:center">
        <h2 style="margin:0;font-size:1.05rem">${meal}</h2>
        <span class="hint" style="margin-left:auto">Add items below</span>
      </div>
      <div class="items" data-meal="${meal}"></div>
      <div class="row">
        <select class="foodSel">
          <option value="" disabled selected>Select food…</option>
          ${FOODS.map((f,i)=>`<option value="${i}">${f.cat} — ${f.name}</option>`).join('')}
        </select>
        <input type="number" class="qtySel" min="0.25" step="0.25" value="1" />
        <button class="primary addBtn">Add</button>
      </div>`;
    wrap.appendChild(card);
    const items = state[meal]||[]; for(const it of items){ addItemRow(card, meal, it.idx, it.qty); }
    $('.addBtn',card).addEventListener('click',()=>{
      const idx = Number($('.foodSel',card).value); const qty = Number($('.qtySel',card).value||1);
      if(Number.isFinite(idx)){ addItemRow(card, meal, idx, qty); persist(); updateTotals(); }
    });
  }
}
function addItemRow(card, meal, idx, qty){
  const itemsBox = $('.items', card);
  const row = document.createElement('div'); row.className = 'item';
  const FOODS = allFoods(); const food = FOODS[idx];
  row.innerHTML = `<div class="hint">${food.name}</div><input class="qty" type="number" min="0.25" step="0.25" value="${qty}" /><button class="remove">✕</button>`;
  itemsBox.appendChild(row);
  $('.qty',row).addEventListener('input',()=>{ persist(); updateTotals(); });
  $('.remove',row).addEventListener('click',()=>{ row.remove(); persist(); updateTotals(); });
  row.dataset.idx = String(idx);
}
function persist(){
  const state = {}; for(const card of $$('#meals .meal-card')){
    const meal = $('.items',card).dataset.meal; state[meal] = [];
    for(const row of $$('.item', card)){ state[meal].push({ idx: Number(row.dataset.idx), qty: Number($('.qty',row).value||1) }); }
  } saveState(state);
}
function updateTotals(){
  const state = loadState(); const sums = calcTotals(state);
  const goals = { kcal: Number($('#goalCal').value||0), p: Number($('#goalPro').value||0), c: Number($('#goalCarb').value||0), f: Number($('#goalFat').value||0) };
  $('#totals').innerHTML = `
    <div class="stat"><label>Calories</label><b>${fmt(sums.kcal)}</b>${badge(sums.kcal,goals.kcal)}</div>
    <div class="stat"><label>Protein (g)</label><b>${fmt(sums.p)}</b>${badge(sums.p,goals.p)}</div>
    <div class="stat"><label>Carbs (g)</label><b>${fmt(sums.c)}</b>${badge(sums.c,goals.c)}</div>
    <div class="stat"><label>Fat (g)</label><b>${fmt(sums.f)}</b>${badge(sums.f,goals.f)}</div>`;
  const advise = [];
  if(sums.p < goals.p) advise.push(`Protein looks a bit low (−${fmt(goals.p - sums.p)}g). Consider adding chicken, egg whites or yogurt.`);
  if(sums.kcal > goals.kcal) advise.push(`Calories are over by ${fmt(sums.kcal - goals.kcal)} kcal. Maybe remove an oil/nut serving or reduce carbs.`);
  $('#advice').textContent = advise.join(' ');
}

function renderFoodTable(){
  const body = $('#foodTable tbody'); body.innerHTML = '';
  for(const f of allFoods()){
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${f.cat}</td><td>${f.name}</td><td class="right">${f.kcal}</td><td class="right">${f.p}</td><td class="right">${f.c}</td><td class="right">${f.f}</td>`;
    const td = document.createElement('td');
    if(String(f._id||'').startsWith('custom_')){
      const btn = document.createElement('button'); btn.className = 'xbtn remove'; btn.textContent = 'Remove';
      btn.addEventListener('click', ()=>{
        const list = getCustomFoods().filter(x=>x._id!==f._id); setCustomFoods(list); renderMeals(); renderFoodTable(); updateTotals();
      });
      td.appendChild(btn);
    }
    tr.appendChild(td); body.appendChild(tr);
  }
}

// Custom item logic
$('#addCustom').addEventListener('click', ()=>{
  const cat = $('#customCat').value; const name = ($('#customName').value||'').trim();
  const kcal = Number($('#customKcal').value); const p = Number($('#customP').value);
  const c = Number($('#customC').value); const f = Number($('#customF').value);
  if(!name){ alert('Please enter a name.'); return; }
  if(!Number.isFinite(kcal) || !Number.isFinite(p) || !Number.isFinite(c) || !Number.isFinite(f)){
    alert('Please enter numbers for kcal, protein, carbs and fat.'); return;
  }
  const item = { _id: 'custom_'+uid(), cat, name, kcal, p, c, f };
  const list = getCustomFoods(); list.push(item); setCustomFoods(list);
  $('#customName').value=''; $('#customKcal').value=''; $('#customP').value=''; $('#customC').value=''; $('#customF').value='';
  renderMeals(); renderFoodTable();
});

$('#clearCustoms').addEventListener('click', ()=>{
  if(confirm('Remove all custom foods?')){ localStorage.removeItem(KEY_CUSTOM); renderMeals(); renderFoodTable(); updateTotals(); }
});

// Import/Export + Share/Save
$('#exportCustoms').addEventListener('click', ()=>{ downloadJSON(getCustomFoods(), 'custom-foods'); });

$('#importFile').addEventListener('change', async (e)=>{
  const file = e.target.files && e.target.files[0]; if(!file) return;
  try{
    const text = await file.text(); let data = JSON.parse(text);
    if(Array.isArray(data)){} else if(data && Array.isArray(data.custom)){ data = data.custom; }
    else { alert('Unrecognized JSON format. Expect an array or an object with a "custom" array.'); return; }
    const normalized = data
      .filter(x => x && x.cat && x.name && Number.isFinite(Number(x.kcal)) && Number.isFinite(Number(x.p)) && Number.isFinite(Number(x.c)) && Number.isFinite(Number(x.f)))
      .map(x => ({ _id: x._id && String(x._id).startsWith('custom_') ? x._id : 'custom_'+uid(), cat: x.cat, name: x.name, kcal: Number(x.kcal), p: Number(x.p), c: Number(x.c), f: Number(x.f) }));
    const append = $('#appendToggle').checked;
    let current = append ? getCustomFoods() : [];
    const key = it => `${it.cat}|${it.name}`.toLowerCase();
    const map = new Map(current.map(it => [key(it), it]));
    for(const it of normalized){ if(!map.has(key(it))) map.set(key(it), it); }
    const merged = Array.from(map.values()); setCustomFoods(merged);
    renderMeals(); renderFoodTable(); updateTotals();
    alert(`Imported ${normalized.length} item(s). Your custom list now has ${merged.length} item(s).`);
    e.target.value = '';
  }catch(err){ console.error(err); alert('Failed to import file. Please ensure it is valid JSON.'); }
});

$('#shareBtn').addEventListener('click', ()=>{
  const state = loadState();
  const payload = { when: new Date().toISOString(),
    goals: { cal: $('#goalCal').value, pro: $('#goalPro').value, carb: $('#goalCarb').value, fat: $('#goalFat').value },
    state, custom: getCustomFoods() };
  downloadJSON(payload, 'meal-day');
});

$('#resetDay').addEventListener('click',()=>{
  if(confirm('Clear all selections for today?')){ localStorage.removeItem(KEY_STATE); renderMeals(); updateTotals(); }
});

for(const id of ['goalCal','goalPro','goalCarb','goalFat']){
  document.addEventListener('input', e=>{ if(e.target && e.target.id===id){ updateTotals(); }});
}

renderMeals(); renderFoodTable(); updateTotals();
