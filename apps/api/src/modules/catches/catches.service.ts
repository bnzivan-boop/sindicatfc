import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateCatch, MediaUploadUrl, TrophyCard, TrophyListQuery } from '@sindikat/domain';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { StorageService } from '../../infra/storage/storage.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { FriendsService } from '../friends/friends.service.js';

@Injectable()
export class CatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly notifications: NotificationsService,
    private readonly friends: FriendsService,
  ) {}

  async listOwn(ownerId: string) {
    const rows = await this.prisma.catch.findMany({
      where: { ownerId },
      include: { species: true, media: { include: { file: true }, orderBy: { sortOrder: 'asc' } }, trophy: true, location: { select: { privacy: true, waterbodyId: true } }, _count: { select: { likes: true, comments: { where: { deletedAt: null } } } } },
      orderBy: { caughtAt: 'desc' },
    });
    return Promise.all(rows.map(async (r) => ({ ...r, photoUrls: await Promise.all(r.media.map((m) => this.storage.createReadUrl(m.file.objectKey, 'media'))) })));
  }

  listSpecies() {
    return this.prisma.fishSpecies.findMany({ orderBy: { nameRu: 'asc' } });
  }

  async remove(ownerId: string, catchId: string) {
    await this.assertOwner(ownerId, catchId);
    await this.prisma.catch.delete({ where: { id: catchId } });
  }

  async create(ownerId: string, dto: CreateCatch) {
    const { gear, location, tournamentId, ...fields } = dto;
    const created = await this.prisma.catch.create({
      data: {
        ownerId,
        ...fields,
        gearLink: gear ? { create: { gearKitId: gear.gearKitId, freeText: gear.freeText, lureRef: gear.lureId ? { lureId: gear.lureId } : undefined } } : undefined,
        location: location ? { create: { waterbodyId: location.waterbodyId, privacy: location.privacy } } : undefined,
        tournamentLink: tournamentId ? { create: { tournamentId } } : undefined,
      },
    });
    // Точку пишем отдельно raw-запросом: Prisma не типизирует geography.
    if (location?.lat !== undefined && location.lng !== undefined) {
      await this.prisma.$executeRaw`
        UPDATE catch_locations SET point = ST_SetSRID(ST_MakePoint(${location.lng}, ${location.lat}), 4326)::geography
        WHERE catch_id = ${created.id}`;
    }
    return created;
  }

  async createMediaUploadUrl(ownerId: string, catchId: string, dto: MediaUploadUrl) {
    await this.assertOwner(ownerId, catchId);
    const fileId = randomUUID();
    const target = await this.storage.createUploadUrl({ fileId, bucket: 'media', mimeType: dto.mimeType, sizeBytes: dto.sizeBytes });
    await this.prisma.$transaction([
      this.prisma.file.create({
        data: { id: fileId, ownerId, bucket: 'media', objectKey: target.objectKey, mimeType: dto.mimeType, sizeBytes: dto.sizeBytes, checksum: dto.checksumSha256 },
      }),
      this.prisma.catchMedia.create({ data: { catchId, fileId } }),
    ]);
    return target;
  }

  async promoteToTrophy(ownerId: string, catchId: string) {
    const c = await this.assertOwner(ownerId, catchId);
    const isPersonalRecord = await this.isPersonalRecord(ownerId, c.speciesId, c.lengthMm, c.weightG);
    return this.prisma.trophy.upsert({
      where: { catchId },
      // публикуется сразу и попадает в ленту; модерация — пост-фактум (жалобы/скрытие), как в handoff §2.3
      create: { catchId, status: 'PUBLISHED', isPersonalRecord, recordType: isPersonalRecord ? 'LENGTH' : null },
      update: { isPersonalRecord, status: 'PUBLISHED' },
    });
  }

  async listPublicTrophies(userId: string, q: TrophyListQuery): Promise<TrophyCard[]> {
    const orderBy = { date: { caughtAt: q.order }, species: { species: { nameRu: q.order } }, weight: { weightG: q.order }, length: { lengthMm: q.order } }[q.sort];
    const rows = await this.prisma.catch.findMany({
      where: { ownerId: userId, visibility: 'PUBLIC', trophy: { status: 'PUBLISHED' } },
      include: {
        species: true,
        trophy: true,
        media: { include: { file: true }, orderBy: { sortOrder: 'asc' } },
        gearLink: { include: { gearKit: { select: { name: true } } } },
        location: { include: { waterbody: { select: { name: true } } } },
        tournamentLink: { include: { tournament: { select: { title: true } } } },
        _count: { select: { likes: true, comments: { where: { deletedAt: null } } } },
      },
      orderBy,
    });
    return Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        species: r.species.nameRu,
        lengthMm: r.lengthMm,
        weightG: r.weightG,
        description: r.description,
        caughtAt: r.caughtAt.toISOString(),
        photos: await Promise.all(r.media.map((m) => this.storage.createReadUrl(m.file.objectKey, 'media'))),
        gearSummary: r.gearLink?.gearKit?.name ?? r.gearLink?.freeText ?? null,
        // WATERBODY_ONLY отдаёт название водоёма, HIDDEN — ничего, EXACT — тоже только название (точка — отдельным приватным эндпоинтом)
        waterbody: r.location?.privacy === 'HIDDEN' ? null : (r.location?.waterbody?.name ?? null),
        isPersonalRecord: r.trophy?.isPersonalRecord ?? false,
        tournamentTitle: r.tournamentLink?.tournament.title ?? null,
        likes: r._count.likes,
        comments: r._count.comments,
      })),
    );
  }

  /** Публичная карточка трофея: только PUBLISHED-трофеи с visibility=PUBLIC; точных координат нет. */
  async trophyDetail(catchId: string, viewerId?: string) {
    const c = await this.prisma.catch.findFirst({
      where: { id: catchId, visibility: 'PUBLIC', trophy: { status: 'PUBLISHED' } },
      include: {
        species: true, trophy: true, owner: { include: { profile: { select: { displayName: true, city: { select: { name: true } } } } } },
        media: { include: { file: true }, orderBy: { sortOrder: 'asc' } },
        gearLink: { include: { gearKit: { select: { id: true, name: true, rod: true, reel: true, mainLine: true } } } },
        location: { include: { waterbody: { select: { name: true } } } },
        tournamentLink: { include: { tournament: { select: { id: true, title: true } } } },
        _count: { select: { likes: true, comments: { where: { deletedAt: null } } } },
        comments: { where: { deletedAt: null }, include: { author: { include: { profile: { select: { displayName: true } } } } }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!c) throw new NotFoundException();
    const likedByMe = viewerId ? !!(await this.prisma.catchLike.findUnique({ where: { catchId_userId: { catchId, userId: viewerId } } })) : false;
    const rod = c.gearLink?.gearKit?.rod as { customBrand?: string; customModel?: string; lureTestMinG?: number; lureTestMaxG?: number } | null;
    return {
      id: c.id,
      owner: { id: c.ownerId, displayName: c.owner.profile?.displayName ?? 'Участник', city: c.owner.profile?.city?.name ?? null },
      species: c.species.nameRu,
      lengthMm: c.lengthMm,
      weightG: c.weightG,
      description: c.description,
      caughtAt: c.caughtAt,
      photos: await Promise.all(c.media.map((m) => this.storage.createReadUrl(m.file.objectKey, 'media', 900))),
      gear: c.gearLink ? { kitId: c.gearLink.gearKit?.id ?? null, kitName: c.gearLink.gearKit?.name ?? null, rod: rod ? [rod.customBrand, rod.customModel, rod.lureTestMinG !== undefined ? `${rod.lureTestMinG}–${rod.lureTestMaxG} г` : null].filter(Boolean).join(' ') : null, freeText: c.gearLink.freeText } : null,
      waterbody: c.location?.privacy === 'HIDDEN' ? null : (c.location?.waterbody?.name ?? null),
      locationPrivacy: c.location?.privacy ?? 'HIDDEN',
      tournament: c.tournamentLink?.tournament ?? null,
      isPersonalRecord: c.trophy?.isPersonalRecord ?? false,
      likes: c._count.likes,
      likedByMe,
      comments: c.comments.map((cm) => ({ id: cm.id, authorId: cm.authorId, author: cm.author.profile?.displayName ?? 'Участник', text: cm.text, createdAt: cm.createdAt })),
    };
  }

  async toggleLike(userId: string, catchId: string) {
    await this.assertPublished(catchId);
    const existing = await this.prisma.catchLike.findUnique({ where: { catchId_userId: { catchId, userId } } });
    if (existing) await this.prisma.catchLike.delete({ where: { catchId_userId: { catchId, userId } } });
    else await this.prisma.catchLike.create({ data: { catchId, userId } });
    const likes = await this.prisma.catchLike.count({ where: { catchId } });
    return { liked: !existing, likes };
  }

  async addComment(authorId: string, catchId: string, text: string) {
    const c = await this.assertPublished(catchId);
    const comment = await this.prisma.catchComment.create({ data: { catchId, authorId, text }, include: { author: { include: { profile: { select: { displayName: true } } } } } });
    if (c.ownerId !== authorId) {
      await this.notifications.send(c.ownerId, 'trophy.comment', `${comment.author.profile?.displayName ?? 'Участник'} прокомментировал трофей`, text.slice(0, 120), { catchId });
    }
    return { id: comment.id, authorId, author: comment.author.profile?.displayName ?? 'Участник', text, createdAt: comment.createdAt };
  }

  async removeComment(userId: string, catchId: string, commentId: string) {
    const cm = await this.prisma.catchComment.findUnique({ where: { id: commentId }, include: { catch: { select: { ownerId: true } } } });
    if (!cm || cm.catchId !== catchId) throw new NotFoundException();
    if (cm.authorId !== userId && cm.catch.ownerId !== userId) throw new ForbiddenException();
    await this.prisma.catchComment.update({ where: { id: commentId }, data: { deletedAt: new Date() } });
  }

  /** Лента трофеев: PUBLISHED + PUBLIC, новые сверху, cursor по promotedAt. */
  async feed(viewerId: string | undefined, q: { cursor?: string; limit: number; scope?: 'all' | 'friends' }) {
    const friendIds = q.scope === 'friends' && viewerId ? await this.friends.friendIds(viewerId) : null;
    const rows = await this.prisma.trophy.findMany({
      where: { status: 'PUBLISHED', catch: { visibility: friendIds ? { in: ['PUBLIC', 'FRIENDS'] } : 'PUBLIC', ...(friendIds ? { ownerId: { in: friendIds } } : {}) }, ...(q.cursor ? { promotedAt: { lt: new Date(q.cursor) } } : {}) },
      include: { catch: { include: { species: true, owner: { include: { profile: { select: { displayName: true, city: { select: { name: true } } } } } }, media: { include: { file: true }, orderBy: { sortOrder: 'asc' }, take: 1 }, location: { include: { waterbody: { select: { name: true } } } }, _count: { select: { likes: true, comments: { where: { deletedAt: null } } } }, likes: viewerId ? { where: { userId: viewerId }, select: { userId: true } } : false } } },
      orderBy: { promotedAt: 'desc' },
      take: q.limit + 1,
    });
    const nextCursor = rows.length > q.limit ? rows.pop()!.promotedAt.toISOString() : null;
    const items = await Promise.all(rows.map(async (t) => ({
      id: t.catchId,
      owner: { id: t.catch.ownerId, displayName: t.catch.owner.profile?.displayName ?? 'Участник', city: t.catch.owner.profile?.city?.name ?? null },
      species: t.catch.species.nameRu,
      lengthMm: t.catch.lengthMm,
      weightG: t.catch.weightG,
      description: t.catch.description,
      photo: t.catch.media[0] ? await this.storage.createReadUrl(t.catch.media[0].file.objectKey, 'media', 900) : null,
      waterbody: t.catch.location?.privacy === 'HIDDEN' ? null : (t.catch.location?.waterbody?.name ?? null),
      isPersonalRecord: t.isPersonalRecord,
      publishedAt: t.promotedAt,
      likes: t.catch._count.likes,
      comments: t.catch._count.comments,
      likedByMe: Array.isArray(t.catch.likes) ? t.catch.likes.length > 0 : false,
    })));
    return { items, nextCursor };
  }

  private async assertPublished(catchId: string) {
    const c = await this.prisma.catch.findFirst({ where: { id: catchId, visibility: 'PUBLIC', trophy: { status: 'PUBLISHED' } } });
    if (!c) throw new NotFoundException('Трофей не опубликован');
    return c;
  }

  private async assertOwner(ownerId: string, catchId: string) {
    const c = await this.prisma.catch.findUnique({ where: { id: catchId } });
    if (!c) throw new NotFoundException();
    if (c.ownerId !== ownerId) throw new ForbiddenException();
    return c;
  }

  private async isPersonalRecord(ownerId: string, speciesId: string, lengthMm: number | null, weightG: number | null) {
    if (lengthMm === null && weightG === null) return false;
    const best = await this.prisma.catch.aggregate({
      where: { ownerId, speciesId, trophy: { isNot: null } },
      _max: { lengthMm: true, weightG: true },
    });
    return (lengthMm !== null && lengthMm >= (best._max.lengthMm ?? 0)) || (weightG !== null && weightG >= (best._max.weightG ?? 0));
  }
}
