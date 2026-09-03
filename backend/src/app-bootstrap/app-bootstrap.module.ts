import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AppBootstrapService } from './app-bootstrap.service';

@Module({
  imports: [UsersModule],
  providers: [AppBootstrapService],
})
export class AppBootstrapModule {}
