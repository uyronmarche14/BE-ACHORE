CREATE TABLE `project_statuses` (
  `id` CHAR(36) NOT NULL,
  `project_id` CHAR(36) NOT NULL,
  `name` VARCHAR(80) NOT NULL,
  `position` INTEGER NOT NULL,
  `is_closed` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `project_statuses_project_id_name_key`(`project_id`, `name`),
  UNIQUE INDEX `project_statuses_project_id_position_key`(`project_id`, `position`),
  INDEX `project_statuses_project_id_position_idx`(`project_id`, `position`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `tasks`
  ADD COLUMN `status_id` CHAR(36) NULL;

INSERT INTO `project_statuses` (
  `id`,
  `project_id`,
  `name`,
  `position`,
  `is_closed`,
  `created_at`,
  `updated_at`
)
SELECT
  UUID(),
  `id`,
  'Todo',
  1,
  false,
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
FROM `projects`;

INSERT INTO `project_statuses` (
  `id`,
  `project_id`,
  `name`,
  `position`,
  `is_closed`,
  `created_at`,
  `updated_at`
)
SELECT
  UUID(),
  `id`,
  'In Progress',
  2,
  false,
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
FROM `projects`;

INSERT INTO `project_statuses` (
  `id`,
  `project_id`,
  `name`,
  `position`,
  `is_closed`,
  `created_at`,
  `updated_at`
)
SELECT
  UUID(),
  `id`,
  'Done',
  3,
  true,
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
FROM `projects`;

UPDATE `tasks`
JOIN `project_statuses`
  ON `project_statuses`.`project_id` = `tasks`.`project_id`
SET `tasks`.`status_id` = `project_statuses`.`id`
WHERE (
  (`tasks`.`status` = 'TODO' AND `project_statuses`.`position` = 1) OR
  (`tasks`.`status` = 'IN_PROGRESS' AND `project_statuses`.`position` = 2) OR
  (`tasks`.`status` = 'DONE' AND `project_statuses`.`position` = 3)
);

ALTER TABLE `tasks`
  MODIFY `status_id` CHAR(36) NOT NULL;

ALTER TABLE `tasks`
  ADD CONSTRAINT `tasks_status_id_fkey`
    FOREIGN KEY (`status_id`) REFERENCES `project_statuses`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX `tasks_status_id_idx` ON `tasks`(`status_id`);
CREATE INDEX `tasks_project_id_status_id_idx` ON `tasks`(`project_id`, `status_id`);

ALTER TABLE `tasks`
  DROP COLUMN `status`;

ALTER TABLE `project_statuses`
  ADD CONSTRAINT `project_statuses_project_id_fkey`
    FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
