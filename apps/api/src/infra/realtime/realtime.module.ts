import { Global, Module } from '@nestjs/common';
import { LiveController } from './live.controller.js';
import { RealtimeService } from './realtime.service.js';

@Global()
@Module({ controllers: [LiveController], providers: [RealtimeService], exports: [RealtimeService] })
export class RealtimeModule {}
