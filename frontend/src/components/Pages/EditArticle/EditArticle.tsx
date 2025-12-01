import React, { Fragment, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getArticle, updateArticle } from '../../../services/conduit';
import { store } from '../../../state/store';
import { useStore } from '../../../state/storeHooks';
import { ArticleEditor } from '../../ArticleEditor/ArticleEditor';
import { ContainerPage } from '../../ContainerPage/ContainerPage';
import { useLockManager } from '../../../hooks/useLockManager';
import { initializeEditor, loadArticle, startSubmitting, updateErrors } from '../../ArticleEditor/ArticleEditor.slice';

export function EditArticle() {
  const { slug } = useParams<{ slug: string }>();
  const { loading } = useStore(({ editor }) => editor);
  const { hasLock, lockError } = useLockManager(slug!);

  useEffect(() => {
    _loadArticle(slug!);
  }, [slug]);

  if (lockError) {
    return (
      <ContainerPage>
        <div className='col-md-10 offset-md-1 col-xs-12'>
          <div className='alert alert-warning'>{lockError}</div>
        </div>
      </ContainerPage>
    );
  }

  if (loading || !hasLock) {
    return (
      <ContainerPage>
        <div className='col-md-10 offset-md-1 col-xs-12'>
          <p>Acquiring edit lock...</p>
        </div>
      </ContainerPage>
    );
  }

  return <ArticleEditor onSubmit={onSubmit(slug!)} />;
}

async function _loadArticle(slug: string) {
  store.dispatch(initializeEditor());
  try {
    const { title, description, body, tagList, coAuthorEmails, author } = await getArticle(slug);

    const currentUser = store.getState().app.user;
    const normalized = (coAuthorEmails ?? []).map((e) => e.trim().toLowerCase());
    if (
      !currentUser ||
      (author.username !== currentUser.username && !normalized.includes(currentUser.email.toLowerCase()))
    ) {
      location.hash = '#/';
      return;
    }

    store.dispatch(loadArticle({ title, description, body, tagList, coAuthorEmails }));
  } catch {
    location.hash = '#/';
  }
}

function onSubmit(slug: string): (ev: React.FormEvent) => void {
  return async (ev) => {
    ev.preventDefault();

    store.dispatch(startSubmitting());

    const { article, coAuthorEmails } = store.getState().editor;

    const result = await updateArticle(slug, { ...article, coAuthorEmails });

    result.match({
      err: (errors) => store.dispatch(updateErrors(errors)),
      ok: ({ slug }) => {
        location.hash = `#/article/${slug}`;
      },
    });
  };
}
