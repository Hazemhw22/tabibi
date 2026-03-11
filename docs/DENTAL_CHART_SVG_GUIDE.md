# دليل تحويل مخطط الأسنان من PNG إلى SVG تفاعلي

## الخطوة 1: تحويل الصورة إلى مسارات SVG

### باستخدام Inkscape (مجاني)

1. **فتح Inkscape** وتحميل الصورة:
   - `File` → `Import` → اختر `pngtree-tooth-chart...png`

2. **تتبع الصورة (Trace Bitmap):**
   - اختر الصورة بزر الماوس
   - `Path` → `Trace Bitmap`

3. **إعدادات التتبع:**
   - **Mode:** `Single scan` أو `Multiple scans` (جرّب Multiple للتفاصيل)
   - **Brightness cutoff:** ~0.5 (لتفاصيل الخطوط الفاتحة على خلفية سوداء)
   - أو **Edge detection** إذا كانت الحدود واضحة
   - فعّل **Invert** إذا احتجت لعكس النتيجة
   - اضغط `Update` للمعاينة ثم `OK`

4. **فصل كل سن عن الآخر:**
   - بعد التتبع تصبح كل الأسنان في path واحد
   - `Path` → `Break Apart` لفصل المسارات المتصلة
   - قد تحتاج `Path` → `Object to Path` أولاً
   - إذا بقيت ملتصقة، استخدم `Path` → `Split path` أو اقتطع يدوياً

5. **تصدير SVG:**
   - `File` → `Save As` → اختر SVG
   - احفظ الملف في `public/dental-chart.svg`

---

### باستخدام أدوات أونلاين

- [vectorizer.io](https://vectorizer.io) – تحويل جيد للرسميات
- [convertio.co/zh/png-svg](https://convertio.co/png-svg/) – تحويل سريع

**ملاحظة:** التحويل التلقائي غالباً يعطيك path واحد كبير. للحصول على 32 مسار منفصل تحتاج لاستخدام Inkscape كما أعلاه.

---

## الخطوة 2: تسمية كل سن بـ id صحيح

بعد الحصول على 32 مسار منفصل، اضبط لكل `<path>` معرفاً ثابتاً:

```xml
<path id="tooth-1" d="M..." />
<path id="tooth-2" d="M..." />
...
<path id="tooth-32" d="M..." />
```

**ترقيم FDI / Universal:**
- 1–8: الفك العلوي الأيمن (من ضرس العقل للأمام)
- 9–16: الفك العلوي الأيسر
- 17–24: الفك السفلي الأيسر
- 25–32: الفك السفلي الأيمن

---

## الخطوة 3: جعل المخطط قابلاً للتلوين والاختيار

### هيكل SVG المقترح

```xml
<svg viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg">
  <rect width="800" height="400" fill="#1a1a1a" />
  <g id="upper-jaw">
    <path id="tooth-1" d="M..." fill="white" stroke="black" stroke-width="1.5" />
    <!-- ... 2-16 -->
  </g>
  <g id="lower-jaw">
    <path id="tooth-17" d="M..." fill="white" stroke="black" stroke-width="1.5" />
    <!-- ... 18-32 -->
  </g>
</svg>
```

### التلوين

```javascript
// تغيير لون السن حسب نوع المشكلة
document.getElementById('tooth-5').setAttribute('fill', '#bbf7d0');  // حشوة
document.getElementById('tooth-5').setAttribute('stroke', '#22c55e');
```

### الاختيار (النقر)

```javascript
// في React
const handleToothClick = (e) => {
  const id = e.currentTarget.id;  // "tooth-7"
  const num = id.replace('tooth-', '');
  setSelectedTeeth(prev => prev.includes(num) ? prev.filter(t => t !== num) : [...prev, num]);
};

// لكل path
<path id="tooth-1" onClick={handleToothClick} className="cursor-pointer" ... />
```

---

## الخطوة 4: دمج SVG الخارجي مع التطبيق

إذا رغبت باستخدام المخطط المحوّل بدلاً من المخطط المبني برمجياً:

1. احفظ الملف المحوّل في `public/dental-chart-traced.svg`
2. غيّر `patients-view.tsx` لتحميل هذا الملف بدلاً من رسم المسارات برمجياً
3. أو استبدل قيم `path` في `DENTAL_CHART_LAYOUT` بمسارات النسخ من SVG المحوّل

---

## ملخص الألوان (للتطبيق الحالي)

| المشكلة | fill       | stroke     |
|---------|------------|------------|
| افتراضي | #ffffff    | #000000    |
| حشوة    | #bbf7d0    | #22c55e    |
| عصب     | #fecaca    | #ef4444    |
| تاج     | #e9d5ff    | #a855f7    |
| زرعة    | #fed7aa    | #fb923c    |
| تقويم   | #bfdbfe    | #3b82f6    |
| مختار   | #e8e0f0    | #1d4ed8    |
