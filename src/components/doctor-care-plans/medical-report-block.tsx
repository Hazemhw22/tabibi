"use client";

import { Input } from "@/components/ui/input";

type Props = {
  data: Record<string, any>;
  setData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
};

export function MedicalReportBlock({ data, setData }: Props) {
  const updateField = (key: string, value: any) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-8 text-right" dir="rtl">
      {/* 1. Clinical History */}
      <section className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
        <h4 className="font-bold text-slate-800 flex items-center gap-2">
          <span className="w-2 h-6 bg-slate-500 rounded-full"></span>
          1. التاريخ المرضي (Clinical History)
        </h4>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 mr-1">الشكوى الرئيسية (Presenting Complaints)</label>
            <textarea
              placeholder="مثال: ألم شديد في البطن منذ يومين مصحوب بغثيان..."
              value={data.presentingComplaints || ""}
              onChange={(e) => updateField("presentingComplaints", e.target.value)}
              className="w-full p-4 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 min-h-[100px]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 mr-1">التاريخ الطبي السابق (Medical History)</label>
            <textarea
              placeholder="الأمراض المزمنة، العمليات الجراحية السابقة، أو الحساسية..."
              value={data.medicalHistory || ""}
              onChange={(e) => updateField("medicalHistory", e.target.value)}
              className="w-full p-4 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 min-h-[80px]"
            />
          </div>
        </div>
      </section>

      {/* 2. Physical Examination */}
      <section className="bg-white p-6 rounded-2xl border border-indigo-100 space-y-4 shadow-sm">
        <h4 className="font-bold text-indigo-900 flex items-center gap-2">
          <span className="w-2 h-6 bg-indigo-500 rounded-full"></span>
          2. الفحص السريري (Physical Examination)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-indigo-700">الضغط (BP)</label>
            <Input
              placeholder="120/80"
              value={data.bp || ""}
              onChange={(e) => updateField("bp", e.target.value)}
              className="bg-indigo-50/30 border-indigo-100"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-indigo-700">الحرارة (Temp)</label>
            <Input
              placeholder="37°C"
              value={data.temp || ""}
              onChange={(e) => updateField("temp", e.target.value)}
              className="bg-indigo-50/30 border-indigo-100"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-indigo-700">النبض (Pulse)</label>
            <Input
              placeholder="72 bpm"
              value={data.pulse || ""}
              onChange={(e) => updateField("pulse", e.target.value)}
              className="bg-indigo-50/30 border-indigo-100"
            />
          </div>
        </div>
        <textarea
          placeholder="نتائج الفحص الفيزيائي التفصيلية..."
          value={data.physicalExamination || ""}
          onChange={(e) => updateField("physicalExamination", e.target.value)}
          className="w-full p-4 rounded-xl border border-indigo-100 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 min-h-[100px]"
        />
      </section>

      {/* 3. Investigations */}
      <section className="bg-purple-50/50 p-6 rounded-2xl border border-purple-100 space-y-4">
        <h4 className="font-bold text-purple-900 flex items-center gap-2">
          <span className="w-2 h-6 bg-purple-500 rounded-full"></span>
          3. النتائج المخبرية والشعاعية (Investigations)
        </h4>
        <textarea
          placeholder="ملخص نتائج التحاليل، الأشعة، أو السونار المسجلة خلال هذه الزيارة..."
          value={data.investigations || ""}
          onChange={(e) => updateField("investigations", e.target.value)}
          className="w-full p-4 rounded-xl border border-purple-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 min-h-[120px]"
        />
      </section>

      {/* 4. Clinical Impression/Diagnosis */}
      <section className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 space-y-4">
        <h4 className="font-bold text-emerald-900 flex items-center gap-2">
          <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
          4. الاستنتاج الطبي والتشخيص (Diagnosis)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-3">
             <textarea
                placeholder="التشخيص النهائي للحالة..."
                value={data.diagnosis || ""}
                onChange={(e) => updateField("diagnosis", e.target.value)}
                className="w-full p-4 rounded-xl border border-emerald-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 min-h-[60px]"
              />
          </div>
          <div className="space-y-1.5">
             <label className="text-xs font-bold text-emerald-700 block">كود ICD-10</label>
             <Input
                placeholder="Kod"
                value={data.icd10 || ""}
                onChange={(e) => updateField("icd10", e.target.value)}
                className="bg-white border-emerald-100"
             />
          </div>
        </div>
      </section>

      {/* 5. Recommendations & Sick Leave */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100 space-y-4">
          <h4 className="font-bold text-amber-900 flex items-center gap-2">
            <span className="w-2 h-6 bg-amber-500 rounded-full"></span>
            5. التوصيات (Recommendations)
          </h4>
          <textarea
            placeholder="ملخص سريع للعلاج الموصوف أو الخطوات القادمة..."
            value={data.recommendations || ""}
            onChange={(e) => updateField("recommendations", e.target.value)}
            className="w-full p-4 rounded-xl border border-amber-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[120px]"
          />
        </div>

        <div className="bg-rose-50/50 p-6 rounded-2xl border border-rose-100 space-y-4">
          <h4 className="font-bold text-rose-900 flex items-center gap-2">
            <span className="w-2 h-6 bg-rose-500 rounded-full"></span>
            6. الإجازة المرضية (Sick Leave)
          </h4>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-rose-800 shrink-0">عدد أيام الراحة المطلوبة:</label>
                <Input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={data.sickLeaveDays || ""}
                    onChange={(e) => updateField("sickLeaveDays", e.target.value)}
                    className="w-24 bg-white border-rose-200 text-center font-bold text-lg"
                />
            </div>
            <textarea
                placeholder="ملاحظات إضافية بخصوص الإجازة المرضية (اختياري)..."
                value={data.sickLeaveNotes || ""}
                onChange={(e) => updateField("sickLeaveNotes", e.target.value)}
                className="w-full p-4 rounded-xl border border-rose-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 min-h-[80px]"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
