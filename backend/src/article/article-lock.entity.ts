import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { User } from '../user/user.entity';
import { Article } from './article.entity';

@Entity({ tableName: 'article_lock' })
export class ArticleLock {
  // Primary key is the article relation (one lock per article)
  @ManyToOne(() => Article, { fieldName: 'article_id', primary: true })
  article!: Article;

  @ManyToOne(() => User, { fieldName: 'user_id' })
  user!: User;

  @Property({ type: 'date', fieldName: 'locked_at' })
  lockedAt: Date = new Date();

  @Property({ type: 'date', fieldName: 'last_seen_at', onUpdate: () => new Date() })
  lastSeenAt: Date = new Date();

  constructor(article: Article, user: User) {
    this.article = article;
    this.user = user;
  }
}
