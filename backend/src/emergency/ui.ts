// @ts-nocheck
const TEMPLATE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Hire Daily – Emergency Automation</title>
<style>
:root{--bg:#f6f7fb;--card:#fff;--tx:#111827;--mu:#6b7280;--bd:#e5e7eb;--pr:#4f46e5;--ok:#059669;--bad:#dc2626;--warn:#d97706}
@media(prefers-color-scheme:dark){:root{--bg:#0b0f19;--card:#141a29;--tx:#e5e7eb;--mu:#9ca3af;--bd:#263047;--pr:#818cf8}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--tx);font:15px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
.wrap{max-width:900px;margin:0 auto;padding:14px}
h1{font-size:18px;margin:6px 0 2px}h2{font-size:16px;margin:0 0 10px}
.card{background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:14px;margin:12px 0}
.mu{color:var(--mu);font-size:13px}
label{display:block;font-weight:600;font-size:13px;margin:10px 0 4px}
input,select,textarea{width:100%;padding:9px 10px;border:1px solid var(--bd);border-radius:8px;background:var(--bg);color:var(--tx);font:inherit}
textarea{min-height:60px}
button{padding:9px 14px;border:0;border-radius:8px;background:var(--pr);color:#fff;font:inherit;font-weight:600;cursor:pointer}
button.sec{background:transparent;color:var(--tx);border:1px solid var(--bd)}button.bad{background:var(--bad)}
button:disabled{opacity:.5;cursor:wait}
.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.row>*{flex:0 0 auto}
.grid{display:grid;gap:8px}.lk{border:1px dashed var(--bd);border-radius:10px;padding:10px;margin:8px 0}
.chip{display:inline-block;padding:2px 9px;border-radius:99px;font-size:12px;font-weight:600;border:1px solid var(--bd)}
.ok{color:var(--ok)}.bd{color:var(--bad)}.wn{color:var(--warn)}
table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:6px 6px;border-bottom:1px solid var(--bd);vertical-align:top}
.scroll{overflow-x:auto}.chk{display:flex;gap:8px;align-items:center;font-weight:500;margin:8px 0}.chk input{width:auto}
#toast{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);background:#111827;color:#fff;padding:10px 14px;border-radius:10px;max-width:92%;display:none;z-index:9}
.hide{display:none}
</style></head><body><div class="wrap">

<div id="login" class="card hide">
  <h1>Emergency Automation</h1><div class="mu">Hire Daily · Cloudflare backup</div>
  <label>Admin email</label><input id="em" type="email" autocomplete="username">
  <label>Password</label><input id="pw" type="password" autocomplete="current-password">
  <div class="row" style="margin-top:12px"><button id="loginBtn">Login</button></div>
</div>

<div id="app" class="hide">
  <div class="row" style="justify-content:space-between"><div><h1>Emergency Automation</h1><div class="mu">Sirf Firebase band hone par. Asli automation alag hai.</div></div><button class="sec" id="logout">Logout</button></div>

  <div class="card" id="statusCard"></div>

  <div class="card">
    <h2 id="formTitle">Nayi automation (post + rule ek saath)</h2>
    <label>Post chuno</label>
    <div class="row"><select id="postSel" style="flex:1;min-width:200px"><option value="">— pehle "Load my posts" dabao —</option></select><button class="sec" id="loadPosts">Load my posts</button></div>
    <label>ya Post (media) ID khud daalo</label><input id="mediaId" inputmode="numeric" placeholder="17900000000000000">
    <label>Keywords (comma se alag; khali = har comment)</label><input id="keywords" placeholder="job, link, apply">
    <label>Links (1 se 5)</label><div id="links"></div>
    <label>Public comment reply (random 1 chuna jayega, max 5)</label><div id="replies" class="grid"></div>
    <div class="chk"><input type="checkbox" id="replyOn" checked><span>Public comment reply bhejo</span></div>
    <div class="chk"><input type="checkbox" id="dmOn" checked><span>DM bhejo (company, role, apply button)</span></div>
    <div class="chk"><input type="checkbox" id="backfill" checked><span>Purane comments par bhi chalao (7 din tak ke)</span></div>
    <div class="row" style="margin-top:10px"><button id="save">Save &amp; start</button><button class="sec" id="reset">Clear form</button></div>
    <div id="saveMsg" class="mu" style="margin-top:8px"></div>
  </div>

  <div class="card"><h2>Automations</h2><div id="rules" class="scroll"></div></div>
  <div class="card"><div class="row" style="justify-content:space-between"><h2 style="margin:0">Recent activity</h2><button class="sec" id="refresh">Refresh</button></div><div id="logs" class="scroll" style="margin-top:8px"></div></div>
</div>
<div id="toast"></div>

<script>
var $=function(s){return document.querySelector(s)};
var esc=function(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})};
var token=sessionStorage.getItem("t")||"";
var DEFAULTS=["Just sent you the details in DM 📩","Check your DM for the link! ✨","Details are in your inbox 📬","Sent you the apply link in DM 🚀","Done! Please check your DM 💌"];
var rulesCache=[];
function toast(m){var t=$("#toast");t.textContent=m;t.style.display="block";clearTimeout(toast.h);toast.h=setTimeout(function(){t.style.display="none"},4500)}
function show(id){["login","app"].forEach(function(x){$("#"+x).classList.toggle("hide",x!==id)})}
function logout(){token="";sessionStorage.removeItem("t");show("login")}
function api(path,method,body){
  var h={"Content-Type":"application/json"};if(token)h.Authorization="Bearer "+token;
  return fetch("__API_BASE__"+path,{method:method||"GET",headers:h,body:body?JSON.stringify(body):undefined}).then(function(r){
    if(r.status===401&&path!=="login"){logout();throw new Error("Dobara login karo")}
    return r.json().catch(function(){return{}}).then(function(j){if(!r.ok)throw new Error(j.error||("HTTP "+r.status));return j})
  })
}
function buildForm(){
  var L=$("#links");L.innerHTML="";
  for(var i=0;i<5;i++){
    var d=document.createElement("div");d.className="lk";
    d.innerHTML='<div class="row"><b>Link '+(i+1)+'</b><select class="t"><option value="job">Job (company + role)</option><option value="external">External link</option></select></div>'+
    '<div class="grid" style="margin-top:6px"><input class="a" placeholder="Company name"><input class="b" placeholder="Role"><input class="u" placeholder="https://apply-link"></div>';
    L.appendChild(d);
    (function(box){box.querySelector(".t").onchange=function(){sync(box)};sync(box)})(d);
  }
  var R=$("#replies");R.innerHTML="";
  for(var j=0;j<5;j++){var inp=document.createElement("input");inp.className="rp";inp.value=DEFAULTS[j];R.appendChild(inp)}
}
function sync(box){var ext=box.querySelector(".t").value==="external";box.querySelector(".a").placeholder=ext?"Link ka naam (jaise: Free resume template)":"Company name";box.querySelector(".b").classList.toggle("hide",ext)}
function collect(){
  var links=[].map.call(document.querySelectorAll(".lk"),function(b){return{type:b.querySelector(".t").value,company:b.querySelector(".a").value,label:b.querySelector(".a").value,role:b.querySelector(".b").value,url:b.querySelector(".u").value}});
  return{mediaId:($("#mediaId").value||$("#postSel").value).trim(),postLabel:($("#postSel").selectedOptions[0]||{}).text||"",keywords:$("#keywords").value,links:links,
    replies:[].map.call(document.querySelectorAll(".rp"),function(x){return x.value}),replyEnabled:$("#replyOn").checked,dmEnabled:$("#dmOn").checked,backfill:$("#backfill").checked}
}
function fill(r){
  $("#formTitle").textContent="Edit: "+(r.post_label||r.media_id);$("#mediaId").value=r.media_id;$("#keywords").value=r.keywords;
  $("#replyOn").checked=r.reply_enabled;$("#dmOn").checked=r.dm_enabled;
  var boxes=document.querySelectorAll(".lk");
  boxes.forEach(function(b,i){var l=r.links[i];b.querySelector(".t").value=l?l.type:"job";sync(b);
    b.querySelector(".a").value=l?(l.type==="external"?l.label:l.company):"";b.querySelector(".b").value=l&&l.role?l.role:"";b.querySelector(".u").value=l?l.url:""});
  document.querySelectorAll(".rp").forEach(function(x,i){x.value=r.replies[i]||""});
  window.scrollTo({top:0,behavior:"smooth"});
}
function runUntilDone(msgEl){
  var n=0;
  function step(){
    return api("run","POST").then(function(j){
      msgEl.textContent="Queue chal rahi hai… baaki: "+j.remaining;
      if(j.remaining>0&&++n<80)return new Promise(function(r){setTimeout(r,1200)}).then(step);
      msgEl.textContent=j.remaining>0?"Baaki "+j.remaining+" cron (har minute) khud nipta dega.":"Sab ho gaya ✅";
    })
  }
  return step().then(loadAll)
}
function loadStatus(){return api("status").then(function(s){
  var c=s.counts,f=function(b,t){return '<span class="chip '+(b?'ok':'bd')+'">'+t+': '+(b?'OK':'MISSING')+'</span> '};
  $("#statusCard").innerHTML=f(s.config.token,"Meta token")+f(s.config.secret,"App secret")+f(s.config.verify,"Verify token")+f(s.config.igId,"IG business ID")+
   (s.dryRun?'<span class="chip wn">DRY RUN — asli message nahi ja rahe</span>':'<span class="chip ok">LIVE</span>')+
   '<div class="mu" style="margin-top:8px">Total '+c.total+' · DM sent '+c.dm_sent+' · Reply sent '+c.reply_sent+' · Pending '+c.pending+' · Failed '+c.failed+' · Purane comments baaki '+c.backfillLeft+'</div>'+
   '<div class="row" style="margin-top:8px"><button class="sec" id="runNow">Run queue now</button><button class="sec" id="retry">Retry failed ('+c.failed+')</button></div><div id="runMsg" class="mu" style="margin-top:6px"></div>';
  $("#runNow").onclick=function(){runUntilDone($("#runMsg"))};
  $("#retry").onclick=function(){api("retry","POST").then(function(j){toast(j.reset+" comments dobara line mein");return runUntilDone($("#runMsg"))}).catch(function(e){toast(e.message)})};
})}
function loadRules(){return api("rules").then(function(j){
  rulesCache=j.rules;
  if(!j.rules.length){$("#rules").innerHTML='<div class="mu">Abhi koi automation nahi.</div>';return}
  var h='<table><tr><th>Post</th><th>Keywords</th><th>Links</th><th>Stats</th><th></th></tr>';
  j.rules.forEach(function(r){
    h+='<tr><td>'+esc(r.post_label||r.media_id)+'<div class="mu">'+esc(r.media_id)+'</div></td><td>'+esc(r.keywords||"(har comment)")+'</td><td>'+r.links.length+'</td>'+
    '<td>DM '+(r.stats.dm_sent||0)+' · Reply '+(r.stats.reply_sent||0)+(r.stats.failed?' · <span class="bd">fail '+r.stats.failed+'</span>':'')+'</td>'+
    '<td><div class="row"><button class="sec" data-e="'+r.id+'">Edit</button><button class="sec" data-t="'+r.id+'">'+(r.enabled?'Pause':'Resume')+'</button><button class="bad" data-d="'+r.id+'">Delete</button></div></td></tr>';
  });
  $("#rules").innerHTML=h+'</table>';
  $("#rules").querySelectorAll("button").forEach(function(b){b.onclick=function(){
    var id=+(b.dataset.e||b.dataset.t||b.dataset.d),r=rulesCache.filter(function(x){return x.id===id})[0];
    if(b.dataset.e)return fill(r);
    if(b.dataset.t)return api("rules/"+id+"/toggle","POST",{enabled:!r.enabled}).then(loadAll);
    if(confirm("Ye automation delete karein?"))api("rules/"+id,"DELETE").then(loadAll);
  }});
})}
function loadLogs(){return api("logs").then(function(j){
  if(!j.logs.length){$("#logs").innerHTML='<div class="mu">Abhi kuch nahi.</div>';return}
  var cls=function(s){return s==="sent"?"ok":s==="failed"?"bd":s==="skipped"?"mu":"wn"};
  var h='<table><tr><th>When</th><th>User</th><th>Comment</th><th>Reply</th><th>DM</th><th>Note</th></tr>';
  j.logs.forEach(function(l){h+='<tr><td>'+esc(new Date(l.created_at).toLocaleString())+'</td><td>@'+esc(l.username||"?")+'<div class="mu">'+esc(l.source)+'</div></td><td>'+esc((l.text||"").slice(0,60))+'</td>'+
    '<td class="'+cls(l.reply_status)+'">'+esc(l.reply_status)+'</td><td class="'+cls(l.dm_status)+'">'+esc(l.dm_status)+'</td><td class="mu">'+esc(l.error||"")+'</td></tr>'});
  $("#logs").innerHTML=h+'</table>';
})}
function loadAll(){return Promise.all([loadStatus(),loadRules(),loadLogs()]).catch(function(e){toast(e.message)})}
function start(){show("app");buildForm();loadAll()}
$("#loginBtn").onclick=function(){api("login","POST",{email:$("#em").value,password:$("#pw").value}).then(function(j){token=j.token;sessionStorage.setItem("t",token);$("#pw").value="";start()}).catch(function(e){toast(e.message)})};
$("#pw").onkeydown=function(e){if(e.key==="Enter")$("#loginBtn").click()};
$("#logout").onclick=logout;$("#refresh").onclick=loadAll;
$("#reset").onclick=function(){$("#formTitle").textContent="Nayi automation (post + rule ek saath)";$("#mediaId").value="";$("#keywords").value="";$("#saveMsg").textContent="";buildForm()};
$("#postSel").onchange=function(){$("#mediaId").value=this.value};
$("#loadPosts").onclick=function(){var b=this;b.disabled=true;api("media").then(function(j){
  var s=$("#postSel");s.innerHTML='<option value="">— post chuno —</option>';
  j.media.forEach(function(m){var o=document.createElement("option");o.value=m.id;o.textContent=(m.timestamp||"").slice(0,10)+" · "+(m.caption||m.media_type||"").replace(/\\s+/g," ").slice(0,50);s.appendChild(o)});
  if(j.error)toast("Posts nahi aaye: "+j.error);
}).catch(function(e){toast(e.message)}).then(function(){b.disabled=false})};
$("#save").onclick=function(){var b=this,m=$("#saveMsg");b.disabled=true;m.textContent="Save ho raha hai…";
  api("rules","POST",collect()).then(function(j){
    var bf=j.backfill,t="Saved ✅";
    if(bf)t+=" · Purane comments: "+bf.queued+" line mein"+(bf.tooOld?", "+bf.tooOld+" 7 din se purane (skip)":"")+(bf.noKeyword?", "+bf.noKeyword+" keyword match nahi":"")+(bf.error?" · Meta error: "+bf.error:"");
    m.textContent=t;loadAll();if(bf&&bf.queued)return runUntilDone(m).then(function(){m.textContent=t+" — "+m.textContent})
  }).catch(function(e){m.textContent="❌ "+e.message}).then(function(){b.disabled=false})};
if(token){start()}else{show("login")}
</script></div></body></html>`;

export const renderPage = (apiBase = "/api/") => TEMPLATE.replace("__API_BASE__", apiBase);
export const PAGE = renderPage("/api/");
