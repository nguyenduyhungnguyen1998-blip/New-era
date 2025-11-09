// Enhanced v1.3 - Optimized & Fixed
(function(){'use strict';

// State
let stats={gTotal:0,gMoves:0,gTime:0,wins:0,optWin:0,modes:{play:0,teach:0,learn:0,challenge:0,sandbox:0},bestEf:0};
let daily={date:null,cfg:null,done:false,str:0,dates:[]};
let weekly={week:null,tasks:[],done:[]};
let monthly={month:null,tasks:[],done:[]};
let vfx=false;
let dailyCountdownInterval=null; // Track interval to prevent leak

const achPrg={rookie:{cur:0,max:1,lbl:'3'},architect:{cur:0,max:1,lbl:'8'},optimal_master:{cur:0,max:1,lbl:'Opt'},perfectionist:{cur:0,max:1,lbl:'6+'},invincible:{cur:0,max:1,lbl:'10+'},absolute_perfection:{cur:0,max:1,lbl:'12'},speedrun_legend:{cur:0,max:1,lbl:'8+2m'},undoer:{cur:0,max:15,lbl:'undo'},creative_soul:{cur:0,max:10,lbl:'cfg'}};

// Achievement Progress
function updAch(id,cur,max){if(achPrg[id]){achPrg[id].cur=Math.min(cur,max);achPrg[id].max=max;savePrg();}}
function getAch(id){return achPrg[id]||{cur:0,max:1,lbl:''};}
function savePrg(){try{localStorage.setItem('hanoi_ach_prg',JSON.stringify(achPrg));}catch(e){console.warn('Save progress fail');}}
function loadPrg(){try{const s=JSON.parse(localStorage.getItem('hanoi_ach_prg'));if(s)Object.assign(achPrg,s);}catch(e){}}

window.enhanceAchievementDisplay=function(el,id,unlock){
    if(unlock)return;
    const p=getAch(id);
    if(p.max>1||p.cur>0){
        const d=el.querySelector('.details');
        if(d){
            const pct=Math.floor((p.cur/p.max)*100);
            d.insertAdjacentHTML('beforeend',`<div class="achievement-progress"><div class="achievement-progress-bar" style="width:${pct}%"></div></div><div class="achievement-progress-text">${p.cur}/${p.max} ${p.lbl}</div>`);
        }
    }
};

// Visual Effects
function addGlow(el){if(vfx)el.classList.add('disk-glow');}
function rmGlow(el){el.classList.remove('disk-glow');}
function trail(el){
    if(!vfx)return;
    const t=el.cloneNode(true);
    t.classList.add('disk-trail');
    t.style.position='absolute';
    t.style.left=el.offsetLeft+'px';
    t.style.top=el.offsetTop+'px';
    t.style.width=el.offsetWidth+'px';
    el.parentElement.appendChild(t);
    setTimeout(()=>{if(t.parentElement)t.parentElement.removeChild(t);},500);
}

window.enhanceDiskDrag=function(el){addGlow(el);trail(el);};
window.enhanceDiskDrop=function(el){rmGlow(el);};
window.enhancePoleHover=function(el,hover){hover?el.classList.add('pole-highlight-glow'):el.classList.remove('pole-highlight-glow');};

// Stats
function loadS(){try{const s=localStorage.getItem('hanoi_game_stats');if(s)Object.assign(stats,JSON.parse(s));}catch(e){}}
function saveS(){try{localStorage.setItem('hanoi_game_stats',JSON.stringify(stats));}catch(e){console.warn('Save stats fail');}}
function track(mode,moves,time,opt,isOpt){
    stats.gTotal++;stats.gMoves+=moves;stats.gTime+=time;stats.wins++;
    if(isOpt)stats.optWin++;
    if(stats.modes[mode]!==undefined)stats.modes[mode]++;
    if(opt>0){const ef=(opt/moves)*100;if(ef>stats.bestEf)stats.bestEf=ef;}
    saveS();
    checkMissions(mode,moves,time,opt,isOpt);
}

function render(){
    const c=document.getElementById('statsContent');
    if(!c)return;
    const avg=stats.gTotal>0?Math.round(stats.gMoves/stats.gTotal):0;
    const avgT=stats.gTotal>0?Math.round(stats.gTime/stats.gTotal):0;
    const wr=stats.gTotal>0?Math.round((stats.wins/stats.gTotal)*100):0;
    const total=Object.values(stats.modes).reduce((a,b)=>a+b,0);
    const mn={play:'🎮Play',teach:'🎓Teach',learn:'🧠Learn',challenge:'⏱️Challenge',sandbox:'🚀Sandbox'};
    
    c.innerHTML=`<div class="stats-grid">
        <div class="stat-card"><div class="stat-label">Trận</div><div class="stat-value">${stats.gTotal}</div></div>
        <div class="stat-card"><div class="stat-label">Thắng</div><div class="stat-value">${stats.wins}</div></div>
        <div class="stat-card"><div class="stat-label">TB Moves</div><div class="stat-value">${avg}</div></div>
        <div class="stat-card"><div class="stat-label">Win%</div><div class="stat-value">${wr}%</div></div>
        <div class="stat-card"><div class="stat-label">Optimal</div><div class="stat-value">${stats.optWin}</div></div>
        <div class="stat-card"><div class="stat-label">Best Eff</div><div class="stat-value">${stats.bestEf.toFixed(1)}%</div></div>
    </div>
    <div class="stat-chart"><h4>📊 Modes</h4>${Object.entries(stats.modes).map(([m,cnt])=>{
        const pct=total>0?Math.round((cnt/total)*100):0;
        return `<div class="stat-bar-container"><div class="stat-bar-label"><span>${mn[m]||m}</span><span>${cnt} (${pct}%)</span></div><div class="stat-bar"><div class="stat-bar-fill" style="width:${pct}%"></div></div></div>`;
    }).join('')}</div>
    <div class="stat-chart"><h4>⏱️ Time</h4><div class="stat-bar-container"><div class="stat-bar-label"><span>Total</span><span>${fmtHr(stats.gTime)}</span></div></div><div class="stat-bar-container"><div class="stat-bar-label"><span>Avg</span><span>${fmtTm(avgT)}</span></div></div></div>`;
}

function fmtHr(s){const h=Math.floor(s/3600),m=Math.floor((s%3600)/60);return h>0?`${h}h ${m}m`:`${m}m`;}
function fmtTm(s){const m=Math.floor(s/60),ss=s%60;return `${m.toString().padStart(2,'0')}:${ss.toString().padStart(2,'0')}`;}

// Daily Challenge
function getDay(d){const dt=d||new Date();return `${dt.getFullYear()}-${(dt.getMonth()+1).toString().padStart(2,'0')}-${dt.getDate().toString().padStart(2,'0')}`;}
function genCfg(ds){
    const seed=ds.split('-').reduce((a,b)=>parseInt(a)+parseInt(b),0);
    const rnd=(seed*9301+49297)%233280;
    const rng=rnd/233280;
    const rules=['classic','adjacent','cyclic'];
    return {disks:4+Math.floor(rng*5),poles:3+Math.floor((rng*1000)%4),rule:rules[Math.floor((rng*10000)%3)],seed:ds};
}

function loadD(){
    try{const s=localStorage.getItem('hanoi_daily');if(s)daily=JSON.parse(s);}catch(e){}
    const td=getDay();
    if(daily.date!==td){daily.date=td;daily.cfg=genCfg(td);daily.done=false;saveD();}
}
function saveD(){try{localStorage.setItem('hanoi_daily',JSON.stringify(daily));}catch(e){console.warn('Save daily fail');}}
function compD(){
    if(!daily.done){
        daily.done=true;
        const td=getDay();
        if(!daily.dates.includes(td)){
            daily.dates.push(td);
            const yd=new Date();yd.setDate(yd.getDate()-1);
            const yds=getDay(yd);
            daily.str=(daily.dates.includes(yds)||daily.dates.length===1)?daily.str+1:1;
            if(daily.dates.length>30)daily.dates=daily.dates.slice(-30);
        }
        saveD();
        updateBadgeVis();
        alert(`🎉 Daily done!\n🔥 Streak: ${daily.str}\nBack tomorrow!`);
    }
}

function renderD(){
    const c=document.getElementById('dailyChallengeContent');
    if(!c||!daily.cfg)return;
    const cfg=daily.cfg;
    const rn={classic:'Classic',adjacent:'Adjacent',cyclic:'Cyclic'};
    const days=[];
    for(let i=6;i>=0;i--){
        const d=new Date();d.setDate(d.getDate()-i);
        const ds=getDay(d);
        days.push({ds,done:daily.dates.includes(ds),today:i===0,num:d.getDate()});
    }
    c.innerHTML=`<p style="font-size:14px;color:var(--muted);margin:0 0 8px 0;">Daily ready! Complete for streak 🔥</p>
    <div class="daily-config"><div style="font-size:18px;font-weight:900;color:#ff6b35;margin-bottom:8px;">📋 Today</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;text-align:left;">
    <div><strong>Disks:</strong> ${cfg.disks}</div><div><strong>Poles:</strong> ${cfg.poles}</div>
    <div><strong>Rule:</strong> ${rn[cfg.rule]}</div><div><strong>Status:</strong> ${daily.done?'✅Done':'⏳Wait'}</div></div></div>
    <div style="margin:16px 0;"><div style="font-size:14px;font-weight:800;color:var(--accent);margin-bottom:8px;">🔥 Streak: ${daily.str}</div>
    <div class="daily-streak">${days.map(d=>`<div class="streak-day ${d.done?'completed':''} ${d.today?'today':''}">${d.num}</div>`).join('')}</div></div>
    <div class="popup-actions"><button id="dailyStartBtn" class="btn" style="background:linear-gradient(135deg,#ff6b35,#f7931e);" ${daily.done?'disabled':''}>
    ${daily.done?'✅ Done':'🚀 Start'}</button><button id="dailyCloseBtn" class="ghost">Close</button></div>`;
    
    const sb=document.getElementById('dailyStartBtn'),cb=document.getElementById('dailyCloseBtn');
    if(sb&&!daily.done)sb.addEventListener('click',startD);
    if(cb)cb.addEventListener('click',()=>document.getElementById('dailyChallengePanel').style.display='none');
}

function startD(){
    const c=daily.cfg;
    if(window.startSandboxWithConfig)window.startSandboxWithConfig(c.poles,c.disks,c.rule,'classic','any_other',true);
    document.getElementById('dailyChallengePanel').style.display='none';
}

function updCD(){
    const el=document.getElementById('dailyCountdown');
    if(!el)return;
    const now=new Date(),tm=new Date(now);
    tm.setDate(tm.getDate()+1);tm.setHours(0,0,0,0);
    const diff=tm-now;
    const h=Math.floor(diff/(1000*60*60)),m=Math.floor((diff%(1000*60*60))/(1000*60)),s=Math.floor((diff%(1000*60))/1000);
    el.textContent=`${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

function updateBadgeVis(){
    const badge=document.getElementById('dailyChallengeBadge');
    if(badge)badge.style.display=daily.done?'none':'block';
}

// Mission System
function getWeek(){const d=new Date();const w=Math.ceil((d.getDate()+6-d.getDay())/7);return `${d.getFullYear()}-${d.getMonth()+1}-W${w}`;}
function getMonth(){const d=new Date();return `${d.getFullYear()}-${d.getMonth()+1}`;}

const weekTasks=[
    {id:'w1',txt:'Win 5 games',icon:'🎮',goal:5,type:'wins'},
    {id:'w2',txt:'3 optimal wins',icon:'🎯',goal:3,type:'optimal'},
    {id:'w3',txt:'Play all modes',icon:'🌟',goal:5,type:'modes'}
];

const monthTasks=[
    {id:'m1',txt:'Win 20 games',icon:'🏆',goal:20,type:'wins'},
    {id:'m2',txt:'10 optimal wins',icon:'💎',goal:10,type:'optimal'},
    {id:'m3',txt:'Daily streak 7',icon:'🔥',goal:7,type:'streak'},
    {id:'m4',txt:'Complete 8+ disks',icon:'🎪',goal:1,type:'hard'},
    {id:'m5',txt:'Sandbox master',icon:'🚀',goal:5,type:'sandbox'},
    {id:'m6',txt:'Speed run <2min',icon:'⚡',goal:1,type:'speed'},
    {id:'m7',txt:'No undo perfection',icon:'✨',goal:3,type:'noundo'},
    {id:'m8',txt:'Teach mode 5 times',icon:'🎓',goal:5,type:'teach'},
    {id:'m9',txt:'Total 50 games',icon:'📊',goal:50,type:'total'},
    {id:'m10',txt:'Best efficiency 95%+',icon:'💯',goal:1,type:'efficiency'}
];

function loadMiss(){
    try{
        let s=localStorage.getItem('hanoi_missions');
        if(s){const m=JSON.parse(s);Object.assign(weekly,m.weekly||{});Object.assign(monthly,m.monthly||{});}
    }catch(e){}
    const cw=getWeek(),cm=getMonth();
    if(weekly.week!==cw){weekly.week=cw;weekly.tasks=weekTasks.map(t=>({...t,prog:0}));weekly.done=[];saveMiss();}
    if(monthly.month!==cm){monthly.month=cm;monthly.tasks=monthTasks.map(t=>({...t,prog:0}));monthly.done=[];saveMiss();}
}

function saveMiss(){try{localStorage.setItem('hanoi_missions',JSON.stringify({weekly,monthly}));}catch(e){console.warn('Save missions fail');}}

function checkMissions(mode,moves,time,opt,isOpt){
    weekly.tasks.forEach(t=>{
        if(weekly.done.includes(t.id))return;
        if(t.type==='wins')t.prog++;
        if(t.type==='optimal'&&isOpt)t.prog++;
        if(t.type==='modes'){const uniq=new Set(Object.keys(stats.modes).filter(k=>stats.modes[k]>0));t.prog=uniq.size;}
        if(t.prog>=t.goal&&!weekly.done.includes(t.id))weekly.done.push(t.id);
    });
    
    monthly.tasks.forEach(t=>{
        if(monthly.done.includes(t.id))return;
        if(t.type==='wins')t.prog++;
        if(t.type==='optimal'&&isOpt)t.prog++;
        if(t.type==='streak')t.prog=daily.str;
        if(t.type==='hard'&&parseInt(window.n||0)>=8)t.prog++;
        if(t.type==='sandbox'&&mode==='sandbox')t.prog++;
        if(t.type==='speed'&&time<120&&isOpt)t.prog++;
        if(t.type==='noundo'&&isOpt&&(window.undoCount||0)===0)t.prog++;
        if(t.type==='teach'&&mode==='teach')t.prog++;
        if(t.type==='total')t.prog=stats.gTotal;
        if(t.type==='efficiency'&&stats.bestEf>=95)t.prog=1;
        if(t.prog>=t.goal&&!monthly.done.includes(t.id))monthly.done.push(t.id);
    });
    
    saveMiss();
}

function renderMiss(){
    const c=document.getElementById('missionContent');
    if(!c)return;
    
    const d=new Date();
    const dateStr=`${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
    
    c.innerHTML=`<div class="mission-date">📅 ${dateStr}</div>
    <div class="mission-tabs">
        <button class="mission-tab active" data-tab="daily">Daily</button>
        <button class="mission-tab" data-tab="weekly">Weekly</button>
        <button class="mission-tab" data-tab="monthly">Monthly</button>
    </div>
    <div class="mission-panels">
        <div class="mission-panel active" data-panel="daily">
            <div class="mission-item ${daily.done?'done':''}">
                <div class="mission-icon">${daily.done?'✅':'🎯'}</div>
                <div class="mission-info">
                    <div class="mission-title">Daily Challenge</div>
                    <div class="mission-desc">${daily.cfg?`${daily.cfg.disks} disks, ${daily.cfg.poles} poles`:'Loading...'}</div>
                </div>
                <div class="mission-status">${daily.done?'Done':'Pending'}</div>
            </div>
            <div class="mission-streak">🔥 Streak: ${daily.str} days</div>
        </div>
        <div class="mission-panel" data-panel="weekly">
            ${weekly.tasks.map(t=>{
                const done=weekly.done.includes(t.id);
                const pct=Math.min(100,Math.floor((t.prog/t.goal)*100));
                return `<div class="mission-item ${done?'done':''}">
                    <div class="mission-icon">${done?'✅':t.icon}</div>
                    <div class="mission-info">
                        <div class="mission-title">${t.txt}</div>
                        <div class="mission-progress"><div class="mission-progress-bar" style="width:${pct}%"></div></div>
                        <div class="mission-desc">${t.prog}/${t.goal}</div>
                    </div>
                    <div class="mission-status">${done?'✅':'...'}</div>
                </div>`;
            }).join('')}
        </div>
        <div class="mission-panel" data-panel="monthly">
            ${monthly.tasks.map(t=>{
                const done=monthly.done.includes(t.id);
                const pct=Math.min(100,Math.floor((t.prog/t.goal)*100));
                return `<div class="mission-item ${done?'done':''}">
                    <div class="mission-icon">${done?'✅':t.icon}</div>
                    <div class="mission-info">
                        <div class="mission-title">${t.txt}</div>
                        <div class="mission-progress"><div class="mission-progress-bar" style="width:${pct}%"></div></div>
                        <div class="mission-desc">${t.prog}/${t.goal}</div>
                    </div>
                    <div class="mission-status">${done?'✅':'...'}</div>
                </div>`;
            }).join('')}
        </div>
    </div>`;
    
    // Tab switching
    c.querySelectorAll('.mission-tab').forEach(tab=>{
        tab.addEventListener('click',()=>{
            const target=tab.dataset.tab;
            c.querySelectorAll('.mission-tab').forEach(t=>t.classList.remove('active'));
            c.querySelectorAll('.mission-panel').forEach(p=>p.classList.remove('active'));
            tab.classList.add('active');
            c.querySelector(`[data-panel="${target}"]`).classList.add('active');
        });
    });
}

// Draggable Panels
function drag(panel,handle,ignore){
    let sx=0,sy=0,px=0,py=0,dragging=false;
    const getXY=(ev)=>{
        if(ev.touches&&ev.touches[0])return {x:ev.touches[0].clientX,y:ev.touches[0].clientY};
        return {x:ev.clientX,y:ev.clientY};
    };
    const normPos=()=>{
        const cs=getComputedStyle(panel);
        // convert right/bottom anchored to left/top
        if(cs.right!=='auto'&&(!panel.style.left||panel.style.left==='')){
            const r=panel.getBoundingClientRect();
            panel.style.left=r.left+'px';
            panel.style.right='auto';
        }
        if(cs.bottom!=='auto'&&(!panel.style.top||panel.style.top==='')){
            const r=panel.getBoundingClientRect();
            panel.style.top=r.top+'px';
            panel.style.bottom='auto';
        }
        if(cs.position!=='fixed'&&cs.position!=='absolute') panel.style.position='fixed';
    };
    const start=(e)=>{
        const tgt=e.target;
        const ignoreElems=['button','input','select','textarea','a','.btn','.ghost'];
        const shouldIgnore=ignore.some(s=>tgt.closest(s))||ignoreElems.some(s=>tgt.matches(s)||tgt.closest(s));
        if(shouldIgnore)return;
        e.preventDefault();
        normPos();
        const {x,y}=getXY(e);
        sx=x;sy=y;
        px=parseFloat(panel.style.left)||panel.getBoundingClientRect().left;
        py=parseFloat(panel.style.top)||panel.getBoundingClientRect().top;
        dragging=true;
        document.addEventListener('mousemove',move);
        document.addEventListener('mouseup',stop);
        document.addEventListener('touchmove',move,{passive:false});
        document.addEventListener('touchend',stop,{passive:false});
        panel.style.cursor='move';
        panel.style.zIndex=String(999999);
    };
    const move=(e)=>{
        if(!dragging) return; e.preventDefault();
        const {x,y}=getXY(e);
        const nx=px+(x-sx), ny=py+(y-sy);
        panel.style.left=Math.round(nx)+'px';
        panel.style.top=Math.round(ny)+'px';
    };
    const stop=()=>{
        dragging=false;
        document.removeEventListener('mousemove',move);
        document.removeEventListener('mouseup',stop);
        document.removeEventListener('touchmove',move);
        document.removeEventListener('touchend',stop);
        panel.style.cursor='';
    };
    panel.addEventListener('mousedown',start);
    panel.addEventListener('touchstart',start,{passive:false});
}

// Init
function init(){
    loadPrg();loadS();loadD();loadMiss();
    updateBadgeVis();
    
    // Stats
    const sBtn=document.getElementById('statsBtn'),sPnl=document.getElementById('statsPanel'),sCls=document.getElementById('statsClose');
    if(sBtn)sBtn.addEventListener('click',()=>{render();if(sPnl){sPnl.style.display='block';drag(sPnl,sPnl,[]);}});
    if(sCls)sCls.addEventListener('click',()=>{if(sPnl)sPnl.style.display='none';});
    
    // Daily
    const dBdg=document.getElementById('dailyChallengeBadge'),dPnl=document.getElementById('dailyChallengePanel');
    if(dBdg){
        const cs=getComputedStyle(dBdg);
        if(cs.right!=='auto'&&(!dBdg.style.left||dBdg.style.left==='')){ const r=dBdg.getBoundingClientRect(); dBdg.style.left=r.left+'px'; dBdg.style.top=r.top+'px'; dBdg.style.right='auto'; }
        dBdg.addEventListener('click',()=>{renderD();if(dPnl){dPnl.style.display='block';drag(dPnl,dPnl,[]);}});
        // Clear old interval to prevent leak
        if(dailyCountdownInterval)clearInterval(dailyCountdownInterval);
        dailyCountdownInterval=setInterval(updCD,1000);
        updCD();
        drag(dBdg,dBdg,[]);
    }
    
    // Mission
    const mBtn=document.getElementById('missionBtn'),mPnl=document.getElementById('missionPanel'),mCls=document.getElementById('missionClose');
    if(mBtn)mBtn.addEventListener('click',()=>{renderMiss();if(mPnl){mPnl.style.display='block';drag(mPnl,mPnl,[]);}});
    if(mCls)mCls.addEventListener('click',()=>{if(mPnl)mPnl.style.display='none';});
    
    console.log('✅ Enhanced v1.3 loaded');
}

// API
window.GameEnhancements={
    trackGameCompletion:track,
    updateAchievementProgress:updAch,
    completeDailyChallenge:compD,
    loadStats:loadS,
    loadDailyChallenge:loadD
};

// Start
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();

})();
