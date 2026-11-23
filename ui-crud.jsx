// ARQUIVO: ui-crud.jsx — listagem genérica com busca, filtros, edição e exclusão
function Crud({title,sub,rows,fields,cols,filter,search,extra,newLabel,defaults,onSave,onDel,top,label}){
  const [q,setQ] = useState(""), [f,setF] = useState("Todos"), [ed,setEd] = useState(null), [del,setDel] = useState(null), [de,setDe] = useState("");
  const list = [...rows].reverse().filter(r =>
    (f==="Todos"||!filter||r[filter.k]===f) &&
    (!q || (search?search(r):Object.values(r).join(" ")).toLowerCase().includes(q.toLowerCase())));
  return <>
    <div className="head"><div><h1>{title}</h1><p className="sub">{sub}</p></div>
      <button className="btn" onClick={()=>setEd({...defaults})}>+ {newLabel}</button></div>
    {top}
    {de && <div className="err" role="alert" onClick={()=>setDe("")}>{de} (toque para fechar)</div>}
    <div className="tools">
      <input placeholder="Buscar…" aria-label="Buscar" value={q} onChange={e=>setQ(e.target.value)}/>
      {filter && <div className="chips">{["Todos",...filter.opts].map(o =>
        <button key={o} className={"chip"+(f===o?" on":"")} onClick={()=>setF(o)}>{o}</button>)}</div>}
    </div>
    <div className="card tw">
      {list.length===0 ? <div className="empty">Nenhum registro encontrado. Clique em “{newLabel}” para cadastrar.</div> :
      <table><thead><tr>{cols.map(c=><th key={c.l}>{c.l}</th>)}<th></th></tr></thead>
      <tbody>{list.map(r => <tr key={r.id}>
        {cols.map(c=><td key={c.l} data-l={c.l}>{c.r(r)}</td>)}
        <td className="ac"><div className="acts">
          {extra && extra(r)}
          <button className="btn s g" onClick={()=>setEd(r)}>Editar</button>
          {del===r.id ? <button className="btn s d" onClick={async()=>{try{await onDel(r.id);setDel(null)}catch(ex){setDel(null);setDe(ex.message||"Erro ao excluir.")}}}>Confirmar?</button>
            : <button className="btn s g" onClick={()=>setDel(r.id)} onBlur={()=>setDel(null)}>Excluir</button>}
        </div></td></tr>)}</tbody></table>}
    </div>
    {ed && <Form title={(ed.id?"Editar ":"Novo(a) ")+label} fields={fields} init={ed} onClose={()=>setEd(null)} onSubmit={async x=>{await onSave(x);setEd(null)}}/>}
  </>;
}
