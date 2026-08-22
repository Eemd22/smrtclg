const db = require("../config/db");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

async function callOpenAI(messages, maxTokens = 500) {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error: ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

async function summarize(text) {
  const messages = [
    {
      role: "system",
      content:
        "أنت مساعد ذكي متخصص في تلخيص النصوص بالعربية الفصحى. قم بتلخيص النص المقدم في 2-4 جمل واضحة ومختصرة. ركّز على الأفكار الرئيسية.",
    },
    { role: "user", content: `لخّص هذا النص:\n\n${text}` },
  ];
  return await callOpenAI(messages, 300);
}

async function smartSearch(query) {
  const posts = await new Promise((resolve, reject) => {
    db.query(
      "SELECT p.id, p.content, p.created_at, p.image, u.username FROM posts p LEFT JOIN users u ON u.uuid = p.user_id ORDER BY p.created_at DESC LIMIT 100",
      (err, result) => {
        if (err) reject(err);
        else resolve(result || []);
      }
    );
  });

  const activities = await new Promise((resolve, reject) => {
    db.query(
      "SELECT a.id, a.activity, a.created_at, u.username, d.name as dept_name FROM activites a LEFT JOIN users u ON u.uuid = a.user_id LEFT JOIN departments d ON d.id = a.dept_id ORDER BY a.created_at DESC LIMIT 50",
      (err, result) => {
        if (err) reject(err);
        else resolve(result || []);
      }
    );
  });

  const lectures = await new Promise((resolve, reject) => {
    db.query(
      `SELECT l.id, l.lecture_title, l.lecture_day, l.start_time, l.end_time,
              c.course_name, h.hall_name, le.lecturer_name
       FROM lectures l
       LEFT JOIN courses c ON c.id = l.course_id
       LEFT JOIN halls h ON h.id = l.hall_id
       LEFT JOIN lecturers le ON le.id = l.lecturer_id
       ORDER BY l.lecture_day, l.start_time LIMIT 100`,
      (err, result) => {
        if (err) reject(err);
        else resolve(result || []);
      }
    );
  });

  const contextData = `
المنشورات:
${posts.map((p) => `- [${p.username}] ${p.content} (${p.created_at})`).join("\n")}

الأنشطة:
${activities.map((a) => `- [${a.dept_name}] ${a.activity} بواسطة ${a.username} (${a.created_at})`).join("\n")}

المحاضرات:
${lectures.map((l) => `- ${l.course_name} - ${l.lecturer_name} - ${l.hall_name} - يوم ${l.lecture_day} ${l.start_time}-${l.end_time}`).join("\n")}
`;

  const messages = [
    {
      role: "system",
      content: `أنت محرك بحث ذكي لكلية ذكية. استخدم البيانات التالية للإجابة على استعلام البحث. أعد النتائج كنقاط مرتبة بالأهمية. إذا لم تجد نتائج، قل "لا توجد نتائج مطابقة".

${contextData}`,
    },
    { role: "user", content: `استعلام البحث: ${query}` },
  ];

  return await callOpenAI(messages, 800);
}

async function chatbot(userMessage, departmentId, groupId) {
  let contextParts = [];

  try {
    const deptLectures = await new Promise((resolve, reject) => {
      db.query(
        `SELECT l.lecture_title, l.lecture_day, l.start_time, l.end_time, l.status,
                c.course_name, h.hall_name, le.lecturer_name, g.group_name
         FROM lectures l
         LEFT JOIN courses c ON c.id = l.course_id
         LEFT JOIN halls h ON h.id = l.hall_id
         LEFT JOIN lecturers le ON le.id = l.lecturer_id
         LEFT JOIN groups_table g ON g.id = l.group_id
         WHERE l.department_id = ? ${groupId ? "AND l.group_id = ?" : ""}
         ORDER BY l.lecture_day, l.start_time`,
        groupId ? [departmentId, groupId] : [departmentId],
        (err, result) => {
          if (err) reject(err);
          else resolve(result || []);
        }
      );
    });

    if (deptLectures.length > 0) {
      contextParts.push(
        `جدول المحاضرات:\n${deptLectures.map((l) => `- ${l.course_name} (${l.lecturer_name}) - يوم ${l.lecture_day} ${l.start_time}-${l.end_time} في ${l.hall_name} - الحالة: ${l.status} ${l.group_name ? `- المجموعة: ${l.group_name}` : ""}`).join("\n")}`
      );
    }
  } catch (_) {}

  try {
    const recentPosts = await new Promise((resolve, reject) => {
      db.query(
        `SELECT p.content, u.username, p.created_at
         FROM posts p LEFT JOIN users u ON u.uuid = p.user_id
         ORDER BY p.created_at DESC LIMIT 10`,
        (err, result) => {
          if (err) reject(err);
          else resolve(result || []);
        }
      );
    });

    if (recentPosts.length > 0) {
      contextParts.push(
        `آخر الأخبار والمنشورات:\n${recentPosts.map((p) => `- [${p.username}]: ${p.content}`).join("\n")}`
      );
    }
  } catch (_) {}

  try {
    const deptActivities = await new Promise((resolve, reject) => {
      db.query(
        `SELECT a.activity, a.created_at, u.username
         FROM activites a LEFT JOIN users u ON u.uuid = a.user_id
         WHERE a.dept_id = ?
         ORDER BY a.created_at DESC LIMIT 10`,
        [departmentId],
        (err, result) => {
          if (err) reject(err);
          else resolve(result || []);
        }
      );
    });

    if (deptActivities.length > 0) {
      contextParts.push(
        `أنشطة القسم:\n${deptActivities.map((a) => `- ${a.activity} بواسطة ${a.username} (${a.created_at})`).join("\n")}`
      );
    }
  } catch (_) {}

  const systemPrompt = `أنت مساعد أكاديمي ذكي لكلية ذكية اسمها "الكلية الذكية". مهمتك مساعدة الطلاب والإجابة على أسئلتهم.

قواعد مهمة:
- أجب بالعربية الفصحى الواضحة
- إذا كان السؤال عن محاضرات أو جدول، استخدم البيانات المتوفرة أعلاه
- إذا لم تجد معلومة في البيانات، قل ذلك بصراحة
- كن ودوداً ومحترماً
- إذا كان السؤال غير متعلق بالكلية، اعتذر بأدب

${contextParts.length > 0 ? "معلومات متوفرة من قاعدة البيانات:\n" + contextParts.join("\n\n") : "لا توجد معلومات إضافية متوفرة حالياً."}`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  return await callOpenAI(messages, 600);
}

async function suggestTags(text) {
  const messages = [
    {
      role: "system",
      content: `أنت نظام تصنيف ذكي. حلل النص المقدم واقترح 1-3 تصنيفات مناسبة من القائمة التالية:
- إعلان
- سؤال
- نقاش
- خبر
- طلب مساعدة
- مشاركة معلومات
- حدث
- أكاديمي

أعد النتيجة كقائمة JSON بالصيغة: {"tags": ["تصنيف1", "تصنيف2"]}`,
    },
    { role: "user", content: text },
  ];

  const result = await callOpenAI(messages, 100);
  try {
    return JSON.parse(result);
  } catch (_) {
    return { tags: ["إعلان"] };
  }
}

module.exports = { summarize, smartSearch, chatbot, suggestTags };
