function erroPt(e){
  const c=e&&e.code, m=(e&&e.message)||String(e);
  const mapa={
    "23505":"Registro duplicado.",
    "23503":"Registro vinculado a outro cadastro.",
    "23502":"Campo obrigatório não preenchido.",
    "42501":"Sem permissão no banco.",
    "42P01":"Tabela não encontrada.",
    "42703":"Coluna não encontrada.",
    "22P02":"Valor inválido."
  };
  if(/failed to fetch|networkerror/i.test(m))
    return "Sem conexão. Verifique a internet.";
  return mapa[c] ? mapa[c]+" ["+c+"]" : m;
}

const STATUS_DB = {
  "Recebido":"received",
  "Em análise":"diagnosis",
  "Aguardando aprovação":"waiting_approval",
  "Em reparo":"in_progress",
  "Pronto":"completed",
  "Entregue":"delivered"
};

const STATUS_UI = Object.fromEntries(
  Object.entries(STATUS_DB).map(([ui,db])=>[db,ui])
);

const statusParaDB = status => {
  const s=String(status||"Recebido").trim().toLocaleLowerCase("pt-BR");
  const aliases={
    "recebido":"received",
    "em análise":"diagnosis",
    "em analise":"diagnosis",
    "aguardando aprovação":"waiting_approval",
    "aguardando aprovacao":"waiting_approval",
    "em reparo":"in_progress",
    "pronto":"completed",
    "entregue":"delivered"
  };
  return aliases[s]||"received";
};

const MAPA = {
  clientes:{
    tabela:"customers",
    de:r=>({
      id:r.id,
      nome:r.name,
      telefone:r.phone||"",
      whatsapp:r.phone||"",
      email:r.email||"",
      documento:r.document||""
    }),
    para:o=>({
      name:o.nome,
      phone:o.telefone||null,
      email:o.email||null,
      document:o.documento||null
    })
  },

  pecas:{
    tabela:"inventory",
    de:r=>({
      id:r.id,
      nome:r.name,
      sku:r.sku||"",
      qtd:Number(r.quantity||0),
      minimo:Number(r.minimum_quantity||0),
      custo:Number(r.cost||0),
      preco:Number(r.unit_price||0)
    }),
    para:o=>({
      name:o.nome,
      sku:o.sku||null,
      quantity:Number(o.qtd||0),
      minimum_quantity:Number(o.minimo||0),
      cost:o.custo===""||o.custo==null?null:Number(o.custo),
      unit_price:Number(o.preco||0)
    })
  },

  equipamentos:{
    tabela:"devices",
    de:r=>({
      id:r.id,
      clienteId:r.customer_id,
      tipo:r.category||"Celular",
      marca:r.brand||"",
      modelo:r.model||"",
      defeito:r.reported_defect||""
    }),
    para:o=>({
      customer_id:o.clienteId||null,
      category:o.tipo||"Celular",
      brand:o.marca,
      model:o.modelo,
      reported_defect:o.defeito||""
    })
  },

  lancamentos:{
    tabela:"financial_entries",
    de:r=>({
      id:r.id,
      tipo:r.entry_type==="expense"?"Despesa":"Receita",
      descricao:r.description||"",
      categoria:r.category||"",
      valor:Number(r.amount||0),
      data:r.entry_date||"",
      status:r.status==="pending"?"Pendente":"Pago"
    }),
    para:o=>({
      entry_type:o.tipo==="Despesa"?"expense":"income",
      description:o.descricao,
      category:o.categoria||null,
      amount:Number(o.valor||0),
      entry_date:o.data||hoje(),
      status:o.status==="Pendente"?"pending":"paid"
    })
  },

  ordens:{
    tabela:"service_orders",
    de:r=>({
      id:r.id,
      numero:"OS-"+String(r.order_number).padStart(4,"0"),
      clienteId:r.customer_id,
      equipId:r.device_id,
      tecnico:r.technician||"",
      diagnostico:r.diagnosis||r.description||"",
      orcamento:Number(r.budget||0),
      status:STATUS_UI[r.status]||r.status,
      data:String(r.created_at||"").slice(0,10)
    }),
    para:o=>({
      customer_id:o.clienteId,
      device_id:o.equipId,
      technician:o.tecnico||null,
      description:o.diagnostico||"Ordem de serviço",
      diagnosis:o.diagnostico||null,
      status:statusParaDB(o.status),
      budget:o.orcamento===""||o.orcamento==null
        ?null:Number(o.orcamento),
      ...(o.data?{
        created_at:new Date(o.data+"T12:00:00-03:00").toISOString()
      }:{})
    })
  },

  garantias:{
    tabela:"warranties",
    de:r=>({
      id:r.id,
      osId:r.service_order_id,
      clienteId:r.customer_id,
      equipamentoId:r.device_id||"",
      numeroCertificado:r.certificate_number||"",
      dias:Number(r.warranty_days||90),
      inicio:r.start_date||"",
      fim:r.end_date||"",
      descricao:r.service_description||"",
      termos:r.terms||"",
      status:r.status||"pending_delivery",
      whatsapp:r.whatsapp_phone||"",
      enviadoEm:r.sent_at||"",
      url:r.certificate_url||"",
      dataCriacao:r.created_at||""
    }),
    para:o=>({
      service_order_id:o.osId,
      customer_id:o.clienteId,
      device_id:o.equipamentoId||null,
      certificate_number:o.numeroCertificado||null,
      warranty_days:Number(o.dias||90),
      start_date:o.inicio||null,
      end_date:o.fim||null,
      service_description:o.descricao||null,
      terms:o.termos||null,
      status:o.status||"pending_delivery",
      whatsapp_phone:o.whatsapp||null,
      sent_at:o.enviadoEm||null,
      certificate_url:o.url||null
    })
  }
};

const repoSupabase = {
  async load(companyId){
    if(!sb) throw new Error("Supabase não configurado.");

    const db={
      lancamentos:[],
      garantias:[]
    };

    for(const k of Object.keys(MAPA)){
      const m=MAPA[k];

      const {data,error}=await sb
        .from(m.tabela)
        .select("*")
        .eq("company_id",companyId)
        .order("created_at");

      if(error)
        throw new Error(m.tabela+": "+erroPt(error));

      db[k]=(data||[]).map(m.de);
    }

    return db;
  },

  async save(tab,o,companyId){
    const m=MAPA[tab];

    if(!m)
      throw new Error("Módulo não configurado: "+tab);

    const row=m.para(o);

    const q=o.id
      ?sb.from(m.tabela)
          .update(row)
          .eq("id",o.id)
          .eq("company_id",companyId)
      :sb.from(m.tabela)
          .insert({...row,company_id:companyId});

    const {data,error}=await q.select().single();

    if(error){
      throw new Error(
        m.tabela+": "+erroPt(error)+
        (tab==="ordens"
          ?" | status enviado: "+String(row.status)+
           " | código: "+String(error.code||"—")+
           " | detalhe: "+String(error.details||"—")
          :"")
      );
    }

    return m.de(data);
  },

  async remove(tab,id,companyId){
    const m=MAPA[tab];

    if(!m)
      throw new Error("Módulo não configurado: "+tab);

    const {data,error}=await sb
      .from(m.tabela)
      .delete()
      .eq("id",id)
      .eq("company_id",companyId)
      .select("id");

    if(error)
      throw new Error(m.tabela+": "+erroPt(error));

    if(!data||!data.length)
      throw new Error(m.tabela+": não foi possível excluir.");
  }
};
