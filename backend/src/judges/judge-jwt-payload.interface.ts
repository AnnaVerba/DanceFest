// Окремий payload-тип (з type: 'judge') — щоб токен судді не міг пройти
// звичайний адмінський JwtStrategy, навіть якщо підписаний тим самим
// секретом.
export interface JudgeJwtPayload {
  sub: string;
  competitionId: string;
  type: 'judge';
}
