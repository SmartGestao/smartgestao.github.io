// ARQUIVO: ui-auth.jsx — login, cadastro, escolha/criação de empresa e componente Root
const ERROS_AUTH = {"Invalid login credentials":"E-mail ou senha incorretos.","Email not confirmed":"Confirme seu e-mail antes de entrar (veja a caixa de entrada).","User already registered":"Este e-mail já está cadastrado. Use a aba Entrar."};
const msgAuth = e => ERROS_AUTH[e.message] || (/at least 6/i.test(e.message) ? "A senha precisa ter pelo menos 6 caracteres." : erroPt(e));

function BrandMark({compact=false}){
  return <div className={"brand-lockup"+(compact?" compact":"")}>
    <span className="brand-symbol"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 4 41 11v12c0 10.5-7.2 17.2-17 21C14.2 40.2 7 33.5 7 23V11L24 4Z" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinejoin="round"/><path d="M17 29.5 23 17h8l-6 12.5h-8Z" fill="currentColor"/><path d="M22 29.5h10" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"/></svg></span>
    <span className="brand-name">Smart<span>Gestão</span><small>GESTÃO INTELIGENTE</small></span>
  </div>;
}

function AuthScreen({onDemo}){
  const [aba,setAba] = useState("entrar"), [email,setEmail] = useState(""), [senha,setSenha] = useState(""), [msg,setMsg] = useState(""), [erro,setErro] = useState(""), [busy,setBusy] = useState(false);
  const limpar = k => {setAba(k);setErro("");setMsg("");};
  const enviar = async e => {
    e.preventDefault(); setErro(""); setMsg("");
    if(!email.trim() || (aba!=="recuperar" && !senha)) return setErro(aba==="recuperar"?"Informe seu e-mail.":"Informe e-mail e senha.");
    setBusy(true);
    try{
      if(aba==="recuperar"){
        const {error}=await sb.auth.resetPasswordForEmail(email.trim(),{redirectTo:location.origin+location.pathname});
        if(error) throw error;
        setMsg("Se o e-mail estiver cadastrado, enviaremos um link para redefinir a senha. Verifique também o spam.");
      } else if(aba==="entrar"){
        const {error}=await sb.auth.signInWithPassword({email:email.trim(),password:senha});
        if(error) throw error;
      } else {
        const {data,error}=await sb.auth.signUp({email:email.trim(),password:senha,options:{emailRedirectTo:location.origin+location.pathname}});
        if(error) throw error;
        if(!data.session) setMsg("Conta criada! Enviamos um e-mail de confirmação. Confirme e depois entre.");
      }
    }catch(ex){setErro(msgAuth(ex));}
    setBusy(false);
  };
  return <div className="auth auth-login">
    <section className="auth-showcase">
      <BrandMark/>
      <div className="showcase-copy"><span className="eyebrow">CONTROLE • ORGANIZAÇÃO • RESULTADOS</span><h1>Seu negócio,<br/>em perfeita sintonia.</h1><p>Uma gestão mais simples para sua assistência técnica crescer com clareza e confiança.</p></div>
      <div className="showcase-foot">GESTÃO COMPLETA PARA ASSISTÊNCIAS TÉCNICAS</div>
    </section>
    <section className="auth-panel"><form className="box auth-card" onSubmit={enviar}>
      <div className="auth-card-brand"><BrandMark compact/></div>
      <span className="auth-kicker">{aba==="recuperar"?"RECUPERAÇÃO DE ACESSO":"BEM-VINDO AO SMARTGESTÃO"}</span>
      <h2>{aba==="recuperar"?"Recupere sua senha":aba==="entrar"?"Acesse sua conta":"Crie sua conta"}</h2>
      <p className="auth-intro">{aba==="recuperar"?"Informe seu e-mail e enviaremos um link seguro para redefinir sua senha.":aba==="entrar"?"Entre para continuar gerenciando sua assistência.":"Comece a organizar sua assistência técnica."}</p>
      <div className="fld"><label>E-mail</label><input type="email" autoComplete="email" placeholder="voce@empresa.com" value={email} onChange={e=>setEmail(e.target.value)}/></div>
      {aba!=="recuperar" && <div className="fld"><div className="auth-label-row"><label>Senha</label>{aba==="entrar"&&<button type="button" className="auth-text-button" onClick={()=>limpar("recuperar")}>Esqueci minha senha</button>}</div><input type="password" autoComplete={aba==="entrar"?"current-password":"new-password"} placeholder="Sua senha" value={senha} onChange={e=>setSenha(e.target.value)}/></div>}
      {erro && <div className="err auth-message" role="alert">{erro}</div>}
      {msg && <div className="ok auth-message" role="status">{msg}</div>}
      <div className="auth-submit"><button className="btn" disabled={busy}>{busy?"Aguarde…":aba==="recuperar"?"Enviar link de recuperação":aba==="entrar"?"Entrar na plataforma":"Criar minha conta"}</button></div>
      {aba==="recuperar"?<button type="button" className="lnk" onClick={()=>limpar("entrar")}>Voltar para entrar</button>:<div className="auth-switch">{aba==="entrar"?"Ainda não tem uma conta?":"Já possui uma conta?"} <button type="button" onClick={()=>limpar(aba==="entrar"?"criar":"entrar")}>{aba==="entrar"?"Criar conta":"Entrar"}</button></div>}
      <div className="auth-divider"><span>OU</span></div>
      <button type="button" className="demo-link" onClick={onDemo}><span>↗</span> Explorar demonstração sem login</button>
      <div className="auth-secure"><span>●</span> Acesso protegido e conexão segura</div>
    </form></section>
  </div>;
}

function PasswordRecoveryScreen(){
  const [senha,setSenha]=useState(""),[confirmar,setConfirmar]=useState(""),[erro,setErro]=useState(""),[msg,setMsg]=useState(""),[busy,setBusy]=useState(false);
  const salvar=async e=>{
    e.preventDefault();setErro("");setMsg("");
    if(senha.length<6)return setErro("A senha precisa ter pelo menos 6 caracteres.");
    if(senha!==confirmar)return setErro("As senhas não coincidem.");
    setBusy(true);
    try{const {error}=await sb.auth.updateUser({password:senha});if(error)throw error;setMsg("Senha atualizada. Você já pode continuar.");}
    catch(ex){setErro(msgAuth(ex));}
    setBusy(false);
  };
  return <div className="auth auth-login"><section className="auth-panel auth-recovery-panel"><form className="box auth-card" onSubmit={salvar}>
    <BrandMark compact/><span className="auth-kicker">RECUPERAÇÃO DE ACESSO</span><h2>Crie uma nova senha</h2><p className="auth-intro">Escolha uma senha segura para voltar ao SmartGestão.</p>
    <div className="fld"><label>Nova senha</label><input type="password" autoComplete="new-password" value={senha} onChange={e=>setSenha(e.target.value)}/></div>
    <div className="fld"><label>Confirme a nova senha</label><input type="password" autoComplete="new-password" value={confirmar} onChange={e=>setConfirmar(e.target.value)}/></div>
    {erro&&<div className="err auth-message" role="alert">{erro}</div>}{msg&&<div className="ok auth-message" role="status">{msg}</div>}
    <div className="auth-submit"><button className="btn" disabled={busy}>{busy?"Salvando…":"Salvar nova senha"}</button></div>
  </form></section></div>;
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
  const [demo,setDemo] = useState(!sb || location.hash==="#demo"), [sess,setSess] = useState(sb?undefined:null), [comp,setComp] = useState(null), [troca,setTroca] = useState(false), [recovery,setRecovery] = useState(false);
  useEffect(()=>{
    if(!sb) return;
    sb.auth.getSession().then(r=>setSess(r.data.session));
    const r = sb.auth.onAuthStateChange((ev,s)=>{ if(ev==="PASSWORD_RECOVERY") setRecovery(true); setSess(s); if(!s){ setComp(null); setTroca(false); setRecovery(false); } });
    return ()=>r.data.subscription.unsubscribe();
  },[]);
  const sair = () => sb.auth.signOut();
  if(demo) return <App ctx={{real:false,repo:repoLocal,onExit:sb?()=>{history.replaceState(null,"",location.pathname);setDemo(false);}:null}}/>;
  if(sess===undefined) return <div className="empty">Carregando…</div>;
  if(recovery && sess) return <PasswordRecoveryScreen/>;
  if(!sess) return <AuthScreen onDemo={()=>setDemo(true)}/>;
  if(!comp) return <CompanyGate user={sess.user} auto={!troca} onPick={c=>{setComp(c);setTroca(false);}} onSignOut={sair}/>;
  return <App key={comp.id} ctx={{real:true,repo:repoSupabase,company:comp,user:sess.user,onExit:sair,onSwitch:()=>{setTroca(true);setComp(null);}}}/>;
}
