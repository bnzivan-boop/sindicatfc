import { Injectable, NotFoundException } from '@nestjs/common';
import type { PublicProfile, SetDisciplines, UpdateProfile } from '@sindikat/domain';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { StorageService } from '../../infra/storage/storage.service.js';
import { FriendsService } from '../friends/friends.service.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly friends: FriendsService,
  ) {}

  /** Приватный профиль + сводка сезона по основной дисциплине (для rank-card на главной). */
  async getPrivateProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: { include: { city: true, avatar: true } }, disciplines: { orderBy: { priority: 'asc' } }, targetSpecies: true, roles: true },
    });
    if (!user) throw new NotFoundException();
    const avatarUrl = user.profile?.avatar ? await this.storage.createReadUrl(user.profile.avatar.objectKey, 'media', 3600) : null;

    const season = await this.prisma.season.findFirst({ where: { isActive: true } });
    const primary = user.disciplines[0]?.discipline;
    let seasonSummary: { rank: number | null; points: number; starts: number; finalProgress: number } | null = null;
    if (season && primary) {
      const entry = await this.prisma.rankingEntry.findUnique({ where: { userId_seasonId_discipline: { userId, seasonId: season.id, discipline: primary } } });
      const rules = await this.prisma.rankingRules.findFirst({ where: { seasonId: season.id, OR: [{ discipline: primary }, { discipline: null }] }, orderBy: { activeFrom: 'desc' } });
      const minStarts = (rules?.payload as { minStartsForFinal?: number } | null)?.minStartsForFinal ?? 2;
      const starts = entry?.starts ?? 0;
      seasonSummary = { rank: entry?.rank ?? null, points: entry ? Number(entry.points) : 0, starts, finalProgress: Math.min(100, Math.round((starts / minStarts) * 100)) };
    }
    return { ...user, avatarUrl, season: seasonSummary, privacy: await this.privacy(userId) };
  }

  async getPublicProfile(userId: string, viewerId?: string): Promise<PublicProfile & { friendship: { state: string; mutual: number } }> {
    if (await this.friends.isBlocked(viewerId, userId)) throw new NotFoundException('Профиль недоступен');
    const user = await this.prisma.user.findUnique({
      where: { id: userId, status: 'ACTIVE' },
      include: { profile: { include: { city: true, avatar: true } }, disciplines: { orderBy: { priority: 'asc' } } },
    });
    if (!user?.profile) throw new NotFoundException();
    // сводка сезона по всем дисциплинам + история стартов — публичны по концепции («турнирный рейтинг, достижения и история участий»)
    const season = await this.prisma.season.findFirst({ where: { isActive: true } });
    const entries = season ? await this.prisma.rankingEntry.findMany({ where: { userId, seasonId: season.id }, orderBy: { rank: 'asc' } }) : [];
    const finished = await this.prisma.registration.findMany({ where: { ownerId: userId, status: 'FINISHED' }, include: { tournament: { select: { id: true, title: true, startsAt: true, discipline: true, level: true, snapshots: { where: { isFinal: true }, orderBy: { version: 'desc' }, take: 1, select: { payload: true } } } } }, orderBy: { tournament: { startsAt: 'desc' } }, take: 20 });
    const history = finished.map((r) => {
      const payload = (r.tournament.snapshots[0]?.payload ?? []) as Array<{ participantId: string; place: number }>;
      return { tournamentId: r.tournament.id, title: r.tournament.title, startsAt: r.tournament.startsAt, discipline: r.tournament.discipline, level: r.tournament.level, place: payload.find((e) => e.participantId === userId)?.place ?? null, fieldSize: payload.length };
    });
    return {
      id: user.id,
      displayName: user.profile.displayName,
      avatarUrl: user.profile.avatar ? await this.storage.createReadUrl(user.profile.avatar.objectKey, 'media') : null,
      city: user.profile.city?.name ?? null,
      experienceYears: user.profile.experienceYears,
      bio: user.profile.bio,
      waterTypes: user.profile.waterTypes as PublicProfile['waterTypes'],
      memberSince: user.createdAt,
      disciplines: user.disciplines.map((d) => d.discipline),
      season: entries.map((e) => ({ discipline: e.discipline, rank: e.rank, points: Number(e.points), starts: e.starts })),
      history,
      podiums: history.filter((h) => h.place !== null && h.place <= 3).length,
      wins: history.filter((h) => h.place === 1).length,
      friendship: await this.friends.status(viewerId ?? '', userId).catch(() => ({ state: 'NONE', mutual: 0 })),
    };
  }

  async updateProfile(userId: string, dto: UpdateProfile) {
    const { targetSpeciesIds, onboardingCompleted, cityName, ...profile } = dto;
    const completion = onboardingCompleted ? { onboardingCompletedAt: new Date() } : {};
    // город свободным текстом → нормализуем в справочник (без дублей по регистру/пробелам)
    if (cityName !== undefined) {
      const name = cityName?.trim().replace(/\s+/g, ' ');
      if (!name) profile.cityId = null;
      else {
        const city = (await this.prisma.city.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } })) ?? (await this.prisma.city.create({ data: { name: name[0]!.toUpperCase() + name.slice(1) } }));
        profile.cityId = city.id;
      }
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.userProfile.upsert({
        where: { userId },
        create: { userId, displayName: profile.displayName ?? 'Рыболов', ...profile, ...completion },
        update: { ...profile, ...completion },
      });
      if (targetSpeciesIds) {
        await tx.userTargetSpecies.deleteMany({ where: { userId } });
        await tx.userTargetSpecies.createMany({ data: targetSpeciesIds.map((speciesId) => ({ userId, speciesId })) });
      }
      return tx.userProfile.findUniqueOrThrow({ where: { userId } });
    });
  }

  async getPublicKits(userId: string, viewerId?: string) {
    const friend = await this.friends.areFriends(viewerId, userId);
    const visibility = friend ? { in: ['PUBLIC', 'FRIENDS'] as Array<'PUBLIC' | 'FRIENDS'> } : ('PUBLIC' as const);
    const kits = await this.prisma.gearKit.findMany({ where: { ownerId: userId, visibility }, orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }] });
    const boat = await this.prisma.boat.findFirst({ where: { ownerId: userId, visibility }, select: { type: true, customName: true, lengthCm: true, seats: true, equipment: true } });
    const hidden = friend ? 0 : await this.prisma.gearKit.count({ where: { ownerId: userId, visibility: 'FRIENDS' } });
    return { kits, boat, hiddenForFriends: hidden };
  }

  async search(q: string) {
    const rows = await this.prisma.userProfile.findMany({
      where: { displayName: { contains: q, mode: 'insensitive' }, onboardingCompletedAt: { not: null }, user: { status: 'ACTIVE' } },
      include: { city: { select: { name: true } }, user: { include: { disciplines: { orderBy: { priority: 'asc' }, take: 1 } } } },
      take: 10,
      orderBy: { displayName: 'asc' },
    });
    return rows.map((p) => ({ id: p.userId, displayName: p.displayName, city: p.city?.name ?? null, discipline: p.user.disciplines[0]?.discipline ?? null }));
  }

  async registerDevice(userId: string, dto: { platform: string; pushToken: string }) {
    const existing = await this.prisma.device.findFirst({ where: { pushToken: dto.pushToken } });
    if (existing) return this.prisma.device.update({ where: { id: existing.id }, data: { userId, platform: dto.platform, lastSeenAt: new Date() } });
    return this.prisma.device.create({ data: { userId, platform: dto.platform, pushToken: dto.pushToken } });
  }

  async unregisterDevice(userId: string, pushToken: string) {
    await this.prisma.device.updateMany({ where: { userId, pushToken }, data: { pushToken: null } });
  }

  listCities() {
    return this.prisma.city.findMany({ orderBy: { name: 'asc' } });
  }

  async setDisciplines(userId: string, disciplines: SetDisciplines['disciplines']) {
    await this.prisma.$transaction([
      this.prisma.userDiscipline.deleteMany({ where: { userId } }),
      this.prisma.userDiscipline.createMany({ data: disciplines.map((d) => ({ userId, ...d })) }),
    ]);
    return this.prisma.userDiscipline.findMany({ where: { userId }, orderBy: { priority: 'asc' } });
  }

  /** Аватар: выдаём URL загрузки и сразу привязываем файл к профилю (после PUT клиент вызывает GET /me — ссылка подписанная). */
  async createAvatarUploadUrl(userId: string, dto: { mimeType: string; sizeBytes: number; checksumSha256: string }) {
    const fileId = randomUUID();
    const target = await this.storage.createUploadUrl({ fileId, bucket: 'media', mimeType: dto.mimeType, sizeBytes: dto.sizeBytes });
    await this.prisma.$transaction([
      this.prisma.file.create({ data: { id: fileId, ownerId: userId, bucket: 'media', objectKey: target.objectKey, mimeType: dto.mimeType, sizeBytes: dto.sizeBytes, checksum: dto.checksumSha256 } }),
      this.prisma.userProfile.update({ where: { userId }, data: { avatarFileId: fileId } }),
    ]);
    return target;
  }

  /** Массово применяет видимость ко всем комплектам и лодке; приватность гео — к записям без явного выбора EXACT. */
  async updatePrivacy(userId: string, dto: { gearVisibility?: 'PUBLIC' | 'FRIENDS' | 'PRIVATE'; locationPrivacy?: 'EXACT' | 'WATERBODY_ONLY' | 'HIDDEN' }) {
    if (dto.gearVisibility) {
      await this.prisma.gearKit.updateMany({ where: { ownerId: userId }, data: { visibility: dto.gearVisibility } });
      await this.prisma.boat.updateMany({ where: { ownerId: userId }, data: { visibility: dto.gearVisibility } });
    }
    if (dto.locationPrivacy) await this.prisma.catchLocation.updateMany({ where: { catch: { ownerId: userId }, privacy: { not: 'EXACT' } }, data: { privacy: dto.locationPrivacy } });
    return this.privacy(userId);
  }

  async privacy(userId: string) {
    const kit = await this.prisma.gearKit.findFirst({ where: { ownerId: userId }, select: { visibility: true } });
    const loc = await this.prisma.catchLocation.findFirst({ where: { catch: { ownerId: userId } }, select: { privacy: true } });
    return { gearVisibility: kit?.visibility ?? 'PUBLIC', locationPrivacy: loc?.privacy ?? 'HIDDEN' };
  }
}
