import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import Survey from './Survey';

// In-memory localStorage stub so cadence logic can be tested deterministically.
const localStorageMock = (function() {
  let store = {};
  return {
    getItem(key) {
      return store[key] || null;
    },
    setItem(key, value) {
      store[key] = value.toString();
    },
    clear() {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('Survey Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders Bi-Weekly prompt when cadence is biweekly', () => {
    localStorage.setItem('siel_cadence', 'biweekly');
    render(<Survey />);
    
    // Using string matching for the prompt
    expect(screen.getByText('How would you describe your last two weeks?')).toBeDefined();
  });

  it('renders Monthly prompt when cadence is monthly', async () => {
    localStorage.setItem('siel_cadence', 'monthly');
    render(<Survey />);
    
    // `Survey` updates cadence in a `useEffect`, so wait for the monthly label.
    expect(
      await screen.findByText('How would you describe your last month?')
    ).toBeDefined();
  });
});
