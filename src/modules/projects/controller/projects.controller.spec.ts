/* eslint-disable @typescript-eslint/unbound-method */

import { ProjectsController } from './projects.controller';
import { ProjectsService } from '../service/projects.service';

describe('ProjectsController', () => {
  const projectsService = {
    createProject: jest.fn().mockResolvedValue({
      id: 'project-1',
      name: 'Launch Website',
      description: 'Track launch tasks',
      role: 'OWNER',
      taskCounts: {
        TODO: 0,
        IN_PROGRESS: 0,
        DONE: 0,
      },
    }),
    listProjects: jest.fn().mockResolvedValue({
      items: [],
    }),
    getProjectDetail: jest.fn().mockResolvedValue({
      id: 'project-1',
      name: 'Launch Website',
      description: 'Track launch tasks',
      members: [],
      taskGroups: {
        TODO: [],
        IN_PROGRESS: [],
        DONE: [],
      },
    }),
    updateProject: jest.fn().mockResolvedValue({
      id: 'project-1',
      name: 'Launch Website',
      description: 'Updated description',
      role: 'OWNER',
      taskCounts: {
        TODO: 0,
        IN_PROGRESS: 0,
        DONE: 0,
      },
    }),
    deleteProject: jest.fn().mockResolvedValue({
      message: 'Project deleted successfully',
    }),
  } as unknown as jest.Mocked<ProjectsService>;

  const projectsController = new ProjectsController(projectsService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const currentUser = {
    id: 'user-1',
    name: 'Jane Doe',
    email: 'jane@example.com',
    role: 'MEMBER' as const,
    emailVerifiedAt: '2026-04-01T00:00:00.000Z',
  };

  it('creates a project for the current user', async () => {
    const response = await projectsController.createProject(currentUser, {
      name: 'Launch Website',
      description: 'Track launch tasks',
    });

    expect(projectsService.createProject).toHaveBeenCalledWith(currentUser, {
      name: 'Launch Website',
      description: 'Track launch tasks',
    });
    expect(response).toEqual({
      id: 'project-1',
      name: 'Launch Website',
      description: 'Track launch tasks',
      role: 'OWNER',
      taskCounts: {
        TODO: 0,
        IN_PROGRESS: 0,
        DONE: 0,
      },
    });
  });

  it('lists accessible projects for the current user', async () => {
    await projectsController.listProjects(currentUser);

    expect(projectsService.listProjects).toHaveBeenCalledWith(currentUser);
  });

  it('loads project detail by route parameter', async () => {
    await projectsController.getProjectDetail('project-1');

    expect(projectsService.getProjectDetail).toHaveBeenCalledWith('project-1');
  });

  it('updates a project by route parameter', async () => {
    await projectsController.updateProject(currentUser, 'project-1', {
      description: null,
    });

    expect(projectsService.updateProject).toHaveBeenCalledWith(
      currentUser,
      'project-1',
      {
        description: null,
      },
    );
  });

  it('deletes a project by route parameter', async () => {
    await projectsController.deleteProject('project-1');

    expect(projectsService.deleteProject).toHaveBeenCalledWith('project-1');
  });
});
