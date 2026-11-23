import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function nextDueDateBrazil() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const tomorrow = new Date(Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day) + 1,
  ));
  return tomorrow.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const asaasKey = Deno.env.get("ASAAS_API_KEY");
    const asaasBase = Deno.env.get("ASAAS_API_BASE_URL") || "https://api.asaas.com/v3";
    if (!supabaseUrl || !anonKey || !serviceKey || !asaasKey) {
      return json({ error: "Configuração do servidor incompleta." }, 500);
    }

    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return json({ error: "Faça login para continuar." }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: "Sessão inválida. Entre novamente." }, 401);

    const body = await req.json();
    const companyId = String(body.company_id || "");
    const customerName = String(body.customer_name || "").trim();
    const cpfCnpj = String(body.cpf_cnpj || "").replace(/\D/g, "");
    const phone = String(body.phone || "").replace(/\D/g, "");
    const email = String(userData.user.email || "").trim();

    if (!companyId || !email) {
      return json({ error: "Não foi possível identificar a empresa ou o e-mail da conta." }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Consulta a associação usando a sessão autenticada do próprio usuário.
    // O CompanyGate já usa esta mesma permissão para listar as empresas disponíveis.
    const { data: membership, error: membershipError } = await userClient
      .from("company_members")
      .select("role")
      .eq("company_id", companyId)
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (membershipError) {
      console.error("Falha ao validar company_members:", membershipError.message);
      return json({ error: "Não foi possível validar o acesso à empresa. Tente sair e entrar novamente." }, 403);
    }
    if (!membership) {
      console.error("Acesso negado à assinatura: usuário não pertence à empresa.", {
        company_id: companyId,
        user_id: userData.user.id,
      });
      return json({ error: "Você não tem acesso a esta empresa." }, 403);
    }
    // Qualquer membro pode consultar se a empresa possui acesso ativo.
    // Somente owner/admin podem criar ou alterar a assinatura.
    if (body.action !== "status" && !["owner", "admin"].includes(String(membership.role || "").toLowerCase())) {
      return json({ error: "Somente o proprietário ou administrador pode gerenciar a assinatura." }, 403);
    }

    if (body.action === "status") {
      const { data: saved, error: statusError } = await admin
        .from("company_subscriptions")
        .select("status, amount, next_due_date, asaas_subscription_id")
        .eq("company_id", companyId)
        .maybeSingle();
      if (statusError) {
        console.error("Falha ao consultar company_subscriptions:", statusError.message, statusError.code, statusError.details);
        return json({
          error: "Não foi possível consultar a assinatura.",
          details: statusError.message || "Erro desconhecido ao consultar company_subscriptions.",
        }, 500);
      }
      if (!saved) return json({ has_subscription: false });

      // Confirma que a assinatura salva pertence ao ambiente Asaas atualmente configurado.
      // Isso evita considerar como ativa uma assinatura criada anteriormente no Sandbox.
      const productionSubscriptionResponse = await fetch(
        asaasBase + "/subscriptions/" + saved.asaas_subscription_id,
        { headers: { "access_token": asaasKey, "Accept": "application/json" } },
      );
      if (productionSubscriptionResponse.status === 404) {
        await admin.from("company_subscriptions")
          .update({ status: "inactive", updated_at: new Date().toISOString() })
          .eq("company_id", companyId);
        return json({
          has_subscription: true,
          status: "inactive",
          amount: saved.amount,
          next_due_date: saved.next_due_date,
          payment_url: null,
        });
      }
      if (!productionSubscriptionResponse.ok) {
        console.error("Falha ao validar assinatura no Asaas:", productionSubscriptionResponse.status);
        return json({
          error: "Não foi possível validar a assinatura na conta Asaas de produção.",
        }, 502);
      }

      let paymentUrl: string | null = null;
      try {
        const statusResponse = await fetch(
          asaasBase + "/subscriptions/" + saved.asaas_subscription_id + "/payments?limit=1",
          { headers: { "access_token": asaasKey, "Accept": "application/json" } },
        );
        const statusData = await statusResponse.json();
        paymentUrl = statusData.data?.[0]?.invoiceUrl || statusData.data?.[0]?.bankSlipUrl || null;
      } catch (_) {
        // O link pode ainda não ter sido gerado pelo Asaas.
      }
      return json({
        has_subscription: true,
        status: saved.status,
        amount: saved.amount,
        next_due_date: saved.next_due_date,
        payment_url: paymentUrl,
      });
    }

    // Bloqueia novas cobranças reais até a aprovação explícita da conta de produção.
    if (Deno.env.get("ASAAS_BILLING_ENABLED") !== "true") {
      return json({
        error: "A contratação online será liberada após a aprovação da conta de produção do SmartGestão no Asaas. Nenhuma cobrança foi criada.",
      }, 403);
    }

    const { data: current } = await admin
      .from("company_subscriptions")
      .select("status, asaas_subscription_id")
      .eq("company_id", companyId)
      .maybeSingle();

    const asaasHeaders = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "access_token": asaasKey,
      "User-Agent": "SmartGestao/1.0",
    };

    if (current && ["pending", "active", "past_due"].includes(current.status)) {
      // Só reutiliza uma assinatura que realmente existe na conta Asaas selecionada.
      // Isso permite migrar do Sandbox para Produção sem bloquear a nova contratação
      // por causa de um ID de assinatura criado no ambiente anterior.
      const existingResponse = await fetch(
        asaasBase + "/subscriptions/" + current.asaas_subscription_id,
        { headers: asaasHeaders },
      ).catch(() => null);
      if (existingResponse?.ok) {
        let paymentUrl: string | null = null;
        try {
          const paymentsResponse = await fetch(
            asaasBase + "/subscriptions/" + current.asaas_subscription_id + "/payments?limit=1",
            { headers: asaasHeaders },
          );
          const paymentsData = await paymentsResponse.json();
          paymentUrl = paymentsData.data?.[0]?.invoiceUrl || paymentsData.data?.[0]?.bankSlipUrl || null;
        } catch (_) {
          // A cobrança pode ainda não estar disponível.
        }
        return json({
          success: true,
          already_exists: true,
          status: current.status,
          payment_url: paymentUrl,
          message: "Esta empresa já possui uma assinatura em andamento.",
        });
      }
    }

    if (!customerName || ![11, 14].includes(cpfCnpj.length)) {
      return json({ error: "Informe o nome do responsável e um CPF/CNPJ válido." }, 400);
    }
    // Reutiliza o cadastro Asaas pelo CPF/CNPJ para evitar duplicidade.
    const customerSearch = await fetch(
      asaasBase + "/customers?cpfCnpj=" + encodeURIComponent(cpfCnpj) + "&limit=10",
      { headers: asaasHeaders },
    );
    const customerSearchData = await customerSearch.json();
    if (!customerSearch.ok) {
      return json({ error: "Não foi possível consultar o cadastro no Asaas.", details: customerSearchData.errors?.[0]?.description || "Falha na consulta." }, 502);
    }

    let customer = customerSearchData.data?.[0];
    if (!customer) {
      const customerResponse = await fetch(asaasBase + "/customers", {
        method: "POST",
        headers: asaasHeaders,
        body: JSON.stringify({
          name: customerName,
          cpfCnpj,
          email,
          ...(phone ? { phone } : {}),
          externalReference: "smartgestao:" + companyId,
        }),
      });
      const customerData = await customerResponse.json();
      if (!customerResponse.ok) {
        return json({ error: "Não foi possível cadastrar o cliente no Asaas.", details: customerData.errors?.[0]?.description || "Falha no cadastro." }, 502);
      }
      customer = customerData;
    }

    const dueDate = nextDueDateBrazil();
    const subscriptionResponse = await fetch(asaasBase + "/subscriptions", {
      method: "POST",
      headers: asaasHeaders,
      body: JSON.stringify({
        customer: customer.id,
        billingType: "UNDEFINED",
        value: 39.90,
        nextDueDate: dueDate,
        cycle: "MONTHLY",
        description: "SmartGestão — Plano mensal",
        externalReference: "smartgestao:" + companyId,
      }),
    });
    const subscription = await subscriptionResponse.json();
    if (!subscriptionResponse.ok) {
      return json({ error: "O Asaas não conseguiu criar a assinatura.", details: subscription.errors?.[0]?.description || "Falha ao criar assinatura." }, 502);
    }

    const { error: saveError } = await admin.from("company_subscriptions").upsert({
      company_id: companyId,
      asaas_customer_id: customer.id,
      asaas_subscription_id: subscription.id,
      status: "pending",
      billing_type: "UNDEFINED",
      amount: 39.90,
      next_due_date: dueDate,
      updated_at: new Date().toISOString(),
    }, { onConflict: "company_id" });

    if (saveError) {
      // Evita manter uma assinatura órfã caso o banco não consiga registrar o vínculo.
      await fetch(asaasBase + "/subscriptions/" + subscription.id, {
        method: "DELETE",
        headers: asaasHeaders,
      }).catch(() => undefined);
      return json({ error: "A assinatura foi criada, mas não conseguimos registrar o vínculo no SmartGestão. Tente novamente." }, 500);
    }

    let paymentUrl: string | null = null;
    try {
      const paymentsResponse = await fetch(
        asaasBase + "/subscriptions/" + subscription.id + "/payments?limit=1",
        { headers: asaasHeaders },
      );
      const paymentsData = await paymentsResponse.json();
      paymentUrl = paymentsData.data?.[0]?.invoiceUrl || paymentsData.data?.[0]?.bankSlipUrl || null;
    } catch (_) {
      // A primeira cobrança pode demorar alguns instantes para ficar disponível.
    }

    return json({
      success: true,
      status: "pending",
      amount: 39.90,
      cycle: "MONTHLY",
      next_due_date: dueDate,
      payment_url: paymentUrl,
      message: "Assinatura criada. O acesso será ativado após a confirmação do pagamento.",
    });
  } catch (error) {
    console.error("asaas-assinaturas:", error);
    return json({ error: "Erro interno ao iniciar a assinatura." }, 500);
  }
});
