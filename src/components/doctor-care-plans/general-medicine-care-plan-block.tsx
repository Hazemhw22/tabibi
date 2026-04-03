"use client";

import IconPlus from "@/components/icon/icon-plus";
import IconTrash from "@/components/icon/icon-trash";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PlanItem = {
  id: string;
  label: string; // اسم البند (العلاج)
  cost: string;  // التكلفة
};

type Prescription = {
  id: string;
  drug: string;
  dosage: string;
  freq: string;
  duration: string;
};

type Props = {
  data: Record<string, any>;
  setData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
};

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function GeneralMedicineCarePlanBlock({ data, setData }: Props) {
  const items = (data.items as PlanItem[]) || [];
  const prescriptions = (data.prescriptions as Prescription[]) || [];
  
  const updateField = (key: string, value: any) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const addItem = () => {
    const newItem: PlanItem = { id: newId("itm"), label: "", cost: "" };
    updateField("items", [...items, newItem]);
  };

  const removeItem = (id: string) => {
    updateField("items", items.filter((m) => m.id !== id));
  };

  const addPrescription = () => {
    const newPr: Prescription = { id: newId("pr"), drug: "", dosage: "", freq: "", duration: "" };
    updateField("prescriptions", [...prescriptions, newPr]);
  };

  const removePrescription = (id: string) => {
    updateField("prescriptions", prescriptions.filter((m) => m.id !== id));
  };

  const updateArrayItem = (key: "items" | "prescriptions", id: string, field: string, value: string) => {
    const arr = (data[key] as any[]) || [];
    const next = arr.map((x) => (x.id === id ? { ...x, [field]: value } : x));
    updateField(key, next);
  };

  const totalCost = items.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);

  return (
    <div className="space-y-8 text-right" dir="rtl">
      {/* 1. Diagnosis Section */}
      <section className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 space-y-4">
        <h4 className="font-bold text-blue-900 flex items-center gap-2">
          <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
          قسم التشخيص (Diagnosis)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 text-right">
            <label className="text-xs font-semibold text-gray-600 block">ICD-10 Code</label>
            <Input
              placeholder="مثال: J03.90"
              value={data.icd10Code || ""}
              onChange={(e) => updateField("icd10Code", e.target.value)}
              className="bg-white"
            />
          </div>
          <div className="space-y-1.5 text-right">
            <label className="text-xs font-semibold text-gray-600 block">حدة الحالة (Severity)</label>
            <select
              value={data.severity || "بسيطة"}
              onChange={(e) => updateField("severity", e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="بسيطة">بسيطة (Mild)</option>
              <option value="متوسطة">متوسطة (Moderate)</option>
              <option value="حادة">حادة (Severe)</option>
            </select>
          </div>
        </div>
      </section>

      {/* 2. Prescription Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-gray-900 flex items-center gap-2">
            <span className="w-2 h-6 bg-blue-600 rounded-full"></span>
            الوصفة الطبية (Prescriptions)
          </h4>
          <Button
            type="button"
            size="sm"
            onClick={addPrescription}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 rounded-xl"
          >
            <IconPlus className="h-4 w-4" /> إضافة دواء
          </Button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-medium">
              <tr>
                <th className="px-4 py-3 text-right">اسم الدواء</th>
                <th className="px-4 py-3 text-right">الجرعة</th>
                <th className="px-4 py-3 text-right">التكرار</th>
                <th className="px-4 py-3 text-right">المدة</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {prescriptions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">
                    لا توجد أدوية مضافة في الوصفة الطبية.
                  </td>
                </tr>
              )}
              {prescriptions.map((pr) => (
                <tr key={pr.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-2">
                    <Input
                      placeholder="Amoxicillin 500mg"
                      value={pr.drug}
                      onChange={(e) => updateArrayItem("prescriptions", pr.id, "drug", e.target.value)}
                      className="h-9 border-transparent focus:border-blue-200"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      placeholder="One tablet"
                      value={pr.dosage}
                      onChange={(e) => updateArrayItem("prescriptions", pr.id, "dosage", e.target.value)}
                      className="h-9 border-transparent focus:border-blue-200"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      placeholder="2 times daily"
                      value={pr.freq}
                      onChange={(e) => updateArrayItem("prescriptions", pr.id, "freq", e.target.value)}
                      className="h-9 border-transparent focus:border-blue-200"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      placeholder="5 days"
                      value={pr.duration}
                      onChange={(e) => updateArrayItem("prescriptions", pr.id, "duration", e.target.value)}
                      className="h-9 border-transparent focus:border-blue-200"
                    />
                  </td>
                  <td className="p-2">
                    <button
                      type="button"
                      onClick={() => removePrescription(pr.id)}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <IconTrash className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. Cost Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-gray-900 flex items-center gap-2">
            <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
            بنود العلاج والتكلفة (Clinic Billing)
          </h4>
          <Button
            type="button"
            size="sm"
            onClick={addItem}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 rounded-xl"
          >
            <IconPlus className="h-4 w-4" /> إضافة بند تكلفة
          </Button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-medium">
              <tr>
                <th className="px-4 py-3 text-right">وصف البند (إجراءات العيادة، أدوية العيادة...)</th>
                <th className="px-4 py-3 w-40 text-center text-right">التكلفة (₪)</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-400 italic">
                    لا توجد بنود تكلفة مضافة.
                  </td>
                </tr>
              )}
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-2">
                    <Input
                      placeholder="مثال: فحص سريري، حقنة فيتامين..."
                      value={item.label}
                      onChange={(e) => updateArrayItem("items", item.id, "label", e.target.value)}
                      className="h-9 border-transparent focus:border-blue-200"
                    />
                  </td>
                  <td className="p-2 text-center">
                    <Input
                      type="number"
                      placeholder="0"
                      value={item.cost}
                      onChange={(e) => updateArrayItem("items", item.id, "cost", e.target.value)}
                      className="h-9 border-transparent focus:border-blue-200 text-center font-semibold text-blue-600"
                    />
                  </td>
                  <td className="p-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <IconTrash className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {items.length > 0 && (
              <tfoot className="bg-emerald-50/50">
                <tr>
                  <td className="p-3 text-right font-bold text-gray-700">إجمالي التكلفة (Total):</td>
                  <td className="p-3 text-center text-lg font-black text-emerald-700">
                    ₪{totalCost.toLocaleString()}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {/* 4. Diagnostics & Advice */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-purple-50/50 p-5 rounded-2xl border border-purple-100 space-y-4 text-right">
          <h4 className="font-bold text-purple-900 flex items-center gap-2">
            <span className="w-2 h-6 bg-purple-500 rounded-full"></span>
            الفحوصات المطلوبة (Diagnostics)
          </h4>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 block">المختبر (Lab Tests)</label>
              <textarea
                placeholder="أدخل الفحوصات المخبرية المطلوبة..."
                value={data.labTests || ""}
                onChange={(e) => updateField("labTests", e.target.value)}
                rows={3}
                className="w-full p-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 min-h-[80px]"
              />
            </div>
          </div>
        </div>

        <div className="bg-sky-50/50 p-5 rounded-2xl border border-sky-100 space-y-4 text-right">
          <h4 className="font-bold text-sky-900 flex items-center gap-2">
            <span className="w-2 h-6 bg-sky-500 rounded-full"></span>
            نمط الحياة (Lifestyle Advice)
          </h4>
          <textarea
            placeholder="نصائح بخصوص الأكل، الشرب، والراحة..."
            value={data.lifestyleAdvice || ""}
            onChange={(e) => updateField("lifestyleAdvice", e.target.value)}
            rows={4}
            className="w-full p-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 min-h-[120px]"
          />
        </div>
      </section>

      {/* 5. Red Flags */}
      <section className="text-right">
        <div className="bg-rose-50/50 p-5 rounded-2xl border border-rose-100 space-y-4">
          <h4 className="font-bold text-rose-900 flex items-center gap-2">
            <span className="w-2 h-6 bg-rose-500 rounded-full"></span>
            علامات الخطر (Red Flags)
          </h4>
          <textarea
            placeholder="قائمة بالأعراض التي تستدعي الطوارئ فوراً..."
            value={data.redFlags || ""}
            onChange={(e) => updateField("redFlags", e.target.value)}
            rows={4}
            className="w-full p-3 rounded-xl border border-gray-100 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 min-h-[100px]"
          />
        </div>
      </section>
    </div>
  );
}
