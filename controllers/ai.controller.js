const aiService = require("../services/ai.service");

exports.summarize = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim().length < 20) {
      return res.status(400).json({ error: "النص قصير جداً للتلخيص" });
    }
    const summary = await aiService.summarize(text);
    res.json({ summary });
  } catch (err) {
    console.error("Summarize error:", err.message);
    if (err.message.includes("OPENAI_API_KEY")) {
      return res.status(503).json({ error: "خدمة الذكاء الاصطناعي غير مفعلة. يرجى إعداد OPENAI_API_KEY" });
    }
    res.status(500).json({ error: "فشل في تلخيص النص" });
  }
};

exports.smartSearch = async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: "كلمة البحث قصيرة جداً" });
    }
    const results = await aiService.smartSearch(query);
    res.json({ results });
  } catch (err) {
    console.error("Smart search error:", err.message);
    if (err.message.includes("OPENAI_API_KEY")) {
      return res.status(503).json({ error: "خدمة الذكاء الاصطناعي غير مفعلة" });
    }
    res.status(500).json({ error: "فشل في البحث" });
  }
};

exports.chatbot = async (req, res) => {
  try {
    const { message, departmentId, groupId } = req.body;
    if (!message || message.trim().length < 1) {
      return res.status(400).json({ error: "الرسالة فارغة" });
    }
    const reply = await aiService.chatbot(message, departmentId, groupId);
    res.json({ reply });
  } catch (err) {
    console.error("Chatbot error:", err.message);
    if (err.message.includes("OPENAI_API_KEY")) {
      return res.status(503).json({ error: "خدمة الذكاء الاصطناعي غير مفعلة. يرجى إعداد OPENAI_API_KEY" });
    }
    res.status(500).json({ error: "فشل في الرد" });
  }
};

exports.suggestTags = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim().length < 5) {
      return res.status(400).json({ error: "النص قصير جداً للتصنيف" });
    }
    const tags = await aiService.suggestTags(text);
    res.json(tags);
  } catch (err) {
    console.error("Tags error:", err.message);
    if (err.message.includes("OPENAI_API_KEY")) {
      return res.status(503).json({ error: "خدمة الذكاء الاصطناعي غير مفعلة" });
    }
    res.status(500).json({ error: "فشل في اقتراح التصنيفات" });
  }
};
