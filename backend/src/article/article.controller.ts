import { Body, Controller, Delete, Get, Param, Post, Put, Query, HttpException, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from '../user/user.decorator';
import { IArticleRO, IArticlesRO, ICommentsRO } from './article.interface';
import { ArticleService } from './article.service';
import { CreateArticleDto, CreateCommentDto } from './dto';
import { EntityManager } from '@mikro-orm/core';
import { Article } from './article.entity';
import { ArticleLockService } from './article-lock.service';

@ApiBearerAuth()
@ApiTags('articles')
@Controller('articles')
export class ArticleController {
  constructor(
    private readonly articleService: ArticleService,
    private readonly lockService: ArticleLockService,
    private readonly em: EntityManager,
  ) {}

  @ApiOperation({ summary: 'Get all articles' })
  @ApiResponse({ status: 200, description: 'Return all articles.' })
  @Get()
  async findAll(@User('id') userId: number, @Query() query: Record<string, string>): Promise<IArticlesRO> {
    return this.articleService.findAll(+userId, query);
  }

  @ApiOperation({ summary: 'Get article feed' })
  @ApiResponse({ status: 200, description: 'Return article feed.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @Get('feed')
  async getFeed(@User('id') userId: number, @Query() query: Record<string, string>): Promise<IArticlesRO> {
    return this.articleService.findFeed(+userId, query);
  }

  @Get(':slug')
  async findOne(@User('id') userId: number, @Param('slug') slug: string): Promise<IArticleRO> {
    return this.articleService.findOne(userId, { slug });
  }

  @Get(':slug/comments')
  async findComments(@Param('slug') slug: string): Promise<ICommentsRO> {
    return this.articleService.findComments(slug);
  }

  @ApiOperation({ summary: 'Create article' })
  @ApiResponse({ status: 201, description: 'The article has been successfully created.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @Post()
  async create(@User('id') userId: number, @Body('article') articleData: CreateArticleDto) {
    return this.articleService.create(userId, articleData);
  }

  @ApiOperation({ summary: 'Update article' })
  @ApiResponse({ status: 201, description: 'The article has been successfully updated.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @Put(':slug')
  async update(
    @User('id') userId: number,
    @User('username') username: string,
    @Param() params: Record<string, string>,
    @Body('article') articleData: CreateArticleDto,
  ) {
    const article = await this.em.findOne(Article, { slug: params.slug });
    if (!article) {
      throw new HttpException({ message: 'Article not found' }, HttpStatus.NOT_FOUND);
    }
    const status = await this.lockService.checkLock(article.id);
    if (status.locked && status.lockedBy !== username) {
      throw new HttpException({ message: 'Locked' }, 423);
    }
    return this.articleService.update(+userId, params.slug, articleData);
  }

  @ApiOperation({ summary: 'Delete article' })
  @ApiResponse({ status: 201, description: 'The article has been successfully deleted.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @Delete(':slug')
  async delete(@Param() params: Record<string, string>) {
    return this.articleService.delete(params.slug);
  }

  @ApiOperation({ summary: 'Create comment' })
  @ApiResponse({ status: 201, description: 'The comment has been successfully created.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @Post(':slug/comments')
  async createComment(
    @User('id') user: number,
    @Param('slug') slug: string,
    @Body('comment') commentData: CreateCommentDto,
  ) {
    return this.articleService.addComment(user, slug, commentData);
  }

  @ApiOperation({ summary: 'Delete comment' })
  @ApiResponse({ status: 201, description: 'The article has been successfully deleted.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @Delete(':slug/comments/:id')
  async deleteComment(@User('id') user: number, @Param() params: Record<string, string>) {
    const { slug, id } = params;
    return this.articleService.deleteComment(+user, slug, +id);
  }

  @ApiOperation({ summary: 'Favorite article' })
  @ApiResponse({ status: 201, description: 'The article has been successfully favorited.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @Post(':slug/favorite')
  async favorite(@User('id') userId: number, @Param('slug') slug: string) {
    return this.articleService.favorite(userId, slug);
  }

  @ApiOperation({ summary: 'Unfavorite article' })
  @ApiResponse({ status: 201, description: 'The article has been successfully unfavorited.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @Delete(':slug/favorite')
  async unFavorite(@User('id') userId: number, @Param('slug') slug: string) {
    return this.articleService.unFavorite(userId, slug);
  }

  @Post(':slug/lock')
  async acquireArticleLock(@User('id') userId: number, @Param('slug') slug: string) {
    const article = await this.em.findOne(Article, { slug });
    if (!article) {
      throw new HttpException({ message: 'Article not found' }, HttpStatus.NOT_FOUND);
    }
    return this.lockService.acquireLock(article.id, userId);
  }

  @Delete(':slug/lock')
  async releaseArticleLock(@User('id') userId: number, @Param('slug') slug: string) {
    const article = await this.em.findOne(Article, { slug });
    if (!article) {
      throw new HttpException({ message: 'Article not found' }, HttpStatus.NOT_FOUND);
    }
    await this.lockService.releaseLock(article.id, userId);
    return { success: true };
  }

  @Put(':slug/lock/heartbeat')
  async heartbeatArticleLock(@User('id') userId: number, @Param('slug') slug: string) {
    const article = await this.em.findOne(Article, { slug });
    if (!article) {
      throw new HttpException({ message: 'Article not found' }, HttpStatus.NOT_FOUND);
    }
    const success = await this.lockService.updateHeartbeat(article.id, userId);
    return { success };
  }

  @Get(':slug/lock')
  async checkArticleLock(@Param('slug') slug: string) {
    console.log('[ArticleController.checkArticleLock] slug:', slug);
    const article = await this.em.findOne(Article, { slug });
    if (!article) {
      console.log('[ArticleController.checkArticleLock] Article not found for slug:', slug);
      throw new HttpException({ message: 'Article not found' }, HttpStatus.NOT_FOUND);
    }
    console.log('[ArticleController.checkArticleLock] article.id:', article.id);
    const result = await this.lockService.checkLock(article.id);
    console.log('[ArticleController.checkArticleLock] service result:', result);
    return result;
  }
}
