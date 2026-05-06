This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## Progressive Web App (PWA) — Akheen

هذا القسم يلخّص كل ما تم إعداده بخصوص الـ PWA في المشروع (بدون سكربتات لتوليد أيقونات).

### الحزمة والإعداد

- **الحزمة:** `@ducanh2912/next-pwa` (مدعومة مع Next.js App Router والبناء بـ Webpack).
- **الملف:** [`next.config.mjs`](next.config.mjs)  
  - يتم لف إعداد Next بـ `withPWA`.  
  - **`dest: "public"`:** مخرجات الـ service worker تُكتب في مجلد `public`.  
  - **`disable: process.env.NODE_ENV === "development"`:** أثناء `npm run dev` لا يُفعّل الـ PWA (سلوك عادي للتطوير). بعد **`npm run build`** يُولَّد الـ service worker للإنتاج.

### Service Worker

- بعد **`npm run build`** يظهر عادةً ملف **`public/sw.js`** (وملفات Workbox المرتبطة إن وُجدت).
- النطاق (**scope**) هو جذر الموقع `/` حتى يغطي التطبيق كاملاً.
- في التطوير المحلي لن يعمل تثبيت الـ PWA كما في الإنتاج؛ الاعتماد على بيئة **HTTPS** حقيقية للتحقق من «تثبيت التطبيق» في Chrome / Edge.

### ملف الـ Web App Manifest

- **المصدر:** [`app/manifest.js`](app/manifest.js) — يولّد المسار التلقائي **`/manifest.webmanifest`** ويضيف Next رابط `<link rel="manifest">` تلقائياً (لا حاجة لـ `metadata.manifest` في الـ layout).
- **عناوين مطلقة للأيقونات و`start_url`:** يُبنى الأساس من `VERCEL_URL` على Vercel، أو من **`NEXT_PUBLIC_APP_URL`** إن عرّفته (مفيد لنطاق مخصص مثل `https://akheen.com` حتى يتطابق الاسم والأيقونة في حوار التثبيت مع العنوان الكنسي).
- **حقول مهمة:** `id` ثابت لكل نسخة نشر، `name` / `short_name`: Akheen، `start_url` مطلق، `scope: "/"`، `display: "standalone"` و`display_override` لسلوك أوضح على بعض منصات سطح المكتب، والألوان كما في الـ layout.

### الأيقونات (جاهزة في `public` فقط)

المسارات المستخدمة **كما هي** (لا يُولَّد أي ملف أيقونات من المشروع):

| الملف | الاستخدام |
|--------|------------|
| `public/web-app-manifest-192x192.png` | أيقونة 192×192 في الـ manifest |
| `public/web-app-manifest-512x512.png` | أيقونة 512×512 في الـ manifest |
| `public/favicon.ico` | أيقونة المتصفح (metadata `icons.icon`) |
| `public/favicon-96x96.png` | أيقونة PNG إضافية للمتصفح |
| `public/apple-touch-icon.png` | أيقونة «إضافة إلى الشاشة الرئيسية» على iOS (metadata `icons.apple`) |

### Metadata في `app/layout.jsx`

- `applicationName` (بدون حقل `manifest` منفصل؛ الربط يأتي من `app/manifest.js`).
- **`appleWebApp`:** `capable: true`، عنوان التطبيق، و`statusBarStyle: 'black-translucent'` لسلوك أوضح على iOS عند فتح الموقع كتطبيق ويب.
- **`viewport.themeColor`:** `#000000` بما يتوافق مع `theme_color` في الـ manifest.
- **`formatDetection`:** إبقاء تعطيل اكتشاف أرقام الهاتف كما هو.

### البناء والملاحظات

- الأوامر: `npm run build` يستخدم `next build --webpack` (مطلوب لتكامل الـ PWA مع Webpack).
- قد يظهر تحذير أثناء البناء إذا كانت بعض الأصول كبيرة الحجم ولا تُضاف لقائمة الـ precache الافتراضية لـ Workbox؛ ذلك **لا يمنع** عمل الـ PWA أو التثبيت، لكنه يعني أن تلك الملفات قد لا تُخزَّن مسبقاً للعمل دون اتصال.

### التحقق اليدوي

1. نشر الموقع على **HTTPS**.  
2. **Android / سطح المكتب (Chrome أو Edge):** التحقق من ظهور خيار تثبيت التطبيق أو تثبيت الـ PWA.  
3. **iOS (Safari):** «مشاركة» ← «إضافة إلى الشاشة الرئيسية» — يعتمد على `apple-touch-icon` و`appleWebApp` بالإضافة إلى سلوك Safari.

### ملفات قد تظهر بعد البناء

- `public/sw.js` (وملفات Workbox إن وُجدت) تُحدَّث عند البناء؛ راجع سياسة الـ Git لديك (إدراجها أو تجاهلها) حسب بيئة النشر.
"# Akheen" 
"# Akheen" 
