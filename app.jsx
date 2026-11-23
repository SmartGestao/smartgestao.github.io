
// ARQUIVO: screen-subscription.jsx — contratação e acompanhamento do plano SmartGestão
async function subscriptionErrorMessage(ex){
  try{
    const response=ex?.context;
    if(response&&typeof response.clone==="function"){
      const body=await response.clone().json();
      if(body?.details)return `${body.error||"Falha na assinatura"}: ${body.details}`;
      if(body?.error)return body.error;
    }
  }catch(_){ }
  return ex?.message||"Não foi possível concluir a operação da assinatura.";
}

function SubscriptionScreen({ctx}){
  const [nome,setNome]=useState(ctx.user?.user_metadata?.full_name||"");
  const [cpf,setCpf]=useState("");
  const [telefone,setTelefone]=useState("");
  const [status,setStatus]=useState(null);
  const [paymentUrl,setPaymentUrl]=useState("");
  const [erro,setErro]=useState("");
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [exempt,setExempt]=useState(false);

  const carregar=async()=>{
    setErro("");
    try{
      const {data,error}=await sb.functions.invoke("asaas-assinaturas",{body:{action:"status",company_id:ctx.company.id}});
      if(error)throw error;

      setExempt(data?.exempt===true);

      if(data?.has_subscription){
        setStatus(data.status);
        setPaymentUrl(data.payment_url||"");
      }else{
        setStatus("none");
        setPaymentUrl("");
      }
    }catch(ex){
      setErro(await subscriptionErrorMessage(ex));
    }finally{setLoading(false);}
  };

  useEffect(()=>{if(!ctx.real){setLoading(false);return;}carregar();},[]);

  const contratar=async e=>{
    e.preventDefault();setErro("");setBusy(true);
    try{
      const {data,error}=await sb.functions.invoke("asaas-assinaturas",{
        body:{
          company_id:ctx.company.id,
          customer_name:nome.trim(),
          cpf_cnpj:cpf.replace(/\D/g,""),
          phone:telefone.replace(/\D/g,"")
        }
      });
      if(error)throw error;
      if(!data?.success)throw new Error(data?.error||"Não foi possível iniciar a assinatura.");
      setStatus(data.status||"pending");
      setPaymentUrl(data.payment_url||"");
    }catch(ex){setErro(await subscriptionErrorMessage(ex));}
    finally{setBusy(false);}
  };

  const statusLabel={none:"Ainda não contratado",pending:"Aguardando pagamento",active:"Assinatura ativa",past_due:"Pagamento em atraso",cancelled:"Assinatura cancelada",inactive:"Inativa"};

  if(!ctx.real)return <div className="box"><h2>Assinatura SmartGestão</h2><p className="mut">A contratação fica disponível após entrar em uma conta de empresa.</p></div>;

  return <div className="subscription-page">
    <div className="sub-heading">
      <div><span className="workspace-overline">PLANO E COBRANÇA</span><h1>Assinatura</h1><p className="mut">Gerencie o plano mensal da sua empresa.</p></div>
    </div>

    {!exempt&&<div className="sub-plan card">
      <div className="sub-plan-top"><div><span className="sub-kicker">PLANO SMARTGESTÃO</span><h2>Completo</h2><p>Gestão de clientes, ordens de serviço, equipamentos, estoque e financeiro.</p></div><div className="sub-price"><strong>R$ 39,90</strong><span>por mês</span></div></div>
      <div className="sub-includes"><span>✓ Acesso aos módulos</span><span>✓ Dados separados por empresa</span><span>✓ Atualizações da plataforma</span></div>
    </div>}

    <div className="card sub-status-card">
      <h3>Situação da assinatura</h3>
      {loading?<p className="mut">Consultando…</p>:<>
        {exempt?<div className="ok"><b>Acesso administrativo gratuito e permanente</b><p>Esta empresa possui isenção de cobrança e acesso liberado a todos os módulos do SmartGestão.</p></div>:<>
          <p><span className={"sub-status-dot "+(status==="active"?"active":status==="pending"?"pending":"")}></span><b>{statusLabel[status]||"Não identificada"}</b></p>
          {status==="active"&&<p className="ok">Pagamento confirmado. Sua assinatura está ativa.</p>}
          {status==="pending"&&<p className="mut">Finalize o pagamento para ativar a assinatura.</p>}
          {status==="past_due"&&<p className="err">Existe um pagamento em atraso. Regularize para manter o serviço ativo.</p>}
          {paymentUrl&&status!=="active"&&<a className="btn sub-pay-link" href={paymentUrl} target="_blank" rel="noopener noreferrer">Continuar para pagamento</a>}
          {status==="pending"&&!paymentUrl&&<button className="btn g" onClick={carregar}>Atualizar cobrança</button>}
        </>}
      </>}
    </div>

    {(!loading&&!exempt&&(status==="none"||status==="cancelled"||status==="inactive"))&&<form className="card sub-form" onSubmit={contratar}>
      <h3>Contratar assinatura</h3>
      <p className="mut">Informe os dados do responsável pela cobrança. O e-mail será o mesmo da sua conta SmartGestão.</p>
      <div className="fld"><label>Nome completo do responsável</label><input value={nome} onChange={e=>setNome(e.target.value)} placeholder="Nome completo" required/></div>
      <div className="fg">
        <div className="fld"><label>CPF ou CNPJ</label><input value={cpf} onChange={e=>setCpf(e.target.value)} placeholder="Somente números ou pontuação" inputMode="numeric" required/></div>
        <div className="fld"><label>Telefone (opcional)</label><input value={telefone} onChange={e=>setTelefone(e.target.value)} placeholder="DDD + número" inputMode="tel"/></div>
      </div>
      {erro&&<div className="err" role="alert">{erro}</div>}
      <button className="btn" disabled={busy}>{busy?"Preparando cobrança…":"Contratar por R$ 39,90/mês"}</button>
      <p className="sub-note">A contratação online será liberada após a aprovação da conta de produção do SmartGestão no Asaas. Não tente contratar enquanto essa validação estiver pendente.</p>
    </form>}

    {erro&&status!=="none"&&<div className="err" role="alert">{erro}</div>}
  </div>;
}
