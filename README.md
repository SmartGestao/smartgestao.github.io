# SmartGestão

Sistema de gestão para assistências técnicas, construído com React via scripts no navegador e Supabase como backend.

## Modos de uso
- **Demonstração local:** utiliza dados fictícios armazenados no navegador (localStorage).
- **Modo autenticado:** utiliza Supabase Auth e tabelas no schema public, com isolamento por empresa via company_id e políticas RLS.

## Arquivos principais
- index.html — carrega bibliotecas e scripts.
- config.js — URL do projeto e chave pública (publishable/anon); nunca inserir chave service_role.
- utils.js — formatação, datas no fuso de São Paulo e constantes.
- data-repo-supabase.js — leitura e gravação no Supabase.
- ui-auth.jsx, ui-form.jsx, ui-crud.jsx — autenticação e componentes.
- app.jsx — telas e regras de negócio.

## Publicação
O site é publicado pelo GitHub Pages a partir da branch main (raiz do repositório).

## Migração do banco
Antes de publicar a versão que utiliza inventory.cost e service_orders.technician, execute a migração SQL em supabase/migrations/202611190001_smartgestao_hardening.sql no SQL Editor do Supabase.

## Segurança
- Nunca coloque chave service_role, senha de banco ou segredos no frontend.
- O isolamento por empresa depende das políticas RLS do Supabase; filtros do frontend são complementares, não substituem RLS.
- A função create_company deve manter execução restrita ao papel authenticated e usar search_path vazio com objetos qualificados por schema.
