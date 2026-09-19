import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { GearCatalogType, UpsertBoat, UpsertGearKit } from '@sindikat/domain';
import { PrismaService } from '../../infra/prisma/prisma.service.js';

@Injectable()
export class GearService {
  constructor(private readonly prisma: PrismaService) {}

  searchCatalog(q: { type: GearCatalogType; query?: string; brandId?: string }) {
    return this.prisma.gearModel.findMany({
      where: {
        type: q.type,
        brandId: q.brandId,
        ...(q.query ? { OR: [{ name: { contains: q.query, mode: 'insensitive' } }, { brand: { name: { contains: q.query, mode: 'insensitive' } } }] } : {}),
      },
      include: { brand: true },
      take: 50,
      orderBy: [{ brand: { name: 'asc' } }, { name: 'asc' }],
    });
  }

  listKits(ownerId: string) {
    return this.prisma.gearKit.findMany({ where: { ownerId }, orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }] });
  }

  async getKit(ownerId: string, id: string) {
    await this.assertOwner(ownerId, id);
    return this.prisma.gearKit.findUniqueOrThrow({ where: { id } });
  }

  getBoat(ownerId: string) {
    return this.prisma.boat.findFirst({ where: { ownerId } });
  }

  async createKit(ownerId: string, dto: UpsertGearKit) {
    await this.queueCustomModels(ownerId, dto);
    const { rod, reel, mainLine, leader, lures, ...rest } = dto;
    return this.prisma.gearKit.create({
      data: { ownerId, ...rest, rod: rod ?? undefined, reel: reel ?? undefined, mainLine: mainLine ?? undefined, leader: leader ?? undefined, lures },
    });
  }

  async updateKit(ownerId: string, id: string, dto: Partial<UpsertGearKit>) {
    await this.assertOwner(ownerId, id);
    const { rod, reel, mainLine, leader, lures, ...rest } = dto;
    return this.prisma.gearKit.update({
      where: { id },
      data: { ...rest, ...(rod && { rod }), ...(reel && { reel }), ...(mainLine && { mainLine }), ...(leader && { leader }), ...(lures && { lures }) },
    });
  }

  async deleteKit(ownerId: string, id: string) {
    await this.assertOwner(ownerId, id);
    await this.prisma.gearKit.delete({ where: { id } });
  }

  async upsertBoat(ownerId: string, dto: UpsertBoat) {
    const { motor, electricMotor, sonar, trailer, brandId, modelId, customBrand, customModel, ...rest } = dto;
    const data = {
      ...rest,
      brandId,
      modelId,
      customName: [customBrand, customModel].filter(Boolean).join(' ') || null,
      equipment: { motor, electricMotor, sonar, trailer },
    };
    const existing = await this.prisma.boat.findFirst({ where: { ownerId } });
    return existing
      ? this.prisma.boat.update({ where: { id: existing.id }, data })
      : this.prisma.boat.create({ data: { ownerId, ...data } });
  }

  private async assertOwner(ownerId: string, kitId: string) {
    const kit = await this.prisma.gearKit.findUnique({ where: { id: kitId }, select: { ownerId: true } });
    if (!kit) throw new NotFoundException();
    if (kit.ownerId !== ownerId) throw new ForbiddenException();
  }


  /** Модели вне каталога попадают в очередь нормализации, не блокируя пользователя. */
  private async queueCustomModels(ownerId: string, dto: UpsertGearKit) {
    const items: Array<{ type: GearCatalogType; item?: { customBrand?: string; customModel?: string; modelId?: string } }> = [
      { type: 'ROD', item: dto.rod },
      { type: 'REEL', item: dto.reel },
      { type: 'LINE', item: dto.mainLine },
      { type: 'LEADER', item: dto.leader },
    ];
    const custom = items.filter(({ item }) => item && !item.modelId && (item.customBrand || item.customModel));
    if (custom.length === 0) return;
    await this.prisma.gearCustomRequest.createMany({
      data: custom.map(({ type, item }) => ({ ownerId, type, brandText: item!.customBrand ?? '', modelText: item!.customModel ?? '' })),
    });
  }
}
