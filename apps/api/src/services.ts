import {
  AdminService,
  FeedbackService,
  IntegrationsService,
  ProjectsService,
  UsersService,
  VersionsService,
} from "@z0/backend";
import {
  DrizzleAdminRepository,
  DrizzleFeedbackRepository,
  DrizzleIntegrationsRepository,
  DrizzleProjectsRepository,
  DrizzleUsersRepository,
  DrizzleVersionsRepository,
} from "./repositories";

export type AppServices = {
  adminService: AdminService;
  feedbackService: FeedbackService;
  integrationsService: IntegrationsService;
  projectsService: ProjectsService;
  usersService: UsersService;
  versionsService: VersionsService;
};

export function createServices(): AppServices {
  return {
    projectsService: new ProjectsService(new DrizzleProjectsRepository()),
    feedbackService: new FeedbackService(new DrizzleFeedbackRepository()),
    integrationsService: new IntegrationsService(
      new DrizzleIntegrationsRepository(),
    ),
    versionsService: new VersionsService(new DrizzleVersionsRepository()),
    usersService: new UsersService(new DrizzleUsersRepository()),
    adminService: new AdminService(new DrizzleAdminRepository()),
  };
}
