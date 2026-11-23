// ARQUIVO: screen-dashboard.jsx — tela do painel
/* ============ TELAS ============ */
function Dashboard({db,go}){
  const nome = (id,l) => (db[l].find(x=>x.id===id)||{}).nome||"—";
  const rec = db.lancamentos.filter(l=>l.tipo==="Receita"&&l.status==="Pago").reduce((s,l)=>s+l.valor,0);
  const abertas = db.ordens.filter(o=>o.status!=="Entregue").length;
  const conc = db.ordens.filter(o=>o.status==="Pronto"||o.status==="Entregue").length;
  const pend = db.ordens.filter(o=>["Recebido","Em análise","Aguardando aprovação"].includes(o.status)).length;
  const max = Math.max(1,...STATUS.map(s=>db.ordens.filter(o=>o.status===s).length));
  const baixo = db.pecas.filter(p=>p.qtd<=p.minimo);
  return <>
    <h1>Painel geral</h1><p className="sub">Resumo da sua assistência técnica hoje.</p>
    <div className="grid">
      <div className="card kpi"><small>Faturamento recebido</small><b>{brl(rec)}</b></div>
      <div className="card kpi b"><small>Ordens abertas</small><b>{abertas}</b></div>
      <div className="card kpi"><small>Serviços concluídos</small><b>{conc}</b></div>
      <div className="card kpi w"><small>Serviços pendentes</small><b>{pend}</b></div>
    </div>
    <div className="two">
      <div className="card"><h3>Ordens por status</h3>
        {STATUS.map(s=>{const n=db.ordens.filter(o=>o.status===s).length;
          return <div className="bar" key={s}><span>{s}</span><div><i style={{width:(n/max*100)+"%"}}/></div><b>{n}</b></div>})}
      </div>
      <div className="card"><h3>Estoque em alerta</h3>
        {baixo.length===0 ? <p className="mut">Tudo certo com o estoque.</p> :
          baixo.map(p=><div key={p.id} className="bar"><span style={{width:"auto",flex:1,color:"var(--tx)"}}>{p.nome}</span><Badge c="g4">{p.qtd} un.</Badge></div>)}
        <button className="btn s g" onClick={()=>go("estoque")}>Ver estoque</button>
      </div>
    </div>
    <div className="card tw" style={{marginTop:14}}>
      <div style={{padding:"16px 16px 4px"}}><h3>Últimas ordens de serviço</h3></div>
      <table><thead><tr><th>Nº</th><th>Cliente</th><th>Equipamento</th><th>Status</th><th>Orçamento</th></tr></thead>
      <tbody>{[...db.ordens].reverse().slice(0,5).map(o=>{const e=db.equipamentos.find(x=>x.id===o.equipId)||{};
        return <tr key={o.id}><td data-l="Nº"><b>{o.numero}</b></td><td data-l="Cliente">{nome(o.clienteId,"clientes")}</td>
        <td data-l="Equipamento">{e.marca} {e.modelo}</td><td data-l="Status"><Badge c={COR[o.status]}>{o.status}</Badge></td><td data-l="Orçamento">{brl(o.orcamento)}</td></tr>})}</tbody></table>
    </div>
  </>;
}
