import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";
import { formatDateNumeric } from "@/lib/utils";

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2026-02-25.clover" });
}

export async function POST(req: Request) {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: "الدفع غير مُهيأ" }, { status: 503 });
    }
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { appointmentId } = await req.json();

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
        doctor: { include: { user: true, specialty: true } },
        clinic: true,
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "الموعد غير موجود" }, { status: 404 });
    }

    if (appointment.patientId !== session.user.id) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    if (appointment.paymentStatus === "PAID") {
      return NextResponse.json({ error: "تم الدفع مسبقاً" }, { status: 400 });
    }

    // Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `موعد طبي - د. ${appointment.doctor.user.name}`,
              description: `${appointment.doctor.specialty.nameAr} - ${appointment.startTime} - ${formatDateNumeric(appointment.appointmentDate)}`,
            },
            unit_amount: Math.round(appointment.fee * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/appointments/${appointmentId}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/appointments/${appointmentId}/payment`,
      customer_email: appointment.patient.email,
      metadata: {
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
      },
    });

    // Update appointment with session ID
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        stripeSessionId: checkoutSession.id,
        paymentStatus: "PROCESSING",
      },
    });

    await prisma.payment.update({
      where: { appointmentId },
      data: {
        stripeSessionId: checkoutSession.id,
        status: "PROCESSING",
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Payment intent error:", error);
    return NextResponse.json({ error: "حدث خطأ في الدفع" }, { status: 500 });
  }
}
