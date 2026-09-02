import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JUDGE_JWT_STRATEGY_NAME } from './judges.constants';

@Injectable()
export class JudgeAuthGuard extends AuthGuard(JUDGE_JWT_STRATEGY_NAME) {}
