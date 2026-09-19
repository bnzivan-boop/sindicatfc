import { Module } from '@nestjs/common';
import { MeController } from './me.controller.js';
import { CitiesController, UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

/** Users: профиль, дисциплины, город, стаж, приватность, публичный DTO. */
@Module({ controllers: [MeController, UsersController, CitiesController], providers: [UsersService], exports: [UsersService] })
export class UsersModule {}
