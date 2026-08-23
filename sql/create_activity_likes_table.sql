CREATE TABLE IF NOT EXISTS activity_likes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  activity_id INT NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  reaction_type ENUM('like', 'dislike') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_activity_user (activity_id, user_id),
  FOREIGN KEY (activity_id) REFERENCES activites(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(uuid) ON DELETE CASCADE
);
