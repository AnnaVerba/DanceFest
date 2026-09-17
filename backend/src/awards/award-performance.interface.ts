// One performance placed in the program, already resolved from the ORM:
// the calculator never touches Sequelize.
export interface AwardPerformance {
  // Performances sharing this key compete in one category.
  categoryKey: string;
  participantsCount: number;
  // 4+ dancers — a cup and participation medals instead of place medals.
  isGroup: boolean;
  // Lineup category name of the nomination (Група / Формейшн / Продакшн).
  cupLabel: string;
  // The entry's league is a «медаль кожному» league of this competition.
  allMedals: boolean;
  // Set for a special nomination; such performances are counted apart.
  specialName: string | null;
}
