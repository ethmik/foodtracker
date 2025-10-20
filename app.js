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
const KEY_LEGACY_STATE = 'mealplanner.v1';
const KEY_DAY_LOG = 'mealplanner.days.v1';
const KEY_CUSTOM = 'mealplanner.custom.v1';
const DEFAULT_GOALS = { kcal: 2100, p: 180, c: 180, f: 60 };

const $ = (sel,root=document)=>root.querySelector(sel);
const $$ = (sel,root=document)=>Array.from(root.querySelectorAll(sel));
const uid = () => Math.random().toString(36).slice(2,9);
const todayStr = () => {
  const d = new Date();
  const pad = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
};
let currentDate = todayStr();
let dayLog = loadInitialLog();
function downloadJSON(obj, prefix){
  const blob = new Blob([JSON.stringify(obj, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${prefix}-${todayStr()}.json`;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 0);
}

function loadInitialLog(){
  try{
    const raw = JSON.parse(localStorage.getItem(KEY_DAY_LOG));
    if(raw && typeof raw === 'object' && !Array.isArray(raw)){ return raw; }
    return {};
  }catch{
    return {};
  }
}
function persistLog(){
  localStorage.setItem(KEY_DAY_LOG, JSON.stringify(dayLog));
}
function loadLegacyStateRaw(){
  try{
    return JSON.parse(localStorage.getItem(KEY_LEGACY_STATE)) || {};
  }catch{
    return {};
  }
}
function migrateLegacyState(){
  const legacy = loadLegacyStateRaw();
  const hasLegacy = legacy && typeof legacy === 'object' && Object.keys(legacy).length > 0;
  if(!hasLegacy) return;
  const existing = dayLog[currentDate];
  if(!existing || !existing.meals || !hasMealEntries(existing.meals)){
    dayLog[currentDate] = { ...(existing||{}), meals: legacy };
    persistLog();
  }
  localStorage.removeItem(KEY_LEGACY_STATE);
}
function hasMealEntries(meals){
  if(!meals) return false;
  return Object.values(meals).some(arr => Array.isArray(arr) && arr.length);
}
function goalsMatchDefault(goals){
  if(!goals) return true;
  return goals.kcal === DEFAULT_GOALS.kcal &&
    goals.p === DEFAULT_GOALS.p &&
    goals.c === DEFAULT_GOALS.c &&
    goals.f === DEFAULT_GOALS.f;
}
function sanitizeGoals(raw){
  const goals = {...DEFAULT_GOALS};
  if(raw && typeof raw === 'object'){
    if(Number.isFinite(Number(raw.kcal))) goals.kcal = Number(raw.kcal);
    if(Number.isFinite(Number(raw.p))) goals.p = Number(raw.p);
    if(Number.isFinite(Number(raw.c))) goals.c = Number(raw.c);
    if(Number.isFinite(Number(raw.f))) goals.f = Number(raw.f);
  }
  return goals;
}
function getMealsForDate(date){
  const entry = dayLog[date];
  return entry && entry.meals ? entry.meals : {};
}
function getGoalsForDate(date){
  const entry = dayLog[date];
  return entry && entry.goals ? sanitizeGoals(entry.goals) : {...DEFAULT_GOALS};
}
function saveMealsForDate(date, meals){
  const entry = dayLog[date] || {};
  if(hasMealEntries(meals)){
    entry.meals = meals;
    dayLog[date] = entry;
  }else{
    if(entry.goals && !goalsMatchDefault(sanitizeGoals(entry.goals))){
      delete entry.meals;
      dayLog[date] = entry;
    }else{
      delete dayLog[date];
    }
  }
  persistLog();
}
function saveGoalsForDate(date, goals){
  const entry = dayLog[date] || {};
  const cleanGoals = sanitizeGoals(goals);
  if(goalsMatchDefault(cleanGoals) && !hasMealEntries(entry.meals)){
    if(dayLog[date]) delete dayLog[date];
  }else{
    entry.goals = cleanGoals;
    if(entry.meals && hasMealEntries(entry.meals)){
      entry.meals = entry.meals;
    }
    dayLog[date] = entry;
  }
  persistLog();
}
function clearDay(date){
  if(dayLog[date]){ delete dayLog[date]; persistLog(); }
}
function getGoalInputs(){
  return {
    kcal: Number($('#goalCal').value || 0) || 0,
    p: Number($('#goalPro').value || 0) || 0,
    c: Number($('#goalCarb').value || 0) || 0,
    f: Number($('#goalFat').value || 0) || 0,
  };
}
function setGoalInputs(goals){
  $('#goalCal').value = goals.kcal;
  $('#goalPro').value = goals.p;
  $('#goalCarb').value = goals.c;
  $('#goalFat').value = goals.f;
}
function dateFromISO(iso){
  const parsed = new Date(`${iso}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
const dateFmt = new Intl.DateTimeFormat(undefined, { weekday:'short', month:'short', day:'numeric', year:'numeric' });
function formatDateLabel(date){
  const parsed = dateFromISO(date);
  if(!parsed) return date;
  let label = dateFmt.format(parsed);
  if(date === todayStr()) label += ' · Today';
  return label;
}
function updateDateHeader(){
  const picker = $('#datePicker');
  if(picker) picker.value = currentDate;
  const label = $('#dateLabel');
  if(label) label.textContent = formatDateLabel(currentDate);
}
function shiftDate(base, deltaDays){
  const parsed = dateFromISO(base) || new Date();
  parsed.setDate(parsed.getDate() + deltaDays);
  return parsed.toISOString().slice(0,10);
}
function normalizeMealState(raw){
  const result = {};
  if(!raw || typeof raw !== 'object') return result;
  for(const meal of MEALS){
    const entries = raw[meal];
    if(!Array.isArray(entries)) continue;
    const cleaned = entries
      .map(it => ({ idx: Number(it.idx), qty: Number(it.qty) }))
      .filter(it => Number.isFinite(it.idx) && Number.isFinite(it.qty));
    if(cleaned.length) result[meal] = cleaned;
  }
  return result;
}
function normalizeImportedGoals(raw){
  if(!raw || typeof raw !== 'object') return null;
  const candidate = {};
  let touched = false;
  const tryAssign = (key, ...aliases) => {
    for(const alias of aliases){
      const val = raw[alias];
      if(val !== undefined){
        const num = Number(val);
        if(Number.isFinite(num)){
          candidate[key] = num;
          touched = true;
          return;
        }
      }
    }
  };
  tryAssign('kcal', 'kcal', 'cal', 'calories');
  tryAssign('p', 'p', 'pro', 'protein');
  tryAssign('c', 'c', 'carb', 'carbs');
  tryAssign('f', 'f', 'fat');
  return touched ? sanitizeGoals(candidate) : null;
}

function getCustomFoods(){ try { return JSON.parse(localStorage.getItem(KEY_CUSTOM)) || []; } catch { return []; } }
function setCustomFoods(arr){ localStorage.setItem(KEY_CUSTOM, JSON.stringify(arr)); }
function allFoods(){ return [...BASE_FOODS.map(f=>({...f, _id: 'base_'+f.name})), ...getCustomFoods()]; }

function calcTotals(mealsByMeal){
  const foods = allFoods();
  const sums = {kcal:0,p:0,c:0,f:0};
  for(const meal of MEALS){
    const items = mealsByMeal[meal] || [];
    for(const item of items){
      const food = foods[item.idx];
      const qty = Number(item.qty)||0;
      if(!food || !Number.isFinite(qty)) continue;
      sums.p += (Number(food.p)||0)*qty;
      sums.c += (Number(food.c)||0)*qty;
      sums.f += (Number(food.f)||0)*qty;
    }
  }
  sums.kcal = (sums.p*4) + (sums.c*4) + (sums.f*9);
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
function renderMeals(){
  const wrap = $('#meals'); wrap.innerHTML = '';
  const state = getMealsForDate(currentDate);
  const FOODS = allFoods();
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
  const state = {};
  for(const card of $$('#meals .meal-card')){
    const meal = $('.items',card).dataset.meal;
    const rows = $$('.item', card);
    if(!rows.length) continue;
    const items = [];
    for(const row of rows){
      items.push({ idx: Number(row.dataset.idx), qty: Number($('.qty',row).value||1) });
    }
    if(items.length) state[meal] = items;
  }
  saveMealsForDate(currentDate, state);
}
function updateTotals(){
  const meals = getMealsForDate(currentDate);
  const sums = calcTotals(meals);
  const goals = getGoalInputs();
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
  if(goals.p && sums.p < goals.p){
    advise.push(`Protein looks a bit low (−${fmt(goals.p - sums.p)}g). Consider chicken, egg whites, or yogurt.`);
  }
  if(goals.kcal && sums.kcal > goals.kcal){
    advise.push(`Calories are over by ${fmt(sums.kcal - goals.kcal)} kcal. Trim oils, nuts, or carb portions.`);
  }
  if(advise.length){
    $('#advice').textContent = advise.join(' ');
  }else if(hasMealEntries(meals)){
    $('#advice').textContent = 'Looking good—targets on track.';
  }else{
    $('#advice').textContent = 'No selections saved for this day yet.';
  }
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

function renderCurrentDate(){
  updateDateHeader();
  setGoalInputs(getGoalsForDate(currentDate));
  renderMeals();
  updateTotals();
}
function selectDate(nextDate){
  const parsed = dateFromISO(nextDate);
  currentDate = parsed ? nextDate : todayStr();
  renderCurrentDate();
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

const exportCustomBtn = $('#exportCustoms');
if(exportCustomBtn){
  exportCustomBtn.addEventListener('click', ()=>{ downloadJSON(getCustomFoods(), 'custom-foods'); });
}

const importCustomInput = $('#importFile');
if(importCustomInput){
  importCustomInput.addEventListener('change', async (e)=>{
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
}

$('#exportPlanner').addEventListener('click', ()=>{
  const payload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    selectedDate: currentDate,
    days: JSON.parse(JSON.stringify(dayLog)),
    custom: getCustomFoods()
  };
  downloadJSON(payload, 'meal-planner');
});

$('#plannerFile').addEventListener('change', async (e)=>{
  const file = e.target.files && e.target.files[0]; if(!file) return;
  try{
    const text = await file.text();
    const data = JSON.parse(text);
    let daysData = null;
    if(data && typeof data === 'object'){
      if(data.days && typeof data.days === 'object') daysData = data.days;
      else if(data.log && typeof data.log === 'object') daysData = data.log;
      else if(data.state && typeof data.state === 'object'){
        const iso = (data.when && typeof data.when === 'string' && data.when.length >= 10) ? data.when.slice(0,10) : currentDate;
        daysData = { [iso]: { meals: data.state, goals: data.goals } };
      }
    }
    if(!daysData || typeof daysData !== 'object'){
      alert('Unrecognized planner JSON format. Please use a file exported from this app.');
      return;
    }
    const merge = $('#plannerMergeToggle').checked;
    dayLog = merge ? {...dayLog} : {};
    let importedDays = 0;
    for(const [date, entry] of Object.entries(daysData)){
      if(!date || !dateFromISO(date)) continue;
      const source = entry && typeof entry === 'object' ? entry : {};
      const mealsSource = source.meals || source.state || source;
      const meals = normalizeMealState(mealsSource);
      const goals = normalizeImportedGoals(source.goals || source.goal || source.targets);
      if(hasMealEntries(meals) || goals){
        const existing = dayLog[date] || {};
        if(hasMealEntries(meals)) existing.meals = meals;
        if(goals) existing.goals = goals;
        dayLog[date] = existing;
        importedDays++;
      }
    }
    persistLog();
    let customCount = 0;
    if(Array.isArray(data.custom)){
      const normalized = data.custom
        .filter(x => x && x.cat && x.name && Number.isFinite(Number(x.kcal)) && Number.isFinite(Number(x.p)) && Number.isFinite(Number(x.c)) && Number.isFinite(Number(x.f)))
        .map(x => ({ _id: x._id && String(x._id).startsWith('custom_') ? x._id : 'custom_'+uid(), cat: x.cat, name: x.name, kcal: Number(x.kcal), p: Number(x.p), c: Number(x.c), f: Number(x.f) }));
      if(normalized.length){
        customCount = normalized.length;
        if(merge){
          const current = getCustomFoods();
          const key = it => `${it.cat}|${it.name}`.toLowerCase();
          const map = new Map(current.map(it => [key(it), it]));
          for(const item of normalized){ map.set(key(item), item); }
          setCustomFoods(Array.from(map.values()));
        }else{
          setCustomFoods(normalized);
        }
        renderFoodTable();
      }
    }
    const available = Object.keys(dayLog).sort();
    if(!available.includes(currentDate) && available.length){
      currentDate = available[available.length-1];
    }
    renderCurrentDate();
    const summary = [];
    if(importedDays){ summary.push(`${importedDays} day${importedDays===1?'':'s'}`); }
    if(customCount){ summary.push(`${customCount} custom food${customCount===1?'':'s'}`); }
    alert(summary.length ? `Imported ${summary.join(' + ')}.` : 'No planner entries found in that file.');
  }catch(err){
    console.error(err);
    alert('Failed to import planner file. Please ensure it is valid JSON.');
  }finally{
    e.target.value = '';
  }
});

$('#resetDay').addEventListener('click', ()=>{
  const label = formatDateLabel(currentDate);
  if(confirm(`Clear all meals and goals for ${label}?`)){
    clearDay(currentDate);
    renderCurrentDate();
  }
});

$('#prevDay').addEventListener('click', ()=>{ selectDate(shiftDate(currentDate, -1)); });
$('#nextDay').addEventListener('click', ()=>{ selectDate(shiftDate(currentDate, 1)); });
$('#datePicker').addEventListener('change', e=>{
  const value = (e.target.value||'').trim();
  selectDate(value || todayStr());
});

for(const id of ['goalCal','goalPro','goalCarb','goalFat']){
  const el = document.getElementById(id);
  if(!el) continue;
  el.addEventListener('input', ()=>{
    saveGoalsForDate(currentDate, getGoalInputs());
    updateTotals();
  });
}

migrateLegacyState();
renderFoodTable();
renderCurrentDate();
