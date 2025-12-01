import { EntityManager, FilterQuery } from '@mikro-orm/core';
import { EntityRepository } from '@mikro-orm/mysql';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { ArticleLock } from './article-lock.entity';
import { Article } from './article.entity';
import { User } from '../user/user.entity';

const LOCK_EXPIRE_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class ArticleLockService {
  constructor(
    private readonly em: EntityManager,
    @InjectRepository(ArticleLock)
    private readonly lockRepository: EntityRepository<ArticleLock>,
  ) {}

  private isExpired(lock: ArticleLock): boolean {
    return lock.lastSeenAt.getTime() < Date.now() - LOCK_EXPIRE_MS;
  }

  async acquireLock(
    articleId: number,
    userId: number,
  ): Promise<{ success: boolean; lockedBy?: string }> {
    const now = new Date();
    const existing = await this.lockRepository.findOne(
      { article: articleId },
      { populate: ['user'] },
    );

    if (existing) {
      const expired = this.isExpired(existing);
      if (!expired && existing.user.id !== userId) {
        return { success: false, lockedBy: existing.user.username };
      }

      // Take over (or refresh) the lock
      existing.user = this.em.getReference(User, userId);
      existing.lockedAt = now;
      existing.lastSeenAt = now;
      await this.em.flush();
      return { success: true };
    }

    // No lock exists, create one
    const articleRef = this.em.getReference(Article, articleId);
    const userRef = this.em.getReference(User, userId);
    const lock = new ArticleLock(articleRef, userRef);
    lock.lockedAt = now;
    lock.lastSeenAt = now;
    await this.em.persistAndFlush(lock);
    return { success: true };
  }

  async releaseLock(articleId: number, userId: number): Promise<void> {
    const existing = await this.lockRepository.findOne(
      { article: articleId },
      { populate: ['user'] },
    );

    if (existing && existing.user.id === userId) {
      await this.em.removeAndFlush(existing);
    }
  }

  async updateHeartbeat(articleId: number, userId: number): Promise<boolean> {
    const existing = await this.lockRepository.findOne(
      { article: articleId },
      { populate: ['user'] },
    );

    if (!existing || existing.user.id !== userId) {
      return false;
    }

    existing.lastSeenAt = new Date();
    await this.em.flush();
    return true;
  }

  async checkLock(
    articleId: number,
  ): Promise<{ locked: boolean; lockedBy?: string }> {
    console.log('[LockService.checkLock] Checking articleId:', articleId);
    const existing = await this.lockRepository.findOne(
      { article: articleId },
      { populate: ['user'] },
    );
    console.log(
      '[LockService.checkLock] Query result:',
      existing
        ? {
            userId: existing.user.id,
            username: existing.user.username,
            lastSeenAt: existing.lastSeenAt,
            lockedAt: existing.lockedAt,
          }
        : null,
    );

    if (!existing) {
      const result = { locked: false } as const;
      console.log('[LockService.checkLock] Returning (no lock):', result);
      return result;
    }

    if (this.isExpired(existing)) {
      const result = { locked: false } as const;
      console.log('[LockService.checkLock] Returning (expired):', result);
      return result;
    }

    const result = { locked: true, lockedBy: existing.user.username } as const;
    console.log('[LockService.checkLock] Returning:', result);
    return result;
  }

  async cleanExpiredLocks(): Promise<void> {
    const cutoff = new Date(Date.now() - LOCK_EXPIRE_MS);
    const where: FilterQuery<ArticleLock> = { lastSeenAt: { $lt: cutoff } };
    await this.lockRepository.nativeDelete(where);
  }
}
