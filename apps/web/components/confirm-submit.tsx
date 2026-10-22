'use client';

import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react';

interface ConfirmSubmitProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Short prompt shown in place of the button once the user starts confirming. */
  message: string;
  /** Label for the final confirming action. Defaults to the button's children. */
  confirmLabel?: string;
  children: ReactNode;
}

/**
 * Two-step, inline confirmation. The first click swaps the button for a short
 * prompt plus Confirm/Cancel controls; the second click submits the surrounding
 * form. This avoids native modal dialogs for a routine destructive action.
 */
export function ConfirmSubmit({
  message,
  confirmLabel,
  children,
  className,
  ...props
}: ConfirmSubmitProps) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        className={className}
        {...props}
        onClick={(event) => {
          props.onClick?.(event);
          if (!event.defaultPrevented) setConfirming(true);
        }}
      >
        {children}
      </button>
    );
  }

  return (
    <span className="row" style={{ gap: 'var(--space-2)' }}>
      <span className="muted" role="status">
        {message}
      </span>
      <button type="submit" className={className ?? 'button button-danger'}>
        {confirmLabel ?? 'Confirm'}
      </button>
      <button type="button" className="button button-ghost" onClick={() => setConfirming(false)}>
        Cancel
      </button>
    </span>
  );
}
