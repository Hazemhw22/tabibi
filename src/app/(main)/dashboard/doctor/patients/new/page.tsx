"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import IconArrowForward from "@/components/icon/icon-arrow-forward";
import IconLoader from "@/components/icon/icon-loader";
import IconUserPlus from "@/components/icon/icon-user-plus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ClinicPatientPhoneLookupField } from "@/components/clinic-patient-phone-lookup";
import { useTranslation } from "@/lib/i18n-context";

export default function NewPatientPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [existingUserId, setExistingUserId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    whatsapp: "",
    email: "",
    gender: "",
    dateOfBirth: "",
    address: "",
    bloodType: "",
    allergies: "",
    notes: "",
    fileNumber: "",
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error(t("doctor_dashboard.patients.toasts.name_required"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/clinic/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(t("doctor_dashboard.patients.toasts.add_success"));
        if (data.setupSmsSent === true) {
          toast.message(t("doctor_dashboard.patients.toasts.sms_sent"));
        } else if (data.setupSmsSent === false) {
          toast.warning(t("doctor_dashboard.patients.toasts.sms_not_sent"));
        }
        router.push("/dashboard/doctor/patients");
        router.refresh();
      } else {
        toast.error(data.error || t("doctor_dashboard.patients.toasts.error"));
      }
    } catch {
      toast.error(t("doctor_dashboard.patients.toasts.conn_error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/dashboard/doctor/patients"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <IconArrowForward className="h-4 w-4" />
        {t("doctor_dashboard.patients.back_to_list")}
      </Link>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="bg-gray-50/80 border-b border-gray-100">
          <CardTitle className="flex items-center gap-2 text-lg">
            <IconUserPlus className="h-5 w-5 text-blue-600" />
            {t("doctor_dashboard.patients.dialogs.add.title")}
          </CardTitle>
          <p className="text-sm text-gray-500 mt-1">{t("doctor_dashboard.patients.modals.add_patient_desc")}</p>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t("doctor_dashboard.patients.modals.name")}
                placeholder={t("doctor_dashboard.patients.dialogs.add.name_placeholder")}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
              <Input
                label={t("doctor_dashboard.patients.modals.file_number")}
                placeholder={t("doctor_dashboard.patients.dialogs.add.file_number_placeholder")}
                value={form.fileNumber}
                onChange={(e) => set("fileNumber", e.target.value)}
              />
            </div>

            <ClinicPatientPhoneLookupField
              whatsapp={form.whatsapp}
              onWhatsappChange={(v) => set("whatsapp", v)}
              onSelectUser={(u) => {
                setForm((p) => ({
                  ...p,
                  name: u.name?.trim() || p.name,
                  email: u.email || "",
                }));
                setExistingUserId(u.id);
              }}
              existingUserId={existingUserId}
              onClearExistingUser={() => setExistingUserId(null)}
            />
            <Input
              label={t("doctor_dashboard.patients.modals.email")}
              type="email"
              placeholder="example@email.com"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              dir="ltr"
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("doctor_dashboard.patients.modals.gender")}</label>
                <select
                  value={form.gender}
                  onChange={(e) => set("gender", e.target.value)}
                  className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">— {t("common.choose")} —</option>
                  <option value="male">{t("doctor_dashboard.patients.modals.gender_male")}</option>
                  <option value="female">{t("doctor_dashboard.patients.modals.gender_female")}</option>
                </select>
              </div>
              <Input
                label={t("doctor_dashboard.patients.modals.dob")}
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => set("dateOfBirth", e.target.value)}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("doctor_dashboard.patients.modals.blood_type")}</label>
                <select
                  value={form.bloodType}
                  onChange={(e) => set("bloodType", e.target.value)}
                  className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">— {t("common.choose")} —</option>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            <Input
              label={t("doctor_dashboard.patients.modals.address")}
              placeholder={t("doctor_dashboard.patients.dialogs.add.address_placeholder")}
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("doctor_dashboard.patients.modals.allergies")}</label>
              <input
                placeholder={t("doctor_dashboard.patients.medical_section.form.allergies_placeholder")}
                value={form.allergies}
                onChange={(e) => set("allergies", e.target.value)}
                className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("doctor_dashboard.patients.modals.notes")}</label>
              <textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={3}
                placeholder={t("doctor_dashboard.patients.dialogs.add.notes_placeholder")}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1" disabled={loading} size="lg">
                {loading ? (
                  <>
                    <IconLoader className="h-4 w-4 animate-spin ml-2" />
                    {t("doctor_dashboard.patients.modals.saving")}
                  </>
                ) : (
                  t("doctor_dashboard.patients.dialogs.add.submit_btn")
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push("/dashboard/doctor/patients")} size="lg">
                {t("doctor_dashboard.patients.modals.cancel")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
