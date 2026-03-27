"use client";

import { useCallback, useMemo, useRef, type Dispatch, type SetStateAction } from "react";
import IconPlus from "@/components/icon/icon-plus";
import IconTrash from "@/components/icon/icon-trash";
import IconPrinter from "@/components/icon/icon-printer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { printHtmlDocument } from "@/lib/print-html";
import { buildCarePlanLetterheadHtml, nl2brEscaped, type CarePlanLetterheadPatient } from "@/lib/care-plan-print-html";
import { getFollowUpVisitsFromPlanData } from "@/lib/care-plan-follow-ups";
import { toast } from "sonner";

const MAX_IMAGES = 8;
const MAX_FILE_MB = 6;

export type FetalImageRow = {
  id: string;
  dataUrl: string;
  caption?: string;
};

function newId() {
  return `fi_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** ضغط تقريبي كصورة JPEG لتقليل حجم JSON في قاعدة البيانات */
function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const maxW = 900;
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > maxW) {
          h = Math.round((h * maxW) / w);
          w = maxW;
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("canvas"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("load"));
    };
    img.src = url;
  });
}

export type FetalPrintBridge = {
  doctorDisplayNameAr: string;
  patient: CarePlanLetterheadPatient;
  doctorNotes: string;
};

type Props = {
  data: Record<string, unknown>;
  setData: Dispatch<SetStateAction<Record<string, unknown>>>;
  printBridge?: FetalPrintBridge | null;
};

const FETAL_FALLBACK_BRIDGE: FetalPrintBridge = {
  doctorDisplayNameAr: "د. —",
  patient: { name: "—", recordId: "" },
  doctorNotes: "",
};

export function FetalImagingCarePlanBlock({ data, setData, printBridge }: Props) {
  const bridge = printBridge ?? FETAL_FALLBACK_BRIDGE;
  const fileRef = useRef<HTMLInputElement>(null);
  const studyDate = (data.studyDate as string) || "";
  const gaRaw = data.gestationalAgeWeeks;
  const gaWeeks =
    gaRaw !== undefined && gaRaw !== null && !Number.isNaN(Number(gaRaw)) ? String(gaRaw) : "";
  const reportText = (data.reportText as string) || "";
  const images = useMemo(
    () => (Array.isArray(data.images) ? data.images : []) as FetalImageRow[],
    [data.images]
  );

  const addFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      const list = [...images];
      for (let i = 0; i < files.length; i++) {
        if (list.length >= MAX_IMAGES) {
          toast.error(`الحد الأقصى ${MAX_IMAGES} صور`);
          break;
        }
        const f = files[i];
        if (!f.type.startsWith("image/")) {
          toast.error("الملف ليس صورة");
          continue;
        }
        if (f.size > MAX_FILE_MB * 1024 * 1024) {
          toast.error(`الصورة كبيرة جداً (حد أقصى ~${MAX_FILE_MB} ميجا)`);
          continue;
        }
        try {
          const dataUrl = await compressImageFile(f);
          list.push({ id: newId(), dataUrl, caption: "" });
        } catch {
          toast.error("تعذر معالجة الصورة");
        }
      }
      setData((d) => ({ ...d, images: list }));
      if (fileRef.current) fileRef.current.value = "";
    },
    [images, setData]
  );

  const openPrintableReport = () => {
    if (typeof window === "undefined") return;
    const title = "تقرير تصوير الجنين / السونار";
    const metaLines = [
      studyDate ? `تاريخ الفحص: ${studyDate}` : "",
      gaWeeks ? `عمر الحمل (أسابيع تقريبية): ${gaWeeks}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const imgsHtml = images
      .map(
        (im, idx) => `
      <div style="page-break-inside:avoid;margin-bottom:16px">
        <p style="font-size:0.85rem;color:#444;margin:0 0 6px">صورة ${idx + 1}${im.caption ? ` — ${escapeHtml(im.caption)}` : ""}</p>
        <img src="${im.dataUrl}" alt="" style="max-width:100%;height:auto;border:1px solid #ccc;border-radius:6px" />
      </div>`,
      )
      .join("");

    const sections = [
      {
        titleAr: "بيانات الفحص",
        titleEn: "Study details",
        bodyHtml: metaLines ? nl2brEscaped(metaLines) : `<p class="muted">—</p>`,
      },
      {
        titleAr: "التقرير والتشخيص",
        titleEn: "Report / diagnosis",
        bodyHtml: reportText.trim() ? nl2brEscaped(reportText.trim()) : `<p class="muted">—</p>`,
      },
      {
        titleAr: "صور السونار",
        titleEn: "Ultrasound images",
        bodyHtml: imgsHtml ? imgsHtml : `<p class="muted">لا صور مرفقة</p>`,
      },
    ];

    const html = buildCarePlanLetterheadHtml({
      origin: window.location.origin,
      documentTitleAr: title,
      issuedAtAr: new Date().toLocaleString("ar", { dateStyle: "medium", timeStyle: "short" }),
      doctor: { displayNameAr: bridge.doctorDisplayNameAr },
      patient: bridge.patient,
      sections,
      followUpVisits: getFollowUpVisitsFromPlanData(data),
      recommendationsText: bridge.doctorNotes,
    });

    printHtmlDocument(html, title);
  };

  return (
    <div className="space-y-4 rounded-xl border border-cyan-100 bg-cyan-50/40 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">تاريخ الفحص</label>
          <input
            type="date"
            value={studyDate}
            onChange={(e) => setData((d) => ({ ...d, studyDate: e.target.value }))}
            className="h-9 w-full rounded-lg border border-gray-300 px-3 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">عمر الحمل (أسابيع، تقريبي)</label>
          <Input
            type="number"
            min={0}
            max={42}
            step={0.1}
            placeholder="مثال: 24"
            value={gaWeeks}
            onChange={(e) => {
              const v = e.target.value;
              setData((d) => ({
                ...d,
                gestationalAgeWeeks: v === "" ? null : Number(v),
              }));
            }}
            className="h-9"
          />
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span className="text-xs font-semibold text-gray-800">صور السونار ({images.length}/{MAX_IMAGES})</span>
          <div className="flex gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => void addFiles(e.target.files)}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1"
              disabled={images.length >= MAX_IMAGES}
              onClick={() => fileRef.current?.click()}
            >
              <IconPlus className="h-3.5 w-3.5" />
              إضافة صور
            </Button>
            <Button type="button" size="sm" variant="secondary" className="h-8 gap-1" onClick={openPrintableReport}>
              <IconPrinter className="h-3.5 w-3.5" />
              طباعة / PDF
            </Button>
          </div>
        </div>

        {images.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 py-4 text-center border border-dashed border-gray-200 rounded-lg bg-white/60 dark:border-slate-700 dark:bg-slate-900/50">
            لم تُرفع صور بعد
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {images.map((im) => (
              <div key={im.id} className="rounded-lg border border-gray-200 bg-white p-2 space-y-2 dark:border-slate-700 dark:bg-slate-900/60">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={im.dataUrl} alt="" className="w-full max-h-48 object-contain rounded-md bg-gray-50 dark:bg-slate-950" />
                <Input
                  className="h-8 text-xs"
                  placeholder="وصف مختصر (اختياري)"
                  value={im.caption || ""}
                  onChange={(e) =>
                    setData((d) => {
                      const arr = [...((d.images as FetalImageRow[]) || [])];
                      const i = arr.findIndex((x) => x.id === im.id);
                      if (i >= 0) arr[i] = { ...arr[i], caption: e.target.value };
                      return { ...d, images: arr };
                    })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-600 h-8 w-full"
                  onClick={() =>
                    setData((d) => ({
                      ...d,
                      images: ((d.images as FetalImageRow[]) || []).filter((x) => x.id !== im.id),
                    }))
                  }
                >
                  <IconTrash className="h-3.5 w-3.5 ml-1" />
                  حذف الصورة
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-800 mb-1 block">التقرير الطبي / الملاحظات</label>
        <textarea
          value={reportText}
          onChange={(e) => setData((d) => ({ ...d, reportText: e.target.value }))}
          rows={8}
          placeholder="اكتب تقرير الفحص، القياسات، الملاحظات، والتوصيات..."
          className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 min-h-[140px]"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" className="gap-2" onClick={openPrintableReport}>
          <IconPrinter className="h-4 w-4" />
          طباعة أو حفظ PDF
        </Button>
      </div>
    </div>
  );
}
