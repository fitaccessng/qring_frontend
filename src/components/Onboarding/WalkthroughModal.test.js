import { beforeEach, describe, expect, it } from 'vitest';

import {
  WALKTHROUGH_STORAGE_KEY,
  clearWalkthroughStorage,
  shouldShowWalkthroughModal,
} from './WalkthroughModal';

describe('walkthrough modal gating', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
    localStorage.clear();
  });

  it('shows the modal when no completion state has been saved', () => {
    expect(shouldShowWalkthroughModal()).toBe(true);
  });

  it('hides the modal after completion unless reset is requested', () => {
    localStorage.setItem(WALKTHROUGH_STORAGE_KEY, JSON.stringify({ completed: true, ts: Date.now() }));

    expect(shouldShowWalkthroughModal()).toBe(false);
  });

  it('reopens the modal when a reset flag is present in the URL', () => {
    localStorage.setItem(WALKTHROUGH_STORAGE_KEY, JSON.stringify({ completed: true, ts: Date.now() }));
    window.history.pushState({}, '', '/?onboarding=reset');

    expect(shouldShowWalkthroughModal()).toBe(true);
  });

  it('removes the persisted completion state when reset is requested', () => {
    localStorage.setItem(WALKTHROUGH_STORAGE_KEY, JSON.stringify({ completed: true, ts: Date.now() }));

    clearWalkthroughStorage();

    expect(localStorage.getItem(WALKTHROUGH_STORAGE_KEY)).toBeNull();
  });
});
