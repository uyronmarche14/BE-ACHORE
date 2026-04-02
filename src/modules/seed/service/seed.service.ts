import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, TaskStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import { createForbiddenException } from '../../../common/utils/api-exception.util';
import { PrismaService } from '../../../database/prisma.service';
import { TaskLogsService } from '../../task-logs/service/task-logs.service';
import {
  DEMO_LOG_TIMESTAMPS,
  DEMO_PASSWORD,
  DEMO_PROJECT_MEMBERSHIPS,
  DEMO_PROJECTS,
  DEMO_SEED_IDS,
  DEMO_TASKS,
  DEMO_USERS,
} from '../seed-data';
import type { SeedInitResponse } from '../types/seed-response.type';

type SeedTransactionClient = Prisma.TransactionClient | PrismaService;

@Injectable()
export class SeedService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
    private readonly taskLogsService: TaskLogsService,
  ) {}

  async initializeDemoData(): Promise<SeedInitResponse> {
    this.assertSeedEndpointEnabled();

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

    return this.prismaService.$transaction(async (transactionClient) => {
      await this.resetSeedOwnedRecords(transactionClient);
      await this.createSeedRecords(transactionClient, passwordHash);
      await this.createSeedLogs(transactionClient);

      return {
        message: 'Seed completed',
        users: DEMO_SEED_IDS.userIds.length,
        projects: DEMO_SEED_IDS.projectIds.length,
        tasks: DEMO_SEED_IDS.taskIds.length,
      };
    });
  }

  private assertSeedEndpointEnabled() {
    const seedEnabled =
      this.configService.get<boolean>('SEED_ENABLED') === true;
    const nodeEnv = this.configService.get<
      'development' | 'test' | 'production'
    >('NODE_ENV');

    if (!seedEnabled || nodeEnv === 'production') {
      throw createForbiddenException({
        message: 'Seed initialization is disabled in this environment',
      });
    }
  }

  private async resetSeedOwnedRecords(
    transactionClient: SeedTransactionClient,
  ) {
    await transactionClient.refreshToken.deleteMany({
      where: {
        userId: {
          in: [...DEMO_SEED_IDS.userIds],
        },
      },
    });
    await transactionClient.taskLog.deleteMany({
      where: {
        taskId: {
          in: [...DEMO_SEED_IDS.taskIds],
        },
      },
    });
    await transactionClient.task.deleteMany({
      where: {
        id: {
          in: [...DEMO_SEED_IDS.taskIds],
        },
      },
    });
    await transactionClient.projectMember.deleteMany({
      where: {
        OR: [
          {
            projectId: {
              in: [...DEMO_SEED_IDS.projectIds],
            },
          },
          {
            userId: {
              in: [...DEMO_SEED_IDS.userIds],
            },
          },
        ],
      },
    });
    await transactionClient.project.deleteMany({
      where: {
        id: {
          in: [...DEMO_SEED_IDS.projectIds],
        },
      },
    });
    await transactionClient.user.deleteMany({
      where: {
        id: {
          in: [...DEMO_SEED_IDS.userIds],
        },
      },
    });
  }

  private async createSeedRecords(
    transactionClient: SeedTransactionClient,
    passwordHash: string,
  ) {
    await transactionClient.user.createMany({
      data: Object.values(DEMO_USERS).map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        passwordHash,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
    });
    await transactionClient.project.createMany({
      data: Object.values(DEMO_PROJECTS).map((project) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        ownerId: project.ownerId,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      })),
    });
    await transactionClient.projectMember.createMany({
      data: DEMO_PROJECT_MEMBERSHIPS.map((membership) => ({
        id: membership.id,
        projectId: membership.projectId,
        userId: membership.userId,
        role: membership.role,
        createdAt: membership.createdAt,
      })),
    });
    await transactionClient.task.createMany({
      data: DEMO_TASKS.map((task) => ({
        id: task.id,
        projectId: task.projectId,
        title: task.title,
        description: task.description,
        status: task.status,
        position: task.position,
        assigneeId: task.assigneeId,
        dueDate: task.dueDate,
        createdById: task.createdById,
        updatedById: task.updatedById,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      })),
    });
  }

  private async createSeedLogs(transactionClient: SeedTransactionClient) {
    const assigneeValue = await this.taskLogsService.getAssigneeLogValue(
      transactionClient,
      DEMO_USERS.member.id,
    );

    await this.taskLogsService.createTaskCreatedLog(transactionClient, {
      actorId: DEMO_USERS.member.id,
      actorName: DEMO_USERS.member.name,
      createdAt: DEMO_LOG_TIMESTAMPS.created,
      taskId: 'demo-task-narrative',
    });
    await this.taskLogsService.createTaskUpdatedLogs(transactionClient, {
      actorId: DEMO_USERS.member.id,
      actorName: DEMO_USERS.member.name,
      createdAt: DEMO_LOG_TIMESTAMPS.titleUpdated,
      taskId: 'demo-task-narrative',
      changes: [
        {
          fieldName: 'title',
          oldValue: 'Draft demo board narrative',
          newValue: 'Finalize demo board narrative',
        },
      ],
    });
    await this.taskLogsService.createTaskUpdatedLogs(transactionClient, {
      actorId: DEMO_USERS.member.id,
      actorName: DEMO_USERS.member.name,
      createdAt: DEMO_LOG_TIMESTAMPS.dueDateUpdated,
      taskId: 'demo-task-narrative',
      changes: [
        {
          fieldName: 'dueDate',
          oldValue: null,
          newValue: '2026-04-06',
        },
      ],
    });
    await this.taskLogsService.createTaskUpdatedLogs(transactionClient, {
      actorId: DEMO_USERS.member.id,
      actorName: DEMO_USERS.member.name,
      createdAt: DEMO_LOG_TIMESTAMPS.assigneeUpdated,
      taskId: 'demo-task-narrative',
      changes: [
        {
          fieldName: 'assigneeId',
          oldValue: null,
          newValue: assigneeValue,
        },
      ],
    });
    await this.taskLogsService.createStatusChangedLog(transactionClient, {
      actorId: DEMO_USERS.member.id,
      actorName: DEMO_USERS.member.name,
      createdAt: DEMO_LOG_TIMESTAMPS.statusChanged,
      taskId: 'demo-task-narrative',
      previousStatus: TaskStatus.IN_PROGRESS,
      nextStatus: TaskStatus.DONE,
    });
  }
}
