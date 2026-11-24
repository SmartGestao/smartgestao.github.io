
// ARQUIVO: app.jsx — menu, telas, regras de negócio e inicialização

/* ============ APLICAÇÃO ============ */

const MENU = [
  ["dashboard","📊","Painel"],
  ["empresa","🏢","Dados da empresa"],
  ["ordens","🛠️","Ordens de serviço"],
  ["garantias","🛡️","Garantias"],
  ["clientes","👥","Clientes"],
  ["equipamentos","📱","Equipamentos"],
  ["estoque","📦","Estoque de peças"],
  ["financeiro","💰","Financeiro"],
  ["assinatura","💳","Assinatura"]
];

function App({ctx}){
  const real=ctx.real,R=ctx.repo;

  const [db,setDb]=useState(null);
  const [page,setPage]=useState("dashboard");
  const [open,setOpen]=useState(false);
  const [msg,setMsg]=useState("");

  const [subscriptionState,setSubscriptionState]=useState(real?"checking":"active");

  useEffect(()=>{
    if(real && subscriptionState!=="active") return;

    let alive=true;

    R.load(real?ctx.company.id:undefined)
      .then(data=>{
        if(alive)setDb(data);
      })
      .catch(e=>{
        if(alive)setMsg(erroPt(e));
      });

    return ()=>{alive=false;};
  },[real,ctx.company?.id,subscriptionState]);

  useEffect(()=>{
    if(!real||subscriptionState!=="checking") return;

    let alive=true;

    sb.functions.invoke("asaas-assinaturas",{
      body:{
        action:"status",
        company_id:ctx.company.id
      }
    }).then(({data,error})=>{
      if(!alive)return;

      if(error||!data||data.error){
        setSubscriptionState("unverified");
      }else{
        setSubscriptionState(
          data.exempt===true ||
          (data.has_subscription&&data.status==="active")
            ? "active"
            : "inactive"
        );
      }
    }).catch(()=>{
      if(alive)setSubscriptionState("unverified");
    });

    return ()=>{alive=false;};
  },[real,ctx.company?.id,subscriptionState]);

  useEffect(()=>{
    if(db&&!real)R.save(db);
  },[db]);

  if(real&&subscriptionState==="checking"){
    return <div className="empty">Verificando a assinatura da empresa…</div>;
  }

  if(real&&subscriptionState==="inactive"){
    return <SubscriptionScreen ctx={ctx}/>;
  }

  if(real&&subscriptionState==="unverified"){
    return (
      <div className="empty" role="alert">
        Não foi possível confirmar a assinatura agora.
        Por segurança, o acesso aos módulos está pausado.
        <br/><br/>
        <button
          className="btn"
          onClick={()=>setSubscriptionState("checking")}
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if(!db){
    return msg
      ?(
        <div className="empty" role="alert">
          {msg}
          <br/><br/>
          <button
            className="btn"
            onClick={ctx.onExit||(()=>location.reload())}
          >
            {ctx.onExit?"Voltar":"Recarregar"}
          </button>
        </div>
      )
      :<div className="empty">Carregando…</div>;
  }

  /* ============ SALVAR DADOS ============ */

  const upsert=async(tab,r)=>{
    // Perfil da empresa: registro único por empresa
    if(tab==="perfilEmpresa"){
      if(!real){
        const perfil={
          ...r,
          id:r.id||uid()
        };

        setDb(d=>({
          ...d,
          perfilEmpresa:perfil
        }));

        return;
      }

      const salvo=await R.save(
        "perfilEmpresa",
        r,
        ctx.company.id
      );

      setDb(d=>({
        ...d,
        perfilEmpresa:salvo
      }));

      return;
    }

    if(!real){
      return setDb(d=>({
        ...d,
        [tab]:r.id
          ?d[tab].map(x=>x.id===r.id?r:x)
          :[...d[tab],{...r,id:uid()}]
      }));
    }

    const s=await R.save(tab,r,ctx.company.id);

    setDb(d=>({
      ...d,
      [tab]:r.id
        ?d[tab].map(x=>x.id===s.id?s:x)
        :[...d[tab],s]
    }));
  };

  const remove=async(tab,id)=>{
    if(real)await R.remove(tab,id,ctx.company.id);

    setDb(d=>({
      ...d,
      [tab]:d[tab].filter(x=>x.id!==id)
    }));
  };

  const cn=id=>
    (db.clientes.find(x=>x.id===id)||{}).nome||"—";

  const eq=id=>{
    const e=db.equipamentos.find(x=>x.id===id);
    return e?e.marca+" "+e.modelo:"—";
  };

  const go=p=>{
    setPage(p);
    setOpen(false);
    window.scrollTo(0,0);
  };

  const somarDias=(data,dias)=>{
    const d=new Date(data+"T12:00:00");
    d.setDate(d.getDate()+Number(dias||90));
    return d.toISOString().slice(0,10);
  };

  /* ============ SALVAR ORDEM DE SERVIÇO ============ */

  const saveOrdem=async o=>{
    if(real){
      const salva=await R.save("ordens",o,ctx.company.id);

      let atualizado=await R.load(ctx.company.id);

      let garantia=(atualizado.garantias||[]).find(
        g=>g.osId===salva.id
      );

      if(
        (salva.status==="Pronto"||salva.status==="Entregue")&&
        !garantia
      ){
        garantia=await R.save("garantias",{
          osId:salva.id,
          clienteId:salva.clienteId,
          equipamentoId:salva.equipId,
          numeroCertificado:"GAR-"+String(salva.id).replace(/-/g,"").slice(0,12).toUpperCase(),
          dias:90,
          descricao:salva.diagnostico||
            "Serviço realizado na "+salva.numero,
          termos:
            "Garantia de 90 dias para o serviço realizado, respeitadas as condições legais aplicáveis.",
          status:"pending_delivery"
        },ctx.company.id);
      }

      if(
        salva.status==="Entregue"&&
        garantia&&
        garantia.status!=="active"
      ){
        const inicio=hoje();

        await R.save("garantias",{
          ...garantia,
          inicio,
          fim:somarDias(inicio,garantia.dias||90),
          status:"active"
        },ctx.company.id);
      }

      atualizado=await R.load(ctx.company.id);
      setDb(atualizado);
      return;
    }

    setDb(d=>{
      let ords=d.ordens;
      let lanc=d.lancamentos;
      let garantias=d.garantias||[];
      let rec={...o};

      if(!rec.id){
        const n=Math.max(
          0,
          ...d.ordens.map(
            x=>parseInt((x.numero||"").slice(3),10)||0
          )
        )+1;

        rec={
          ...rec,
          id:uid(),
          numero:"OS-"+String(n).padStart(4,"0")
        };

        ords=[...ords,rec];
      }else{
        ords=ords.map(x=>x.id===rec.id?rec:x);
      }

      if(
        rec.status==="Pronto"&&
        !rec.lancado&&
        Number(rec.orcamento||0)>0
      ){
        rec.lancado=true;

        ords=ords.map(x=>x.id===rec.id?rec:x);

        lanc=[
          ...lanc,
          {
            id:uid(),
            tipo:"Receita",
            descricao:rec.numero+" — "+eq(rec.equipId),
            categoria:"Serviços",
            valor:Number(rec.orcamento||0),
            data:hoje(),
            status:"Pendente"
          }
        ];
      }

      let garantia=garantias.find(g=>g.osId===rec.id);

      if(
        (rec.status==="Pronto"||rec.status==="Entregue")&&
        !garantia
      ){
        garantia={
          id:uid(),
          osId:rec.id,
          clienteId:rec.clienteId,
          equipamentoId:rec.equipId,
          numeroCertificado:"GAR-"+String(rec.id).replace(/-/g,"").slice(0,12).toUpperCase(),
          dias:90,
          inicio:"",
          fim:"",
          descricao:rec.diagnostico||
            "Serviço realizado na "+rec.numero,
          termos:
            "Garantia de 90 dias para o serviço realizado, respeitadas as condições legais aplicáveis.",
          status:"pending_delivery",
          whatsapp:"",
          enviadoEm:"",
          url:""
        };

        garantias=[...garantias,garantia];
      }

      if(
        rec.status==="Entregue"&&
        garantia&&
        garantia.status!=="active"
      ){
        const inicio=hoje();

        garantia={
          ...garantia,
          inicio,
          fim:somarDias(inicio,garantia.dias||90),
          status:"active"
        };

        garantias=garantias.map(
          g=>g.id===garantia.id?garantia:g
        );
      }

      return {
        ...d,
        ordens:ords,
        lancamentos:lanc,
        garantias
      };
    });
  };

  /* ============ WHATSAPP ============ */

  const wa=r=>(
    <a
      className="btn s n"
      style={{textDecoration:"none"}}
      target="_blank"
      rel="noopener noreferrer"
      href={"https://wa.me/55"+String(r.whatsapp).replace(/\D/g,"")}
    >
      WhatsApp
    </a>
  );

  const enviarGarantiaWhatsApp=r=>{
    const cliente=db.clientes.find(c=>c.id===r.clienteId);
    const telefone=cliente?.telefone||cliente?.whatsapp||"";

    if(!telefone){
      alert("Este cliente não possui telefone cadastrado.");
      return;
    }

    const mensagem=
      "Olá, "+(cliente.nome||"cliente")+"! "+
      "Sua garantia referente à OS "+(r.numeroCertificado||"")+
      " está disponível. "+
      "Prazo: "+(r.dias||90)+" dias. "+
      "Início: "+(r.inicio||"aguardando entrega")+". "+
      "Validade: "+(r.fim||"a definir")+". "+
      "Em caso de dúvidas, entre em contato com nossa assistência.";

    const texto=window.prompt(
      "Confira e confirme a mensagem que será aberta no WhatsApp:",
      mensagem
    );

    if(texto===null)return;

    const numero=String(telefone).replace(/\D/g,"");

    window.open(
      "https://wa.me/55"+numero+"?text="+encodeURIComponent(texto),
      "_blank"
    );
  };

  /* ============ CERTIFICADO DE GARANTIA ============ */

  const gerarCertificadoPDF = r => {
    const cliente = db.clientes.find(c => c.id === r.clienteId) || {};
    const equipamento = db.equipamentos.find(e => e.id === r.equipamentoId) || {};
    const ordem = db.ordens.find(o => o.id === r.osId) || {};

    const perfil=db.perfilEmpresa||{};

    const empresa=
      perfil.nomeFantasia||
      perfil.razaoSocial||
      ctx.company?.name||
      "Assistência técnica";

    const endereco=[
      perfil.rua,
      perfil.numero,
      perfil.complemento,
      perfil.bairro,
      perfil.cidade,
      perfil.estado
    ].filter(Boolean).join(", ");

    const esc = v => String(v ?? "—").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;",
      '"': "&quot;", "'": "&#39;"
    }[c]));

    const w = window.open("", "_blank");

    if (!w) {
      alert("Permita pop-ups para gerar o certificado.");
      return;
    }

    const status = r.status === "active" ? "Ativa" :
      r.status === "expired" ? "Expirada" :
      r.status === "cancelled" ? "Cancelada" :
      "Aguardando entrega";

    const linhas = [
      '<!DOCTYPE html>',
      '<html lang="pt-BR">',
      '<head>',
      '<meta charset="utf-8">',
      '<title>Certificado ' + esc(r.numeroCertificado) + '</title>',
      '<style>',
      '*{box-sizing:border-box}',
      'body{font-family:Arial,sans-serif;color:#1f2937;padding:30px}',
      '.doc{max-width:800px;margin:auto;border:1px solid #ddd;padding:35px}',
      'h1{text-align:center;color:#183b63;margin:35px 0}',
      'h2{font-size:14px;color:#183b63;border-bottom:1px solid #ddd;padding-bottom:8px;margin-top:25px}',
      '.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}',
      '.field{font-size:12px;color:#64748b}',
      '.field b{display:block;color:#1f2937;font-size:14px;margin-top:5px}',
      '.terms{font-size:13px;line-height:1.6;white-space:pre-wrap}',
      '.top{display:flex;justify-content:space-between;border-bottom:3px solid #183b63;padding-bottom:20px;gap:20px}',
      '.brand{font-size:22px;font-weight:bold;color:#183b63}',
      '.company-info{font-size:11px;line-height:1.6;color:#475569;margin-top:8px}',
      '.logo{max-width:110px;max-height:65px;object-fit:contain;margin-bottom:8px}',
      '.number{text-align:right;font-size:12px;min-width:130px}',
      'button{display:block;margin:0 auto 20px;padding:12px 20px;background:#183b63;color:white;border:0;border-radius:6px;cursor:pointer}',
      '.sign{display:grid;grid-template-columns:1fr 1fr;gap:50px;margin-top:70px;text-align:center;font-size:12px}',
      '.line{border-top:1px solid #555;padding-top:8px}',
      'footer{text-align:center;border-top:1px solid #ddd;margin-top:30px;padding-top:12px;font-size:10px}',
      '@media print{body{padding:0}.doc{border:0;padding:15px}button{display:none}@page{size:A4;margin:14mm}}',
      '</style>',
      '</head>',
      '<body>',
      '<button onclick="window.print()">Imprimir / Salvar como PDF</button>',
      '<main class="doc">',
      '<div class="top">',
      '<div>',
      perfil.logoUrl?'<img class="logo" src="'+esc(perfil.logoUrl)+'" alt="Logotipo">':'',
      '<div class="brand">' + esc(empresa) + '</div>',
      '<div class="company-info">',
      perfil.razaoSocial&&perfil.nomeFantasia
        ?'Razão social: '+esc(perfil.razaoSocial)+'<br>':'',
      perfil.documento?'CNPJ/CPF: '+esc(perfil.documento)+'<br>':'',
      endereco?esc(endereco)+'<br>':'',
      perfil.cep?'CEP: '+esc(perfil.cep)+'<br>':'',
      perfil.telefone?'Telefone: '+esc(perfil.telefone)+'<br>':'',
      perfil.whatsapp?'WhatsApp: '+esc(perfil.whatsapp)+'<br>':'',
      perfil.email?esc(perfil.email):'',
      '</div>',
      '<p style="font-size:12px;margin-bottom:0">Certificado de garantia de serviço</p>',
      '</div>',
      '<div class="number">CERTIFICADO<strong><br>' + esc(r.numeroCertificado) + '</strong></div>',
      '</div>',
      '<h1>CERTIFICADO DE GARANTIA</h1>',
      '<h2>DADOS DO CLIENTE</h2>',
      '<div class="grid">',
      '<div class="field">Cliente<b>' + esc(cliente.nome) + '</b></div>',
      '<div class="field">Telefone<b>' + esc(cliente.telefone || cliente.whatsapp || "Não informado") + '</b></div>',
      '<div class="field">CPF/CNPJ<b>' + esc(cliente.documento || "Não informado") + '</b></div>',
      '</div>',
      '<h2>EQUIPAMENTO E SERVIÇO</h2>',
      '<div class="grid">',
      '<div class="field">Ordem de serviço<b>' + esc(ordem.numero) + '</b></div>',
      '<div class="field">Equipamento<b>' + esc((equipamento.marca || "") + " " + (equipamento.modelo || "")) + '</b></div>',
      '<div class="field">Tipo<b>' + esc(equipamento.tipo) + '</b></div>',
      '<div class="field">Técnico<b>' + esc(ordem.tecnico) + '</b></div>',
      '<div class="field">Valor do serviço<b>' + esc(typeof brl==="function"?brl(ordem.orcamento):"Não informado") + '</b></div>',
      '</div>',
      '<h2>PRAZO E VALIDADE</h2>',
      '<div class="grid">',
      '<div class="field">Prazo<b>' + esc((r.dias || 90) + " dias") + '</b></div>',
      '<div class="field">Situação<b>' + esc(status) + '</b></div>',
      '<div class="field">Início<b>' + esc(r.inicio ? dt(r.inicio) : "A definir na entrega") + '</b></div>',
      '<div class="field">Término<b>' + esc(r.fim ? dt(r.fim) : "A definir na entrega") + '</b></div>',
      '</div>',
      '<h2>SERVIÇO REALIZADO</h2>',
      '<div class="terms">' + esc(r.descricao || "Serviço técnico conforme ordem de serviço.") + '</div>',
      '<h2>TERMOS E CONDIÇÕES</h2>',
      '<div class="terms">' + esc(r.termos || "Aplicam-se as condições legais de garantia previstas na legislação vigente.") + '</div>',
      '<p class="terms">Este certificado não limita nem substitui os direitos assegurados ao consumidor pela legislação aplicável.</p>',
      '<div class="sign">',
      '<div class="line">Assinatura da assistência técnica</div>',
      '<div class="line">Assinatura do cliente</div>',
      '</div>',
      '<footer>Documento emitido pelo SmartGestão • ' + esc(hoje().split("-").reverse().join("/")) + '</footer>',
      '</main>',
      '</body>',
      '</html>'
    ];

    w.document.open();
    w.document.write(linhas.join("\n"));
    w.document.close();
    w.focus();
  };

  const SOON={};

  /* ============ TELAS ============ */

  const telas={
    dashboard:<Dashboard db={db} go={go}/>,

    assinatura:<SubscriptionScreen ctx={ctx}/>,

    empresa:(
      <Crud
        title="Dados da empresa"
        sub="Cadastre os dados da assistência. Eles serão utilizados automaticamente nos certificados de garantia."
        label="perfil da empresa"
        newLabel="Cadastrar dados da empresa"
        rows={db.perfilEmpresa?[db.perfilEmpresa]:[]}
        defaults={{
          razaoSocial:"",
          nomeFantasia:"",
          documento:"",
          telefone:"",
          whatsapp:"",
          email:"",
          cep:"",
          rua:"",
          numero:"",
          complemento:"",
          bairro:"",
          cidade:"",
          estado:"",
          logoUrl:""
        }}
        fields={[
          {k:"razaoSocial",l:"Razão social",w:1},
          {k:"nomeFantasia",l:"Nome fantasia",w:1},
          {k:"documento",l:"CNPJ / CPF"},
          {k:"telefone",l:"Telefone",t:"tel"},
          {k:"whatsapp",l:"WhatsApp",t:"tel"},
          {k:"email",l:"E-mail",t:"email"},
          {k:"cep",l:"CEP"},
          {k:"rua",l:"Rua / Avenida",w:1},
          {k:"numero",l:"Número"},
          {k:"complemento",l:"Complemento"},
          {k:"bairro",l:"Bairro"},
          {k:"cidade",l:"Cidade"},
          {k:"estado",l:"Estado"},
          {k:"logoUrl",l:"URL do logotipo",w:1}
        ]}
        cols={[
          {l:"Empresa",r:r=><b>{r.nomeFantasia||r.razaoSocial||"Empresa cadastrada"}</b>},
          {l:"CNPJ / CPF",r:r=>r.documento||"—"},
          {l:"Telefone",r:r=>r.telefone||"—"},
          {l:"E-mail",r:r=>r.email||"—"}
        ]}
        onSave={r=>upsert("perfilEmpresa",r)}
        onDel={()=>{}}
      />
    ),

    clientes:(
      <Crud
        title="Clientes"
        sub="Cadastro de clientes e contatos."
        label="cliente"
        newLabel="Novo cliente"
        rows={db.clientes}
        defaults={real
          ?{nome:"",telefone:"",email:"",documento:""}
          :{nome:"",telefone:"",whatsapp:""}
        }
        fields={real
          ?[
            {k:"nome",l:"Nome completo",req:1,w:1},
            {k:"telefone",l:"Telefone / WhatsApp",t:"tel",req:1},
            {k:"email",l:"E-mail",t:"email"},
            {k:"documento",l:"CPF / CNPJ"}
          ]
          :[
            {k:"nome",l:"Nome completo",req:1,w:1},
            {k:"telefone",l:"Telefone",t:"tel"},
            {k:"whatsapp",l:"WhatsApp",t:"tel",req:1}
          ]
        }
        cols={real
          ?[
            {l:"Nome",r:r=><b>{r.nome}</b>},
            {l:"Telefone / WhatsApp",r:r=>r.telefone||"—"},
            {l:"E-mail",r:r=>r.email||"—"}
          ]
          :[
            {l:"Nome",r:r=><b>{r.nome}</b>},
            {l:"Telefone",r:r=>r.telefone||"—"},
            {l:"WhatsApp",r:r=>r.whatsapp}
          ]
        }
        extra={r=>r.whatsapp?wa(r):null}
        onSave={r=>upsert("clientes",r)}
        onDel={id=>remove("clientes",id)}
      />
    ),

    equipamentos:(
      <Crud
        title="Equipamentos"
        sub="Aparelhos recebidos, marca, modelo e defeito relatado."
        label="equipamento"
        newLabel="Novo equipamento"
        rows={db.equipamentos}
        defaults={{
          tipo:"Celular",
          marca:"",
          modelo:"",
          defeito:"",
          clienteId:""
        }}
        filter={{k:"tipo",opts:TIPOS}}
        search={r=>[
          r.tipo,r.marca,r.modelo,r.defeito,cn(r.clienteId)
        ].join(" ")}
        fields={[
          {k:"tipo",l:"Tipo",opts:TIPOS,req:1},
          {
            k:"clienteId",
            l:"Cliente",
            opts:db.clientes.map(c=>[c.id,c.nome]),
            req:real?1:0
          },
          {k:"marca",l:"Marca",req:1},
          {k:"modelo",l:"Modelo",req:1},
          {k:"defeito",l:"Defeito relatado",t:"area",w:1,req:1}
        ]}
        cols={[
          {l:"Tipo",r:r=>r.tipo},
          {l:"Aparelho",r:r=><b>{r.marca} {r.modelo}</b>},
          {l:"Defeito",r:r=>r.defeito},
          {l:"Cliente",r:r=>cn(r.clienteId)}
        ]}
        onSave={r=>upsert("equipamentos",r)}
        onDel={id=>remove("equipamentos",id)}
      />
    ),

    ordens:(
      <Crud
        title="Ordens de serviço"
        sub="Acompanhe cada aparelho da entrada até a entrega."
        label="ordem de serviço"
        newLabel="Nova OS"
        rows={db.ordens}
        defaults={{
          clienteId:"",
          equipId:"",
          tecnico:TECNICOS[0],
          diagnostico:"",
          orcamento:"",
          status:"Recebido",
          data:hoje()
        }}
        filter={{k:"status",opts:STATUS}}
        search={r=>[
          r.numero,cn(r.clienteId),eq(r.equipId),
          r.tecnico,r.diagnostico,r.status
        ].join(" ")}
        fields={[
          {
            k:"clienteId",
            l:"Cliente",
            opts:db.clientes.map(c=>[c.id,c.nome]),
            req:1
          },
          {
            k:"equipId",
            l:"Equipamento",
            opts:db.equipamentos.map(
              e=>[e.id,e.marca+" "+e.modelo+" — "+cn(e.clienteId)]
            ),
            req:1
          },
          {k:"tecnico",l:"Técnico responsável",opts:TECNICOS,req:1},
          {k:"status",l:"Status",opts:STATUS,req:1},
          {k:"diagnostico",l:"Diagnóstico",t:"area",w:1},
          {k:"orcamento",l:"Orçamento (R$)",t:"number"},
          {k:"data",l:"Data de entrada",t:"date"}
        ]}
        cols={[
          {l:"Nº",r:r=><b>{r.numero}</b>},
          {l:"Cliente",r:r=>cn(r.clienteId)},
          {l:"Equipamento",r:r=>eq(r.equipId)},
          {l:"Técnico",r:r=>r.tecnico||"—"},
          {l:"Status",r:r=><Badge c={COR[r.status]}>{r.status}</Badge>},
          {l:"Orçamento",r:r=>brl(r.orcamento)},
          {l:"Entrada",r:r=>dt(r.data)}
        ]}
        onSave={saveOrdem}
        onDel={id=>remove("ordens",id)}
      />
    ),

    garantias:(
      <Crud
        title="Garantias"
        sub="Acompanhe os certificados e os prazos de garantia dos serviços."
        label="garantia"
        newLabel="Nova garantia"
        rows={db.garantias||[]}
        defaults={{
          osId:"",
          clienteId:"",
          equipamentoId:"",
          numeroCertificado:"",
          dias:90,
          inicio:"",
          fim:"",
          descricao:"",
          termos:"",
          status:"pending_delivery"
        }}
        search={r=>[
          r.numeroCertificado,
          cn(r.clienteId),
          eq(r.equipamentoId),
          r.status
        ].join(" ")}
        fields={[
          {
            k:"osId",
            l:"Ordem de serviço",
            opts:(db.ordens||[]).map(o=>[o.id,o.numero]),
            req:1
          },
          {
            k:"clienteId",
            l:"Cliente",
            opts:db.clientes.map(c=>[c.id,c.nome]),
            req:1
          },
          {
            k:"equipamentoId",
            l:"Equipamento",
            opts:db.equipamentos.map(
              e=>[e.id,e.marca+" "+e.modelo]
            )
          },
          {k:"numeroCertificado",l:"Número do certificado"},
          {k:"dias",l:"Prazo em dias",t:"number",req:1},
          {k:"inicio",l:"Início da garantia",t:"date"},
          {k:"fim",l:"Término da garantia",t:"date"},
          {
            k:"status",
            l:"Situação",
            opts:[
              ["pending_delivery","Aguardando entrega"],
              ["active","Ativa"],
              ["expired","Expirada"],
              ["cancelled","Cancelada"]
            ],
            req:1
          },
          {k:"descricao",l:"Serviço realizado",t:"area",w:1},
          {k:"termos",l:"Termos da garantia",t:"area",w:1}
        ]}
        cols={[
          {
            l:"Certificado",
            r:r=><b>{r.numeroCertificado||"—"}</b>
          },
          {l:"Cliente",r:r=>cn(r.clienteId)},
          {l:"Equipamento",r:r=>eq(r.equipamentoId)},
          {
            l:"Prazo",
            r:r=>(r.dias||90)+" dias"
          },
          {
            l:"Validade",
            r:r=>r.fim?dt(r.fim):"Aguardando entrega"
          },
          {
            l:"Situação",
            r:r=>(
              <Badge c={
                r.status==="active"?"g2":
                r.status==="expired"?"g4":"g3"
              }>
                {
                  r.status==="active"?"Ativa":
                  r.status==="expired"?"Expirada":
                  r.status==="cancelled"?"Cancelada":
                  "Aguardando entrega"
                }
              </Badge>
            )
          }
        ]}
        extra={r=>(
          <>
            <button
              className="btn s n"
              type="button"
              onClick={()=>gerarCertificadoPDF(r)}
            >
              Gerar certificado PDF
            </button>
            <button
              className="btn s n"
              type="button"
              onClick={()=>enviarGarantiaWhatsApp(r)}
            >
              WhatsApp
            </button>
          </>
        )}
        onSave={r=>upsert("garantias",r)}
        onDel={id=>remove("garantias",id)}
      />
    ),

    estoque:(
      <Crud
        title="Estoque de peças"
        sub="Controle de quantidades, custo e preço de venda."
        label="peça"
        newLabel="Nova peça"
        rows={db.pecas}
        defaults={{
          nome:"",
          sku:"",
          qtd:"",
          minimo:"",
          custo:"",
          preco:""
        }}
        fields={[
          {k:"nome",l:"Peça",req:1,w:1},
          {k:"sku",l:"Código (SKU)"},
          {k:"qtd",l:"Quantidade",t:"number",req:1},
          {k:"minimo",l:"Estoque mínimo",t:"number"},
          {k:"custo",l:"Custo (R$)",t:"number"},
          {k:"preco",l:"Preço de venda (R$)",t:"number"}
        ]}
        cols={[
          {l:"Peça",r:r=><b>{r.nome}</b>},
          {l:"Código",r:r=>r.sku||"—"},
          {
            l:"Quantidade",
            r:r=>(
              <Badge c={r.qtd<=r.minimo?"g4":"g1"}>
                {r.qtd} un.{r.qtd<=r.minimo?" · repor":""}
              </Badge>
            )
          },
          {l:"Custo",r:r=>brl(r.custo)},
          {l:"Venda",r:r=>brl(r.preco)}
        ]}
        onSave={r=>upsert("pecas",r)}
        onDel={id=>remove("pecas",id)}
      />
    ),

    financeiro:(()=>{
      const s=t=>db.lancamentos
        .filter(l=>l.tipo===t)
        .reduce((a,l)=>a+l.valor,0);

      return (
        <Crud
          title="Financeiro"
          sub="Receitas e despesas da assistência."
          label="lançamento"
          newLabel="Novo lançamento"
          rows={db.lancamentos}
          defaults={{
            tipo:"Receita",
            descricao:"",
            categoria:"",
            valor:"",
            data:hoje(),
            status:"Pago"
          }}
          filter={{k:"tipo",opts:["Receita","Despesa"]}}
          search={r=>[r.descricao,r.categoria,r.tipo].join(" ")}
          top={
            <div
              className="grid"
              style={{gridTemplateColumns:"repeat(3,1fr)"}}
            >
              <div className="card kpi">
                <small>Receitas</small>
                <b>{brl(s("Receita"))}</b>
              </div>
              <div className="card kpi r">
                <small>Despesas</small>
                <b>{brl(s("Despesa"))}</b>
              </div>
              <div className="card kpi b">
                <small>Saldo</small>
                <b>{brl(s("Receita")-s("Despesa"))}</b>
              </div>
            </div>
          }
          fields={[
            {k:"tipo",l:"Tipo",opts:["Receita","Despesa"],req:1},
            {k:"status",l:"Situação",opts:["Pago","Pendente"],req:1},
            {k:"descricao",l:"Descrição",req:1,w:1},
            {k:"categoria",l:"Categoria"},
            {k:"valor",l:"Valor (R$)",t:"number",req:1},
            {k:"data",l:"Data",t:"date"}
          ]}
          cols={[
            {l:"Data",r:r=>dt(r.data)},
            {l:"Descrição",r:r=><b>{r.descricao}</b>},
            {l:"Categoria",r:r=>r.categoria||"—"},
            {
              l:"Tipo",
              r:r=>(
                <Badge c={r.tipo==="Receita"?"g1":"g4"}>
                  {r.tipo}
                </Badge>
              )
            },
            {l:"Valor",r:r=>brl(r.valor)},
            {
              l:"Situação",
              r:r=>(
                <Badge c={r.status==="Pago"?"g2":"g3"}>
                  {r.status}
                </Badge>
              )
            }
          ]}
          onSave={r=>upsert("lancamentos",r)}
          onDel={id=>remove("lancamentos",id)}
        />
      );
    })()
  };

  const menu=real&&
    !["owner","admin"].includes(
      String(ctx.company.role||"").toLowerCase()
    )
      ?MENU.filter(m=>m[0]!=="assinatura")
      :MENU;

  const current=menu.find(m=>m[0]===page)||menu[0];

  return (
    <div className="app">
      <aside className={"side"+(open?" open":"")}>
        <div className="logo">
          <i>
            <svg viewBox="0 0 40 40" aria-hidden="true">
              <path
                d="M20 3.5 34 9v10.2c0 8.2-5.8 13.8-14 17.3C11.8 33 6 27.4 6 19.2V9l14-5.5Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              />
              <path
                d="M13 25V15h4l6 7v-7h4v10h-4l-6-7v7z"
                fill="currentColor"
              />
            </svg>
          </i>
          <span>
            SmartGestão
            <small>GESTÃO INTELIGENTE</small>
          </span>
        </div>

        <div className="nav-caption">MENU PRINCIPAL</div>

        <nav className="nav">
          {menu.map(m=>(
            <button
              key={m[0]}
              aria-current={page===m[0]?"page":undefined}
              className={page===m[0]?"on":""}
              onClick={()=>go(m[0])}
            >
              <span className="nav-icon">{m[1]}</span>
              <span className="nav-label">{m[2]}</span>
              {page===m[0]&&<i className="nav-active"/>}
            </button>
          ))}
        </nav>

        <div className="side-bottom">
          <div className="side-status">
            <span className="status-dot"/>
            Sistema operacional
          </div>

          <div className="sfoot">
            {real
              ?(
                <div>
                  <b>{ctx.company.name}</b>
                  <span className="user-email">{ctx.user.email}</span>
                  <div className="account-actions">
                    <button onClick={ctx.onSwitch}>Trocar empresa</button>
                    <button onClick={ctx.onExit}>Sair</button>
                  </div>
                </div>
              )
              :(
                <div>
                  <b>Modo demonstração</b>
                  <span className="user-email">
                    Dados salvos neste navegador
                  </span>
                  {ctx.onExit&&(
                    <div className="account-actions">
                      <button onClick={ctx.onExit}>Voltar ao login</button>
                    </div>
                  )}
                </div>
              )
            }
          </div>
        </div>
      </aside>

      <div
        className={"scrim"+(open?" open":"")}
        onClick={()=>setOpen(false)}
      />

      <main className="main">
        <header className="workspace-top">
          <div className="workspace-left">
            <button
              className="mobile-menu"
              aria-label="Abrir menu"
              onClick={()=>setOpen(true)}
            >
              ☰
            </button>

            <div>
              <span className="workspace-overline">
                SMARTGESTÃO / {current[2].toUpperCase()}
              </span>
              <div className="workspace-title">{current[2]}</div>
            </div>
          </div>

          <div className="workspace-meta">
            <span className="workspace-live">
              <i/> Ambiente seguro
            </span>
            <span className="workspace-company">
              {real?ctx.company.name:"Ambiente de demonstração"}
            </span>
          </div>
        </header>

        <section className="workspace-content">
          {real&&SOON[page]
            ?<Soon t={SOON[page]}/>
            :telas[page]
          }
        </section>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Root/>);
