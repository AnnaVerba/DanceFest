import { planNominationExits } from './nomination-exits';

const programs = [
  { id: 'p1', name: 'Імпровізація межансе' },
  { id: 'p2', name: 'Табла' },
  { id: 'p3', name: 'Класика' },
];

describe('planNominationExits', () => {
  it('дає один вихід без програми, коли exitMode single', () => {
    expect(
      planNominationExits({
        label: 'Юніори 1 · Перші кроки · Корона Шехеризади',
        exitMode: 'single',
        programs,
        durationLimitSeconds: null,
        programLimits: {},
      }),
    ).toEqual([
      {
        programId: null,
        programName: null,
        label: 'Юніори 1 · Перші кроки · Корона Шехеризади',
        durationLimitSeconds: null,
      },
    ]);
  });

  it('дає вихід на кожну програму, коли exitMode per_program', () => {
    const exits = planNominationExits({
      label: 'Юніори 1 · Перші кроки · Корона Шехеризади',
      exitMode: 'per_program',
      programs,
      durationLimitSeconds: null,
      programLimits: {},
    });

    expect(exits).toHaveLength(3);
    expect(exits.map((e) => e.label)).toEqual([
      'Юніори 1 · Перші кроки · Корона Шехеризади · Імпровізація межансе',
      'Юніори 1 · Перші кроки · Корона Шехеризади · Табла',
      'Юніори 1 · Перші кроки · Корона Шехеризади · Класика',
    ]);
    expect(exits.map((e) => e.programName)).toEqual([
      'Імпровізація межансе',
      'Табла',
      'Класика',
    ]);
  });

  it('на одному виході сумує ліміти всіх програм', () => {
    const [exit] = planNominationExits({
      label: 'Корона',
      exitMode: 'single',
      programs,
      durationLimitSeconds: null,
      programLimits: { p1: 90, p2: 120, p3: 60 },
    });

    expect(exit.durationLimitSeconds).toBe(270);
  });

  it('явний ліміт номінації переважає суму програм', () => {
    const [exit] = planNominationExits({
      label: 'Корона',
      exitMode: 'single',
      programs,
      durationLimitSeconds: 240,
      programLimits: { p1: 90, p2: 120, p3: 60 },
    });

    expect(exit.durationLimitSeconds).toBe(240);
  });

  it('на окремих виходах дає кожному ліміт своєї програми', () => {
    const exits = planNominationExits({
      label: 'Корона',
      exitMode: 'per_program',
      programs,
      durationLimitSeconds: 200,
      programLimits: { p1: 90, p3: 60 },
    });

    // p2 власного ліміту не має — падає на ліміт номінації.
    expect(exits.map((e) => e.durationLimitSeconds)).toEqual([90, 200, 60]);
  });

  it('без програм дає один вихід навіть у режимі per_program', () => {
    const exits = planNominationExits({
      label: 'Соло · Діти · Дебют · Фрі Денс',
      exitMode: 'per_program',
      programs: [],
      durationLimitSeconds: 150,
      programLimits: {},
    });

    expect(exits).toEqual([
      {
        programId: null,
        programName: null,
        label: 'Соло · Діти · Дебют · Фрі Денс',
        durationLimitSeconds: 150,
      },
    ]);
  });

  it('звичайна номінація з однією дисципліною лишається одним виходом', () => {
    const exits = planNominationExits({
      label: 'Соло · Діти · Дебют · Фрі Денс',
      exitMode: 'single',
      programs: [{ id: 'd1', name: 'Фрі Денс' }],
      durationLimitSeconds: 150,
      programLimits: {},
    });

    expect(exits).toHaveLength(1);
    expect(exits[0].label).toBe('Соло · Діти · Дебют · Фрі Денс');
    expect(exits[0].durationLimitSeconds).toBe(150);
  });
});
