import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schemas';
import { MailModule } from '../../mail/mail.module';
import { AiChatHistoryModule } from '../ai-chat-history/ai-chat-history.module';
import {
  Appointment,
  AppointmentSchema,
} from '../appointments/schemas/appointment.schemas';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Appointment.name, schema: AppointmentSchema },
    ]),
    MailModule,
    AiChatHistoryModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
