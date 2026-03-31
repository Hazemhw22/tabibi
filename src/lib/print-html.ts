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

  const waitForImages = async () => {
    try {
      const images = Array.from(doc.images ?? []);
      if (images.length === 0) return;
      await Promise.race([
        Promise.all(
          images.map(
            (img) =>
              new Promise<void>((resolve) => {
                if (img.complete) return resolve();
                img.addEventListener("load", () => resolve(), { once: true });
                img.addEventListener("error", () => resolve(), { once: true });
              }),
          ),
        ),
        new Promise<void>((resolve) => setTimeout(resolve, 2000)),
      ]);
    } catch {
      /* ignore */
    }
  };

  const runPrint = async () => {
    await waitForImages();
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
    requestAnimationFrame(() => setTimeout(() => void runPrint(), 50));
  } else {
    win.addEventListener("load", () => setTimeout(() => void runPrint(), 50), { once: true });
  }
}
