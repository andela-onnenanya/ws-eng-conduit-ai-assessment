import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ArticleForEditor } from '../../types/article';
import * as R from 'ramda';
import { GenericErrors } from '../../types/error';

export interface EditorState {
  article: ArticleForEditor;
  tag: string;
  coAuthorEmails: string[];
  submitting: boolean;
  errors: GenericErrors;
  loading: boolean;
}

const initialState: EditorState = {
  article: { title: '', body: '', tagList: [], description: '' },
  tag: '',
  coAuthorEmails: [],
  submitting: false,
  errors: {},
  loading: true,
};

const slice = createSlice({
  name: 'editor',
  initialState,
  reducers: {
    initializeEditor: () => initialState,
    updateField: (
      state,
      {
        payload: { name, value },
      }: PayloadAction<{ name: keyof EditorState['article'] | 'tag' | 'coAuthorEmails'; value: string }>,
    ) => {
      if (name === 'tag') {
        state.tag = value;
        return;
      }


      if (name !== 'tagList' && name !== 'coAuthorEmails') {
        // handle only string fields of the article payload explicitly to keep types strict
        switch (name) {
          case 'title':
            state.article.title = value;
            return;
          case 'description':
            state.article.description = value;
            return;
          case 'body':
            state.article.body = value;
            return;
          default:
            // ignore other keys
            return;
        }
      }
    },
    updateErrors: (state, { payload: errors }: PayloadAction<GenericErrors>) => {
      state.errors = errors;
      state.submitting = false;
    },
    startSubmitting: (state) => {
      state.submitting = true;
    },
    addTag: (state) => {
      if (state.tag.length > 0) {
        state.article.tagList.push(state.tag);
        state.tag = '';
      }
    },
    removeTag: (state, { payload: index }: PayloadAction<number>) => {
      state.article.tagList = R.remove(index, 1, state.article.tagList);
    },
    setCoAuthorEmails: (state, { payload }: PayloadAction<string[]>) => {
      state.coAuthorEmails = payload;
    },
    loadArticle: (state, { payload: article }: PayloadAction<ArticleForEditor>) => {
      state.article = article;
      state.coAuthorEmails = article.coAuthorEmails ?? [];
      state.loading = false;
    },
  },
});

export const { initializeEditor, updateField, startSubmitting, addTag, removeTag, setCoAuthorEmails, updateErrors, loadArticle } =
  slice.actions;

export default slice.reducer;
