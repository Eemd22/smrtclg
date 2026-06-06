const db = require("../config/db");
// *****************  *********************
function getStatus(start, end) {
  const now = new Date();
  const s = new Date(start);
  const e = new Date(end);

  if (now < s) return "scheduled";
  if (now >= s && now <= e) return "ongoing";
  return "finished";
}

exports.getLectureStatus = (req, res) => {
  const id = req.params.id;

  db.query(
    "SELECT start_time, end_time FROM lectures WHERE id = ?",
    [id],
    (err, rows) => {
      if (err) return res.status(500).json(err);

      if (!rows.length) {
        return res.status(404).json({ message: "Not found" });
      }

      const status = getStatus(
        rows[0].start_time,
        rows[0].end_time
      );

      res.json({ status });
    }
  );
};
