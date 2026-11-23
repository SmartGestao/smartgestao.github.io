// ARQUIVO: ui-auth.jsx — login, cadastro, escolha/criação de empresa e componente Root
const ERROS_AUTH = {"Invalid login credentials":"E-mail ou senha incorretos.","Email not confirmed":"Confirme seu e-mail antes de entrar (veja a caixa de entrada).","User already registered":"Este e-mail já está cadastrado. Use a aba Entrar."};
const msgAuth = e => ERROS_AUTH[e.message] || (/at least 6/i.test(e.message) ? "A senha precisa ter pelo menos 6 caracteres." : erroPt(e));

function AuthScreen({onDemo}){
  const [aba,setAba] = useState("entrar"), [email,setEmail] = useState(""), [senha,setSenha] = useState(""), [msg,setMsg] = useState(""), [erro,setErro] = useState(""), [busy,setBusy] = useState(false);
  const enviar = async e => {
    e.preventDefault(); setErro(""); setMsg("");
    if(!email.trim() || !senha) return setErro("Informe e-mail e senha.");
    setBusy(true);
    try{
      if(aba==="entrar"){
        const {error} = await sb.auth.signInWithPassword({email:email.trim(),password:senha});
        if(error) throw error;
      } else {
        const {data,error} = await sb.auth.signUp({email:email.trim(),password:senha,options:{emailRedirectTo:location.origin+location.pathname}});
        if(error) throw error;
        if(!data.session) setMsg("Conta criada! Enviamos um e-mail de confirmação. Confirme e depois entre.");
      }
    }catch(ex){ setErro(msgAuth(ex)); }
    setBusy(false);
  };
  const troca = k => { setAba(k); setErro(""); setMsg(""); };
  return <div className="auth"><form className="box" onSubmit={enviar}>
    <div className="logo" style={{color:"var(--tx)"}}><i>🔧</i>SmartGestão</div>
    <div className="tabs">{[["entrar","Entrar"],["criar","Criar conta"]].map(t=><button type="button" key={t[0]} className={"chip"+(aba===t[0]?" on":"")} onClick={()=>troca(t[0])}>{t[1]}</button>)}</div>
    <div className="fld"><label>E-mail</label><input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></div>
    <div className="fld"><label>Senha</label><input type="password" autoComplete={aba==="entrar"?"current-password":"new-password"} value={senha} onChange={e=>setSenha(e.target.value)}/></div>
    {erro && <div className="err" role="alert">{erro}</div>}
    {msg && <div className="ok">{msg}</div>}
    <div style={{marginTop:16}}><button className="btn" disabled={busy}>{busy?"Aguarde…":(aba==="entrar"?"Entrar":"Criar conta")}</button></div>
    <button type="button" className="lnk" onClick={onDemo}>Explorar a demonstração (sem login)</button>
  </form></div>;
}

function CompanyGate({user,auto,onPick,onSignOut}){
  const [lista,setLista] = useState(null), [nome,setNome] = useState(""), [erro,setErro] = useState(""), [busy,setBusy] = useState(false), [novo,setNovo] = useState(false);
  const carregar = async () => {
    setErro("");
    const m = await sb.from("company_members").select("company_id, role").eq("user_id",user.id);
    if(m.error) return setErro("company_members: "+erroPt(m.error));
    const ids = [...new Set(m.data.map(x=>x.company_id))];
    if(!ids.length) return setLista([]);
    const c = await sb.from("companies").select("id, name").in("id",ids);
    if(c.error) return setErro("companies: "+erroPt(c.error));
    const L = c.data.map(x=>({id:x.id,name:x.name,role:(m.data.find(y=>y.company_id===x.id)||{}).role}));
    setLista(L);
    if(auto && L.length===1) onPick(L[0]);
  };
  useEffect(()=>{ carregar(); },[]);
  const criar = async e => {
    e.preventDefault();
    if(!nome.trim()) return setErro("Informe o nome da empresa.");
    setBusy(true); setErro("");
    const {error} = await sb.rpc("create_company",{p_name:nome.trim()});
    if(error){ setErro("create_company: "+erroPt(error)); setBusy(false); return; }
    setNome(""); setNovo(false); await carregar(); setBusy(false);
  };
  const vazio = lista && lista.length===0;
  return <div className="auth"><div className="box">
    <div className="logo" style={{color:"var(--tx)"}}><i>🔧</i>SmartGestão</div>
    <p className="mut" style={{marginTop:0}}>Conectado como {user.email}</p>
    {erro && <div className="err" role="alert">{erro}</div>}
    {lista===null && !erro && <div className="empty">Carregando…</div>}
    {lista && lista.length>0 && <div><h3 style={{margin:"6px 0 10px"}}>Escolha a empresa</h3>
      {lista.map(c=><button key={c.id} className="btn g" style={{marginBottom:8,textAlign:"left"}} onClick={()=>onPick(c)}>{c.name}{c.role?<span className="mut"> · {c.role}</span>:null}</button>)}</div>}
    {(vazio||novo) && <form onSubmit={criar}>
      <h3 style={{margin:"6px 0 10px"}}>{vazio?"Cadastre sua empresa":"Nova empresa"}</h3>
      <div className="fld"><label>Nome da empresa</label><input value={nome} onChange={e=>setNome(e.target.value)} placeholder="Ex.: Assistência Silva"/></div>
      <div style={{marginTop:12}}><button className="btn" disabled={busy}>{busy?"Criando…":"Criar empresa"}</button></div>
    </form>}
    {lista && !vazio && !novo && <button className="lnk" onClick={()=>setNovo(true)}>+ Cadastrar outra empresa</button>}
    <button className="lnk" onClick={onSignOut}>Sair</button>
  </div></div>;
}

function Root(){
  const [demo,setDemo] = useState(!sb), [sess,setSess] = useState(sb?undefined:null), [comp,setComp] = useState(null), [troca,setTroca] = useState(false);
  useEffect(()=>{
    if(!sb) return;
    sb.auth.getSession().then(r=>setSess(r.data.session));
    const r = sb.auth.onAuthStateChange((_ev,s)=>{ setSess(s); if(!s){ setComp(null); setTroca(false); } });
    return ()=>r.data.subscription.unsubscribe();
  },[]);
  const sair = () => sb.auth.signOut();
  if(demo) return <App ctx={{real:false,repo:repoLocal,onExit:sb?()=>setDemo(false):null}}/>;
  if(sess===undefined) return <div className="empty">Carregando…</div>;
  if(!sess) return <AuthScreen onDemo={()=>setDemo(true)}/>;
  if(!comp) return <CompanyGate user={sess.user} auto={!troca} onPick={c=>{setComp(c);setTroca(false);}} onSignOut={sair}/>;
  return <App key={comp.id} ctx={{real:true,repo:repoSupabase,company:comp,user:sess.user,onExit:sair,onSwitch:()=>{setTroca(true);setComp(null);}}}/>;
}
