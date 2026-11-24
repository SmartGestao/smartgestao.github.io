
// ARQUIVO: screen-dashboard.jsx — painel com gráficos animados

function Dashboard({db,go}){
  const nome=(id,l)=>
    (db[l].find(x=>x.id===id)||{}).nome||"—";

  const rec=db.lancamentos
    .filter(l=>l.tipo==="Receita"&&l.status==="Pago")
    .reduce((s,l)=>s+Number(l.valor||0),0);

  const abertas=db.ordens.filter(
    o=>o.status!=="Entregue"
  ).length;

  const conc=db.ordens.filter(
    o=>o.status==="Pronto"||o.status==="Entregue"
  ).length;

  const pend=db.ordens.filter(
    o=>["Recebido","Em análise","Aguardando aprovação"].includes(o.status)
  ).length;

  const baixo=db.pecas.filter(
    p=>Number(p.qtd)<=Number(p.minimo)
  );

  const totalOrdens=db.ordens.length;

  const max=Math.max(
    1,
    ...STATUS.map(s=>
      db.ordens.filter(o=>o.status===s).length
    )
  );

  const percentualConcluido=totalOrdens
    ?Math.round(conc/totalOrdens*100)
    :0;

  return <>
    <style>{`
      @keyframes dashboardEnter {
        from {
          opacity:0;
          transform:translateY(12px);
        }
        to {
          opacity:1;
          transform:translateY(0);
        }
      }

      @keyframes chartGrow {
        from { width:0; }
        to { width:var(--bar-width); }
      }

      @keyframes numberAppear {
        from {
          opacity:0;
          transform:translateY(7px);
        }
        to {
          opacity:1;
          transform:translateY(0);
        }
      }

      .dash-enter {
        animation:dashboardEnter .55s ease both;
      }

      .dash-kpi {
        transition:transform .25s ease,box-shadow .25s ease;
      }

      .dash-kpi:hover {
        transform:translateY(-4px);
        box-shadow:0 10px 25px rgba(15,23,42,.09);
      }

      .dash-kpi b {
        display:block;
        animation:numberAppear .7s ease both;
      }

      .dash-chart-row {
        display:grid;
        grid-template-columns:minmax(95px,145px) 1fr 30px;
        align-items:center;
        gap:12px;
        margin:17px 0;
      }

      .dash-chart-label {
        font-size:12px;
        color:var(--tx);
        font-weight:600;
      }

      .dash-chart-track {
        height:10px;
        border-radius:20px;
        background:var(--bg,#eef2f7);
        overflow:hidden;
      }

      .dash-chart-fill {
        height:100%;
        width:var(--bar-width);
        border-radius:20px;
        background:linear-gradient(90deg,#2563eb,#60a5fa);
        animation:chartGrow 1s cubic-bezier(.22,1,.36,1) both;
        animation-delay:var(--delay,0ms);
      }

      .dash-chart-value {
        font-size:12px;
        font-weight:700;
        text-align:right;
        color:var(--tx);
      }

      .dash-progress {
        height:9px;
        border-radius:20px;
        overflow:hidden;
        background:var(--bg,#eef2f7);
        margin-top:12px;
      }

      .dash-progress-fill {
        height:100%;
        width:var(--bar-width);
        border-radius:20px;
        background:linear-gradient(90deg,#059669,#34d399);
        animation:chartGrow 1.2s ease both;
        animation-delay:250ms;
      }

      .dash-section-title {
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:12px;
        flex-wrap:wrap;
      }

      .dash-section-title h3 {
        margin:0;
      }

      .dash-muted {
        color:var(--muted,var(--tx));
        font-size:12px;
      }

      .dash-alert-item {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        padding:12px 0;
        border-bottom:1px solid var(--bd,#e5e7eb);
        animation:dashboardEnter .5s ease both;
      }

      .dash-alert-item:last-child {
        border-bottom:0;
      }

      @media(max-width:600px) {
        .dash-chart-row {
          grid-template-columns:105px 1fr 25px;
          gap:7px;
        }
      }

      @media(prefers-reduced-motion:reduce) {
        .dash-enter,
        .dash-kpi b,
        .dash-chart-fill,
        .dash-progress-fill,
        .dash-alert-item {
          animation:none!important;
        }

        .dash-kpi {
          transition:none!important;
        }
      }
    `}</style>

    <div className="dash-enter">
      <h1>Painel geral</h1>
      <p className="sub">
        Resumo da sua assistência técnica hoje.
      </p>

      <div className="grid">
        <div className="card kpi dash-kpi">
          <small>Faturamento recebido</small>
          <b>{brl(rec)}</b>
        </div>

        <div className="card kpi b dash-kpi">
          <small>Ordens abertas</small>
          <b>{abertas}</b>
        </div>

        <div className="card kpi dash-kpi">
          <small>Serviços concluídos</small>
          <b>{conc}</b>
        </div>

        <div className="card kpi w dash-kpi">
          <small>Serviços pendentes</small>
          <b>{pend}</b>
        </div>
      </div>

      <div className="two">
        <div className="card">
          <div className="dash-section-title">
            <h3>Ordens por status</h3>
            <span className="dash-muted">
              {totalOrdens} ordens registradas
            </span>
          </div>

          {totalOrdens===0
            ?(
              <p className="mut">
                Nenhuma ordem cadastrada ainda.
              </p>
            )
            :STATUS.map((s,i)=>{
              const n=db.ordens.filter(
                o=>o.status===s
              ).length;

              const percentual=n/max*100;

              return (
                <div className="dash-chart-row" key={s}>
                  <span className="dash-chart-label">
                    {s}
                  </span>

                  <div className="dash-chart-track">
                    <div
                      className="dash-chart-fill"
                      style={{
                        "--bar-width":percentual+"%",
                        "--delay":(i*100)+"ms"
                      }}
                    />
                  </div>

                  <b className="dash-chart-value">
                    {n}
                  </b>
                </div>
              );
            })
          }

          <div style={{
            marginTop:22,
            paddingTop:16,
            borderTop:"1px solid var(--bd,#e5e7eb)"
          }}>
            <div className="dash-section-title">
              <span className="dash-muted">
                Taxa de conclusão
              </span>
              <b>{percentualConcluido}%</b>
            </div>

            <div className="dash-progress">
              <div
                className="dash-progress-fill"
                style={{
                  "--bar-width":percentualConcluido+"%"
                }}
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="dash-section-title">
            <h3>Estoque em alerta</h3>
            <span className="dash-muted">
              {baixo.length} itens
            </span>
          </div>

          {baixo.length===0
            ?(
              <p className="mut">
                Tudo certo com o estoque.
              </p>
            )
            :baixo.map((p,i)=>(
              <div
                key={p.id}
                className="dash-alert-item"
                style={{animationDelay:(i*80)+"ms"}}
              >
                <div>
                  <b>{p.nome}</b>
                  <div className="dash-muted">
                    Mínimo: {p.minimo||0} un.
                  </div>
                </div>

                <Badge c="g4">
                  {p.qtd} un.
                </Badge>
              </div>
            ))
          }

          <button
            className="btn s g"
            onClick={()=>go("estoque")}
          >
            Ver estoque
          </button>
        </div>
      </div>

      <div
        className="card tw"
        style={{marginTop:14}}
      >
        <div style={{padding:"16px 16px 4px"}}>
          <div className="dash-section-title">
            <h3>Últimas ordens de serviço</h3>

            <button
              className="btn s g"
              onClick={()=>go("ordens")}
            >
              Ver todas
            </button>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Nº</th>
              <th>Cliente</th>
              <th>Equipamento</th>
              <th>Status</th>
              <th>Orçamento</th>
            </tr>
          </thead>

          <tbody>
            {[...db.ordens]
              .reverse()
              .slice(0,5)
              .map(o=>{
                const e=db.equipamentos.find(
                  x=>x.id===o.equipId
                )||{};

                return (
                  <tr key={o.id}>
                    <td data-l="Nº">
                      <b>{o.numero}</b>
                    </td>

                    <td data-l="Cliente">
                      {nome(o.clienteId,"clientes")}
                    </td>

                    <td data-l="Equipamento">
                      {e.marca} {e.modelo}
                    </td>

                    <td data-l="Status">
                      <Badge c={COR[o.status]}>
                        {o.status}
                      </Badge>
                    </td>

                    <td data-l="Orçamento">
                      {brl(o.orcamento)}
                    </td>
                  </tr>
                );
              })
            }
          </tbody>
        </table>
      </div>
    </div>
  </>;
}
