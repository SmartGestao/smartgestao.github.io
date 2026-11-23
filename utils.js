// ARQUIVO: utils.js — React, datas, formatação e constantes
const { useState, useEffect } = React;

// Datas de calendário no fuso oficial do Brasil, sem depender do fuso do aparelho.
const dataLocalBR = (data = new Date()) => {
  const partes = new Intl.DateTimeFormat("en-CA", {timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(data);
  const p = Object.fromEntries(partes.map(x=>[x.type,x.value]));
  return p.year+"-"+p.month+"-"+p.day;
};
const hoje = () => dataLocalBR();
const dias = n => dataLocalBR(new Date(Date.now()-Number(n||0)*864e5));
/* ============ UTILITÁRIOS ============ */
const uid = () => Math.random().toString(36).slice(2,9);
const brl = n => Number(n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const dt = d => d ? d.split("-").reverse().join("/") : "";
const STATUS = ["Recebido","Em análise","Aguardando aprovação","Em reparo","Pronto","Entregue"];
const COR = {"Recebido":"g2","Em análise":"g3","Aguardando aprovação":"g3","Em reparo":"g2","Pronto":"g1","Entregue":"g1"};
const TECNICOS = ["Lucas Andrade","Bruno Reis","Camila Torres"];
const TIPOS = ["Celular","Computador","Notebook","Videogame","Outro eletrônico"];