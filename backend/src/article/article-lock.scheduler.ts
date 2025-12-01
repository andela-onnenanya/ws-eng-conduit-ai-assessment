import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ArticleLockService } from './article-lock.service';

@Injectable()
export class ArticleLockScheduler {
  private readonly logger = new Logger(ArticleLockScheduler.name);

  constructor(private readonly lockService: ArticleLockService) {}

  // Runs every minute at second 0
  @Cron('0 * * * * *')
  async cleanExpiredLocks(): Promise<void> {
    try {
      await this.lockService.cleanExpiredLocks();
      // this.logger.debug('Expired article locks cleaned');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to clean expired article locks: ${msg}`);
    }
  }
}
