import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "DOCTOR") return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

    const { id } = await params;
    const doctor = await prisma.doctor.findUnique({ where: { userId: session.user.id } });
    if (!doctor) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

    const apt = await prisma.clinicAppointment.findUnique({ where: { id } });
    if (!apt || apt.doctorId !== doctor.id) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

    const { status } = await req.json();
    const updated = await prisma.clinicAppointment.update({ where: { id }, data: { status } });

    return NextResponse.json({ appointment: updated });
  } catch {
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
