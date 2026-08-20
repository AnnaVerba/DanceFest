import { buildNominationLabel } from './nomination-naming';

describe('buildNominationLabel', () => {
  it('ставить назву спецкатегорії перед осями', () => {
    expect(
      buildNominationLabel({
        axisNames: ['Юніори 1', 'Перші кроки'],
        specialName: 'Корона Шехеризади',
      }),
    ).toBe('Корона Шехеризади · Юніори 1 · Перші кроки');
  });

  it('дописує програму в кінець, після осей', () => {
    expect(
      buildNominationLabel({
        axisNames: ['Юніори 1', 'Перші кроки'],
        specialName: 'Корона Шехеризади',
        programName: 'Імпровізація межансе',
      }),
    ).toBe('Корона Шехеризади · Юніори 1 · Перші кроки · Імпровізація межансе');
  });

  it('обходиться без назви спецкатегорії — це звичайна номінація', () => {
    expect(
      buildNominationLabel({
        axisNames: ['Соло', 'Діти', 'Дебют', 'Фрі Денс'],
        specialName: null,
      }),
    ).toBe('Соло · Діти · Дебют · Фрі Денс');
  });

  it('відкидає порожні частини й обрізає пробіли', () => {
    expect(
      buildNominationLabel({
        axisNames: ['  Юніори 1  ', '', '   '],
        specialName: '  Корона  ',
        programName: null,
      }),
    ).toBe('Корона · Юніори 1');
  });
});
