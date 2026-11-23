// ARQUIVO: data-repo-local.js — repositório do modo demonstração (localStorage)
/* ============ CAMADA DE DADOS (pronta para Supabase) ============
   Hoje: dados demonstrativos salvos no navegador (localStorage).
   Para integrar: crie o cliente com a URL e a chave pública (anon) do SEU projeto
   e troque o corpo de repo.load/save por supabase.from(TABELAS[nome]).select() / upsert() / delete().
   Nenhuma credencial é usada aqui. */
const TABELAS = { clientes:"clientes", equipamentos:"equipamentos", ordens:"ordens_servico", pecas:"pecas", lancamentos:"lancamentos" };
const KEY = "smartgestao:v1";
const repoLocal = {
  async load(){ try{ const s = localStorage.getItem(KEY); if(s) return JSON.parse(s); }catch(e){} return seed(); },
  async save(db){ try{ localStorage.setItem(KEY, JSON.stringify(db)); }catch(e){} }
};
