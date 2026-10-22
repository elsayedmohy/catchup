'use client';

import { useActionState, useEffect, useRef } from 'react';
import { createItemAction, type ActionState } from '@/app/actions';

const initialState: ActionState = {};

export function SaveForm() {
  const [state, formAction, pending] = useActionState(createItemAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the input after a successful save.
  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="stack-sm">
      <div className="row" style={{ flexWrap: 'nowrap' }}>
        <label htmlFor="url" className="visually-hidden">
          Link to save
        </label>
        <input
          id="url"
          name="url"
          type="url"
          required
          className="input"
          placeholder="Paste a link to save…"
          autoComplete="off"
        />
        <button type="submit" className="button button-primary" disabled={pending}>
          {pending ? 'Saving…' : 'Save'}
        </button>
      </div>
      {state.error ? (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
