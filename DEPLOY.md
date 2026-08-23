# دليل نشر المشروع على Render (مجاني) مع MySQL سحابي

هذا الدليل يشرح خطوة بخطوة كيفية رفع الباك-إند (Node.js) على **Render** وقاعدة البيانات **MySQL** على خدمة مجانية خارجية.

---

## لماذا قاعدة بيانات خارجية؟

الخطة المجانية في Render لا توفر MySQL، وقرصها مؤقت (يمسح الملفات عند كل إعادة نشر)، لذا نستخدم قاعدة MySQL سحابية مجانية دائمة:

| الخدمة | الرابط | الملاحظات |
|--------|--------|-----------|
| **Aiven** (موصى بها) | https://aiven.io | خطة Free دائمة، MySQL حقيقية، تتطلب SSL |
| **TiDB Cloud** | https://tidbcloud.com | متوافقة مع MySQL، Serverless مجاني |
| **filess.io** | https://filess.io | أبسط الخيارات لكن أقل موثوقية |

---

## الخطوة 1: إنشاء قاعدة البيانات (مثال على Aiven)

1. أنشئ حساباً على [aiven.io](https://aiven.io)
2. اختر **MySQL** → الخطة **Free** → اختر أقرب منطقة
3. بعد الجاهزية، من صفحة الخدمة اجعل:
   - **Connection Method:** `Public access` مفعّل
4. من تبويب **Overview** انسخ:
   - `Service Host` ← سيكون `MYSQL_HOST`
   - `Service Port` ← عادة `3306` أو منفذ آخر
   - `Service User` ← عادة `avnadmin`
   - `Service Password`
5. من تبويب **Databases** أنشئ قاعدة باسم: `smart_college`

> ⚠️ Aiven يتطلب SSL — يجب ضبط `MYSQL_SSL=true` (ملف render.yaml يفعّلها تلقائياً).

### استيراد جداولك الحالية من جهازك (سكربت جاهز)

لا تحتاج mysqldump — يوجد سكربت نقل مدمج في المشروع:

```bash
# 1) صدّر قاعدتك المحلية (يعمل بدون إعدادات، يستهدف localhost/smart_college)
npm run db:export

# 2) اضبط بيانات القاعدة السحابية ثم استوردها
$env:MYSQL_HOST="<من Aiven>"
$env:MYSQL_PORT="3306"
$env:MYSQL_USER="avnadmin"
$env:MYSQL_PASSWORD="<كلمة مرور Aiven>"
$env:MYSQL_DATABASE="smart_college"
$env:MYSQL_SSL="true"
npm run db:import
```

> السكربت يحذف الجداول الموجودة في الوجهة وينشئها من جديد. لمنع الحذف أضف `--no-drop`.
> ملف `db-dump.json` الناتج محمي في `.gitignore` ولا يُرفع للمستودع.

---

## الخطوة 2: رفع الكود إلى GitHub

الكود يجب أن يكون في مستودع GitHub (المجلد الرئيسي يحتوي `nodejs/` و `smartclg/`):

```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

✅ تم التحقق من أن `.env` غير موجود في المستودع (موجود في `.gitignore`) — لا ترفعه أبداً.

---

## الخطوة 3: النشر على Render

### الطريقة السهلة (Blueprint):
1. ادخل [dashboard.render.com](https://dashboard.render.com) وسجّل بحساب GitHub
2. **New +** → **Blueprint**
3. اختر المستودع — سيقرأ Render ملف `render.yaml` تلقائياً
4. سيطلب منك تعبئة المتغيرات التي عليها `sync: false`:
   - `MYSQL_HOST` / `MYSQL_USER` / `MYSQL_PASSWORD` / `MYSQL_DATABASE`
5. اضغط **Apply** وانتهى!

### الطريقة اليدوية:
1. **New +** → **Web Service** → اربط المستودع
2. الإعدادات:
   | الإعداد | القيمة |
   |---------|--------|
   | Root Directory | `nodejs` |
   | Runtime | `Node` |
   | Build Command | `npm install` |
   | Start Command | `npm start` |
3. أضف متغيرات البيئة (Environment):
   ```
   JWT_SECRET=<نفس القيمة أو قيمة جديدة عشوائية>
   MYSQL_HOST=<من Aiven>
   MYSQL_PORT=<من Aiven>
   MYSQL_USER=<من Aiven>
   MYSQL_PASSWORD=<من Aiven>
   MYSQL_DATABASE=smart_college
   MYSQL_SSL=true
   MYSQL_CONNECTION_LIMIT=5
   ```
4. **Create Web Service**

بعد النشر ستحصل على رابط مثل: `https://smartapp-api.onrender.com`

اختبره: افتح `/health` بالمتصفح — يجب أن ترى `{"status":"ok"}`.

---

## الخطوة 4: تحديث تطبيق Flutter

غيّر عنوان الـ API في تطبيق Flutter إلى رابط Render الجديد.

> 💡 Socket.io يعمل على Render بشكل طبيعي عبر WebSocket.

---

## قيود الخطة المجانية (مهم!)

1. **النوم التلقائي:** الخدمة تنام بعد 15 دقيقة بدون طلبات، وأول طلب بعدها يستغرق ~50 ثانية.
   - الحل: استخدم خدمة مثل [cron-job.org](https://cron-job.org) لإرسال ping كل 10 دقائق إلى `/health`.
2. **750 ساعة/شهر مجاناً** — تكفي خدمة واحدة تعمل دائماً.
3. **الملفات المرفوعة مؤقتة:** الصور المرفوعة إلى مجلدات `uploads/` **تُمسح عند إعادة النشر**. للحل النهائي لاحقاً: Cloudinary (مجاني) أو قرص مدفوع في Render.
4. لا تستخدم هذه الخطة لإنتاج حساس — مناسبة للتطوير والتجربة.

---

## استكشاف الأخطاء

| المشكلة | السبب والحل |
|---------|-------------|
| `Database connection error: ... SSL required` | تأكد أن `MYSQL_SSL=true` |
| `ER_ACCESS_DENIED_ERROR` | بيانات MYSQL_USER/PASSWORD خاطئة |
| `ENOTFOUND` أو timeout | Host/Port خطأ، أو لم تُفعّل Public access |
| `ER_BAD_DB_ERROR` | قاعدة `smart_college` غير منشأة في السحابة |
| الخدمة لا تعمل بعد النشر | راجع Logs من لوحة Render |
