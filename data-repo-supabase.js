// ARQUIVO: data-repo-supabase.js — repositório real (Supabase), Etapa 1: clientes e estoque
// Usa só colunas confirmadas. O isolamento por empresa vem do RLS do banco; aqui também filtramos por company_id.
function erroPt(e){
  const c = e && e.code, m = (e && e.message) || String(e);
  const mapa = {"23505":"Já existe um registro com estes dados (valor duplicado).","23503":"Este registro está vinculado a outros cadastros e não pode ser excluído.","23502":"Falta preencher um campo obrigatório no banco.","42501":"Sem permissão para esta operação (política de segurança do banco).","42P01":"Tabela não encontrada no banco.","42703":"Coluna não encontrada no banco.","22P02":"Valor em formato inválido para o banco.","PGRST116":"Registro não encontrado ou sem permissão."};
  if(/failed to fetch|networkerror/i.test(m)) return "Sem conexão com o servidor. Verifique a internet e o config.js.";
  return mapa[c] ? mapa[c]+" ["+c+"]" : m;
}
const MAPA = {
  clientes:{ tabela:"customers",
    de:r=>({id:r.id,nome:r.name,telefone:r.phone||"",whatsapp:r.phone||"",email:r.email||"",documento:r.document||""}),
    para:o=>({name:o.nome,phone:o.telefone||null,email:o.email||null,document:o.documento||null}) },
  pecas:{ tabela:"inventory",
    de:r=>({id:r.id,nome:r.name,sku:r.sku||"",qtd:Number(r.quantity||0),minimo:Number(r.minimum_quantity||0),custo:0,preco:Number(r.unit_price||0)}),
    para:o=>({name:o.nome,sku:o.sku||null,quantity:Number(o.qtd||0),minimum_quantity:Number(o.minimo||0),unit_price:Number(o.preco||0)}) }
};
const repoSupabase = {
  async load(companyId){
    if(!sb) throw new Error("Supabase não configurado (config.js).");
    const db = {equipamentos:[],ordens:[],lancamentos:[]};
    for(const k of Object.keys(MAPA)){
      const m = MAPA[k];
      const {data,error} = await sb.from(m.tabela).select("*").eq("company_id",companyId).order("created_at");
      if(error) throw new Error(m.tabela+": "+erroPt(error));
      db[k] = data.map(m.de);
    }
    return db;
  },
  async save(tab,o,companyId){
    const m = MAPA[tab], row = m.para(o);
    const q = o.id ? sb.from(m.tabela).update(row).eq("id",o.id).eq("company_id",companyId)
                   : sb.from(m.tabela).insert({...row,company_id:companyId});
    const {data,error} = await q.select().single();
    if(error) throw new Error(m.tabela+": "+erroPt(error));
    return m.de(data);
  },
  async remove(tab,id,companyId){
    const m = MAPA[tab];
    const {data,error} = await sb.from(m.tabela).delete().eq("id",id).eq("company_id",companyId).select("id");
    if(error) throw new Error(m.tabela+": "+erroPt(error));
    if(!data||!data.length) throw new Error(m.tabela+": não foi possível excluir (sem permissão ou já excluído).");
  }
};
