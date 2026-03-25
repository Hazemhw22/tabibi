/**
 * طباعة أو «حفظ كـ PDF» بدون window.open — يتجنب حظر النوافذ المنبثقة.
 * يعمل من نفس نقرة المستخدم مباشرة ثم يطبع محتوى الـ iframe المخفي.
 */
export function printHtmlDocument(html: string, documentTitle = "document"): void {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", documentTitle);
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();
  try {
    doc.title = "\u200b";
  } catch {
    /* ignore */
  }

  const remove = () => {
    try {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    } catch {
      /* ignore */
    }
  };

  const runPrint = () => {
    try {
      win.focus();
      win.print();
    } finally {
      win.addEventListener("afterprint", remove, { once: true });
      setTimeout(remove, 120_000);
    }
  };

  // انتظر رسم المستند داخل الـ iframe
  if (doc.readyState === "complete") {
    requestAnimationFrame(() => setTimeout(runPrint, 50));
  } else {
    win.addEventListener("load", () => setTimeout(runPrint, 50), { once: true });
  }
}
