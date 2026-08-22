-- جدول تفاعلات محتوى المجتمع (إعجاب / انزعاج)
CREATE TABLE IF NOT EXISTS channel_activity_likes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ch_ac_id INT NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  reaction_type ENUM('like', 'dislike', 'love', 'haha', 'wow', 'sad', 'angry') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_channel_activity_reaction (ch_ac_id, user_id),
  FOREIGN KEY (ch_ac_id) REFERENCES channel_activity(ch_ac_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(uuid) ON DELETE CASCADE
);
