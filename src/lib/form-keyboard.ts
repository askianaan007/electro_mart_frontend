import type { KeyboardEvent } from 'react';

/**
 * Phone keyboards: Enter ("Next") in a box marked `data-step` jumps to the
 * following one instead of submitting; Enter in the last one submits.
 * Attach as the form's onKeyDown.
 */
export function focusNextOnEnter(event: KeyboardEvent<HTMLFormElement>) {
  if (event.key !== 'Enter' || !(event.target instanceof HTMLInputElement)) return;
  const boxes = Array.from(event.currentTarget.querySelectorAll<HTMLInputElement>('input[data-step]:not(:disabled)'));
  const index = boxes.indexOf(event.target);
  if (index >= 0 && index < boxes.length - 1) {
    event.preventDefault();
    boxes[index + 1].focus();
  }
}
