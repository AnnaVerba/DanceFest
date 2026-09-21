import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreationAttributes, Op } from 'sequelize';
import { User } from '../users/user.model';
import { AccessLevel } from '../auth/access-level.enum';
import { CategoriesService } from '../categories/categories.service';
import type { Category } from '../categories/category.model';
import {
  CATEGORY_TYPE_LABELS,
  CRITERIA_ORDER,
} from '../categories/category-type-labels';
import { Nomination } from '../nominations/nomination.model';
import { DEFAULT_EXIT_MODE } from '../nominations/nomination-exits';
import {
  TEMPLATE_IN_USE,
  TEMPLATE_IN_USE_MESSAGE,
} from './template-error-codes';
import { CategoryTemplate } from './category-template.model';
import { TemplateNomination } from './template-nomination.model';
import { TemplateCategoryPrice } from './template-category-price.model';
import { CreateCategoryTemplateDto } from './dto/create-category-template.dto';
import { UpdateCategoryTemplateDto } from './dto/update-category-template.dto';
import { ForkCategoryTemplateDto } from './dto/fork-category-template.dto';
import { TemplateNominationDto } from './dto/template-nomination.dto';
import { TemplateCategoryPriceDto } from './dto/template-category-price.dto';
import {
  TEMPLATE_NOT_FOUND_MESSAGE,
  TEMPLATE_EDIT_AUTHOR_ONLY_MESSAGE,
  TEMPLATE_DELETE_AUTHOR_ONLY_MESSAGE,
  TEMPLATE_CANNOT_BE_EMPTY_MESSAGE,
  FORK_NAME_MUST_DIFFER_MESSAGE,
  UNKNOWN_CATEGORIES_MESSAGE_PREFIX,
  UNKNOWN_PRICED_CATEGORIES_MESSAGE_PREFIX,
  DUPLICATE_CATEGORY_PRICE_MESSAGE,
  PRICED_AXIS_REQUIRED_MESSAGE,
  DEFAULT_TEMPLATE_NOMINATIONS_PAGE_SIZE,
  MAX_TEMPLATE_NOMINATIONS_PAGE_SIZE,
} from './category-templates.constants';
import { resolvePage } from '../common/pagination';
import { bulkCreateChunked } from '../common/bulk-insert';
import { normalizeLeagueNames } from './normalize-league-names';
import { isPricedAxis } from '../categories/priced-axes';
import { resolveAxisPrice } from './resolve-axis-price';
import { priceMapOf } from './category-price-map';
import { specialGroupPrice, specialGroupPrices } from './special-group-prices';

const AUTHOR_INCLUDE = [
  { model: User, as: 'author', attributes: ['id', 'firstName', 'lastName'] },
];

const DEFAULT_TEMPLATES_PAGE_SIZE = 20;
const MAX_TEMPLATES_PAGE_SIZE = 100;

@Injectable()
export class CategoryTemplatesService {
  constructor(
    @InjectModel(CategoryTemplate)
    private readonly templateModel: typeof CategoryTemplate,
    @InjectModel(TemplateNomination)
    private readonly nominationModel: typeof TemplateNomination,
    @InjectModel(TemplateCategoryPrice)
    private readonly categoryPriceModel: typeof TemplateCategoryPrice,
    @InjectModel(Nomination)
    private readonly contestNominationModel: typeof Nomination,
    private readonly categoriesService: CategoriesService,
  ) {}

  async list(
    requesterId: string,
    requesterLevel: AccessLevel,
    search?: string,
    rawPage?: string,
    rawPageSize?: string,
  ) {
    // An admin sees every template, private ones included.
    const visible =
      requesterLevel === AccessLevel.ADMIN
        ? {}
        : { [Op.or]: [{ isPublic: true }, { authorId: requesterId }] };
    const trimmed = search?.trim();
    const { page, pageSize, limit, offset } = resolvePage(
      rawPage,
      rawPageSize,
      DEFAULT_TEMPLATES_PAGE_SIZE,
      MAX_TEMPLATES_PAGE_SIZE,
    );

    const { rows: templates, count } = await this.templateModel.findAndCountAll(
      {
        where: trimmed
          ? { [Op.and]: [visible, { name: { [Op.iLike]: `%${trimmed}%` } }] }
          : visible,
        include: AUTHOR_INCLUDE,
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        distinct: true,
      },
    );

    if (templates.length === 0) {
      return { rows: [], total: count, page, pageSize };
    }

    const templateIds = templates.map((t) => t.id);
    const nominations = await this.nominationModel.findAll({
      where: { templateId: { [Op.in]: templateIds } },
      order: [
        ['sortOrder', 'ASC'],
        ['createdAt', 'ASC'],
      ],
    });
    // Категорії всіх шаблонів вантажаться одним запитом: інакше на списку з
    // тридцяти шаблонів виходить тридцять звернень до бази.
    const categories = await this.loadCategoriesOf(nominations);

    const byTemplate = new Map<string, TemplateNomination[]>();
    for (const nomination of nominations) {
      const bucket = byTemplate.get(nomination.templateId) ?? [];
      bucket.push(nomination);
      byTemplate.set(nomination.templateId, bucket);
    }

    return {
      rows: templates.map((t) => {
        const own = byTemplate.get(t.id) ?? [];
        return {
          ...this.toDto(t),
          nominationsCount: own.length,
          criteria: this.buildCriteria(own, categories),
          specials: this.buildSpecials(own),
        };
      }),
      total: count,
      page,
      pageSize,
    };
  }

  async findOne(
    templateId: string,
    requesterId: string,
    requesterLevel: AccessLevel,
  ) {
    return this.toDetailDto(
      await this.loadReadable(templateId, requesterId, requesterLevel),
    );
  }

  // Header info for the template detail page: never touches the nomination
  // rows, so it stays cheap even for a template of thousands of nominations.
  async findMeta(
    templateId: string,
    requesterId: string,
    requesterLevel: AccessLevel,
  ) {
    const template = await this.loadReadable(
      templateId,
      requesterId,
      requesterLevel,
    );
    const nominationsCount = await this.nominationModel.count({
      where: { templateId },
    });
    return { ...this.toDto(template), nominationsCount };
  }

  async listNominations(
    templateId: string,
    requesterId: string,
    requesterLevel: AccessLevel,
    rawPage?: string,
    rawPageSize?: string,
  ) {
    await this.loadReadable(templateId, requesterId, requesterLevel);
    const { page, pageSize, limit, offset } = resolvePage(
      rawPage,
      rawPageSize,
      DEFAULT_TEMPLATE_NOMINATIONS_PAGE_SIZE,
      MAX_TEMPLATE_NOMINATIONS_PAGE_SIZE,
    );

    const { rows, count } = await this.nominationModel.findAndCountAll({
      where: { templateId },
      order: [
        ['sortOrder', 'ASC'],
        ['createdAt', 'ASC'],
      ],
      limit,
      offset,
    });

    const prices = priceMapOf(await this.loadCategoryPrices(templateId));
    const categoryById = this.categoryMapOf(await this.loadCategoriesOf(rows));

    return {
      rows: rows.map((n) => this.nominationToDto(n, categoryById, prices)),
      total: count,
      page,
      pageSize,
    };
  }

  // The full template view; the caller has already checked read access.
  private async toDetailDto(template: CategoryTemplate) {
    const templateId = template.id;
    const nominations = await this.nominationModel.findAll({
      where: { templateId },
      order: [
        ['sortOrder', 'ASC'],
        ['createdAt', 'ASC'],
      ],
    });

    const categoryPrices = await this.loadCategoryPrices(templateId);
    // Ціна може стояти на осі, якої вже немає в жодній номінації, тому її
    // категорії довантажуються разом із категоріями номінацій.
    const categories = await this.loadCategoriesOf(
      nominations,
      categoryPrices.map((p) => p.categoryId),
    );

    const prices = priceMapOf(categoryPrices);
    const categoryById = this.categoryMapOf(categories);

    return {
      ...this.toDto(template),
      nominationsCount: nominations.length,
      criteria: this.buildCriteria(nominations, categories),
      specials: this.buildSpecials(nominations),
      categoryPrices: this.categoryPricesToDto(categoryPrices, categories),
      nominations: nominations.map((n) =>
        this.nominationToDto(n, categoryById, prices),
      ),
    };
  }

  async create(requesterId: string, dto: CreateCategoryTemplateDto) {
    await this.assertCategoriesExist(dto.nominations);
    await this.assertPricedCategories(dto.categoryPrices);

    const template = await this.templateModel.create({
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      isPublic: dto.isPublic ?? false,
      allMedalLeagues: normalizeLeagueNames(dto.allMedalLeagues),
      authorId: requesterId,
      forkedFromId: null,
    } as CreationAttributes<CategoryTemplate>);

    await this.replaceCategoryPrices(template.id, dto.categoryPrices ?? []);
    await this.replaceNominations(template.id, dto.nominations);
    return this.toDetailDto(await this.loadWithAuthor(template.id));
  }

  async update(
    templateId: string,
    requesterId: string,
    dto: UpdateCategoryTemplateDto,
  ) {
    const template = await this.templateModel.findByPk(templateId);
    if (!template) {
      throw new NotFoundException(TEMPLATE_NOT_FOUND_MESSAGE);
    }
    if (template.authorId !== requesterId) {
      throw new ForbiddenException(TEMPLATE_EDIT_AUTHOR_ONLY_MESSAGE);
    }
    // Перевірка до першого запису: інакше відхилений апдейт лишав би вже
    // збережені назву й ціни поруч зі старим набором номінацій.
    if (dto.nominations && dto.nominations.length === 0) {
      throw new BadRequestException(TEMPLATE_CANNOT_BE_EMPTY_MESSAGE);
    }

    if (dto.name !== undefined) template.name = dto.name.trim();
    if (dto.description !== undefined) {
      template.description = dto.description?.trim() || null;
    }
    if (dto.isPublic !== undefined) template.isPublic = dto.isPublic;
    if (dto.allMedalLeagues !== undefined) {
      template.allMedalLeagues = normalizeLeagueNames(dto.allMedalLeagues);
    }
    await template.save();

    if (dto.categoryPrices !== undefined) {
      await this.assertPricedCategories(dto.categoryPrices);
      await this.replaceCategoryPrices(templateId, dto.categoryPrices);
    }

    // Зміна цін осей навмисно не чіпає вже збережені номінації: вісь — лише
    // помічник заповнення, ціна номінації належить самій номінації.
    if (dto.nominations) {
      await this.assertCategoriesExist(dto.nominations);
      await this.replaceNominations(templateId, dto.nominations);
    }

    return this.toDetailDto(await this.loadWithAuthor(templateId));
  }

  async fork(
    templateId: string,
    requesterId: string,
    requesterLevel: AccessLevel,
    dto: ForkCategoryTemplateDto,
  ) {
    const source = await this.loadReadable(
      templateId,
      requesterId,
      requesterLevel,
    );

    const name = dto.name.trim();
    if (name.toLowerCase() === source.name.trim().toLowerCase()) {
      throw new BadRequestException(FORK_NAME_MUST_DIFFER_MESSAGE);
    }

    const copy = await this.templateModel.create({
      name,
      description: source.description,
      isPublic: false,
      allMedalLeagues: source.allMedalLeagues,
      authorId: requesterId,
      forkedFromId: source.id,
    } as CreationAttributes<CategoryTemplate>);

    const sourceNominations = await this.nominationModel.findAll({
      where: { templateId: source.id },
      order: [
        ['sortOrder', 'ASC'],
        ['createdAt', 'ASC'],
      ],
    });

    const sourcePrices = await this.loadCategoryPrices(source.id);
    if (sourcePrices.length > 0) {
      const priceRecords = sourcePrices.map((p) => ({
        templateId: copy.id,
        categoryId: p.categoryId,
        price: Number(p.price),
      })) as CreationAttributes<TemplateCategoryPrice>[];
      await this.categoryPriceModel.sequelize!.transaction((transaction) =>
        bulkCreateChunked(this.categoryPriceModel, priceRecords, transaction),
      );
    }

    if (sourceNominations.length > 0) {
      const records = sourceNominations.map((n, index) => ({
        templateId: copy.id,
        name: n.name,
        price: n.price === null ? null : Number(n.price),
        allowsImprovisation: n.allowsImprovisation,
        categoryIds: n.categoryIds,
        isSpecial: n.isSpecial,
        specialName: n.specialName,
        exitMode: n.exitMode,
        sortOrder: n.sortOrder ?? index,
      })) as CreationAttributes<TemplateNomination>[];
      await this.nominationModel.sequelize!.transaction((transaction) =>
        bulkCreateChunked(this.nominationModel, records, transaction),
      );
    }

    return this.toDetailDto(await this.loadWithAuthor(copy.id));
  }

  async remove(templateId: string, requesterId: string): Promise<void> {
    const template = await this.templateModel.findByPk(templateId);
    if (!template) {
      throw new NotFoundException(TEMPLATE_NOT_FOUND_MESSAGE);
    }
    if (template.authorId !== requesterId) {
      throw new ForbiddenException(TEMPLATE_DELETE_AUTHOR_ONLY_MESSAGE);
    }

    const usedBy = await this.contestNominationModel.count({
      where: { templateId },
    });
    if (usedBy > 0) {
      throw new ConflictException({
        code: TEMPLATE_IN_USE,
        message: TEMPLATE_IN_USE_MESSAGE,
        competitionNominationsCount: usedBy,
      });
    }

    await template.destroy();
  }

  private async loadWithAuthor(templateId: string) {
    const template = await this.templateModel.findByPk(templateId, {
      include: AUTHOR_INCLUDE,
    });
    if (!template) {
      throw new NotFoundException(TEMPLATE_NOT_FOUND_MESSAGE);
    }
    return template;
  }

  // A public template, the caller's own, or — for an admin — any.
  private async loadReadable(
    templateId: string,
    requesterId: string,
    requesterLevel: AccessLevel,
  ) {
    const template = await this.loadWithAuthor(templateId);
    if (
      requesterLevel !== AccessLevel.ADMIN &&
      !template.isPublic &&
      template.authorId !== requesterId
    ) {
      throw new NotFoundException(TEMPLATE_NOT_FOUND_MESSAGE);
    }
    return template;
  }

  private async replaceNominations(
    templateId: string,
    nominations: TemplateNominationDto[],
  ): Promise<void> {
    const groupPrices = specialGroupPrices(nominations);

    const records = nominations.map((n, index) => ({
      templateId,
      name: n.name.trim(),
      // Ціна приходить із рядка. Для спецкатегорії порожня ціна успадковує
      // ціну своєї групи — вона одна на назву.
      price: n.isSpecial
        ? (n.price ?? specialGroupPrice(groupPrices, n.specialName))
        : (n.price ?? null),
      allowsImprovisation: n.allowsImprovisation ?? false,
      categoryIds: n.categoryIds ?? [],
      isSpecial: n.isSpecial ?? false,
      specialName: n.specialName?.trim() || null,
      exitMode: n.exitMode ?? DEFAULT_EXIT_MODE,
      sortOrder: n.sortOrder ?? index,
    })) as CreationAttributes<TemplateNomination>[];

    // Chunked inserts issue several INSERT statements instead of one, so the
    // destroy + recreate needs an explicit transaction to still be atomic.
    await this.nominationModel.sequelize!.transaction(async (transaction) => {
      await this.nominationModel.destroy({ where: { templateId }, transaction });
      await bulkCreateChunked(this.nominationModel, records, transaction);
    });
  }

  private async replaceCategoryPrices(
    templateId: string,
    prices: TemplateCategoryPriceDto[],
  ): Promise<void> {
    const records = prices.map((p) => ({
      templateId,
      categoryId: p.categoryId,
      price: p.price,
    })) as CreationAttributes<TemplateCategoryPrice>[];

    await this.categoryPriceModel.sequelize!.transaction(
      async (transaction) => {
        await this.categoryPriceModel.destroy({
          where: { templateId },
          transaction,
        });
        await bulkCreateChunked(this.categoryPriceModel, records, transaction);
      },
    );
  }

  private loadCategoryPrices(
    templateId: string,
  ): Promise<TemplateCategoryPrice[]> {
    return this.categoryPriceModel.findAll({ where: { templateId } });
  }

  private categoryMapOf(categories: Category[]): Map<string, Category> {
    return new Map(categories.map((category) => [category.id, category]));
  }

  private async loadCategoriesOf(
    nominations: TemplateNomination[],
    extraIds: string[] = [],
  ): Promise<Category[]> {
    const ids = [
      ...new Set([
        ...nominations.flatMap((n) => n.categoryIds ?? []),
        ...extraIds,
      ]),
    ];
    return this.categoriesService.findByIds(ids);
  }

  /**
   * Критерії — це не окрема таблиця, а похідне: категорії, на які посилаються
   * номінації шаблону, згруповані за віссю.
   */
  private buildCriteria(
    nominations: TemplateNomination[],
    categories: Category[],
  ) {
    const used = new Set(nominations.flatMap((n) => n.categoryIds ?? []));
    const mine = categories.filter((c) => used.has(c.id));

    return CRITERIA_ORDER.map((type) => ({
      id: type,
      name: CATEGORY_TYPE_LABELS[type],
      values: mine
        .filter((c) => c.type === type)
        .map((c) => ({
          id: c.id,
          label: c.name,
          rangeFrom: c.rangeFrom,
          rangeTo: c.rangeTo,
        })),
    })).filter((criterion) => criterion.values.length > 0);
  }

  private buildSpecials(nominations: TemplateNomination[]) {
    const names = new Set<string>();
    for (const nomination of nominations) {
      if (nomination.isSpecial && nomination.specialName) {
        names.add(nomination.specialName);
      }
    }
    return [...names].map((name) => ({ name }));
  }

  private async assertCategoriesExist(
    nominations: TemplateNominationDto[],
  ): Promise<void> {
    const ids = [...new Set(nominations.flatMap((n) => n.categoryIds ?? []))];
    if (ids.length === 0) return;

    const existing = await this.categoriesService.findExistingIds(ids);
    const missing = ids.filter((id) => !existing.includes(id));
    if (missing.length > 0) {
      throw new BadRequestException(
        `${UNKNOWN_CATEGORIES_MESSAGE_PREFIX}: ${missing.join(', ')}`,
      );
    }
  }

  /**
   * Ціну можна повісити лише на значення цінової осі: ціна на «Хіп-хоп» або
   * на вікову категорію нікуди не читається, тож мовчки зникла б.
   */
  private async assertPricedCategories(
    prices: TemplateCategoryPriceDto[] | undefined,
  ): Promise<void> {
    if (!prices || prices.length === 0) return;

    const ids = prices.map((p) => p.categoryId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException(DUPLICATE_CATEGORY_PRICE_MESSAGE);
    }

    const categories = await this.categoriesService.findByIds(ids);
    const found = new Set(categories.map((c) => c.id));
    const missing = ids.filter((id) => !found.has(id));
    if (missing.length > 0) {
      throw new BadRequestException(
        `${UNKNOWN_PRICED_CATEGORIES_MESSAGE_PREFIX}: ${missing.join(', ')}`,
      );
    }

    const wrongAxis = categories.filter((c) => !isPricedAxis(c.type));
    if (wrongAxis.length > 0) {
      throw new BadRequestException(
        `${PRICED_AXIS_REQUIRED_MESSAGE}: ${wrongAxis.map((c) => c.name).join(', ')}`,
      );
    }
  }

  private categoryPricesToDto(
    prices: TemplateCategoryPrice[],
    categories: Category[],
  ) {
    const typeById = new Map(categories.map((c) => [c.id, c.type]));
    return prices
      .filter((p) => typeById.has(p.categoryId))
      .map((p) => ({
        categoryId: p.categoryId,
        // Вісь потрібна клієнту, щоб зібрати ту саму мапу «вісь:категорія →
        // ціна», якою він малює поля цін.
        type: typeById.get(p.categoryId) as Category['type'],
        price: Number(p.price),
      }));
  }

  private toDto(template: CategoryTemplate) {
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      isPublic: template.isPublic,
      allMedalLeagues: template.allMedalLeagues ?? [],
      forkedFromId: template.forkedFromId,
      author: template.author
        ? {
            id: template.author.id,
            name: `${template.author.firstName} ${template.author.lastName}`,
          }
        : null,
      createdAt: template.createdAt,
    };
  }

  private nominationToDto(
    nomination: TemplateNomination,
    categoryById: Map<string, Category>,
    prices: Map<string, number>,
  ) {
    const price = nomination.price === null ? null : Number(nomination.price);
    return {
      id: nomination.id,
      name: nomination.name,
      price,
      // Ціна, що діє: власна ціна рядка, а якщо її не виставили — ціна складу
      // або ліги. Спецкатегорія осей не має: її ціна належить групі за назвою,
      // і підстановка за складом розвела б членів однієї групи.
      effectivePrice: nomination.isSpecial
        ? price
        : (price ??
          resolveAxisPrice(nomination.categoryIds ?? [], categoryById, prices)),
      allowsImprovisation: nomination.allowsImprovisation,
      categoryIds: nomination.categoryIds,
      isSpecial: nomination.isSpecial,
      specialName: nomination.specialName,
      exitMode: nomination.exitMode,
      sortOrder: nomination.sortOrder,
    };
  }
}
