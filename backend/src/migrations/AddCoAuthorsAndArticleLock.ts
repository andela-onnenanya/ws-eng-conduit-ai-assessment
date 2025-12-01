import { Migration } from '@mikro-orm/migrations';

export class AddCoAuthorsAndArticleLock extends Migration {
  async up(): Promise<void> {
    // Add co_author_emails to article (store JSON string similar to tag_list)
    // Use a nullable add, backfill, then enforce NOT NULL to avoid MySQL TEXT default constraints.
    this.addSql('alter table `article` add `co_author_emails` text null;');
    this.addSql("update `article` set `co_author_emails` = '[]' where `co_author_emails` is null;");
    this.addSql('alter table `article` modify `co_author_emails` text not null;');

    // Create article_lock table for ADVANCED locking
    this.addSql(
      'create table `article_lock` (`article_id` int unsigned not null, `user_id` int unsigned not null, `locked_at` datetime not null, `last_seen_at` datetime not null) default character set utf8mb4 engine = InnoDB;',
    );

    // Indexes / PK
    this.addSql('alter table `article_lock` add index `article_lock_user_id_index`(`user_id`);');
    this.addSql('alter table `article_lock` add primary key `article_lock_pkey`(`article_id`);');

    // Foreign keys
    this.addSql(
      'alter table `article_lock` add constraint `article_lock_article_id_foreign` foreign key (`article_id`) references `article` (`id`) on update cascade on delete cascade;',
    );
    this.addSql(
      'alter table `article_lock` add constraint `article_lock_user_id_foreign` foreign key (`user_id`) references `user` (`id`) on update cascade on delete cascade;',
    );
  }
}
