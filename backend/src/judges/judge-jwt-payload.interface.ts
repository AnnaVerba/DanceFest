export interface JudgeJwtPayload {
  sub: string;
  competitionId: string;
  type: 'judge';
}
