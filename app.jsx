// ARQUIVO: app.jsx — menu, telas, regras de negócio e inicialização
/* ============ APLICAÇÃO ============ */
const MENU = [["dashboard","📊","Painel"],["ordens","🛠️","Ordens de serviço"],["clientes","👥","Clientes"],["equipamentos","📱","Equipamentos"],["estoque","📦","Estoque de peças"],["financeiro","💰","Financeiro"],["assinatura","💳","Assinatura"]];
function App({ctx}){
  const real=ctx.real,R=ctx.repo;
  const [db,setDb]=useState(null),[page,setPage]=useState("dashboard"),[open,setOpen]=useState(false),[msg,setMsg]=useState("");
  const [subscriptionState,setSubscriptionState]=useState(real?"checking":"active");
  useEffect(()=>{
    if(real && subscriptionState!=="active") return;
    let alive=true;
    R.load(real?ctx.company.id:undefined)
      .then(data=>{if(alive)setDb(data);})
      .catch(e=>{if(alive)setMsg(erroPt(e));});
    return ()=>{alive=false;};
  },[real,ctx.company?.id,subscriptionState]);
  useEffect(()=>{
    if(!real||subscriptionState!=="checking") return;
    let alive=true;
    sb.functions.invoke("asaas-assinaturas",{body:{action:"status",company_id:ctx.company.id}})
      .then(({data,error})=>{
        if(!alive) return;
        if(error||!data||data.error) setSubscriptionState("unverified");
        else setSubscriptionState(data.exempt===true || (data.has_subscription&&data.status==="active") ? "active" : "inactive");
      }).catch(()=>{if(alive)setSubscriptionState("unverified");});
    return ()=>{alive=false;};
  },[real,ctx.company?.id,subscriptionState]);
  useEffect(()=>{if(db&&!real)R.save(db);},[db]);
  if(real&&subscriptionState==="checking") return <div className="empty">Verificando a assinatura da empresa…</div>;
  if(real&&subscriptionState==="inactive") return <SubscriptionScreen ctx={ctx}/>;
  if(real&&subscriptionState==="unverified") return <div className="empty" role="alert">Não foi possível confirmar a assinatura agora. Por segurança, o acesso aos módulos está pausado.<br/><br/><button className="btn" onClick={()=>setSubscriptionState("checking")}>Tentar novamente</button></div>;
  if(!db)return msg?<div className="empty" role="alert">{msg}<br/><br/><button className="btn" onClick={ctx.onExit||(()=>location.reload())}>{ctx.onExit?"Voltar":"Recarregar"}</button></div>:<div className="empty">Carregando…</div>;
  const upsert=async(tab,r)=>{
    if(!real)return setDb(d=>({...d,[tab]:r.id?d[tab].map(x=>x.id===r.id?r:x):[...d[tab],{...r,id:uid()}]}));
    const s=await R.save(tab,r,ctx.company.id);
    setDb(d=>({...d,[tab]:r.id?d[tab].map(x=>x.id===s.id?s:x):[...d[tab],s]}));
  };
  const remove=async(tab,id)=>{if(real)await R.remove(tab,id,ctx.company.id);setDb(d=>({...d,[tab]:d[tab].filter(x=>x.id!==id)}));};
  const cn=id=>(db.clientes.find(x=>x.id===id)||{}).nome||"—";
  const eq=id=>{const e=db.equipamentos.find(x=>x.id===id);return e?e.marca+" "+e.modelo:"—";};
  const go=p=>{setPage(p);setOpen(false);window.scrollTo(0,0);};
  const saveOrdem=async o=>{
    if(real){await upsert("ordens",o);if(o.status==="Pronto"){const atualizado=await R.load(ctx.company.id);setDb(atualizado);}return;}
    setDb(d=>{
      let ords=d.ordens,lanc=d.lancamentos,rec={...o};
      if(!rec.id){const n=Math.max(0,...d.ordens.map(x=>parseInt((x.numero||"").slice(3),10)||0))+1;rec={...rec,id:uid(),numero:"OS-"+String(n).padStart(4,"0")};ords=[...ords,rec];}
      else ords=ords.map(x=>x.id===rec.id?rec:x);
      if(rec.status==="Pronto"&&!rec.lancado&&Number(rec.orcamento||0)>0){rec.lancado=true;ords=ords.map(x=>x.id===rec.id?rec:x);lanc=[...lanc,{id:uid(),tipo:"Receita",descricao:rec.numero+" — "+eq(rec.equipId),categoria:"Serviços",valor:Number(rec.orcamento||0),data:hoje(),status:"Pendente"}];}
      return {...d,ordens:ords,lancamentos:lanc};
    });
  };
  const wa=r=><a className="btn s n" style={{textDecoration:"none"}} target="_blank" rel="noopener noreferrer" href={"https://wa.me/55"+String(r.whatsapp).replace(/\D/g,"")}>WhatsApp</a>;
  const SOON={};
  const telas={
    dashboard:<Dashboard db={db} go={go}/>,
    assinatura:<SubscriptionScreen ctx={ctx}/>,
    clientes:<Crud title="Clientes" sub="Cadastro de clientes e contatos." label="cliente" newLabel="Novo cliente" rows={db.clientes}
      defaults={real?{nome:"",telefone:"",email:"",documento:""}:{nome:"",telefone:"",whatsapp:""}}
      fields={real?[{k:"nome",l:"Nome completo",req:1,w:1},{k:"telefone",l:"Telefone / WhatsApp",t:"tel",req:1},{k:"email",l:"E-mail",t:"email"},{k:"documento",l:"CPF / CNPJ"}]:[{k:"nome",l:"Nome completo",req:1,w:1},{k:"telefone",l:"Telefone",t:"tel"},{k:"whatsapp",l:"WhatsApp",t:"tel",req:1}]}
      cols={real?[{l:"Nome",r:r=><b>{r.nome}</b>},{l:"Telefone / WhatsApp",r:r=>r.telefone||"—"},{l:"E-mail",r:r=>r.email||"—"}]:[{l:"Nome",r:r=><b>{r.nome}</b>},{l:"Telefone",r:r=>r.telefone||"—"},{l:"WhatsApp",r:r=>r.whatsapp}]}
      extra={r=>r.whatsapp?wa(r):null} onSave={r=>upsert("clientes",r)} onDel={id=>remove("clientes",id)}/>,
    equipamentos:<Crud title="Equipamentos" sub="Aparelhos recebidos, marca, modelo e defeito relatado." label="equipamento" newLabel="Novo equipamento" rows={db.equipamentos}
      defaults={{tipo:"Celular",marca:"",modelo:"",defeito:"",clienteId:""}}
      filter={{k:"tipo",opts:TIPOS}} search={r=>[r.tipo,r.marca,r.modelo,r.defeito,cn(r.clienteId)].join(" ")}
      fields={[{k:"tipo",l:"Tipo",opts:TIPOS,req:1},{k:"clienteId",l:"Cliente",opts:db.clientes.map(c=>[c.id,c.nome]),req:real?1:0},{k:"marca",l:"Marca",req:1},{k:"modelo",l:"Modelo",req:1},{k:"defeito",l:"Defeito relatado",t:"area",w:1,req:1}]}
      cols={[{l:"Tipo",r:r=>r.tipo},{l:"Aparelho",r:r=><b>{r.marca} {r.modelo}</b>},{l:"Defeito",r:r=>r.defeito},{l:"Cliente",r:r=>cn(r.clienteId)}]}
      onSave={r=>upsert("equipamentos",r)} onDel={id=>remove("equipamentos",id)}/>,
    ordens:<Crud title="Ordens de serviço" sub="Acompanhe cada aparelho da entrada até a entrega." label="ordem de serviço" newLabel="Nova OS" rows={db.ordens}
      defaults={{clienteId:"",equipId:"",tecnico:TECNICOS[0],diagnostico:"",orcamento:"",status:"Recebido",data:hoje()}}
      filter={{k:"status",opts:STATUS}} search={r=>[r.numero,cn(r.clienteId),eq(r.equipId),r.tecnico,r.diagnostico,r.status].join(" ")}
      fields={[{k:"clienteId",l:"Cliente",opts:db.clientes.map(c=>[c.id,c.nome]),req:1},{k:"equipId",l:"Equipamento",opts:db.equipamentos.map(e=>[e.id,e.marca+" "+e.modelo+" — "+cn(e.clienteId)]),req:1},{k:"tecnico",l:"Técnico responsável",opts:TECNICOS,req:1},{k:"status",l:"Status",opts:STATUS,req:1},{k:"diagnostico",l:"Diagnóstico",t:"area",w:1},{k:"orcamento",l:"Orçamento (R$)",t:"number"},{k:"data",l:"Data de entrada",t:"date"}]}
      cols={[{l:"Nº",r:r=><b>{r.numero}</b>},{l:"Cliente",r:r=>cn(r.clienteId)},{l:"Equipamento",r:r=>eq(r.equipId)},{l:"Técnico",r:r=>r.tecnico||"—"},{l:"Status",r:r=><Badge c={COR[r.status]}>{r.status}</Badge>},{l:"Orçamento",r:r=>brl(r.orcamento)},{l:"Entrada",r:r=>dt(r.data)}]}
      onSave={saveOrdem} onDel={id=>remove("ordens",id)}/>,
    estoque:<Crud title="Estoque de peças" sub="Controle de quantidades, custo e preço de venda." label="peça" newLabel="Nova peça" rows={db.pecas}
      defaults={{nome:"",sku:"",qtd:"",minimo:"",custo:"",preco:""}}
      fields={[{k:"nome",l:"Peça",req:1,w:1},{k:"sku",l:"Código (SKU)"},{k:"qtd",l:"Quantidade",t:"number",req:1},{k:"minimo",l:"Estoque mínimo",t:"number"},{k:"custo",l:"Custo (R$)",t:"number"},{k:"preco",l:"Preço de venda (R$)",t:"number"}]}
      cols={[{l:"Peça",r:r=><b>{r.nome}</b>},{l:"Código",r:r=>r.sku||"—"},{l:"Quantidade",r:r=><Badge c={r.qtd<=r.minimo?"g4":"g1"}>{r.qtd} un.{r.qtd<=r.minimo?" · repor":""}</Badge>},{l:"Custo",r:r=>brl(r.custo)},{l:"Venda",r:r=>brl(r.preco)}]}
      onSave={r=>upsert("pecas",r)} onDel={id=>remove("pecas",id)}/>,
    financeiro:(()=>{
      const s=t=>db.lancamentos.filter(l=>l.tipo===t).reduce((a,l)=>a+l.valor,0);
      return <Crud title="Financeiro" sub="Receitas e despesas da assistência." label="lançamento" newLabel="Novo lançamento" rows={db.lancamentos}
        defaults={{tipo:"Receita",descricao:"",categoria:"",valor:"",data:hoje(),status:"Pago"}}
        filter={{k:"tipo",opts:["Receita","Despesa"]}} search={r=>[r.descricao,r.categoria,r.tipo].join(" ")}
        top={<div className="grid" style={{gridTemplateColumns:"repeat(3,1fr)"}}><div className="card kpi"><small>Receitas</small><b>{brl(s("Receita"))}</b></div><div className="card kpi r"><small>Despesas</small><b>{brl(s("Despesa"))}</b></div><div className="card kpi b"><small>Saldo</small><b>{brl(s("Receita")-s("Despesa"))}</b></div></div>}
        fields={[{k:"tipo",l:"Tipo",opts:["Receita","Despesa"],req:1},{k:"status",l:"Situação",opts:["Pago","Pendente"],req:1},{k:"descricao",l:"Descrição",req:1,w:1},{k:"categoria",l:"Categoria"},{k:"valor",l:"Valor (R$)",t:"number",req:1},{k:"data",l:"Data",t:"date"}]}
        cols={[{l:"Data",r:r=>dt(r.data)},{l:"Descrição",r:r=><b>{r.descricao}</b>},{l:"Categoria",r:r=>r.categoria||"—"},{l:"Tipo",r:r=><Badge c={r.tipo==="Receita"?"g1":"g4"}>{r.tipo}</Badge>},{l:"Valor",r:r=>brl(r.valor)},{l:"Situação",r:r=><Badge c={r.status==="Pago"?"g2":"g3"}>{r.status}</Badge>}]}
        onSave={r=>upsert("lancamentos",r)} onDel={id=>remove("lancamentos",id)}/>;
    })()
  };
  const menu=real && !["owner","admin"].includes(String(ctx.company.role||"").toLowerCase())?MENU.filter(m=>m[0]!=="assinatura"):MENU;
  const current=menu.find(m=>m[0]===page)||menu[0];
  return <div className="app">
    <aside className={"side"+(open?" open":"")}>
      <div className="logo"><i><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 3.5 34 9v10.2c0 8.2-5.8 13.8-14 17.3C11.8 33 6 27.4 6 19.2V9l14-5.5Z" fill="none" stroke="currentColor" strokeWidth="2.5"/><path d="M13 25V15h4l6 7v-7h4v10h-4l-6-7v7z" fill="currentColor"/></svg></i><span>SmartGestão<small>GESTÃO INTELIGENTE</small></span></div>
      <div className="nav-caption">MENU PRINCIPAL</div>
      <nav className="nav">{menu.map(m=><button key={m[0]} aria-current={page===m[0]?"page":undefined} className={page===m[0]?"on":""} onClick={()=>go(m[0])}><span className="nav-icon">{m[1]}</span><span className="nav-label">{m[2]}</span>{page===m[0]&&<i className="nav-active"/>}</button>)}</nav>
      <div className="side-bottom"><div className="side-status"><span className="status-dot"/> Sistema operacional</div>
        <div className="sfoot">{real?<div><b>{ctx.company.name}</b><span className="user-email">{ctx.user.email}</span><div className="account-actions"><button onClick={ctx.onSwitch}>Trocar empresa</button><button onClick={ctx.onExit}>Sair</button></div></div>:<div><b>Modo demonstração</b><span className="user-email">Dados salvos neste navegador</span>{ctx.onExit&&<div className="account-actions"><button onClick={ctx.onExit}>Voltar ao login</button></div>}</div>}</div>
      </div>
    </aside>
    <div className={"scrim"+(open?" open":"")} onClick={()=>setOpen(false)}/>
    <main className="main">
      <header className="workspace-top"><div className="workspace-left"><button className="mobile-menu" aria-label="Abrir menu" onClick={()=>setOpen(true)}>☰</button><div><span className="workspace-overline">SMARTGESTÃO / {current[2].toUpperCase()}</span><div className="workspace-title">{current[2]}</div></div></div>
        <div className="workspace-meta"><span className="workspace-live"><i/> Ambiente seguro</span><span className="workspace-company">{real?ctx.company.name:"Ambiente de demonstração"}</span></div>
      </header>
      <section className="workspace-content">{real&&SOON[page]?<Soon t={SOON[page]}/>:telas[page]}</section>
    </main>
  </div>;
}
ReactDOM.createRoot(document.getElementById("root")).render(<Root/>);
