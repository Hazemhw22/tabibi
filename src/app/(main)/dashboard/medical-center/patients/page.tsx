"use client";

import { useEffect, useState } from "react";
import CenterPatientsView, { type CenterPatientRow } from "./patients-view";

export default function CenterPatientsPage() {
  const [rows, setRows] = useState<CenterPatientRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/medical-center/patients")
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setErr(j.error);
        else setRows(j.patients ?? []);
      })
      .catch(() => setErr("تعذر التحميل"));
  }, []);

  return (
    <>
      {err ? <div className="px-3 py-4 text-sm text-red-600">{err}</div> : null}
      <CenterPatientsView rows={rows} />
    </>
  );
}
