import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "DOCTOR") return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

    const { id } = await params;
    const doctor = await prisma.doctor.findUnique({ where: { userId: session.user.id } });
    if (!doctor) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

    const tx = await prisma.clinicTransaction.findUnique({
      where: { id },
      include: { clinicPatient: true },
    });

    if (!tx || tx.clinicPatient.doctorId !== doctor.id) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    await prisma.clinicTransaction.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
