// ARQUIVO: ui-common.jsx — componentes visuais simples
const Soon = ({t}) => <div className="card soon"><h1 style={{fontSize:20}}>{t}</h1><p className="mut">Em integração com o banco de dados. Disponível na próxima etapa. Enquanto isso, a demonstração mantém todas as telas funcionando.</p></div>;
const Badge = ({c,children}) => <span className={"bdg "+c}>{children}</span>;
