import { buildNominationLabel } from './nomination-naming';

describe('buildNominationLabel', () => {
  it('не згадує програму, коли вихід один', () => {
    expect(
      buildNominationLabel({
        axisNames: ['Юніори 1', 'Перші кроки'],
        specialName: 'Корона Шехеризади',
      }),
    ).toBe('Юніори 1 · Перші кроки · Корона Шехеризади');
  });

  it('дописує програму в кінець, після назви спецкатегорії', () => {
    expect(
      buildNominationLabel({
        axisNames: ['Юніори 1', 'Перші кроки'],
        specialName: 'Корона Шехеризади',
        programName: 'Імпровізація межансе',
      }),
    ).toBe('Юніори 1 · Перші кроки · Корона Шехеризади · Імпровізація межансе');
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
    ).toBe('Юніори 1 · Корона');
  });
});
