// ARQUIVO: data-seed.js — dados demonstrativos
const seed = () => ({
  clientes:[
    {id:"c1",nome:"Mariana Souza",telefone:"(21) 3333-1020",whatsapp:"(21) 99811-2030"},
    {id:"c2",nome:"Carlos Eduardo Lima",telefone:"(21) 2555-7788",whatsapp:"(21) 99722-4411"},
    {id:"c3",nome:"Patrícia Gomes",telefone:"",whatsapp:"(21) 98877-1200"},
    {id:"c4",nome:"Rafael Mendes",telefone:"(21) 3030-4040",whatsapp:"(21) 97766-5544"},
    {id:"c5",nome:"Studio Pixel Ltda.",telefone:"(21) 3399-0001",whatsapp:"(21) 99900-0001"}],
  equipamentos:[
    {id:"e1",tipo:"Celular",marca:"Samsung",modelo:"Galaxy A54",defeito:"Tela quebrada",clienteId:"c1"},
    {id:"e2",tipo:"Notebook",marca:"Dell",modelo:"Inspiron 15",defeito:"Não liga",clienteId:"c2"},
    {id:"e3",tipo:"Videogame",marca:"Sony",modelo:"PlayStation 5",defeito:"Superaquecimento",clienteId:"c3"},
    {id:"e4",tipo:"Celular",marca:"Apple",modelo:"iPhone 12",defeito:"Bateria viciada",clienteId:"c4"},
    {id:"e5",tipo:"Computador",marca:"Positivo",modelo:"Desktop Master",defeito:"Lentidão e travamentos",clienteId:"c5"},
    {id:"e6",tipo:"Celular",marca:"Motorola",modelo:"Moto G84",defeito:"Não carrega",clienteId:"c3"}],
  ordens:[
    {id:"o1",numero:"OS-0001",clienteId:"c1",equipId:"e1",tecnico:"Lucas Andrade",diagnostico:"Display danificado, troca completa.",orcamento:420,status:"Pronto",data:dias(2)},
    {id:"o2",numero:"OS-0002",clienteId:"c2",equipId:"e2",tecnico:"Bruno Reis",diagnostico:"Placa-mãe em análise; suspeita de fonte.",orcamento:0,status:"Em análise",data:dias(1)},
    {id:"o3",numero:"OS-0003",clienteId:"c3",equipId:"e3",tecnico:"Lucas Andrade",diagnostico:"Limpeza e troca de pasta térmica.",orcamento:280,status:"Aguardando aprovação",data:dias(1)},
    {id:"o4",numero:"OS-0004",clienteId:"c4",equipId:"e4",tecnico:"Bruno Reis",diagnostico:"Troca de bateria original.",orcamento:350,status:"Entregue",data:dias(6),lancado:true},
    {id:"o5",numero:"OS-0005",clienteId:"c5",equipId:"e5",tecnico:"Camila Torres",diagnostico:"Formatação, SSD novo e backup.",orcamento:390,status:"Em reparo",data:dias(3)},
    {id:"o6",numero:"OS-0006",clienteId:"c3",equipId:"e6",tecnico:"Camila Torres",diagnostico:"",orcamento:0,status:"Recebido",data:hoje()}],
  pecas:[
    {id:"p1",nome:"Tela Galaxy A54",sku:"TEL-A54",qtd:3,minimo:2,custo:210,preco:420},
    {id:"p2",nome:"Bateria iPhone 12",sku:"BAT-IP12",qtd:1,minimo:3,custo:120,preco:350},
    {id:"p3",nome:"SSD 240GB",sku:"SSD-240",qtd:8,minimo:3,custo:95,preco:190},
    {id:"p4",nome:"Pasta térmica 4g",sku:"PST-4G",qtd:15,minimo:5,custo:9,preco:30},
    {id:"p5",nome:"Conector USB-C",sku:"CON-UC",qtd:2,minimo:5,custo:6,preco:45},
    {id:"p6",nome:"Fonte 12V notebook",sku:"FNT-12V",qtd:4,minimo:2,custo:55,preco:130}],
  lancamentos:[
    {id:"l1",tipo:"Receita",descricao:"OS-0004 — Bateria iPhone 12",categoria:"Serviços",valor:350,data:dias(5),status:"Pago"},
    {id:"l2",tipo:"Receita",descricao:"Venda de capinhas e películas",categoria:"Acessórios",valor:180,data:dias(4),status:"Pago"},
    {id:"l3",tipo:"Despesa",descricao:"Compra de peças — fornecedor",categoria:"Peças",valor:640,data:dias(8),status:"Pago"},
    {id:"l4",tipo:"Despesa",descricao:"Aluguel da loja",categoria:"Fixas",valor:1500,data:dias(10),status:"Pago"},
    {id:"l5",tipo:"Receita",descricao:"Manutenção mensal — Studio Pixel",categoria:"Contratos",valor:600,data:dias(3),status:"Pendente"},
    {id:"l6",tipo:"Despesa",descricao:"Energia e internet",categoria:"Fixas",valor:310,data:dias(2),status:"Pendente"}]
});
