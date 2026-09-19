import { Injectable } from '@nestjs/common';
import { Subject, filter, type Observable } from 'rxjs';

export type LiveEvent =
  | { type: 'leaderboard.updated'; tournamentId: string; version: number }
  | { type: 'result.status'; tournamentId: string; resultId: string; participantId: string; status: string }
  | { type: 'judge.queue'; tournamentId: string; pending: number }
  | { type: 'protest.updated'; tournamentId: string; protestId: string; status: string };

/**
 * Шина live-событий турнира (handoff, 4.1 — WebSocket или SSE).
 * MVP: SSE поверх in-process Subject. При горизонтальном масштабировании
 * заменяется на Redis pub/sub без изменения контракта контроллера.
 */
@Injectable()
export class RealtimeService {
  private readonly bus = new Subject<LiveEvent>();

  publish(event: LiveEvent) {
    this.bus.next(event);
  }

  streamFor(tournamentId: string): Observable<LiveEvent> {
    return this.bus.pipe(filter((e) => e.tournamentId === tournamentId));
  }
}
