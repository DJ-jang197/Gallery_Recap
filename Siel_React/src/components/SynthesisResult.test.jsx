import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SynthesisResult from './SynthesisResult';

describe('SynthesisResult', () => {
  it('renders loading overlay and messages when isLoading', () => {
    render(
      <SynthesisResult
        content=""
        onComplete={vi.fn()}
        onRegenerate={vi.fn()}
        onBack={vi.fn()}
        isLoading
      />
    );
    expect(screen.getByRole('textbox').disabled).toBe(true);
    expect(screen.getByText(/Siel is leafing through your memories/i)).toBeDefined();
  });

  it('shows generated content when not loading', () => {
    render(
      <SynthesisResult
        content="Here is your journal entry."
        onComplete={vi.fn()}
        onRegenerate={vi.fn()}
        onBack={vi.fn()}
        isLoading={false}
      />
    );
    expect(screen.getByRole('textbox').value).toBe('Here is your journal entry.');
  });
});
