import { supabaseAdmin } from "@/lib/supabase-admin";

export type NotificationType =
  | "payment"      // دفعة واردة
  | "service"      // خدمة جديدة / دين
  | "appointment"  // موعد جديد
  | "appointment_update" // تحديث حالة موعد
  | "info";

interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
}

/**
 * Creates a notification for a user. Fire-and-forget — does not throw.
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    await supabaseAdmin.from("Notification").insert({
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type,
      link: params.link ?? null,
      isRead: false,
    });
  } catch (err) {
    console.error("[Notification] Failed to create notification:", err);
  }
}

/**
 * Creates notifications for both doctor and patient when an appointment is booked.
 */
export async function notifyAppointmentBooked({
  doctorUserId,
  patientUserId,
  patientName,
  doctorName,
  date,
  appointmentId,
}: {
  doctorUserId: string;
  patientUserId: string;
  patientName: string;
  doctorName: string;
  date: string;
  appointmentId: string;
}) {
  await Promise.all([
    createNotification({
      userId: doctorUserId,
      title: "موعد جديد",
      message: `${patientName} حجز موعداً بتاريخ ${date}`,
      type: "appointment",
      link: `/dashboard/doctor/appointments`,
    }),
    createNotification({
      userId: patientUserId,
      title: "تم تأكيد موعدك",
      message: `موعدك مع ${doctorName} بتاريخ ${date} تم تسجيله`,
      type: "appointment",
      link: `/dashboard/patient/appointments`,
    }),
  ]);
}

/**
 * Notifies both the doctor and the patient about a new transaction.
 */
export async function notifyClinicTransaction({
  doctorUserId,
  patientUserId,
  patientName,
  type,
  description,
  amount,
  doctorName,
  patientId,
}: {
  doctorUserId: string;
  patientUserId: string | null;
  patientName?: string | null;
  type: "SERVICE" | "PAYMENT";
  description: string;
  amount: number;
  doctorName?: string | null;
  patientId?: string;
}) {
  const tasks: Promise<void>[] = [];

  /* ── إشعار للطبيب دائماً ────────────────────────────────── */
  if (type === "PAYMENT") {
    tasks.push(
      createNotification({
        userId: doctorUserId,
        title: "تم تسجيل دفعة",
        message: `دفعة بمبلغ ₪${amount.toFixed(0)} من ${patientName ?? "مريض"} — ${description}`,
        type: "payment",
        link: patientId ? `/dashboard/doctor/patients?id=${patientId}&source=clinic` : "/dashboard/doctor/patients",
      })
    );
  } else {
    tasks.push(
      createNotification({
        userId: doctorUserId,
        title: "خدمة طبية مُسجَّلة",
        message: `تمت إضافة "${description}" بقيمة ₪${amount.toFixed(0)} للمريض ${patientName ?? ""}`,
        type: "service",
        link: patientId ? `/dashboard/doctor/patients?id=${patientId}&source=clinic` : "/dashboard/doctor/patients",
      })
    );
  }

  /* ── إشعار للمريض إن كان له حساب ───────────────────────── */
  if (patientUserId) {
    if (type === "PAYMENT") {
      tasks.push(
        createNotification({
          userId: patientUserId,
          title: "تم تسجيل دفعتك",
          message: `تم تسجيل دفعة بمبلغ ₪${amount.toFixed(0)} — ${description}${doctorName ? ` · د. ${doctorName}` : ""}`,
          type: "payment",
          link: "/dashboard/patient/transactions",
        })
      );
    } else {
      tasks.push(
        createNotification({
          userId: patientUserId,
          title: "خدمة طبية مضافة",
          message: `تمت إضافة خدمة "${description}" بقيمة ₪${amount.toFixed(0)}${doctorName ? ` · د. ${doctorName}` : ""}`,
          type: "service",
          link: "/dashboard/patient/transactions",
        })
      );
    }
  }

  await Promise.all(tasks);
}
