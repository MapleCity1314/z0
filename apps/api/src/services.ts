import {
  AdminService,
  FeedbackService,
  ProjectsService,
  UsersService,
  VersionsService,
} from "@z0/backend";
import {
  DrizzleAdminRepository,
  DrizzleFeedbackRepository,
  DrizzleProjectsRepository,
  DrizzleUsersRepository,
  DrizzleVersionsRepository,
} from "./repositories";

export type AppServices = {
  adminService: AdminService;
  feedbackService: FeedbackService;
  projectsService: ProjectsService;
  usersService: UsersService;
  versionsService: VersionsService;
};

export function createServices(): AppServices {
  return {
    projectsService: new ProjectsService(new DrizzleProjectsRepository()),
    feedbackService: new FeedbackService(new DrizzleFeedbackRepository()),
    versionsService: new VersionsService(new DrizzleVersionsRepository()),
    usersService: new UsersService(new DrizzleUsersRepository()),
    adminService: new AdminService(new DrizzleAdminRepository()),
  };
}
