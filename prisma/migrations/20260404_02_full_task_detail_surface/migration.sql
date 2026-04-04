ALTER TABLE `project_statuses`
  ADD COLUMN `color` ENUM('SLATE', 'BLUE', 'AMBER', 'GREEN', 'RED', 'PURPLE') NOT NULL DEFAULT 'SLATE';

UPDATE `project_statuses`
SET `color` = CASE
  WHEN `is_closed` = true THEN 'GREEN'
  WHEN LOWER(`name`) = 'todo' THEN 'SLATE'
  WHEN LOWER(`name`) = 'in progress' THEN 'BLUE'
  ELSE 'BLUE'
END;

ALTER TABLE `tasks`
  ADD COLUMN `acceptance_criteria` TEXT NULL,
  ADD COLUMN `notes` TEXT NULL,
  ADD COLUMN `parent_task_id` CHAR(36) NULL;

CREATE INDEX `tasks_parent_task_id_idx` ON `tasks`(`parent_task_id`);

ALTER TABLE `tasks`
  ADD CONSTRAINT `tasks_parent_task_id_fkey`
    FOREIGN KEY (`parent_task_id`) REFERENCES `tasks`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `task_links` (
  `id` CHAR(36) NOT NULL,
  `task_id` CHAR(36) NOT NULL,
  `label` VARCHAR(160) NOT NULL,
  `url` VARCHAR(2048) NOT NULL,
  `position` INTEGER NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `task_links_task_id_position_idx`(`task_id`, `position`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `task_links`
  ADD CONSTRAINT `task_links_task_id_fkey`
    FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `task_checklist_items` (
  `id` CHAR(36) NOT NULL,
  `task_id` CHAR(36) NOT NULL,
  `label` VARCHAR(255) NOT NULL,
  `is_completed` BOOLEAN NOT NULL DEFAULT false,
  `position` INTEGER NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `task_checklist_items_task_id_position_idx`(`task_id`, `position`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `task_checklist_items`
  ADD CONSTRAINT `task_checklist_items_task_id_fkey`
    FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `task_comments` (
  `id` CHAR(36) NOT NULL,
  `task_id` CHAR(36) NOT NULL,
  `author_id` CHAR(36) NOT NULL,
  `body` TEXT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `task_comments_task_id_created_at_idx`(`task_id`, `created_at`),
  INDEX `task_comments_author_id_idx`(`author_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `task_comments`
  ADD CONSTRAINT `task_comments_task_id_fkey`
    FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `task_comments_author_id_fkey`
    FOREIGN KEY (`author_id`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE `task_attachments` (
  `id` CHAR(36) NOT NULL,
  `task_id` CHAR(36) NOT NULL,
  `label` VARCHAR(160) NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `url` VARCHAR(2048) NOT NULL,
  `mime_type` VARCHAR(120) NULL,
  `size_bytes` INTEGER NULL,
  `created_by_id` CHAR(36) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `task_attachments_task_id_created_at_idx`(`task_id`, `created_at`),
  INDEX `task_attachments_created_by_id_idx`(`created_by_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `task_attachments`
  ADD CONSTRAINT `task_attachments_task_id_fkey`
    FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `task_attachments_created_by_id_fkey`
    FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
