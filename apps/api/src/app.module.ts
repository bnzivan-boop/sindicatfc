import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.js';
import { PrismaModule } from './infra/prisma/prisma.module.js';
import { OtpModule } from './infra/otp/otp.module.js';
import { PushModule } from './infra/push/push.module.js';
import { RealtimeModule } from './infra/realtime/realtime.module.js';
import { StorageModule } from './infra/storage/storage.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { CatchesModule } from './modules/catches/catches.module.js';
import { CommunityModule } from './modules/community/community.module.js';
import { CompetitionModule } from './modules/competition/competition.module.js';
import { FriendsModule } from './modules/friends/friends.module.js';
import { GearModule } from './modules/gear/gear.module.js';
import { IdentityModule } from './modules/identity/identity.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { RankingsModule } from './modules/rankings/rankings.module.js';
import { RegistrationsModule } from './modules/registrations/registrations.module.js';
import { TournamentsModule } from './modules/tournaments/tournaments.module.js';
import { UsersModule } from './modules/users/users.module.js';

/**
 * Модульный монолит (handoff, раздел 4.3).
 * Доменные модули не обращаются к таблицам друг друга напрямую —
 * только через публичные сервисы соседнего модуля.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // инфраструктура
    PrismaModule,
    PushModule,
    OtpModule,
    StorageModule,
    RealtimeModule,
    // домены
    IdentityModule,
    UsersModule,
    FriendsModule,
    GearModule,
    CatchesModule,
    TournamentsModule,
    RegistrationsModule,
    CompetitionModule,
    RankingsModule,
    NotificationsModule,
    CommunityModule,
    AdminModule,
  ],
})
export class AppModule {}
