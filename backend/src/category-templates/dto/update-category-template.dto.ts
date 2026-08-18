import { PartialType } from '@nestjs/mapped-types';
import { CreateCategoryTemplateDto } from './create-category-template.dto';

// nominations теж необов'язкові: якщо їх передали — набір замінюється цілком,
// якщо ні — правляться лише поля шаблону.
export class UpdateCategoryTemplateDto extends PartialType(
  CreateCategoryTemplateDto,
) {}
