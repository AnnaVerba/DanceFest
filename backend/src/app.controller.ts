import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import process from 'process';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async healthCheck(): Promise<string> {
    this.appService;

    return 'OK';
  }

  @Get('variables')
  variables() {

щось не серйозне
    return {
      status: 'OK',
      env: process.env,
    };
  }
}
