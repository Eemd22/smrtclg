-- Migration: Extend reaction_type ENUM to support Facebook-style reactions
-- Run this on your existing database to upgrade without data loss

ALTER TABLE likes
  MODIFY COLUMN reaction_type ENUM('like', 'dislike', 'love', 'haha', 'wow', 'sad', 'angry') NOT NULL;

ALTER TABLE board_likes
  MODIFY COLUMN reaction_type ENUM('like', 'dislike', 'love', 'haha', 'wow', 'sad', 'angry') NOT NULL;
