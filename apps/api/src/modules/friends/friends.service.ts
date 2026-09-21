import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

export type FriendState = 'NONE' | 'FRIENDS' | 'OUTGOING' | 'INCOMING' | 'BLOCKED' | 'BLOCKED_BY' | 'SELF';

const MAX_PENDING_OUT = 50;
const RETRY_AFTER_DECLINE_DAYS = 7;

@Injectable()
export class FriendsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private pair(a: string, b: string) { return a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a }; }
  private find(a: string, b: string) { return this.prisma.friendship.findUnique({ where: { userAId_userBId: this.pair(a, b) } }); }

  /** Состояние связи глазами `me` — для кнопки в профиле и списках. */
  async status(me: string, other: string): Promise<{ state: FriendState; mutual: number }> {
    if (me === other) return { state: 'SELF', mutual: 0 };
    const f = await this.find(me, other);
    let state: FriendState = 'NONE';
    if (f?.status === 'ACCEPTED') state = 'FRIENDS';
    else if (f?.status === 'PENDING') state = f.requestedBy === me ? 'OUTGOING' : 'INCOMING';
    else if (f?.status === 'BLOCKED') state = f.blockedBy === me ? 'BLOCKED' : 'BLOCKED_BY';
    const [mine, theirs] = await Promise.all([this.friendIds(me), this.friendIds(other)]);
    return { state, mutual: mine.filter((id) => theirs.includes(id)).length };
  }

  async friendIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.friendship.findMany({ where: { status: 'ACCEPTED', OR: [{ userAId: userId }, { userBId: userId }] }, select: { userAId: true, userBId: true } });
    return rows.map((r) => (r.userAId === userId ? r.userBId : r.userAId));
  }

  async areFriends(a: string | undefined, b: string): Promise<boolean> {
    if (!a) return false;
    if (a === b) return true;
    const f = await this.find(a, b);
    return f?.status === 'ACCEPTED';
  }

  async isBlocked(viewer: string | undefined, owner: string): Promise<boolean> {
    if (!viewer || viewer === owner) return false;
    const f = await this.find(viewer, owner);
    return f?.status === 'BLOCKED' && f.blockedBy === owner;
  }

  async request(me: string, other: string) {
    if (me === other) throw new BadRequestException('Нельзя добавить себя');
    const target = await this.prisma.user.findUnique({ where: { id: other }, select: { status: true, profile: { select: { displayName: true } } } });
    if (!target || target.status !== 'ACTIVE') throw new NotFoundException('Профиль недоступен');
    const f = await this.find(me, other);
    if (f?.status === 'BLOCKED') throw new NotFoundException('Профиль недоступен'); // заблокированный не должен узнать о блокировке
    if (f?.status === 'ACCEPTED') return { state: 'FRIENDS' as FriendState };
    if (f?.status === 'PENDING') {
      if (f.requestedBy === me) return { state: 'OUTGOING' as FriendState };
      return this.accept(me, other); // встречная заявка = принятие
    }
    if (f?.status === 'DECLINED' && f.requestedBy === me && f.respondedAt && Date.now() - f.respondedAt.getTime() < RETRY_AFTER_DECLINE_DAYS * 86_400_000) {
      throw new BadRequestException(`Повторить заявку можно через ${RETRY_AFTER_DECLINE_DAYS} дней после отказа`);
    }
    const pending = await this.prisma.friendship.count({ where: { status: 'PENDING', requestedBy: me } });
    if (pending >= MAX_PENDING_OUT) throw new BadRequestException('Слишком много заявок в ожидании');

    await this.prisma.friendship.upsert({ where: { userAId_userBId: this.pair(me, other) }, create: { ...this.pair(me, other), status: 'PENDING', requestedBy: me }, update: { status: 'PENDING', requestedBy: me, blockedBy: null, respondedAt: null, createdAt: new Date() } });
    const meP = await this.prisma.userProfile.findUnique({ where: { userId: me }, select: { displayName: true } });
    await this.notifications.send(other, 'friend.request', `${meP?.displayName ?? 'Участник'} хочет добавить вас в друзья`, 'Откройте профиль, чтобы принять или отклонить.', { userId: me });
    return { state: 'OUTGOING' as FriendState };
  }

  async accept(me: string, other: string) {
    const f = await this.find(me, other);
    if (!f || f.status !== 'PENDING' || f.requestedBy === me) throw new NotFoundException('Заявки нет');
    await this.prisma.friendship.update({ where: { userAId_userBId: this.pair(me, other) }, data: { status: 'ACCEPTED', respondedAt: new Date() } });
    const meP = await this.prisma.userProfile.findUnique({ where: { userId: me }, select: { displayName: true } });
    await this.notifications.send(other, 'friend.accepted', `${meP?.displayName ?? 'Участник'} принял заявку в друзья`, 'Теперь вы видите арсенал и уловы друг друга с видимостью «друзьям».', { userId: me });
    return { state: 'FRIENDS' as FriendState };
  }

  async decline(me: string, other: string) {
    const f = await this.find(me, other);
    if (!f || f.status !== 'PENDING' || f.requestedBy === me) throw new NotFoundException('Заявки нет');
    await this.prisma.friendship.update({ where: { userAId_userBId: this.pair(me, other) }, data: { status: 'DECLINED', respondedAt: new Date() } });
    return { state: 'NONE' as FriendState };
  }

  async remove(me: string, other: string) {
    const f = await this.find(me, other);
    if (!f || f.status === 'BLOCKED') return;
    await this.prisma.friendship.delete({ where: { userAId_userBId: this.pair(me, other) } });
  }

  async block(me: string, other: string) {
    if (me === other) throw new BadRequestException();
    await this.prisma.friendship.upsert({ where: { userAId_userBId: this.pair(me, other) }, create: { ...this.pair(me, other), status: 'BLOCKED', requestedBy: me, blockedBy: me, respondedAt: new Date() }, update: { status: 'BLOCKED', blockedBy: me, respondedAt: new Date() } });
    return { state: 'BLOCKED' as FriendState };
  }

  async unblock(me: string, other: string) {
    const f = await this.find(me, other);
    if (!f || f.status !== 'BLOCKED' || f.blockedBy !== me) throw new ForbiddenException();
    await this.prisma.friendship.delete({ where: { userAId_userBId: this.pair(me, other) } });
    return { state: 'NONE' as FriendState };
  }

  private async cards(ids: string[]) {
    const season = await this.prisma.season.findFirst({ where: { isActive: true } });
    const rows = await this.prisma.userProfile.findMany({ where: { userId: { in: ids } }, select: { userId: true, displayName: true, city: { select: { name: true } }, user: { select: { lastSeenAt: true, disciplines: { orderBy: { priority: 'asc' }, take: 1 }, rankings: season ? { where: { seasonId: season.id } } : false } } } });
    return new Map(rows.map((r) => {
      const d = r.user.disciplines[0]?.discipline ?? null;
      const rk = Array.isArray(r.user.rankings) ? r.user.rankings.find((x) => x.discipline === d) : undefined;
      return [r.userId, { id: r.userId, displayName: r.displayName, city: r.city?.name ?? null, discipline: d, rank: rk?.rank ?? null, lastSeenAt: r.user.lastSeenAt }];
    }));
  }

  async list(me: string) {
    const rows = await this.prisma.friendship.findMany({ where: { status: { in: ['ACCEPTED', 'PENDING'] }, OR: [{ userAId: me }, { userBId: me }] }, orderBy: { createdAt: 'desc' } });
    const other = (r: (typeof rows)[number]) => (r.userAId === me ? r.userBId : r.userAId);
    const cards = await this.cards(rows.map(other));
    const pick = (r: (typeof rows)[number]) => ({ ...(cards.get(other(r)) ?? { id: other(r), displayName: 'Участник', city: null, discipline: null, rank: null, lastSeenAt: null }), since: r.respondedAt ?? r.createdAt });
    return {
      friends: rows.filter((r) => r.status === 'ACCEPTED').map(pick).sort((a, b) => (b.lastSeenAt?.getTime() ?? 0) - (a.lastSeenAt?.getTime() ?? 0)),
      incoming: rows.filter((r) => r.status === 'PENDING' && r.requestedBy !== me).map(pick),
      outgoing: rows.filter((r) => r.status === 'PENDING' && r.requestedBy === me).map(pick),
    };
  }

  /** Кого добавить: стартовали вместе, одноклубники, общие друзья, совпадение дисциплины/города. */
  async suggestions(me: string) {
    const known = new Set([me, ...(await this.prisma.friendship.findMany({ where: { OR: [{ userAId: me }, { userBId: me }] }, select: { userAId: true, userBId: true } })).flatMap((r) => [r.userAId, r.userBId])]);
    const reasons = new Map<string, Set<string>>();
    const add = (id: string, why: string) => { if (known.has(id)) return; reasons.set(id, (reasons.get(id) ?? new Set()).add(why)); };

    const myFinished = await this.prisma.registration.findMany({ where: { ownerId: me, status: 'FINISHED' }, select: { tournamentId: true } });
    if (myFinished.length) {
      const co = await this.prisma.registration.findMany({ where: { tournamentId: { in: myFinished.map((r) => r.tournamentId) }, status: 'FINISHED', ownerId: { not: me } }, select: { ownerId: true } });
      const cnt = new Map<string, number>(); for (const c of co) cnt.set(c.ownerId, (cnt.get(c.ownerId) ?? 0) + 1);
      for (const [id, n] of cnt) add(id, n > 1 ? `${n} общих старта` : 'стартовали вместе');
    }
    const myClubs = await this.prisma.clubMember.findMany({ where: { userId: me, role: { in: ['CAPTAIN', 'ATHLETE'] } }, select: { clubId: true } });
    if (myClubs.length) for (const m of await this.prisma.clubMember.findMany({ where: { clubId: { in: myClubs.map((c) => c.clubId) }, userId: { not: me }, role: { in: ['CAPTAIN', 'ATHLETE'] } }, select: { userId: true } })) add(m.userId, 'одноклубник');
    const friends = await this.friendIds(me);
    if (friends.length) {
      const fof = await this.prisma.friendship.findMany({ where: { status: 'ACCEPTED', OR: [{ userAId: { in: friends } }, { userBId: { in: friends } }] }, select: { userAId: true, userBId: true } });
      const cnt = new Map<string, number>(); for (const r of fof) for (const id of [r.userAId, r.userBId]) if (!friends.includes(id)) cnt.set(id, (cnt.get(id) ?? 0) + 1);
      for (const [id, n] of cnt) add(id, `${n} общих ${n === 1 ? 'друг' : n < 5 ? 'друга' : 'друзей'}`);
    }
    const meP = await this.prisma.user.findUnique({ where: { id: me }, include: { profile: true, disciplines: true } });
    const myD = meP?.disciplines.map((d) => d.discipline) ?? [];
    if (reasons.size < 8 && myD.length) for (const u of await this.prisma.userDiscipline.findMany({ where: { discipline: { in: myD } }, select: { userId: true }, take: 100 })) add(u.userId, 'та же дисциплина');
    if (meP?.profile?.cityId) for (const p of await this.prisma.userProfile.findMany({ where: { cityId: meP.profile.cityId }, select: { userId: true }, take: 50 })) add(p.userId, 'ваш город');

    const cards = await this.cards([...reasons.keys()]);
    return [...reasons.entries()].map(([id, why]) => ({ ...(cards.get(id) ?? { id, displayName: 'Участник', city: null, discipline: null, rank: null }), reasons: [...why].slice(0, 3), score: why.size + ([...why].some((w) => w.includes('старт')) ? 2 : 0) + ([...why].some((w) => w.includes('друг')) ? 1 : 0) })).filter((c) => c.displayName !== 'Участник').sort((a, b) => b.score - a.score).slice(0, 20);
  }
}
