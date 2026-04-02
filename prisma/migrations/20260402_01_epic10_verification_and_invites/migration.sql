ALTER TABLE `users`
  ADD COLUMN `email_verified_at` DATETIME(3) NULL;

CREATE TABLE `email_verification_tokens` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `token_hash` CHAR(64) NOT NULL,
  `expires_at` DATETIME(3) NOT NULL,
  `consumed_at` DATETIME(3) NULL,
  `redirect_path` VARCHAR(255) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `email_verification_tokens_token_hash_key`(`token_hash`),
  INDEX `email_verification_tokens_user_id_idx`(`user_id`),
  INDEX `email_verification_tokens_expires_at_idx`(`expires_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `project_invites` (
  `id` CHAR(36) NOT NULL,
  `project_id` CHAR(36) NOT NULL,
  `invited_by_id` CHAR(36) NOT NULL,
  `email` VARCHAR(190) NOT NULL,
  `role` ENUM('OWNER', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
  `token_hash` CHAR(64) NOT NULL,
  `expires_at` DATETIME(3) NOT NULL,
  `accepted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `project_invites_token_hash_key`(`token_hash`),
  INDEX `project_invites_project_id_idx`(`project_id`),
  INDEX `project_invites_email_idx`(`email`),
  INDEX `project_invites_project_id_email_accepted_at_expires_at_idx`(`project_id`, `email`, `accepted_at`, `expires_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `email_verification_tokens`
  ADD CONSTRAINT `email_verification_tokens_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `project_invites`
  ADD CONSTRAINT `project_invites_project_id_fkey`
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `project_invites`
  ADD CONSTRAINT `project_invites_invited_by_id_fkey`
  FOREIGN KEY (`invited_by_id`) REFERENCES `users`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
