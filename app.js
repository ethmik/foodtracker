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
function badge(val, goal){
  if(!goal){ return ''; }
  const diff = goal - val;
  const tolerance = goal ? goal * 0.05 : 0;
  const toneClass = diff < 0 ? 'text-rose-400' : diff <= tolerance ? 'text-amber-400' : 'text-emerald-400';
  const label = diff < 0 ? `${fmt(Math.abs(diff))} over` : `${fmt(diff)} left`;
  return `<span class="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-medium text-slate-200 ${toneClass}">${label}</span>`;
}
function loadState(){ try{ return JSON.parse(localStorage.getItem(KEY_STATE)) || {}; }catch{ return {}; } }
function saveState(s){ localStorage.setItem(KEY_STATE, JSON.stringify(s)); }

function renderMeals(){
  const wrap = $('#meals'); wrap.innerHTML = '';
  const state = loadState(); const FOODS = allFoods();
  for(const meal of MEALS){
    const card = document.createElement('section');
    card.className = 'meal-card space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg';
    card.innerHTML = `
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-lg font-semibold text-slate-100">${meal}</h2>
          <p class="text-xs text-slate-400">Add foods and tweak quantities below.</p>
        </div>
      </div>
      <div class="items flex flex-col gap-3" data-meal="${meal}"></div>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select class="foodSel w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
          <option value="" disabled selected>Select food…</option>
          ${FOODS.map((f,i)=>`<option value="${i}">${f.cat} — ${f.name}</option>`).join('')}
        </select>
        <div class="flex items-center gap-2">
          <label class="text-xs font-semibold uppercase tracking-wide text-slate-400">Qty</label>
          <input type="number" class="qtySel w-20 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" min="0.25" step="0.25" value="1" />
        </div>
        <button class="addBtn inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors">Add</button>
      </div>`;
    wrap.appendChild(card);
    const items = state[meal] || [];
    for(const it of items){ addItemRow(card, meal, it.idx, it.qty); }
    const foodSel = $('.foodSel',card);
    const qtySel = $('.qtySel',card);
    $('.addBtn',card).addEventListener('click',()=>{
      if(foodSel.value === ''){ alert('Select a food to add.'); return; }
      const idx = Number(foodSel.value);
      const qty = Number(qtySel.value||1);
      if(Number.isFinite(idx)){
        addItemRow(card, meal, idx, qty);
        persist();
        updateTotals();
        foodSel.value = '';
        foodSel.selectedIndex = 0;
        qtySel.value = '1';
      }
    });
  }
}
function addItemRow(card, meal, idx, qty){
  const itemsBox = $('.items', card);
  const row = document.createElement('div');
  row.className = 'item flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-inner sm:flex-row sm:items-center sm:justify-between';
  const FOODS = allFoods(); const food = FOODS[idx];
  row.innerHTML = `
    <div class="flex-1 space-y-1">
      <p class="text-sm font-semibold text-slate-100">${food.name}</p>
      <p class="text-xs text-slate-500">${food.kcal} kcal • ${food.p}P / ${food.c}C / ${food.f}F</p>
    </div>
    <div class="flex items-center gap-2">
      <label class="text-xs font-semibold uppercase tracking-wide text-slate-400">Qty</label>
      <input class="qty w-20 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" type="number" min="0.25" step="0.25" value="${qty}" />
    </div>
    <button class="remove inline-flex items-center justify-center rounded-xl border border-rose-500 px-3 py-2 text-sm font-semibold text-rose-200 transition-colors" aria-label="Remove ${food.name}">Remove</button>`;
  itemsBox.appendChild(row);
  $('.qty',row).addEventListener('input',()=>{ persist(); updateTotals(); });
  $('.remove',row).addEventListener('click',()=>{
    row.remove();
    persist();
    updateTotals();
  });
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
  const goals = {
    kcal: Number($('#goalCal').value||0),
    p: Number($('#goalPro').value||0),
    c: Number($('#goalCarb').value||0),
    f: Number($('#goalFat').value||0)
  };
  $('#totals').innerHTML = `
    <div class="space-y-2 rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-inner">
      <p class="text-xs uppercase tracking-wide text-slate-400">Calories</p>
      <p class="text-2xl font-semibold text-slate-100">${fmt(sums.kcal)}</p>
      ${badge(sums.kcal, goals.kcal)}
    </div>
    <div class="space-y-2 rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-inner">
      <p class="text-xs uppercase tracking-wide text-slate-400">Protein (g)</p>
      <p class="text-2xl font-semibold text-slate-100">${fmt(sums.p)}</p>
      ${badge(sums.p, goals.p)}
    </div>
    <div class="space-y-2 rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-inner">
      <p class="text-xs uppercase tracking-wide text-slate-400">Carbs (g)</p>
      <p class="text-2xl font-semibold text-slate-100">${fmt(sums.c)}</p>
      ${badge(sums.c, goals.c)}
    </div>
    <div class="space-y-2 rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-inner">
      <p class="text-xs uppercase tracking-wide text-slate-400">Fat (g)</p>
      <p class="text-2xl font-semibold text-slate-100">${fmt(sums.f)}</p>
      ${badge(sums.f, goals.f)}
    </div>`;
  const advise = [];
  if(sums.p < goals.p){
    advise.push(`Protein looks a bit low (−${fmt(goals.p - sums.p)}g). Consider chicken, egg whites, or yogurt.`);
  }
  if(goals.kcal && sums.kcal > goals.kcal){
    advise.push(`Calories are over by ${fmt(sums.kcal - goals.kcal)} kcal. Trim oils, nuts, or carb portions.`);
  }
  $('#advice').textContent = advise.length ? advise.join(' ') : 'Looking good—targets on track.';
}

function renderFoodTable(){
  const body = $('#foodTable tbody'); body.innerHTML = '';
  for(const f of allFoods()){
    const tr = document.createElement('tr');
    tr.className = 'border-b border-slate-800';
    tr.innerHTML = `
      <td class="px-4 py-3">${f.cat}</td>
      <td class="px-4 py-3 text-slate-100">${f.name}</td>
      <td class="px-4 py-3 text-right text-slate-300">${f.kcal}</td>
      <td class="px-4 py-3 text-right text-slate-300">${f.p}</td>
      <td class="px-4 py-3 text-right text-slate-300">${f.c}</td>
      <td class="px-4 py-3 text-right text-slate-300">${f.f}</td>`;
    const td = document.createElement('td'); td.className = 'px-4 py-3 text-right';
    if(String(f._id||'').startsWith('custom_')){
      const btn = document.createElement('button');
      btn.className = 'xbtn inline-flex items-center justify-center rounded-xl border border-rose-500 px-3 py-2 text-xs font-semibold text-rose-200 transition-colors';
      btn.textContent = 'Remove';
      btn.addEventListener('click', ()=>{
        const list = getCustomFoods().filter(x=>x._id!==f._id);
        setCustomFoods(list);
        renderMeals(); renderFoodTable(); updateTotals();
      });
      td.appendChild(btn);
    }
    tr.appendChild(td);
    body.appendChild(tr);
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
