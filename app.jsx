// ARQUIVO: app.jsx — menu, telas, regras de negócio e inicialização
/* ============ APLICAÇÃO ============ */
const MENU = [["dashboard","📊","Painel"],["ordens","🛠️","Ordens de serviço"],["clientes","👥","Clientes"],["equipamentos","📱","Equipamentos"],["estoque","📦","Estoque de peças"],["financeiro","💰","Financeiro"]];

function App({ctx}){
  const real = ctx.real, R = ctx.repo;
  const [db,setDb] = useState(null), [page,setPage] = useState("dashboard"), [open,setOpen] = useState(false), [msg,setMsg] = useState("");
  useEffect(()=>{ R.load(real?ctx.company.id:undefined).then(setDb).catch(e=>setMsg(erroPt(e))); },[]);
  useEffect(()=>{ if(db && !real) R.save(db); },[db]);
  if(!db) return msg ? <div className="empty" role="alert">{msg}<br/><br/><button className="btn" onClick={ctx.onExit||(()=>location.reload())}>{ctx.onExit?"Voltar":"Recarregar"}</button></div> : <div className="empty">Carregando…</div>;

  const upsert = async (tab,r) => {
    if(!real) return setDb(d => ({...d,[tab]: r.id ? d[tab].map(x=>x.id===r.id?r:x) : [...d[tab],{...r,id:uid()}]}));
    const s = await R.save(tab,r,ctx.company.id);
    setDb(d => ({...d,[tab]: r.id ? d[tab].map(x=>x.id===s.id?s:x) : [...d[tab],s]}));
  };
  const remove = async (tab,id) => {
    if(real) await R.remove(tab,id,ctx.company.id);
    setDb(d => ({...d,[tab]: d[tab].filter(x=>x.id!==id)}));
  };
  const cn = id => (db.clientes.find(x=>x.id===id)||{}).nome||"—";
  const eq = id => { const e = db.equipamentos.find(x=>x.id===id); return e ? e.marca+" "+e.modelo : "—"; };
  const go = p => { setPage(p); setOpen(false); window.scrollTo(0,0); };

  const saveOrdem = o => setDb(d => {
    let ords = d.ordens, lanc = d.lancamentos, rec = {...o};
    if(!rec.id){ // número automático
      const n = Math.max(0,...d.ordens.map(x=>parseInt(x.numero.slice(3),10)||0))+1;
      rec = {...rec,id:uid(),numero:"OS-"+String(n).padStart(4,"0")}; ords = [...ords,rec];
    } else ords = ords.map(x=>x.id===rec.id?rec:x);
    if(rec.status==="Entregue" && !rec.lancado){ // gera receita ao entregar
      rec.lancado = true; ords = ords.map(x=>x.id===rec.id?rec:x);
      lanc = [...lanc,{id:uid(),tipo:"Receita",descricao:rec.numero+" — "+eq(rec.equipId),categoria:"Serviços",valor:rec.orcamento,data:hoje(),status:"Pago"}];
    }
    return {...d,ordens:ords,lancamentos:lanc};
  });

  const wa = r => <a className="btn s n" style={{textDecoration:"none"}} target="_blank" rel="noopener noreferrer"
    href={"https://wa.me/55"+String(r.whatsapp).replace(/\D/g,"")}>WhatsApp</a>;

  const SOON = {dashboard:"Painel",equipamentos:"Equipamentos",ordens:"Ordens de serviço",financeiro:"Financeiro"};
  const telas = {
    dashboard: <Dashboard db={db} go={go}/>,
    clientes: <Crud title="Clientes" sub="Cadastro de clientes e contatos." label="cliente" newLabel="Novo cliente" rows={db.clientes}
      defaults={real?{nome:"",telefone:"",email:"",documento:""}:{nome:"",telefone:"",whatsapp:""}}
      fields={real?[{k:"nome",l:"Nome completo",req:1,w:1},{k:"telefone",l:"Telefone / WhatsApp",t:"tel",req:1},{k:"email",l:"E-mail",t:"email"},{k:"documento",l:"CPF / CNPJ"}]:[{k:"nome",l:"Nome completo",req:1,w:1},{k:"telefone",l:"Telefone",t:"tel"},{k:"whatsapp",l:"WhatsApp",t:"tel",req:1}]}
      cols={real?[{l:"Nome",r:r=><b>{r.nome}</b>},{l:"Telefone / WhatsApp",r:r=>r.telefone||"—"},{l:"E-mail",r:r=>r.email||"—"}]:[{l:"Nome",r:r=><b>{r.nome}</b>},{l:"Telefone",r:r=>r.telefone||"—"},{l:"WhatsApp",r:r=>r.whatsapp}]}
      extra={r=>r.whatsapp?wa(r):null} onSave={r=>upsert("clientes",r)} onDel={id=>remove("clientes",id)}/>,
    equipamentos: <Crud title="Equipamentos" sub="Aparelhos recebidos, marca, modelo e defeito relatado." label="equipamento" newLabel="Novo equipamento" rows={db.equipamentos}
      defaults={{tipo:"Celular",marca:"",modelo:"",defeito:"",clienteId:""}}
      filter={{k:"tipo",opts:TIPOS}} search={r=>[r.tipo,r.marca,r.modelo,r.defeito,cn(r.clienteId)].join(" ")}
      fields={[{k:"tipo",l:"Tipo",opts:TIPOS,req:1},{k:"clienteId",l:"Cliente",opts:db.clientes.map(c=>[c.id,c.nome])},{k:"marca",l:"Marca",req:1},{k:"modelo",l:"Modelo",req:1},{k:"defeito",l:"Defeito relatado",t:"area",w:1,req:1}]}
      cols={[{l:"Tipo",r:r=>r.tipo},{l:"Aparelho",r:r=><b>{r.marca} {r.modelo}</b>},{l:"Defeito",r:r=>r.defeito},{l:"Cliente",r:r=>cn(r.clienteId)}]}
      onSave={r=>upsert("equipamentos",r)} onDel={id=>remove("equipamentos",id)}/>,
    ordens: <Crud title="Ordens de serviço" sub="Acompanhe cada aparelho da entrada até a entrega." label="ordem de serviço" newLabel="Nova OS" rows={db.ordens}
      defaults={{clienteId:"",equipId:"",tecnico:TECNICOS[0],diagnostico:"",orcamento:"",status:"Recebido",data:hoje()}}
      filter={{k:"status",opts:STATUS}} search={r=>[r.numero,cn(r.clienteId),eq(r.equipId),r.tecnico,r.diagnostico,r.status].join(" ")}
      fields={[{k:"clienteId",l:"Cliente",opts:db.clientes.map(c=>[c.id,c.nome]),req:1},
        {k:"equipId",l:"Equipamento",opts:db.equipamentos.map(e=>[e.id,e.marca+" "+e.modelo+" — "+cn(e.clienteId)]),req:1},
        {k:"tecnico",l:"Técnico responsável",opts:TECNICOS,req:1},{k:"status",l:"Status",opts:STATUS,req:1},
        {k:"diagnostico",l:"Diagnóstico",t:"area",w:1},{k:"orcamento",l:"Orçamento (R$)",t:"number"},{k:"data",l:"Data de entrada",t:"date"}]}
      cols={[{l:"Nº",r:r=><b>{r.numero}</b>},{l:"Cliente",r:r=>cn(r.clienteId)},{l:"Equipamento",r:r=>eq(r.equipId)},{l:"Técnico",r:r=>r.tecnico},
        {l:"Status",r:r=><Badge c={COR[r.status]}>{r.status}</Badge>},{l:"Orçamento",r:r=>brl(r.orcamento)},{l:"Entrada",r:r=>dt(r.data)}]}
      onSave={saveOrdem} onDel={id=>remove("ordens",id)}/>,
    estoque: <Crud title="Estoque de peças" sub="Controle de quantidades, custo e preço de venda." label="peça" newLabel="Nova peça" rows={db.pecas}
      defaults={{nome:"",sku:"",qtd:"",minimo:"",custo:"",preco:""}}
      fields={[{k:"nome",l:"Peça",req:1,w:1},{k:"sku",l:"Código (SKU)"},{k:"qtd",l:"Quantidade",t:"number",req:1},{k:"minimo",l:"Estoque mínimo",t:"number"},{k:"custo",l:"Custo (R$)",t:"number"},{k:"preco",l:"Preço de venda (R$)",t:"number"}].filter(f=>!(real&&f.k==="custo"))}
      cols={[{l:"Peça",r:r=><b>{r.nome}</b>},{l:"Código",r:r=>r.sku||"—"},
        {l:"Quantidade",r:r=><Badge c={r.qtd<=r.minimo?"g4":"g1"}>{r.qtd} un.{r.qtd<=r.minimo?" · repor":""}</Badge>},...(real?[]:[{l:"Custo",r:r=>brl(r.custo)}]),{l:"Venda",r:r=>brl(r.preco)}]}
      onSave={r=>upsert("pecas",r)} onDel={id=>remove("pecas",id)}/>,
    financeiro: (() => {
      const s = t => db.lancamentos.filter(l=>l.tipo===t).reduce((a,l)=>a+l.valor,0);
      return <Crud title="Financeiro" sub="Receitas e despesas da assistência." label="lançamento" newLabel="Novo lançamento" rows={db.lancamentos}
        defaults={{tipo:"Receita",descricao:"",categoria:"",valor:"",data:hoje(),status:"Pago"}}
        filter={{k:"tipo",opts:["Receita","Despesa"]}} search={r=>[r.descricao,r.categoria,r.tipo].join(" ")}
        top={<div className="grid" style={{gridTemplateColumns:"repeat(3,1fr)"}}>
          <div className="card kpi"><small>Receitas</small><b>{brl(s("Receita"))}</b></div>
          <div className="card kpi r"><small>Despesas</small><b>{brl(s("Despesa"))}</b></div>
          <div className="card kpi b"><small>Saldo</small><b>{brl(s("Receita")-s("Despesa"))}</b></div></div>}
        fields={[{k:"tipo",l:"Tipo",opts:["Receita","Despesa"],req:1},{k:"status",l:"Situação",opts:["Pago","Pendente"],req:1},{k:"descricao",l:"Descrição",req:1,w:1},{k:"categoria",l:"Categoria"},{k:"valor",l:"Valor (R$)",t:"number",req:1},{k:"data",l:"Data",t:"date"}]}
        cols={[{l:"Data",r:r=>dt(r.data)},{l:"Descrição",r:r=><b>{r.descricao}</b>},{l:"Categoria",r:r=>r.categoria||"—"},
          {l:"Tipo",r:r=><Badge c={r.tipo==="Receita"?"g1":"g4"}>{r.tipo}</Badge>},{l:"Valor",r:r=>brl(r.valor)},{l:"Situação",r:r=><Badge c={r.status==="Pago"?"g2":"g3"}>{r.status}</Badge>}]}
        onSave={r=>upsert("lancamentos",r)} onDel={id=>remove("lancamentos",id)}/>;
    })()
  };

  return <div className="app">
    <aside className={"side"+(open?" open":"")}>
      <div className="logo"><i>🔧</i>SmartGestão</div>
      <nav className="nav">{MENU.map(m=><button key={m[0]} className={page===m[0]?"on":""} onClick={()=>go(m[0])}><span>{m[1]}</span>{m[2]}</button>)}</nav>
      <div className="sfoot">{real ? <div><b>{ctx.company.name}</b>{ctx.user.email}<br/><button onClick={ctx.onSwitch}>Trocar empresa</button><button onClick={ctx.onExit}>Sair</button></div> : <div>Modo demonstração<br/>Dados salvos neste navegador{ctx.onExit && <div><button onClick={ctx.onExit}>Voltar ao login</button></div>}</div>}</div>
    </aside>
    <div className={"scrim"+(open?" open":"")} onClick={()=>setOpen(false)}/>
    <main className="main">
      <div className="top"><button aria-label="Abrir menu" onClick={()=>setOpen(true)}>☰</button>SmartGestão</div>
      {real && SOON[page] ? <Soon t={SOON[page]}/> : telas[page]}
    </main>
  </div>;
}
ReactDOM.createRoot(document.getElementById("root")).render(<Root/>);
