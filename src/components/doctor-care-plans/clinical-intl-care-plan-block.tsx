"use client";

import type { Dispatch, SetStateAction } from "react";
import IconPlus from "@/components/icon/icon-plus";
import IconTrash from "@/components/icon/icon-trash";
import IconPrinter from "@/components/icon/icon-printer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CarePlanType } from "@/lib/specialty-plan-registry";
import { printHtmlDocument } from "@/lib/print-html";
import {
  INTL_CLINICAL_DATA_KEY,
  INTL_CLINICAL_PLAN_LAYOUTS,
  INTL_OPTIONAL_ROWS_KEY,
  type IntlField,
  type IntlFieldOptionalButtons,
  type IntlOptionalRow,
  type IntlPlanLayout,
} from "./clinical-intl-care-plan-config";
import {
  buildCarePlanLetterheadHtml,
  tableRowsToHtml,
  type CarePlanLetterheadPatient,
} from "@/lib/care-plan-print-html";
import { getFollowUpVisitsFromPlanData } from "@/lib/care-plan-follow-ups";

type IntlRoot = Partial<Record<CarePlanType, Record<string, unknown>>>;

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getIntlRoot(data: Record<string, unknown>): IntlRoot {
  const raw = data[INTL_CLINICAL_DATA_KEY];
  if (!raw || typeof raw !== "object") return {};
  return raw as IntlRoot;
}

function isOptionalRow(x: unknown): x is IntlOptionalRow {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.id === "string" && typeof o.blockId === "string" && typeof o.value === "string";
}

function parseOptionalRowsFromValue(v: unknown): Record<string, IntlOptionalRow[]> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const out: Record<string, IntlOptionalRow[]> = {};
  for (const [gk, arr] of Object.entries(v as Record<string, unknown>)) {
    if (!Array.isArray(arr)) continue;
    out[gk] = arr.filter(isOptionalRow).map((r) => ({
      id: r.id,
      blockId: r.blockId,
      value: r.value,
    }));
  }
  return out;
}

function parsePlanSlice(raw: unknown): {
  strings: Record<string, string>;
  optionalRows: Record<string, IntlOptionalRow[]>;
} {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { strings: {}, optionalRows: {} };
  }
  const o = raw as Record<string, unknown>;
  const optionalRows = parseOptionalRowsFromValue(o[INTL_OPTIONAL_ROWS_KEY]);
  const strings: Record<string, string> = {};
  for (const [k, v] of Object.entries(o)) {
    if (k === INTL_OPTIONAL_ROWS_KEY) continue;
    if (typeof v === "string") strings[k] = v;
  }
  return { strings, optionalRows };
}

function buildSerializedSlice(
  strings: Record<string, string>,
  optionalRows: Record<string, IntlOptionalRow[]>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...strings };

  const cleaned: Record<string, IntlOptionalRow[]> = {};
  for (const [k, rows] of Object.entries(optionalRows)) {
    if (rows.length > 0) cleaned[k] = rows;
  }
  if (Object.keys(cleaned).length > 0) out[INTL_OPTIONAL_ROWS_KEY] = cleaned;
  else delete out[INTL_OPTIONAL_ROWS_KEY];

  return out;
}

function isOptionalButtonsField(f: IntlField): f is IntlFieldOptionalButtons {
  return f.kind === "optionalButtons";
}

function sectionHasPrintableContent(
  sec: IntlPlanLayout["sections"][0],
  slice: Record<string, string>,
  optionalRows: Record<string, IntlOptionalRow[]>,
): boolean {
  for (const f of sec.fields) {
    if (isOptionalButtonsField(f)) {
      const rows = optionalRows[f.groupKey] ?? [];
      if (rows.some((r) => r.value.trim())) return true;
    } else if ((slice[f.key] ?? "").trim()) return true;
  }
  return false;
}

function renderOptionalButtonsPrintTable(field: IntlFieldOptionalButtons, optionalRows: Record<string, IntlOptionalRow[]>) {
  const rows = optionalRows[field.groupKey] ?? [];
  const filled = rows.filter((r) => r.value.trim());
  if (filled.length === 0) return "";
  return filled
    .map((r) => {
      const blk = field.blocks.find((b) => b.blockId === r.blockId);
      const labelAr = blk?.rowLabelAr ?? r.blockId;
      const labelEn = blk?.rowLabelEn ? ` — ${blk.rowLabelEn}` : "";
      return `<tr><td class="l">${escapeHtml(labelAr)}${escapeHtml(labelEn)}</td><td>${escapeHtml(r.value.trim()).replace(/\n/g, "<br/>")}</td></tr>`;
    })
    .join("");
}

export type ClinicalIntlPrintBridge = {
  doctorDisplayNameAr: string;
  patient: CarePlanLetterheadPatient;
  doctorNotes: string;
};

type Props = {
  carePlanType: CarePlanType;
  data: Record<string, unknown>;
  setData: Dispatch<SetStateAction<Record<string, unknown>>>;
  printBridge?: ClinicalIntlPrintBridge | null;
};

const FALLBACK_PRINT_BRIDGE: ClinicalIntlPrintBridge = {
  doctorDisplayNameAr: "د. —",
  patient: { name: "—", recordId: "" },
  doctorNotes: "",
};

export function ClinicalIntlCarePlanBlock({ carePlanType, data, setData, printBridge }: Props) {
  const layout = INTL_CLINICAL_PLAN_LAYOUTS[carePlanType];
  if (!layout) return null;

  const bridge = printBridge ?? FALLBACK_PRINT_BRIDGE;

  const { strings: slice, optionalRows } = parsePlanSlice(getIntlRoot(data)[carePlanType]);

  const setField = (key: string, value: string) => {
    setData((d) => {
      const root: IntlRoot = { ...getIntlRoot(d) };
      const parsed = parsePlanSlice(root[carePlanType]);
      parsed.strings[key] = value;
      root[carePlanType] = buildSerializedSlice(parsed.strings, parsed.optionalRows);
      return { ...d, [INTL_CLINICAL_DATA_KEY]: root };
    });
  };

  const setOptionalGroup = (groupKey: string, rows: IntlOptionalRow[]) => {
    setData((d) => {
      const root: IntlRoot = { ...getIntlRoot(d) };
      const parsed = parsePlanSlice(root[carePlanType]);
      const nextOpt = { ...parsed.optionalRows, [groupKey]: rows };
      if (rows.length === 0) delete nextOpt[groupKey];
      root[carePlanType] = buildSerializedSlice(parsed.strings, nextOpt);
      return { ...d, [INTL_CLINICAL_DATA_KEY]: root };
    });
  };

  const printSummary = () => {
    if (typeof window === "undefined") return;
    const issuedAtAr = new Date().toLocaleString("ar", { dateStyle: "medium", timeStyle: "short" });
    let sections = layout.sections
      .map((sec) => {
        if (!sectionHasPrintableContent(sec, slice, optionalRows)) return null;
        const inner = sec.fields
          .map((f) => {
            if (isOptionalButtonsField(f)) {
              return renderOptionalButtonsPrintTable(f, optionalRows);
            }
            const v = (slice[f.key] ?? "").trim();
            if (!v) return "";
            const opt = f.optional ? " (اختياري)" : "";
            return `<tr><td class="l">${escapeHtml(f.labelAr)}${escapeHtml(opt)}</td><td>${escapeHtml(v).replace(/\n/g, "<br/>")}</td></tr>`;
          })
          .filter(Boolean)
          .join("");
        if (!inner) return null;
        const hint = sec.hint ? `<p class="muted" style="margin:0 0 8px;font-size:0.82rem">${escapeHtml(sec.hint)}</p>` : "";
        return {
          titleAr: sec.titleAr,
          titleEn: sec.titleEn,
          bodyHtml: hint + tableRowsToHtml(inner),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);

    if (sections.length === 0) {
      sections = [
        {
          titleAr: "محتوى الخطة",
          titleEn: "Care plan",
          bodyHtml: `<p class="muted">لا توجد بنود مملوءة في الأقسام السريرية.</p>`,
        },
      ];
    }

    const followUps = getFollowUpVisitsFromPlanData(data, carePlanType);
    const html = buildCarePlanLetterheadHtml({
      origin: window.location.origin,
      documentTitleAr: layout.printTitleAr,
      issuedAtAr,
      doctor: { displayNameAr: bridge.doctorDisplayNameAr },
      patient: bridge.patient,
      sections,
      followUpVisits: followUps,
      recommendationsText: bridge.doctorNotes,
    });
    printHtmlDocument(html, layout.printTitleAr);
  };

  return (
    <div className={`space-y-4 rounded-xl border p-4 ${layout.accentBorder} ${layout.accentBg}`}>
      <div className="flex justify-end">
        <Button type="button" size="sm" variant="secondary" className="h-8 gap-1" onClick={printSummary}>
          <IconPrinter className="h-3.5 w-3.5" />
          طباعة / PDF
        </Button>
      </div>
      <IntlSectionsForm
        layout={layout}
        slice={slice}
        optionalRows={optionalRows}
        onChangeField={setField}
        onChangeOptionalGroup={setOptionalGroup}
      />
    </div>
  );
}

function IntlSectionsForm({
  layout,
  slice,
  optionalRows,
  onChangeField,
  onChangeOptionalGroup,
}: {
  layout: IntlPlanLayout;
  slice: Record<string, string>;
  optionalRows: Record<string, IntlOptionalRow[]>;
  onChangeField: (key: string, value: string) => void;
  onChangeOptionalGroup: (groupKey: string, rows: IntlOptionalRow[]) => void;
}) {
  return (
    <div className="space-y-5">
      {layout.sections.map((sec) => (
        <section key={sec.id} className="rounded-lg border border-white/60 bg-white/70 p-3 space-y-2 shadow-sm">
          <header>
            <h4 className="text-sm font-semibold text-gray-900">{sec.titleAr}</h4>
            {sec.titleEn && <p className="text-[11px] text-slate-500 mt-0.5 tracking-wide">{sec.titleEn}</p>}
            {sec.hint && <p className="text-[11px] text-gray-500 mt-1">{sec.hint}</p>}
          </header>
          <div className="space-y-4">
            {sec.fields.map((f) =>
              isOptionalButtonsField(f) ? (
                <OptionalButtonsField
                  key={f.groupKey}
                  field={f}
                  rows={optionalRows[f.groupKey] ?? []}
                  onRowsChange={(rows) => onChangeOptionalGroup(f.groupKey, rows)}
                />
              ) : (
                <div key={f.key}>
                  <label className="text-xs font-medium text-gray-700 block mb-1">
                    {f.labelAr}
                    {f.optional && <span className="text-slate-400 font-normal"> (اختياري)</span>}
                    {f.labelEn && <span className="text-slate-400 font-normal mr-1"> — {f.labelEn}</span>}
                  </label>
                  {f.multiline ? (
                    <textarea
                      value={slice[f.key] ?? ""}
                      onChange={(e) => onChangeField(f.key, e.target.value)}
                      rows={f.rows ?? 3}
                      placeholder={f.placeholderAr}
                      className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[72px]"
                    />
                  ) : (
                    <Input
                      value={slice[f.key] ?? ""}
                      onChange={(e) => onChangeField(f.key, e.target.value)}
                      placeholder={f.placeholderAr}
                      className="h-9 text-sm"
                    />
                  )}
                </div>
              ),
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

function OptionalButtonsField({
  field,
  rows,
  onRowsChange,
}: {
  field: IntlFieldOptionalButtons;
  rows: IntlOptionalRow[];
  onRowsChange: (rows: IntlOptionalRow[]) => void;
}) {
  const maxGroup = field.maxRowsPerGroup ?? 80;

  const addRow = (blockId: string) => {
    const blk = field.blocks.find((b) => b.blockId === blockId);
    if (!blk) return;
    const countThis = rows.filter((r) => r.blockId === blockId).length;
    if (blk.maxRows != null && countThis >= blk.maxRows) return;
    if (rows.length >= maxGroup) return;
    onRowsChange([...rows, { id: newId("opt"), blockId, value: "" }]);
  };

  const updateRow = (id: string, value: string) => {
    onRowsChange(rows.map((r) => (r.id === id ? { ...r, value } : r)));
  };

  const removeRow = (id: string) => {
    onRowsChange(rows.filter((r) => r.id !== id));
  };

  return (
    <div className="rounded-lg border border-dashed border-purple-200/80 bg-purple-50/20 p-3 space-y-3">
      {(field.labelAr || field.labelEn) && (
        <p className="text-xs font-medium text-gray-800">
          {field.labelAr}
          {field.labelEn && <span className="text-slate-500 font-normal mr-1"> — {field.labelEn}</span>}
        </p>
      )}
      {field.hint && <p className="text-[11px] text-gray-500">{field.hint}</p>}
      <div className="flex flex-wrap gap-2">
        {field.blocks.map((b) => {
          const countThis = rows.filter((r) => r.blockId === b.blockId).length;
          const atBlockCap = b.maxRows != null && countThis >= b.maxRows;
          const atGroupCap = rows.length >= maxGroup;
          return (
            <Button
              key={b.blockId}
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1 text-xs border-purple-200 hover:bg-purple-50"
              disabled={atBlockCap || atGroupCap}
              onClick={() => addRow(b.blockId)}
              title={b.buttonLabelEn}
            >
              <IconPlus className="h-3 w-3" />
              {b.buttonLabelAr}
            </Button>
          );
        })}
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-gray-400 py-1">لم تُضف بنود بعد — اضغط أحد الأزرار لإضافة بند.</p>
      ) : (
        <ul className="space-y-3 list-none p-0 m-0">
          {rows.map((row) => {
            const blk = field.blocks.find((x) => x.blockId === row.blockId);
            return (
              <li
                key={row.id}
                className="rounded-lg border border-gray-200 bg-white p-2 space-y-2 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-gray-800">
                    {blk?.rowLabelAr ?? row.blockId}
                    {blk?.rowLabelEn && (
                      <span className="text-slate-400 font-normal mr-1"> — {blk.rowLabelEn}</span>
                    )}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-red-600 px-2"
                    onClick={() => removeRow(row.id)}
                  >
                    <IconTrash className="h-3.5 w-3.5 ml-1" />
                    حذف
                  </Button>
                </div>
                {blk?.multiline ? (
                  <textarea
                    value={row.value}
                    onChange={(e) => updateRow(row.id, e.target.value)}
                    rows={blk.rows ?? 3}
                    placeholder={blk.placeholderAr}
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 min-h-[72px]"
                  />
                ) : (
                  <Input
                    value={row.value}
                    onChange={(e) => updateRow(row.id, e.target.value)}
                    placeholder={blk?.placeholderAr}
                    className="h-9 text-sm"
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
