'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { loginAction, registerAction, type ActionState } from '@/app/actions';
import { ThemeToggle } from './theme-toggle';

const initialState: ActionState = {};

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const action = mode === 'login' ? loginAction : registerAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <div className="auth-wrap">
      <div className="panel auth-card stack">
        <div className="spread">
          <span className="brand">
            <span className="brand-mark" aria-hidden="true">
              C
            </span>
            Catchup
          </span>
          <ThemeToggle />
        </div>

        <div>
          <h1>{mode === 'login' ? 'Welcome back' : 'Create your library'}</h1>
          <p className="muted">
            {mode === 'login'
              ? 'Sign in to reach everything you saved.'
              : 'One place for every link you meant to come back to.'}
          </p>
        </div>

        <form action={formAction} className="stack" noValidate>
          {state.error ? (
            <p className="form-error" role="alert">
              {state.error}
            </p>
          ) : null}

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="input"
              placeholder="you@example.com"
              aria-describedby={state.fieldErrors?.Email ? 'email-error' : undefined}
            />
            {state.fieldErrors?.Email ? (
              <span id="email-error" className="field-error">
                {state.fieldErrors.Email.join(' ')}
              </span>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={mode === 'register' ? 8 : undefined}
              className="input"
              placeholder={mode === 'register' ? 'At least 8 characters' : '••••••••'}
              aria-describedby={state.fieldErrors?.Password ? 'password-error' : undefined}
            />
            {state.fieldErrors?.Password ? (
              <span id="password-error" className="field-error">
                {state.fieldErrors.Password.join(' ')}
              </span>
            ) : null}
          </div>

          <button type="submit" className="button button-primary" disabled={pending}>
            {pending ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="muted">
          {mode === 'login' ? (
            <>
              No account yet? <Link href="/register">Create one</Link>
            </>
          ) : (
            <>
              Already have an account? <Link href="/login">Sign in</Link>
            </>
          )}
        </p>

        <p className="muted" style={{ fontSize: '0.8rem' }}>
          By continuing you agree to the <Link href="/terms">terms</Link> and{' '}
          <Link href="/privacy">privacy policy</Link>.
        </p>
      </div>
    </div>
  );
}
