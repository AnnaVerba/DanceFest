import { JUDGE_TOKEN_TYPE } from './judges.constants';

export interface JudgeJwtPayload {
  sub: string;
  competitionId: string;
  type: typeof JUDGE_TOKEN_TYPE;
}
