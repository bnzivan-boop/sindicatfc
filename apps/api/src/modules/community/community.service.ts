import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

const author = { include: { profile: { select: { displayName: true, city: { select: { name: true } } } } } } as const;

@Injectable()
export class CommunityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async listChannels(viewerId?: string) {
    const rows = await this.prisma.channel.findMany({
      include: { _count: { select: { members: true, posts: { where: { deletedAt: null } } } }, posts: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 1, select: { title: true } }, members: viewerId ? { where: { userId: viewerId }, select: { userId: true } } : false },
      orderBy: [{ kind: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((c) => ({ id: c.id, slug: c.slug, name: c.name, kind: c.kind, city: c.city, description: c.description, members: c._count.members, posts: c._count.posts, lastPost: c.posts[0]?.title ?? null, joined: Array.isArray(c.members) ? c.members.length > 0 : false }));
  }

  async channel(id: string, viewerId?: string) {
    const c = await this.prisma.channel.findUnique({
      where: { id },
      include: { rubrics: { orderBy: { sortOrder: 'asc' }, include: { _count: { select: { posts: { where: { deletedAt: null } } } } } }, _count: { select: { members: true, posts: { where: { deletedAt: null } } } }, members: { where: { role: { in: ['OWNER', 'ADMIN'] } }, take: 5 } },
    });
    if (!c) throw new NotFoundException();
    const owner = c.ownerId ? await this.prisma.userProfile.findUnique({ where: { userId: c.ownerId }, select: { displayName: true } }) : null;
    const joined = viewerId ? !!(await this.prisma.channelMember.findUnique({ where: { channelId_userId: { channelId: id, userId: viewerId } } })) : false;
    return { id: c.id, slug: c.slug, name: c.name, kind: c.kind, city: c.city, description: c.description, owner: owner?.displayName ?? (c.kind === 'OFFICIAL' ? 'лига' : null), admins: c.members.length, members: c._count.members, posts: c._count.posts, joined, rubrics: c.rubrics.map((r) => ({ id: r.id, name: r.name, posts: r._count.posts })) };
  }

  async createChannel(ownerId: string, dto: { name: string; city?: string; description?: string }) {
    const slug = `${dto.name.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/(^-|-$)/g, '')}-${Date.now().toString(36)}`;
    return this.prisma.channel.create({
      data: { slug, name: dto.name, city: dto.city, description: dto.description, ownerId, members: { create: { userId: ownerId, role: 'OWNER' } }, rubrics: { create: [{ name: 'водоёмы', sortOrder: 0 }, { name: 'снасти', sortOrder: 1 }, { name: 'отчёты', sortOrder: 2 }, { name: 'флудилка', sortOrder: 3 }] } },
    });
  }

  async toggleMembership(userId: string, channelId: string) {
    const existing = await this.prisma.channelMember.findUnique({ where: { channelId_userId: { channelId, userId } } });
    if (existing?.role === 'OWNER') throw new BadRequestException('Владелец не может выйти из своего канала');
    if (existing) await this.prisma.channelMember.delete({ where: { channelId_userId: { channelId, userId } } });
    else await this.prisma.channelMember.create({ data: { channelId, userId } });
    return { joined: !existing, members: await this.prisma.channelMember.count({ where: { channelId } }) };
  }

  async listPosts(viewerId: string | undefined, q: { limit: number; channelId?: string }) {
    const rows = await this.prisma.post.findMany({
      where: { deletedAt: null, channelId: q.channelId },
      include: { channel: { select: { id: true, name: true, kind: true } }, rubric: { select: { name: true } }, _count: { select: { likes: true, comments: { where: { deletedAt: null } } } }, likes: viewerId ? { where: { userId: viewerId }, select: { userId: true } } : false },
      orderBy: { createdAt: 'desc' },
      take: q.limit,
    });
    const authors = await this.prisma.userProfile.findMany({ where: { userId: { in: rows.map((r) => r.authorId) } }, select: { userId: true, displayName: true, city: { select: { name: true } } } });
    const byId = new Map(authors.map((a) => [a.userId, a]));
    return rows.map((p) => this.toPostDto(p, byId.get(p.authorId)));
  }

  async post(id: string, viewerId?: string) {
    const p = await this.prisma.post.findFirst({
      where: { id, deletedAt: null },
      include: { channel: { select: { id: true, name: true, kind: true } }, rubric: { select: { name: true } }, _count: { select: { likes: true, comments: { where: { deletedAt: null } } } }, likes: viewerId ? { where: { userId: viewerId }, select: { userId: true } } : false, comments: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } } },
    });
    if (!p) throw new NotFoundException();
    const ids = [p.authorId, ...p.comments.map((c) => c.authorId)];
    const authors = await this.prisma.userProfile.findMany({ where: { userId: { in: ids } }, select: { userId: true, displayName: true, city: { select: { name: true } } } });
    const byId = new Map(authors.map((a) => [a.userId, a]));
    return { ...this.toPostDto(p, byId.get(p.authorId)), comments: p.comments.map((c) => ({ id: c.id, authorId: c.authorId, author: byId.get(c.authorId)?.displayName ?? 'Участник', text: c.text, createdAt: c.createdAt })) };
  }

  async createPost(authorId: string, channelId: string, dto: { title: string; text: string; rubricId?: string }) {
    const channel = await this.prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel) throw new NotFoundException();
    if (channel.kind === 'OFFICIAL') {
      const admin = await this.prisma.userRole.findFirst({ where: { userId: authorId, role: { in: ['SYSTEM_ADMIN', 'ORGANIZER', 'MODERATOR'] } } });
      if (!admin) throw new ForbiddenException('В официальный канал публикует только лига');
    }
    // публикация = членство: не участник — становится участником
    await this.prisma.channelMember.upsert({ where: { channelId_userId: { channelId, userId: authorId } }, create: { channelId, userId: authorId }, update: {} });
    const post = await this.prisma.post.create({ data: { channelId, authorId, title: dto.title, text: dto.text, rubricId: dto.rubricId } });
    return this.post(post.id, authorId);
  }

  async toggleLike(userId: string, postId: string) {
    const existing = await this.prisma.postLike.findUnique({ where: { postId_userId: { postId, userId } } });
    if (existing) await this.prisma.postLike.delete({ where: { postId_userId: { postId, userId } } });
    else await this.prisma.postLike.create({ data: { postId, userId } });
    return { liked: !existing, likes: await this.prisma.postLike.count({ where: { postId } }) };
  }

  async addComment(authorId: string, postId: string, text: string) {
    const p = await this.prisma.post.findFirst({ where: { id: postId, deletedAt: null } });
    if (!p) throw new NotFoundException();
    const c = await this.prisma.postComment.create({ data: { postId, authorId, text } });
    const a = await this.prisma.userProfile.findUnique({ where: { userId: authorId }, select: { displayName: true } });
    if (p.authorId !== authorId) await this.notifications.send(p.authorId, 'trophy.comment', `${a?.displayName ?? 'Участник'} ответил в теме`, text.slice(0, 120), { postId });
    return { id: c.id, authorId, author: a?.displayName ?? 'Участник', text, createdAt: c.createdAt };
  }

  async removePost(userId: string, postId: string) {
    const p = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!p) throw new NotFoundException();
    const mod = await this.prisma.userRole.findFirst({ where: { userId, role: { in: ['SYSTEM_ADMIN', 'MODERATOR'] } } });
    if (p.authorId !== userId && !mod) throw new ForbiddenException();
    await this.prisma.post.update({ where: { id: postId }, data: { deletedAt: new Date() } });
  }

  private toPostDto(p: { id: string; authorId: string; title: string; text: string; createdAt: Date; channel: { id: string; name: string; kind: string }; rubric: { name: string } | null; _count: { likes: number; comments: number }; likes: unknown }, a?: { displayName: string; city: { name: string } | null }) {
    return { id: p.id, author: { id: p.authorId, displayName: a?.displayName ?? 'Участник', city: a?.city?.name ?? null }, channel: p.channel, rubric: p.rubric?.name ?? null, title: p.title, text: p.text, createdAt: p.createdAt, likes: p._count.likes, comments: p._count.comments, likedByMe: Array.isArray(p.likes) ? p.likes.length > 0 : false };
  }
}
