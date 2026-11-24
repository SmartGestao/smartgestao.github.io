// ARQUIVO: screen-subscription.jsx
// Tela de assinatura SmartGestão
// Oferta Parceiro Fundador — primeiros 10 clientes.
// Contratação online bloqueada até aprovação do Asaas.

async function subscriptionErrorMessage(ex) {
  try {
    const response = ex?.context;
    if (response && typeof response.clone === "function") {
      const body = await response.clone().json();
      if (body?.details) {
        return `${body.error || "Falha na assinatura"}: ${body.details}`;
      }
      if (body?.error) return body.error;
    }
  } catch (_) {}
  return ex?.message || "Não foi possível consultar a assinatura.";
}

function SubscriptionScreen({ ctx }) {
  const [status, setStatus] = useState(null);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(true);
  const [exempt, setExempt] = useState(false);

  const carregar = async () => {
    setErro("");
    setLoading(true);

    try {
      const { data, error } = await sb.functions.invoke(
        "asaas-assinaturas",
        {
          body: {
            action: "status",
            company_id: ctx.company.id
          }
        }
      );

      if (error) throw error;

      setExempt(data?.exempt === true);

      if (data?.has_subscription) {
        setStatus(data.status);
      } else {
        setStatus("none");
      }
    } catch (ex) {
      setErro(await subscriptionErrorMessage(ex));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!ctx.real) {
      setLoading(false);
      return;
    }

    carregar();
  }, []);

  const statusLabel = {
    none: "Ainda não contratado",
    pending: "Aguardando pagamento",
    active: "Assinatura ativa",
    past_due: "Pagamento em atraso",
    cancelled: "Assinatura cancelada",
    inactive: "Inativa"
  };

  if (!ctx.real) {
    return (
      <div className="box">
        <h2>Assinatura SmartGestão</h2>
        <p className="mut">
          A contratação fica disponível após entrar em uma conta de empresa.
        </p>
      </div>
    );
  }

  return (
    <div className="subscription-page">
      <div className="sub-heading">
        <div>
          <span className="workspace-overline">PLANO E COBRANÇA</span>
          <h1>Assinatura</h1>
          <p className="mut">
            Conheça as condições do plano SmartGestão.
          </p>
        </div>
      </div>

      {!exempt && (
        <div className="sub-plan card">
          <div className="sub-plan-top">
            <div>
              <span className="sub-kicker">OFERTA PARCEIRO FUNDADOR</span>
              <h2>Plano Completo</h2>
              <p>
                Gestão de clientes, ordens de serviço, equipamentos,
                estoque e financeiro em um só lugar.
              </p>
            </div>
            <div className="sub-price">
              <strong>R$ 59,90</strong>
              <span>por mês</span>
            </div>
          </div>

          <div style={{
            marginTop: "20px",
            padding: "16px",
            borderRadius: "12px",
            background: "#f5f8f6",
            border: "1px solid #e3ebe6"
          }}>
            <div style={{
              color: "#345b50",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "1px"
            }}>
              CONDIÇÃO ESPECIAL DE LANÇAMENTO
            </div>

            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
              marginTop: "9px"
            }}>
              <div>
                <div style={{
                  fontSize: "13px",
                  color: "#52616b"
                }}>
                  Implantação — pagamento único
                </div>
                <strong style={{
                  fontSize: "23px",
                  color: "#293b49"
                }}>
                  R$ 300,00
                </strong>
              </div>

              <div style={{
                fontSize: "11px",
                color: "#6d7b83",
                maxWidth: "230px"
              }}>
                Condição especial para os primeiros 10 clientes.
              </div>
            </div>
          </div>

          <div className="sub-includes">
            <span>✓ Acesso aos módulos</span>
            <span>✓ Dados separados por empresa</span>
            <span>✓ Atualizações da plataforma</span>
            <span>✓ Mensalidade fixa enquanto mantiver a assinatura</span>
          </div>

          <p className="sub-note">
            A oferta Parceiro Fundador é limitada aos 10 primeiros clientes.
            A mensalidade de R$ 59,90 permanece fixa enquanto a assinatura
            for mantida, conforme as condições da oferta.
          </p>
        </div>
      )}

      <div className="card sub-status-card">
        <h3>
          {exempt
            ? "Acesso administrativo"
            : "Situação da assinatura"}
        </h3>

        {loading ? (
          <p className="mut">Consultando…</p>
        ) : exempt ? (
          <div className="ok">
            <b>Acesso administrativo gratuito e permanente</b>
            <p>
              Esta empresa possui isenção de cobrança e acesso
              liberado a todos os módulos do SmartGestão.
            </p>
          </div>
        ) : (
          <>
            <p>
              <span
                className={
                  "sub-status-dot " +
                  (status === "active"
                    ? "active"
                    : status === "pending"
                    ? "pending"
                    : "")
                }
              ></span>

              <b>
                {statusLabel[status] || "Não identificada"}
              </b>
            </p>

            {status === "active" && (
              <p className="ok">
                Pagamento confirmado. Sua assinatura está ativa.
              </p>
            )}

            {status === "pending" && (
              <p className="mut">
                Existe uma cobrança pendente vinculada à sua assinatura.
              </p>
            )}

            {status === "past_due" && (
              <p className="err">
                Existe um pagamento em atraso. Regularize para manter
                o serviço ativo.
              </p>
            )}

            {status === "cancelled" && (
              <p className="mut">
                Esta assinatura foi cancelada.
              </p>
            )}
          </>
        )}

        {erro && (
          <div className="err" role="alert">
            {erro}
          </div>
        )}

        {!loading && !exempt && (
          <button
            className="btn g"
            onClick={carregar}
            disabled={loading}
          >
            Atualizar situação
          </button>
        )}
      </div>

      {!loading && !exempt && status !== "active" && (
        <div className="card sub-form">
          <h3>Contratação online em breve</h3>

          <p className="mut">
            Estamos finalizando a liberação dos pagamentos online.
            A contratação será disponibilizada assim que a análise
            da conta de recebimento for concluída pelo Asaas.
          </p>

          <p className="sub-note">
            Oferta de lançamento: R$ 300,00 de implantação e R$ 59,90
            mensais para os primeiros 10 clientes. Nenhuma cobrança
            será realizada por esta tela enquanto a contratação online
            estiver indisponível.
          </p>
        </div>
      )}
    </div>
  );
}
