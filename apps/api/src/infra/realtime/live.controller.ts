import { Controller, Param, Sse, type MessageEvent } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { map, type Observable } from 'rxjs';
import { Public } from '../../common/decorators/roles.decorator.js';
import { RealtimeService } from './realtime.service.js';

@ApiTags('live')
@Controller('live')
export class LiveController {
  constructor(private readonly realtime: RealtimeService) {}

  /** GET /v1/live/tournaments/:id — SSE-поток live-рейтинга и статусов. */
  @Public()
  @Sse('tournaments/:id')
  stream(@Param('id') tournamentId: string): Observable<MessageEvent> {
    return this.realtime.streamFor(tournamentId).pipe(map((data) => ({ type: data.type, data })));
  }
}
