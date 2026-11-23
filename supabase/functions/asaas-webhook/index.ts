import { createClient } from "npm:@supabase/supabase-js@2";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  try {
    const webhookToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
    const receivedToken = req.headers.get("asaas-access-token");
    if (!webhookToken || !receivedToken || receivedToken !== webhookToken) {
      return json({ error: "Não autorizado." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const payload = await req.json();
    const eventId = String(payload.id || "");
    const eventName = String(payload.event || "");
    if (!eventId || !eventName) return json({ error: "Evento inválido." }, 400);

    const { error: eventError } = await admin.from("asaas_webhook_events").insert({
      event_id: eventId,
      event_name: eventName,
      payload,
    });

    if (eventError?.code === "23505") {
      // Se uma tentativa anterior falhou antes de concluir, permite reprocessar o evento.
      const { data: previous } = await admin
        .from("asaas_webhook_events")
        .select("processed_at")
        .eq("event_id", eventId)
        .maybeSingle();
      if (previous?.processed_at) return json({ received: true, duplicate: true });
    } else if (eventError) {
      console.error("Falha ao registrar evento Asaas:", eventError.message);
      return json({ error: "Não foi possível registrar o evento." }, 500);
    }

    const payment = payload.payment || {};
    const subscription = payload.subscription || {};
    const subscriptionId = String(payment.subscription || subscription.id || "");

    if (subscriptionId) {
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

      if (["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"].includes(eventName)) {
        updates.status = "active";
        updates.last_payment_id = payment.id || null;
        updates.last_payment_status = payment.status || eventName;
      } else if ([
        "PAYMENT_OVERDUE",
        "PAYMENT_REFUNDED",
        "PAYMENT_PARTIALLY_REFUNDED",
        "PAYMENT_RECEIVED_IN_CASH_UNDONE",
        "PAYMENT_CHARGEBACK_REQUESTED",
      ].includes(eventName)) {
        updates.status = "past_due";
        updates.last_payment_id = payment.id || null;
        updates.last_payment_status = payment.status || eventName;
      } else if (["SUBSCRIPTION_INACTIVATED", "SUBSCRIPTION_DELETED"].includes(eventName)) {
        updates.status = "cancelled";
      } else if (eventName === "SUBSCRIPTION_UPDATED" && subscription.status === "ACTIVE") {
        // Não ativa acesso por criação/atualização da assinatura; exige pagamento confirmado.
        updates.next_due_date = subscription.nextDueDate || null;
      }

      if (Object.keys(updates).length > 1) {
        const { error: updateError } = await admin
          .from("company_subscriptions")
          .update(updates)
          .eq("asaas_subscription_id", subscriptionId);
        if (updateError) {
          console.error("Falha ao atualizar assinatura:", updateError.message);
          return json({ error: "Evento recebido, mas não foi possível atualizar a assinatura." }, 500);
        }
      }
    }

    await admin.from("asaas_webhook_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("event_id", eventId);

    return json({ received: true });
  } catch (error) {
    console.error("asaas-webhook:", error);
    return json({ error: "Erro interno ao processar webhook." }, 500);
  }
});
