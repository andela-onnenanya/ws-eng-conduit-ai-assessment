import React, { useEffect, useState } from 'react';
import { store } from '../../state/store';
import { useStore } from '../../state/storeHooks';
import { buildGenericFormField } from '../../types/genericFormField';
import { ContainerPage } from '../ContainerPage/ContainerPage';
import { GenericForm } from '../GenericForm/GenericForm';
import { getUsers } from '../../services/conduit';
import { addTag, EditorState, removeTag, updateField, setCoAuthorEmails } from './ArticleEditor.slice';

export function ArticleEditor({ onSubmit }: { onSubmit: (ev: React.FormEvent) => void }) {
  const { article, submitting, tag, coAuthorEmails, errors } = useStore(({ editor }) => editor);
  const [users, setUsers] = useState<Array<{ username: string; email: string; image?: string | null }>>([]);
  const currentUser = useStore(({ app }) => app.user);
  const selectableUsers = users.filter((u) => !currentUser || u.email.toLowerCase() !== currentUser.email.toLowerCase());

  useEffect(() => {
    let mounted = true;
    getUsers()
      .then((list) => {
        if (mounted) setUsers(list);
      })
      .catch(() => setUsers([]));
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className='editor-page'>
      <ContainerPage>
        <div className='col-md-10 offset-md-1 col-xs-12'>
          <div className='form-group'>
            <label>Co-authors</label>
            <select
              multiple
              className='form-control'
              value={coAuthorEmails}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
                store.dispatch(setCoAuthorEmails(selected));
              }}
            >
              {selectableUsers.map((u) => (
                <option key={u.email} value={u.email}>
                  {u.username} ({u.email})
                </option>
              ))}
            </select>
            <small className='text-muted'>Hold Ctrl/Cmd to select multiple</small>
          </div>
          <GenericForm
            formObject={{ ...article, tag } as unknown as Record<string, string | null>}
            disabled={submitting}
            errors={errors}
            onChange={onUpdateField}
            onSubmit={onSubmit}
            submitButtonText='Publish Article'
            onAddItemToList={onAddTag}
            onRemoveListItem={onRemoveTag}
            fields={[
              buildGenericFormField({ name: 'title', placeholder: 'Article Title' }),
              buildGenericFormField({ name: 'description', placeholder: "What's this article about?", lg: false }),
              buildGenericFormField({
                name: 'body',
                placeholder: 'Write your article (in markdown)',
                fieldType: 'textarea',
                rows: 8,
                lg: false,
              }),
              buildGenericFormField({
                name: 'tag',
                placeholder: 'Enter the tag name and press enter',
                listName: 'tagList',
                fieldType: 'list',
                lg: false,
              }),
            ]}
          />
        </div>
      </ContainerPage>
    </div>
  );
}

function onUpdateField(name: string, value: string) {
  store.dispatch(updateField({ name: name as keyof EditorState['article'] | 'tag', value }));
}

function onAddTag() {
  store.dispatch(addTag());
}

function onRemoveTag(_: string, index: number) {
  store.dispatch(removeTag(index));
}
