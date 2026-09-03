import { test as base } from '@playwright/test';
import { HomePage } from '../pages/home.page';
import { LoginPage } from '../pages/login.page';
import { RegisterPage } from '../pages/register.page';
import { DashboardPage } from '../pages/dashboard.page';
import { PublicCompetitionPage } from '../pages/public-competition.page';
import { CategoryTemplateFormPage } from '../pages/category-template-form.page';
import { ParticipantCabinetPage } from '../pages/participant-cabinet.page';
import { CoachCabinetPage } from '../pages/coach-cabinet.page';
import { AdminsPage } from '../pages/admins.page';
import { NewCompetitionPage } from '../pages/new-competition.page';
import { CompetitionDetailPage } from '../pages/competition-detail.page';
import { CompetitionEditPage } from '../pages/competition-edit.page';
import { TeamPage } from '../pages/team.page';
import { ApplyPage } from '../pages/apply.page';

interface AppFixtures {
  homePage: HomePage;
  loginPage: LoginPage;
  registerPage: RegisterPage;
  dashboardPage: DashboardPage;
  publicCompetitionPage: PublicCompetitionPage;
  categoryTemplateFormPage: CategoryTemplateFormPage;
  participantCabinetPage: ParticipantCabinetPage;
  coachCabinetPage: CoachCabinetPage;
  adminsPage: AdminsPage;
  newCompetitionPage: NewCompetitionPage;
  competitionDetailPage: CompetitionDetailPage;
  competitionEditPage: CompetitionEditPage;
  teamPage: TeamPage;
  applyPage: ApplyPage;
}

/** Extends Playwright's base test with one page object per app page, so specs never construct them by hand. */
export const test = base.extend<AppFixtures>({
  homePage: async ({ page }, use) => use(new HomePage(page)),
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  registerPage: async ({ page }, use) => use(new RegisterPage(page)),
  dashboardPage: async ({ page }, use) => use(new DashboardPage(page)),
  publicCompetitionPage: async ({ page }, use) => use(new PublicCompetitionPage(page)),
  categoryTemplateFormPage: async ({ page }, use) => use(new CategoryTemplateFormPage(page)),
  participantCabinetPage: async ({ page }, use) => use(new ParticipantCabinetPage(page)),
  coachCabinetPage: async ({ page }, use) => use(new CoachCabinetPage(page)),
  adminsPage: async ({ page }, use) => use(new AdminsPage(page)),
  newCompetitionPage: async ({ page }, use) => use(new NewCompetitionPage(page)),
  competitionDetailPage: async ({ page }, use) => use(new CompetitionDetailPage(page)),
  competitionEditPage: async ({ page }, use) => use(new CompetitionEditPage(page)),
  teamPage: async ({ page }, use) => use(new TeamPage(page)),
  applyPage: async ({ page }, use) => use(new ApplyPage(page)),
});

export { expect } from '@playwright/test';
