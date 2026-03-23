import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import IconStar from "@/components/icon/icon-star";
import IconCircleCheck from "@/components/icon/icon-circle-check";
import IconClock from "@/components/icon/icon-clock";
import IconXCircle from "@/components/icon/icon-x-circle";
import IconMinusCircle from "@/components/icon/icon-minus-circle";
import AdminDoctorActions from "../admin-doctor-actions";

const STATUS_MAP: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  APPROVED: { label: "معتمد", icon: IconCircleCheck, color: "text-green-600" },
  PENDING: { label: "قيد المراجعة", icon: IconClock, color: "text-orange-500" },
  REJECTED: { label: "مرفوض", icon: IconXCircle, color: "text-red-500" },
  SUSPENDED: { label: "موقوف", icon: IconMinusCircle, color: "text-gray-500" },
};

export default async function AdminDoctorsPage() {
  const session = await auth();
  if (!session || !["PLATFORM_ADMIN", "CLINIC_ADMIN"].includes(session.user.role)) redirect("/login");

  const doctors = await prisma.doctor.findMany({
    include: {
      user: true,
      specialty: true,
      clinics: { take: 1 },
      _count: { select: { appointments: true, reviews: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">إدارة الأطباء</h1>
        <p className="text-gray-500 text-sm mt-0.5">{doctors.length} طبيب مسجّل</p>
      </div>

      <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 bg-white rounded-2xl border border-gray-200 shadow-sm touch-pan-x scrollbar-hide">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-right text-xs text-gray-500">
              <th className="px-5 py-4 font-medium">الطبيب</th>
              <th className="px-4 py-4 font-medium">التخصص</th>
              <th className="px-4 py-4 font-medium">المواعيد</th>
              <th className="px-4 py-4 font-medium">التقييم</th>
              <th className="px-4 py-4 font-medium">تاريخ التسجيل</th>
              <th className="px-4 py-4 font-medium">الحالة</th>
              <th className="px-4 py-4 font-medium">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {doctors.map((doc: (typeof doctors)[number]) => {
              const cfg = STATUS_MAP[doc.status];
              const Icon = cfg.icon;
              return (
                <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-base font-bold text-blue-600 shrink-0">
                        {doc.user.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">د. {doc.user.name}</p>
                        <p className="text-xs text-gray-400">{doc.user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-gray-700">{doc.specialty.nameAr}</td>
                  <td className="px-4 py-4 text-gray-600">{doc._count.appointments}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <IconStar className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium text-gray-800">{doc.rating.toFixed(1)}</span>
                      <span className="text-xs text-gray-400">({doc._count.reviews})</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-gray-500 text-xs">
                    {format(new Date(doc.createdAt), "dd/MM/yyyy")}
                  </td>
                  <td className="px-4 py-4">
                    <div className={`flex items-center gap-1.5 text-xs font-medium ${cfg.color}`}>
                      <Icon className="h-3.5 w-3.5" />{cfg.label}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {doc.status === "PENDING" && <AdminDoctorActions doctorId={doc.id} />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
