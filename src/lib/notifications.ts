import { supabaseAdmin } from "@/lib/supabase-admin";

export type NotificationType =
  | "payment"
  | "service"
  | "appointment"
  | "appointment_update"
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
 * Supabase client returns { error } instead of throwing; we must check it.
 */
export async function createNotification(params: CreateNotificationParams) {
  if (!params.userId?.trim()) {
    console.error("[Notification] Skip: userId is empty");
    return;
  }
  try {
    const payload = {
      userId:  params.userId,
      title:   params.title,
      message: params.message,
      type:    params.type,
      link:    params.link ?? null,
      isRead:  false,
    };
    const { error } = await supabaseAdmin.from("Notification").insert(payload);

    if (error) {
      console.error("[Notification] Insert failed:", error.message, "code:", error.code, "details:", error.details, "payload:", { ...payload, userId: payload.userId?.slice(0, 8) + "…" });
    }
  } catch (err) {
    console.error("[Notification] Unexpected error:", err);
  }
}

/** إشعار جميع مشرفي المنصة (مثلاً تسجيل مركز جديد) */
export async function notifyPlatformAdmins(title: string, message: string, link?: string) {
  try {
    const { data: admins } = await supabaseAdmin.from("User").select("id").eq("role", "PLATFORM_ADMIN");
    for (const row of admins ?? []) {
      const id = (row as { id: string }).id;
      await createNotification({ userId: id, title, message, type: "info", link });
    }
  } catch (e) {
    console.error("[notifyPlatformAdmins]", e);
  }
}

/**
 * Finds a User.id by email or phone (for linking clinic patients to platform accounts).
 */
async function resolvePatientUserId(
  userId: string | null | undefined,
  email: string | null | undefined,
  phone: string | null | undefined,
): Promise<string | null> {
  if (userId) return userId;

  if (email) {
    const { data } = await supabaseAdmin
      .from("User")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (data?.id) return data.id;
  }

  if (phone) {
    const { data } = await supabaseAdmin
      .from("User")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();
    if (data?.id) return data.id;
  }

  return null;
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
      userId:  doctorUserId,
      title:   "موعد جديد",
      message: `${patientName} طلب موعداً بتاريخ ${date} — بانتظار تأكيدك`,
      type:    "appointment",
      link:    "/dashboard/doctor/appointments",
    }),
    createNotification({
      userId:  patientUserId,
      title:   "طلب حجز قيد الانتظار",
      message: `تم استلام طلب موعد مع ${doctorName} بتاريخ ${date}. سيتم إشعارك عند تأكيد الطبيب.`,
      type:    "appointment",
      link:    "/dashboard/patient/appointments",
    }),
  ]);
}

/** بعد تأكيد الطبيب للحجز (DRAFT → CONFIRMED) */
export async function notifyAppointmentConfirmedByDoctor({
  patientUserId,
  doctorName,
  date,
  time,
}: {
  patientUserId: string;
  doctorName: string;
  date: string;
  time: string;
}) {
  await createNotification({
    userId: patientUserId,
    title: "تم تأكيد موعدك",
    message: `تم تأكيد موعدك مع ${doctorName} بتاريخ ${date} الساعة ${time}.`,
    type: "appointment",
    link: "/dashboard/patient/appointments",
  });
}

/**
 * Notifies both the doctor and the patient (resolved by userId / email / phone)
 * about a new transaction.
 */
export async function notifyClinicTransaction({
  doctorUserId,
  patientUserId,
  patientEmail,
  patientPhone,
  patientName,
  type,
  description,
  amount,
  doctorName,
  patientId,
  patientSource = "clinic",
}: {
  doctorUserId: string;
  patientUserId: string | null | undefined;
  patientEmail?: string | null;
  patientPhone?: string | null;
  patientName?: string | null;
  type: "SERVICE" | "PAYMENT";
  description: string;
  amount: number;
  doctorName?: string | null;
  patientId?: string;
  patientSource?: "clinic" | "platform";
}) {
  const tasks: Promise<void>[] = [];
  const patientLink = patientId
    ? `/dashboard/doctor/patients?id=${patientId}&source=${patientSource}`
    : "/dashboard/doctor/patients";

  /* ── إشعار للطبيب دائماً ─────────────────────────────────── */
  tasks.push(
    createNotification({
      userId:  doctorUserId,
      title:   type === "PAYMENT" ? "تم تسجيل دفعة" : "خدمة طبية مُسجَّلة",
      message: type === "PAYMENT"
        ? `دفعة ₪${amount.toFixed(0)} من ${patientName ?? "مريض"} — ${description}`
        : `تمت إضافة "${description}" ₪${amount.toFixed(0)} للمريض ${patientName ?? ""}`,
      type: type === "PAYMENT" ? "payment" : "service",
      link: patientLink,
    })
  );

  /* ── إشعار للمريض — يُحلَّل userId من الإيميل/الهاتف إن لم يُوجد ── */
  const resolvedPatientId = await resolvePatientUserId(
    patientUserId,
    patientEmail,
    patientPhone,
  );

  if (resolvedPatientId) {
    tasks.push(
      createNotification({
        userId:  resolvedPatientId,
        title:   type === "PAYMENT" ? "تم تسجيل دفعتك" : "خدمة طبية مضافة",
        message: type === "PAYMENT"
          ? `تم تسجيل دفعة ₪${amount.toFixed(0)} — ${description}${doctorName ? ` · د. ${doctorName}` : ""}`
          : `تمت إضافة خدمة "${description}" ₪${amount.toFixed(0)}${doctorName ? ` · د. ${doctorName}` : ""}`,
        type: type === "PAYMENT" ? "payment" : "service",
        link: "/dashboard/patient/transactions",
      })
    );
  }

  await Promise.all(tasks);
}
