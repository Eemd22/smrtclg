CREATE TABLE IF NOT EXISTS board_likes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  b_id INT NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  reaction_type ENUM('like', 'dislike', 'love', 'haha', 'wow', 'sad', 'angry') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_board_reaction (b_id, user_id),
  FOREIGN KEY (b_id) REFERENCES board(b_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(uuid) ON DELETE CASCADE
);
