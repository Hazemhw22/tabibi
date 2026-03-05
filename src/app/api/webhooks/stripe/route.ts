import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-02-25.clover",
});

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.CheckoutSessionCompletedEvent["data"]["object"];
        const appointmentId = session.metadata?.appointmentId;

        if (!appointmentId) break;

        await prisma.$transaction([
          prisma.appointment.update({
            where: { id: appointmentId },
            data: {
              status: "CONFIRMED",
              paymentStatus: "PAID",
              stripeSessionId: session.id,
            },
          }),
          prisma.payment.update({
            where: { appointmentId },
            data: {
              status: "PAID",
              stripeSessionId: session.id,
              stripeIntentId: session.payment_intent as string,
            },
          }),
          prisma.notification.create({
            data: {
              userId: session.metadata?.patientId || "",
              title: "تم تأكيد موعدك!",
              message: "تم الدفع بنجاح وتأكيد موعدك.",
              type: "appointment_confirmed",
              link: `/appointments/${appointmentId}`,
            },
          }),
        ]);
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.CheckoutSessionExpiredEvent["data"]["object"];
        const appointmentId = session.metadata?.appointmentId;

        if (!appointmentId) break;

        await prisma.appointment.update({
          where: { id: appointmentId },
          data: { paymentStatus: "FAILED", status: "DRAFT" },
        });

        await prisma.payment.update({
          where: { appointmentId },
          data: { status: "FAILED" },
        });
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = charge.payment_intent as string;

        const payment = await prisma.payment.findFirst({
          where: { stripeIntentId: paymentIntentId },
        });

        if (payment) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: "REFUNDED" },
          });

          await prisma.appointment.update({
            where: { id: payment.appointmentId },
            data: { paymentStatus: "REFUNDED", status: "CANCELLED" },
          });
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
