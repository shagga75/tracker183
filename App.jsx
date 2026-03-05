import { useState, useEffect, useMemo } from "react";

// Telegram init
const tg = window.Telegram?.WebApp;
if (tg) { tg.expand(); tg.ready(); }

// ─── DATA ─────────────────────────────────────────────────────────────────────
const COUNTRIES = [
  { code:"ae", flag:"🇦🇪", name:"Dubai / UAE",      limit:0,   note:"Sin límite · 0% impuesto personal" },
  { code:"py", flag:"🇵🇾", name:"Paraguay",          limit:183, note:"Territorial · 0% fuente extranjera" },
  { code:"ge", flag:"🇬🇪", name:"Georgia",           limit:183, note:"Visa 365d automática · Territorial" },
  { code:"sv", flag:"🇸🇻", name:"El Salvador",       limit:183, note:"BTC legal tender · 0% CGT" },
  { code:"pa", flag:"🇵🇦", name:"Panamá",            limit:183, note:"Sistema territorial · USD" },
  { code:"mt", flag:"🇲🇹", name:"Malta",             limit:183, note:"Non-dom · mínimo 90d/año" },
  { code:"pt", flag:"🇵🇹", name:"Portugal",          limit:183, note:"D8 nómada · IFICI 20% flat" },
  { code:"cr", flag:"🇨🇷", name:"Costa Rica",        limit:183, note:"Sistema territorial · Rentista" },
  { code:"uy", flag:"🇺🇾", name:"Uruguay",           limit:60,  note:"⚠️ Solo 60d para residencia fiscal" },
  { code:"th", flag:"🇹🇭", name:"Tailandia",         limit:180, note:"180d nueva ley 2024 · LTR Visa" },
  { code:"id", flag:"🇮🇩", name:"Indonesia / Bali",  limit:183, note:"E-Visa nómada disponible" },
  { code:"hr", flag:"🇭🇷", name:"Croacia",           limit:183, note:"Visa nómada digital · UE" },
  { code:"gr", flag:"🇬🇷", name:"Grecia",            limit:183, note:"Flat tax 7% · visa nómada" },
  { code:"tr", flag:"🇹🇷", name:"Turquía",           limit:183, note:"Territorial parcial · fácil visa" },
  { code:"vn", flag:"🇻🇳", name:"Vietnam",           limit:183, note:"E-visa 90d renovable" },
  { code:"ee", flag:"🇪🇪", name:"Estonia",           limit:183, note:"e-Residency · UE · flat 20%" },
  { code:"es", flag:"🇪🇸", name:"España",            limit:183, note:"⚠️ Sistema mundial · Riesgo alto" },
  { code:"de", flag:"🇩🇪", name:"Alemania",          limit:183, note:"⚠️ Sistema mundial" },
  { code:"fr", flag:"🇫🇷", name:"Francia",           limit:183, note:"⚠️ Sistema mundial" },
  { code:"it", flag:"🇮🇹", name:"Italia",            limit:183, note:"⚠️ Sistema mundial" },
  { code:"us", flag:"🇺🇸", name:"EE.UU.",            limit:183, note:"⚠️ Ciudadanos tributan mundialmente" },
  { code:"uk", flag:"🇬🇧", name:"Reino Unido",       limit:183, note:"⚠️ Sistema mundial" },
  { code:"mx", flag:"🇲🇽", name:"México",            limit:183, note:"Sistema mundial" },
  { code:"ar", flag:"🇦🇷", name:"Argentina",         limit:183, note:"⚠️ Sistema mundial + confiscación" },
  { code:"br", flag:"🇧🇷", name:"Brasil",            limit:183, note:"Sistema mundial" },
  { code:"co", flag:"🇨🇴", name:"Colombia",          limit:183, note:"183d activa residencia fiscal" },
  { code:"pl", flag:"🇵🇱", name:"Polonia",           limit:183, note:"Sistema mundial · UE" },
  { code:"nl", flag:"🇳🇱", name:"Países Bajos",      limit:183, note:"Sistema mundial · 30% ruling" },
  { code:"jp", flag:"🇯🇵", name:"Japón",             limit:183, note:"Sistema mundial · 90d turista" },
  { code:"other", flag:"🌍", name:"Otro país",        limit:183, note:"Configura manualmente" },
];

const YEAR = new Date().getFullYear();
const Y0 = `${YEAR}-01-01`, Y1 = `${YEAR}-12-31`;
const MN = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];

// ─── UTILS ────────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().split("T")[0];
const addD  = (d,n) => { const x=new Date(d+"T12:00:00"); x.setDate(x.getDate()+n); return x.toISOString().split("T")[0]; };
const diff  = (a,b) => Math.max(0,Math.round((new Date(b+"T12:00:00")-new Date(a+"T12:00:00"))/86400000)+1);
const fmt   = d => new Date(d+"T12:00:00").toLocaleDateString("es-ES",{day:"2-digit",month:"short"});

function daysInYear(stays) {
  const s=new Set();
  stays.forEach(st=>{
    const a=st.from<Y0?Y0:st.from, b=st.to>Y1?Y1:st.to;
    if(a>b) return;
    let c=a; while(c<=b){s.add(c);c=addD(c,1);}
  });
  return s.size;
}

function activeSet(stays) {
  const s=new Set();
  stays.forEach(st=>{
    const a=st.from<Y0?Y0:st.from, b=st.to>Y1?Y1:st.to;
    if(a>b) return;
    let c=a; while(c<=b){s.add(c);c=addD(c,1);}
  });
  return s;
}

function status(days,limit) {
  if(!limit) return {lv:"free",    c:"#22c95e",bg:"rgba(34,201,94,.09)",  t:"SIN LÍMITE",p:0};
  const p=Math.min(days/limit*100,100);
  if(days>=limit)     return {lv:"exceed",c:"#e04e4e",bg:"rgba(224,78,78,.12)", t:"EXCEDIDO", p};
  if(days>=limit-15)  return {lv:"crit",  c:"#e04e4e",bg:"rgba(224,78,78,.09)", t:"CRÍTICO",  p};
  if(days>=limit-35)  return {lv:"warn",  c:"#e8973a",bg:"rgba(232,151,58,.09)",t:"ATENCIÓN", p};
  if(days>0)          return {lv:"ok",    c:"#22c95e",bg:"rgba(34,201,94,.07)", t:"OK",        p};
  return                     {lv:"none",  c:"#1e3040",bg:"transparent",          t:"SIN DÍAS", p};
}

const load = () => { try { return JSON.parse(localStorage.getItem("t183")||"{}"); } catch{return {};} };
const save = d  => { try { localStorage.setItem("t183",JSON.stringify(d)); } catch{} };

// ─── STYLES ───────────────────────────────────────────────────────────────────
const G = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body,#root{height:100%;overflow:hidden}
body{background:#030509;color:#b0c8d8;font-family:'DM Sans',sans-serif;font-weight:300;-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:#060c12}::-webkit-scrollbar-thumb{background:#1a2e40}
input[type=date]::-webkit-calendar-picker-indicator{filter:invert(.5) sepia(1) saturate(3) hue-rotate(90deg);cursor:pointer}
@keyframes blink{0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(34,201,94,.5)}60%{opacity:.6;box-shadow:0 0 0 6px transparent}}
@keyframes up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes slide{from{transform:translateY(100%)}to{transform:translateY(0)}}
@keyframes sin{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:translateX(0)}}
`;

// ─── HEATMAP ──────────────────────────────────────────────────────────────────
function HeatMap({stays, st}) {
  const active = useMemo(()=>activeSet(stays),[stays]);
  const months = useMemo(()=>MN.map((name,m)=>{
    const dim=new Date(YEAR,m+1,0).getDate();
    const days=Array.from({length:dim},(_,i)=>{
      const ds=`${YEAR}-${String(m+1).padStart(2,"0")}-${String(i+1).padStart(2,"0")}`;
      return {ds,on:active.has(ds)};
    });
    const wks=[]; for(let w=0;w<5;w++) wks.push(days.slice(w*7,w*7+7));
    return {name,wks};
  }),[active]);

  const cc = on => {
    if(!on) return "#0e1a26";
    return st.lv==="exceed"||st.lv==="crit" ? "#e04e4e" : st.lv==="warn" ? "#e8973a" : "#22c95e";
  };

  return (
    <div style={{overflowX:"auto",paddingBottom:2}}>
      <div style={{display:"flex",gap:3,minWidth:"max-content"}}>
        {months.map((mo,mi)=>(
          <div key={mi}>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:6.5,color:"#1a2e3a",textAlign:"center",marginBottom:3,letterSpacing:".1em"}}>{mo.name}</div>
            <div style={{display:"flex",flexDirection:"column",gap:2}}>
              {mo.wks.map((wk,wi)=>(
                <div key={wi} style={{display:"flex",gap:2}}>
                  {wk.map((day,di)=>(
                    <div key={di} title={day.on?fmt(day.ds):""}
                      style={{width:6,height:6,background:cc(day.on),flexShrink:0}}/>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── COUNTRY CARD ─────────────────────────────────────────────────────────────
function CCard({c, onClick}) {
  const d=daysInYear(c.stays), st=status(d,c.limit);
  return (
    <div onClick={onClick} style={{background:"#080e18",border:`1px solid ${st.lv==="crit"||st.lv==="exceed"?"rgba(224,78,78,.35)":st.lv==="warn"?"rgba(232,151,58,.28)":"rgba(34,201,94,.1)"}`,marginBottom:8,cursor:"pointer",position:"relative",overflow:"hidden",animation:"up .3s ease"}}>
      <div style={{position:"absolute",left:0,top:0,bottom:0,width:2,background:st.c}}/>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"11px 12px 9px 14px"}}>
        <span style={{fontSize:20,flexShrink:0}}>{c.flag}</span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:12.5,fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",marginBottom:2}}>{c.name}</div>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:8,letterSpacing:".12em",color:st.c}}>{st.t}</div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:24,color:st.c,lineHeight:1}}>{d}</div>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:7,color:"#1e3040"}}>{c.limit>0?`/ ${c.limit}d`:"días"}</div>
        </div>
      </div>
      {c.limit>0&&<div style={{height:2,background:"#0a1520",margin:"0 14px 9px"}}><div style={{height:"100%",width:st.p+"%",background:st.c,transition:"width .8s ease"}}/></div>}
    </div>
  );
}

// ─── DETAIL ───────────────────────────────────────────────────────────────────
function Detail({c, onBack, onUpdate}) {
  const [form,setForm]=useState(false);
  const [ns,setNs]=useState({from:today(),to:today(),note:""});
  const d=daysInYear(c.stays), st=status(d,c.limit);
  const rem=c.limit>0?Math.max(0,c.limit-d):null;
  const rc=rem!=null&&rem<=15?"#e04e4e":rem!=null&&rem<=35?"#e8973a":"#b0c8d8";
  const ys=c.stays.filter(s=>s.to.startsWith(String(YEAR))||s.from.startsWith(String(YEAR)));

  const saveStay=()=>{
    if(ns.from>ns.to) return;
    const stay={id:`s-${Date.now()}`,...ns};
    onUpdate({...c,stays:[...c.stays,stay].sort((a,b)=>a.from.localeCompare(b.from))});
    setForm(false); setNs({from:today(),to:today(),note:""});
  };
  const delStay=id=>onUpdate({...c,stays:c.stays.filter(s=>s.id!==id)});
  const delCountry=()=>{ if(confirm(`¿Eliminar ${c.name}?`)) onUpdate(null); };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",animation:"up .3s ease"}}>
      <div onClick={onBack} style={{display:"flex",alignItems:"center",gap:8,padding:"11px 14px",fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:".22em",color:"#22c95e",textTransform:"uppercase",cursor:"pointer",borderBottom:"1px solid rgba(34,201,94,.1)",background:"rgba(3,5,9,.97)",flexShrink:0}}>
        ← Volver
      </div>
      <div style={{flex:1,overflowY:"auto",padding:14}}>
        <div style={{background:"#080e18",border:"1px solid rgba(34,201,94,.2)",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${st.c},transparent)`}}/>

          {/* Header */}
          <div style={{padding:"18px 14px 14px",borderBottom:"1px solid rgba(34,201,94,.07)"}}>
            <div style={{fontSize:28,marginBottom:6}}>{c.flag}</div>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,letterSpacing:".08em",lineHeight:1,marginBottom:4}}>{c.name}</div>
            <div style={{fontSize:10.5,color:"#253040",lineHeight:1.5,marginBottom:12}}>{c.note}</div>
            <div style={{display:"grid",gridTemplateColumns:rem!=null?"1fr 1fr 1fr":"1fr 1fr",gap:8}}>
              {[[d,`Días ${YEAR}`,st.c],...(rem!=null?[[rem,"Restantes",rc]]:[]),[c.stays.length,"Estancias","#253040"]].map(([v,l,col],i)=>(
                <div key={i} style={{background:"#0a1520",padding:"10px 8px",textAlign:"center"}}>
                  <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:26,color:col,lineHeight:1,marginBottom:2}}>{v}</div>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:7,color:"#1e3040",letterSpacing:".15em",textTransform:"uppercase"}}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Gauge */}
          {c.limit>0&&(
            <div style={{padding:"14px",borderBottom:"1px solid rgba(34,201,94,.07)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
                <span style={{fontFamily:"'DM Mono',monospace",fontSize:8,letterSpacing:".28em",color:"#253040",textTransform:"uppercase"}}>Presencia fiscal</span>
                <span style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,color:st.c}}>{st.p.toFixed(0)}% · {st.t}</span>
              </div>
              <div style={{height:7,background:"#0a1520",overflow:"hidden"}}>
                <div style={{height:"100%",width:st.p+"%",background:`linear-gradient(90deg,#166636,${st.c})`,transition:"width 1s cubic-bezier(.34,1.56,.64,1)",position:"relative"}}>
                  <div style={{position:"absolute",right:0,top:0,bottom:0,width:2,background:"rgba(255,255,255,.3)"}}/>
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
                {["0","30","60","91","120","148",String(c.limit)].map((v,i)=>(
                  <span key={i} style={{fontFamily:"'DM Mono',monospace",fontSize:7,color:parseInt(v)>=148?"#e04e4e":"#1a2e3a"}}>{v}</span>
                ))}
              </div>
            </div>
          )}

          {/* Heatmap */}
          <div style={{padding:"12px 14px",borderBottom:"1px solid rgba(34,201,94,.07)"}}>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:8,letterSpacing:".28em",color:"#253040",textTransform:"uppercase",marginBottom:8}}>{`// Mapa ${YEAR}`}</div>
            <HeatMap stays={c.stays} st={st}/>
          </div>

          {/* Stays */}
          <div style={{padding:"14px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <span style={{fontFamily:"'DM Mono',monospace",fontSize:8,letterSpacing:".3em",color:"#253040",textTransform:"uppercase"}}>{`// Estancias ${YEAR}`}</span>
              <div style={{display:"flex",gap:7}}>
                <button onClick={()=>{setForm(v=>!v);setNs({from:today(),to:today(),note:""}); }}
                  style={{fontFamily:"'DM Mono',monospace",fontSize:8,letterSpacing:".22em",textTransform:"uppercase",padding:"7px 12px",border:"1px solid rgba(34,201,94,.35)",background:"none",color:"#22c95e",cursor:"pointer"}}>
                  {form?"Cancelar":"+ Nueva"}
                </button>
                <button onClick={delCountry}
                  style={{fontFamily:"'DM Mono',monospace",fontSize:8,padding:"7px 10px",border:"1px solid rgba(224,78,78,.3)",background:"none",color:"#e04e4e",cursor:"pointer"}}>
                  🗑
                </button>
              </div>
            </div>

            {form&&(
              <div style={{background:"#0a1520",border:"1px solid rgba(34,201,94,.2)",padding:14,marginBottom:12,animation:"up .3s ease"}}>
                {[["Fecha entrada","date","from",null,ns.to],["Fecha salida","date","to",ns.from,null],["Nota (opcional)","text","note",null,null]].map(([lbl,type,key,min,max])=>(
                  <div key={key} style={{marginBottom:10}}>
                    <label style={{display:"block",fontFamily:"'DM Mono',monospace",fontSize:7.5,letterSpacing:".25em",color:"rgba(34,201,94,.6)",textTransform:"uppercase",marginBottom:4}}>{lbl}</label>
                    <input type={type} value={ns[key]} min={min||undefined} max={max||undefined}
                      placeholder={type==="text"?"Turismo, trabajo...":undefined}
                      onChange={e=>setNs(s=>({...s,[key]:e.target.value}))}
                      style={{width:"100%",background:"#060c14",border:"1px solid rgba(34,201,94,.2)",color:"#b0c8d8",padding:"9px 11px",fontFamily:"'DM Mono',monospace",fontSize:11,outline:"none"}}/>
                  </div>
                ))}
                {ns.from<=ns.to&&<div style={{fontFamily:"'DM Mono',monospace",fontSize:9.5,color:"#22c95e",marginBottom:10,letterSpacing:".1em"}}>→ {diff(ns.from,ns.to)} días · {fmt(ns.from)} – {fmt(ns.to)}</div>}
                <div style={{display:"flex",gap:8}}>
                  <button onClick={saveStay} style={{flex:1,fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:".22em",textTransform:"uppercase",padding:10,background:"#22c95e",border:"none",color:"#030509",cursor:"pointer",fontWeight:600}}>Guardar</button>
                  <button onClick={()=>setForm(false)} style={{fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:".22em",textTransform:"uppercase",padding:"10px 14px",background:"none",border:"1px solid rgba(34,201,94,.2)",color:"#253040",cursor:"pointer"}}>Cancelar</button>
                </div>
              </div>
            )}

            {ys.length===0
              ? <div style={{padding:"16px 0",textAlign:"center",fontFamily:"'DM Mono',monospace",fontSize:9,color:"#1a2e3a",letterSpacing:".15em"}}>SIN ESTANCIAS EN {YEAR}</div>
              : ys.map(s=>(
                <div key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid rgba(34,201,94,.06)"}}>
                  <div style={{textAlign:"center",flexShrink:0,width:38}}>
                    <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,color:"#22c95e",lineHeight:1}}>{diff(s.from,s.to)}</div>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:7,color:"#253040"}}>días</div>
                  </div>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:10.5,flex:1,minWidth:0}}>
                    {fmt(s.from)}<span style={{color:"#253040",margin:"0 5px"}}>→</span>{fmt(s.to)}
                  </div>
                  {s.note&&<div style={{fontSize:10,color:"#253040",fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:90}}>{s.note}</div>}
                  <button onClick={()=>delStay(s.id)} style={{background:"none",border:"none",color:"#1e3040",cursor:"pointer",fontSize:13,padding:"4px 6px",fontFamily:"'DM Mono',monospace"}}>✕</button>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
function Modal({existing,onAdd,onClose}) {
  const [q,setQ]=useState("");
  const used=new Set(existing.map(c=>c.code));
  const filtered=COUNTRIES.filter(c=>!used.has(c.code)&&c.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()}
      style={{position:"fixed",inset:0,zIndex:200,background:"rgba(3,5,9,.92)",backdropFilter:"blur(12px)",display:"flex",alignItems:"flex-end"}}>
      <div style={{background:"#060c14",border:"1px solid rgba(34,201,94,.22)",borderBottom:"none",width:"100%",maxHeight:"82vh",display:"flex",flexDirection:"column",animation:"slide .35s cubic-bezier(.34,1.56,.64,1)"}}>
        <div style={{width:36,height:4,background:"#1e3040",borderRadius:2,margin:"10px auto 0"}}/>
        <div style={{padding:"14px 16px",borderBottom:"1px solid rgba(34,201,94,.09)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <span style={{fontFamily:"'Bebas Neue',cursive",fontSize:17,letterSpacing:".1em"}}>AGREGAR PAÍS</span>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#253040",fontSize:18,cursor:"pointer",padding:"0 4px",fontFamily:"'DM Mono',monospace"}}>×</button>
        </div>
        <div style={{padding:"10px 14px",borderBottom:"1px solid rgba(34,201,94,.07)",flexShrink:0}}>
          <input autoFocus type="text" placeholder="Buscar país..." value={q} onChange={e=>setQ(e.target.value)}
            style={{width:"100%",background:"#080f18",border:"1px solid rgba(34,201,94,.2)",color:"#b0c8d8",padding:"9px 12px",fontFamily:"'DM Mono',monospace",fontSize:11,outline:"none"}}
            onFocus={e=>e.target.style.borderColor="rgba(34,201,94,.4)"} onBlur={e=>e.target.style.borderColor="rgba(34,201,94,.2)"}/>
        </div>
        <div style={{overflowY:"auto",flex:1}}>
          {filtered.length===0
            ? <div style={{padding:22,textAlign:"center",fontFamily:"'DM Mono',monospace",fontSize:9,color:"#1e3040",letterSpacing:".2em"}}>SIN RESULTADOS</div>
            : filtered.map(c=>(
              <div key={c.code} onClick={()=>onAdd(c)}
                style={{display:"flex",alignItems:"center",gap:10,padding:"11px 16px",borderBottom:"1px solid rgba(34,201,94,.06)",cursor:"pointer"}}
                onMouseEnter={e=>e.currentTarget.style.background="#0d1a26"}
                onMouseLeave={e=>e.currentTarget.style.background=""}>
                <span style={{fontSize:19,flexShrink:0}}>{c.flag}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:12.5,marginBottom:2}}>{c.name}</div>
                  <div style={{fontSize:9.5,color:"#253040"}}>{c.limit>0?`Límite: ${c.limit}d · `:""}{c.note}</div>
                </div>
                <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#22c95e",flexShrink:0}}>+</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [countries,setCountries] = useState(()=>load().countries||[]);
  const [detailId,setDetailId]   = useState(null);
  const [tab,setTab]             = useState("dashboard");
  const [modal,setModal]         = useState(false);

  useEffect(()=>save({countries}),[countries]);

  const totalD  = useMemo(()=>countries.reduce((s,c)=>s+daysInYear(c.stays),0),[countries]);
  const alerts  = useMemo(()=>countries.filter(c=>{const d=daysInYear(c.stays);return c.limit>0&&d>=c.limit-35;}),[countries]);
  const detail  = countries.find(c=>c.id===detailId)||null;

  const addCountry = t => {
    const e={...t,id:`${t.code}-${Date.now()}`,stays:[]};
    setCountries(p=>[...p,e]);
    setModal(false);
    setDetailId(e.id);
  };

  const updateCountry = u => {
    if(!u){ setCountries(p=>p.filter(c=>c.id!==detailId)); setDetailId(null); return; }
    setCountries(p=>p.map(c=>c.id===u.id?u:c));
  };

  // ── shared pieces ──
  const NavBar = () => (
    <div style={{height:44,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px",background:"rgba(3,5,9,.97)",borderBottom:"1px solid rgba(34,201,94,.12)",flexShrink:0}}>
      <span style={{fontFamily:"'Bebas Neue',cursive",fontSize:15,letterSpacing:".2em",color:"#22c95e"}}>183<span style={{color:"#1e3040"}}> // </span>TRACKER</span>
      <div style={{display:"flex",alignItems:"center",gap:5,fontFamily:"'DM Mono',monospace",fontSize:8.5,color:"#22c95e",letterSpacing:".2em"}}>
        <div style={{width:5,height:5,borderRadius:"50%",background:"#22c95e",animation:"blink 2.2s infinite"}}/>EN VIVO
      </div>
    </div>
  );

  const TabBar = () => (
    <div style={{display:"flex",background:"rgba(3,5,9,.95)",borderBottom:"1px solid rgba(34,201,94,.1)",flexShrink:0}}>
      {[["dashboard","Dashboard"],["countries","Países"],["summary","Resumen"]].map(([id,lbl])=>(
        <div key={id} onClick={()=>setTab(id)}
          style={{flex:1,padding:"10px 0",fontFamily:"'DM Mono',monospace",fontSize:8.5,letterSpacing:".2em",textTransform:"uppercase",textAlign:"center",cursor:"pointer",color:tab===id?"#22c95e":"#253040",borderBottom:tab===id?"2px solid #22c95e":"2px solid transparent",transition:"all .2s"}}>
          {lbl}
        </div>
      ))}
    </div>
  );

  const AddBtn = () => (
    <button onClick={()=>setModal(true)} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,width:"100%",padding:12,border:"1px dashed rgba(34,201,94,.2)",background:"none",fontFamily:"'DM Mono',monospace",fontSize:8.5,letterSpacing:".3em",textTransform:"uppercase",color:"#253040",cursor:"pointer",marginTop:4}}
      onMouseEnter={e=>{e.target.style.borderColor="rgba(34,201,94,.4)";e.target.style.color="#22c95e"}}
      onMouseLeave={e=>{e.target.style.borderColor="rgba(34,201,94,.2)";e.target.style.color="#253040"}}>
      + Agregar país
    </button>
  );

  const Empty = () => (
    <div style={{padding:"52px 20px",textAlign:"center"}}>
      <div style={{fontSize:42,opacity:.3,marginBottom:12}}>🌍</div>
      <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:".1em",color:"#253040",marginBottom:6}}>SIN PAÍSES REGISTRADOS</div>
      <div style={{fontSize:11.5,color:"#253040",lineHeight:1.65,maxWidth:240,margin:"0 auto 18px"}}>Agrega los países que visitas para rastrear tus días y evitar residencia fiscal involuntaria.</div>
      <button onClick={()=>setModal(true)} style={{fontFamily:"'DM Mono',monospace",fontSize:8.5,letterSpacing:".22em",textTransform:"uppercase",padding:"11px 24px",background:"#22c95e",border:"none",color:"#030509",cursor:"pointer",fontWeight:600}}>+ Agregar primer país</button>
    </div>
  );

  const SecLabel = ({text}) => (
    <div style={{fontFamily:"'DM Mono',monospace",fontSize:8,letterSpacing:".35em",color:"#1e3040",textTransform:"uppercase",marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
      {text}<div style={{flex:1,height:1,background:"rgba(34,201,94,.08)"}}/>
    </div>
  );

  // background layers
  const BG = () => (
    <>
      <div style={{position:"fixed",inset:0,backgroundImage:"linear-gradient(rgba(34,201,94,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(34,201,94,.025) 1px,transparent 1px)",backgroundSize:"44px 44px",pointerEvents:"none",zIndex:0}}/>
      <div style={{position:"fixed",top:0,left:0,right:0,height:200,background:"radial-gradient(ellipse 80% 120% at 50% 0%,rgba(34,201,94,.05) 0%,transparent 70%)",pointerEvents:"none",zIndex:0}}/>
    </>
  );

  // ── DETAIL VIEW ──
  if (detail) {
    return (
      <>
        <style>{G}</style>
        <div style={{background:"#030509",height:"100vh",display:"flex",flexDirection:"column",position:"relative"}}>
          <BG/>
          <div style={{position:"relative",zIndex:1,flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <NavBar/>
            <Detail c={detail} onBack={()=>setDetailId(null)} onUpdate={updateCountry}/>
          </div>
        </div>
      </>
    );
  }

  // ── MAIN VIEWS ──
  return (
    <>
      <style>{G}</style>
      <div style={{background:"#030509",height:"100vh",display:"flex",flexDirection:"column",position:"relative"}}>
        <BG/>
        <div style={{position:"relative",zIndex:1,flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <NavBar/>
          <TabBar/>
          <div style={{flex:1,overflowY:"auto"}}>

            {/* DASHBOARD */}
            {tab==="dashboard"&&(
              <div style={{padding:14,animation:"up .25s ease"}}>
                {/* Alerts */}
                {alerts.map(c=>{
                  const d=daysInYear(c.stays), st=status(d,c.limit), rem=c.limit-d;
                  return (
                    <div key={c.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 12px",borderLeft:`3px solid ${st.c}`,background:st.bg,color:st.lv==="warn"?"#d4a96a":"#f08080",fontSize:12,fontFamily:"'DM Mono',monospace",animation:"sin .3s ease",marginBottom:8}}>
                      <span style={{fontSize:14,flexShrink:0}}>{d>=c.limit?"⛔":st.lv==="crit"?"🔴":"⚠️"}</span>
                      <div><strong style={{fontFamily:"'DM Sans',sans-serif",fontWeight:600}}>{c.flag} {c.name}</strong>{" — "}{d>=c.limit?`Límite de ${c.limit}d superado.`:`Quedan ${rem} días para el límite de ${c.limit}d.`}</div>
                    </div>
                  );
                })}

                {/* Year totals */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
                  {[["#22c95e",totalD,"Días usados"],["#b0c8d8",Math.max(0,365-totalD),"Disponibles"],[alerts.length?"#e04e4e":"#253040",alerts.length,"Alertas"]].map(([col,v,l],i)=>(
                    <div key={i} style={{background:"#080e18",border:"1px solid rgba(34,201,94,.09)",padding:"12px 8px",textAlign:"center"}}>
                      <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:26,color:col,lineHeight:1,marginBottom:3}}>{v}</div>
                      <div style={{fontFamily:"'DM Mono',monospace",fontSize:7,letterSpacing:".15em",color:"#1e3040",textTransform:"uppercase"}}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{height:3,background:"#0a1520",overflow:"hidden",marginBottom:4}}>
                  <div style={{height:"100%",width:Math.min(totalD/365*100,100)+"%",background:"linear-gradient(90deg,#22c95e,#e8973a,#e04e4e)",transition:"width .9s ease"}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontFamily:"'DM Mono',monospace",fontSize:7,color:"#1e3040",marginBottom:16}}>
                  {["0","91","183","274","365"].map(v=><span key={v}>{v}</span>)}
                </div>

                <SecLabel text="// Países monitorizados"/>
                {countries.length===0?<Empty/>:countries.map(c=><CCard key={c.id} c={c} onClick={()=>setDetailId(c.id)}/>)}
                <AddBtn/>
              </div>
            )}

            {/* PAÍSES */}
            {tab==="countries"&&(
              <div style={{padding:14,animation:"up .25s ease"}}>
                {countries.length===0?<Empty/>:countries.map(c=><CCard key={c.id} c={c} onClick={()=>setDetailId(c.id)}/>)}
                <AddBtn/>
              </div>
            )}

            {/* RESUMEN */}
            {tab==="summary"&&(
              <div style={{padding:14,animation:"up .25s ease"}}>
                <SecLabel text={`// Resumen global ${YEAR}`}/>
                {countries.length===0?<Empty/>:(
                  <div style={{background:"#080e18",border:"1px solid rgba(34,201,94,.18)"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontFamily:"'DM Mono',monospace"}}>
                      <thead><tr>
                        {["País","Días","Límite","Resto","Estado"].map(h=>(
                          <th key={h} style={{fontSize:7.5,letterSpacing:".2em",color:"#1e3040",textTransform:"uppercase",textAlign:"left",padding:"8px 10px",borderBottom:"1px solid rgba(34,201,94,.07)",fontWeight:400}}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {[...countries].map(c=>({...c,d:daysInYear(c.stays)})).sort((a,b)=>b.d-a.d).map(c=>{
                          const st=status(c.d,c.limit), rem=c.limit>0?Math.max(0,c.limit-c.d):"∞";
                          const rc=typeof rem==="number"&&rem<=15?"#e04e4e":typeof rem==="number"&&rem<=35?"#e8973a":"#b0c8d8";
                          return (
                            <tr key={c.id} onClick={()=>setDetailId(c.id)} style={{cursor:"pointer"}}
                              onMouseEnter={e=>Array.from(e.currentTarget.cells).forEach(td=>td.style.background="#0a1520")}
                              onMouseLeave={e=>Array.from(e.currentTarget.cells).forEach(td=>td.style.background="")}>
                              <td style={{padding:"9px 10px",borderBottom:"1px solid rgba(34,201,94,.05)",fontSize:12}}>{c.flag} {c.name}</td>
                              <td style={{padding:"9px 10px",borderBottom:"1px solid rgba(34,201,94,.05)",fontFamily:"'Bebas Neue',cursive",fontSize:17,color:st.c}}>{c.d}</td>
                              <td style={{padding:"9px 10px",borderBottom:"1px solid rgba(34,201,94,.05)",fontSize:11,color:"#253040"}}>{c.limit||"—"}</td>
                              <td style={{padding:"9px 10px",borderBottom:"1px solid rgba(34,201,94,.05)",fontFamily:"'Bebas Neue',cursive",fontSize:17,color:rc}}>{rem}</td>
                              <td style={{padding:"9px 10px",borderBottom:"1px solid rgba(34,201,94,.05)"}}>
                                <span style={{fontSize:7.5,letterSpacing:".12em",padding:"3px 7px",background:st.bg,color:st.c,border:`1px solid ${st.c}40`,textTransform:"uppercase"}}>{st.t}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {modal&&<Modal existing={countries} onAdd={addCountry} onClose={()=>setModal(false)}/>}
      </div>
    </>
  );
}
