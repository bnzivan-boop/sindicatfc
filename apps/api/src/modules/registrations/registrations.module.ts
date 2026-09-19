import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { RegistrationsController } from './registrations.controller.js';
import { RegistrationsService } from './registrations.service.js';

/** Registrations: заявки, напарники, команды, лист ожидания, допуски, оплаты. */
@Module({ imports: [NotificationsModule], controllers: [RegistrationsController], providers: [RegistrationsService], exports: [RegistrationsService] })
export class RegistrationsModule {}
