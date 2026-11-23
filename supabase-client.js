// ARQUIVO: supabase-client.js — cria o cliente do Supabase (somente chave pública)
const sb = (function(){
  const c = window.SMARTGESTAO_CONFIG || {};
  if(!window.supabase || !c.supabaseUrl || !c.supabaseAnonKey) return null;
  try{ return window.supabase.createClient(c.supabaseUrl.trim(), c.supabaseAnonKey.trim()); }catch(e){ return null; }
})();
