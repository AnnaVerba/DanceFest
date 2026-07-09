import { Injectable } from '@nestjs/common';
import { Competition } from './competition.model';

@Injectable()
export class CompetitionsService {
  private competitions: Competition[] = [
    {
      id: '1',
      name: 'Зірки Танцполу 2026',
      date: '2026-06-15',
      location: 'Київ, Палац Спорту',
      style: 'Латина',
    },
    {
      id: '2',
      name: 'Золотий Вальс',
      date: '2026-07-20',
      location: 'Львів, Оперний театр',
      style: 'Стандарт',
    },
    {
      id: '3',
      name: 'DanceFest Open',
      date: '2026-08-10',
      location: 'Одеса, Філармонія',
      style: 'Хіп-хоп',
    },
  ];

  findAll(): Competition[] {
    return this.competitions;
  }
}
