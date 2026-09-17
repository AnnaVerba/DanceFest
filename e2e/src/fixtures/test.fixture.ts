import { test as base } from '@playwright/test';
import { HomePage } from '../pages/home.page';
import { LoginPage } from '../pages/login.page';
import { PublicCompetitionPage } from '../pages/public-competition.page';
import { CategoryTemplateFormPage } from '../pages/category-template-form.page';

interface AppFixtures {
  homePage: HomePage;
  loginPage: LoginPage;
  publicCompetitionPage: PublicCompetitionPage;
  categoryTemplateFormPage: CategoryTemplateFormPage;
}

/** Extends Playwright's base test with one page object per app page, so specs never construct them by hand. */
export const test = base.extend<AppFixtures>({
  homePage: async ({ page }, use) => use(new HomePage(page)),
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  publicCompetitionPage: async ({ page }, use) => use(new PublicCompetitionPage(page)),
  categoryTemplateFormPage: async ({ page }, use) => use(new CategoryTemplateFormPage(page)),
});

export { expect } from '@playwright/test';
