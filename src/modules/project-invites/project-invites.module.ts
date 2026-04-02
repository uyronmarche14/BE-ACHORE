import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { ProjectInvitesController } from './controller/project-invites.controller';
import { ProjectInvitesService } from './service/project-invites.service';

@Module({
  imports: [AuthModule, MailModule],
  controllers: [ProjectInvitesController],
  providers: [ProjectInvitesService],
  exports: [ProjectInvitesService],
})
export class ProjectInvitesModule {}
