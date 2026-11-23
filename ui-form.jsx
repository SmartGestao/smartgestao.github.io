// ARQUIVO: ui-form.jsx — formulário genérico (modal)
/* ============ FORMULÁRIO E LISTAGEM GENÉRICOS ============ */
function Form({title,fields,init,onClose,onSubmit}){
  const [v,setV] = useState(init), [err,setErr] = useState(""), [busy,setBusy] = useState(false);
  const set = (k,x) => setV(p => ({...p,[k]:x}));
  const submit = async e => {
    e.preventDefault();
    const miss = fields.find(f => f.req && !String(v[f.k]??"").trim());
    if(miss) return setErr("Preencha o campo: "+miss.l);
    const out = {...v};
    fields.forEach(f => { if(f.t==="number") out[f.k] = Number(out[f.k]||0); });
    setBusy(true); setErr("");
    try{ await onSubmit(out); }catch(ex){ setErr(ex.message||"Erro ao salvar."); setBusy(false); }
  };
  return <div className="ov" onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
    <form className="modal" onSubmit={submit}>
      <h2>{title}</h2>
      <div className="fg">{fields.map(f => <div key={f.k} className={"fld"+(f.w?" w":"")}>
        <label>{f.l}{f.req?" *":""}</label>
        {f.opts ? <select value={v[f.k]??""} onChange={e=>set(f.k,e.target.value)}>
            {!f.req||!v[f.k] ? <option value="">Selecione…</option> : null}
            {f.opts.map(o => Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o}>{o}</option>)}
          </select>
        : f.t==="area" ? <textarea rows="3" value={v[f.k]??""} onChange={e=>set(f.k,e.target.value)}/>
        : <input type={f.t||"text"} step={f.t==="number"?"0.01":undefined} min={f.t==="number"?"0":undefined} inputMode={f.t==="tel"?"tel":undefined} value={v[f.k]??""} onChange={e=>set(f.k,e.target.value)}/>}
      </div>)}</div>
      {err && <div className="err">{err}</div>}
      <div className="mf"><button type="button" className="btn g" onClick={onClose}>Cancelar</button><button className="btn" disabled={busy}>{busy?"Salvando…":"Salvar"}</button></div>
    </form>
  </div>;
}
