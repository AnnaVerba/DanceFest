import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MentorCoachPicker from './MentorCoachPicker';
import { PHONE_INVALID_MESSAGE } from '../lib/validation.constants';

const getSelectableCoaches = vi.fn();

vi.mock('../lib/auth', () => ({
  getSelectableCoaches: (...args: unknown[]) => getSelectableCoaches(...args),
}));

beforeEach(() => {
  getSelectableCoaches.mockReset();
  getSelectableCoaches.mockResolvedValue([]);
});

function openNewCoachForm() {
  fireEvent.click(screen.getByRole('button', { name: /Додати вручну/ }));
}

describe('MentorCoachPicker — новий тренер', () => {
  it('не віддає нового тренера, поки телефон некоректний', () => {
    const onChange = vi.fn();
    render(<MentorCoachPicker onChange={onChange} />);
    openNewCoachForm();

    fireEvent.change(screen.getByPlaceholderText('Імʼя'), {
      target: { value: 'Петро' },
    });
    fireEvent.change(screen.getByPlaceholderText('Прізвище'), {
      target: { value: 'Іваненко' },
    });
    fireEvent.change(screen.getByPlaceholderText('Телефон'), {
      target: { value: '050123' },
    });

    expect(screen.getByText(PHONE_INVALID_MESSAGE)).toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('віддає нового тренера, коли телефон у форматі E.164', () => {
    const onChange = vi.fn();
    render(<MentorCoachPicker onChange={onChange} />);
    openNewCoachForm();

    fireEvent.change(screen.getByPlaceholderText('Імʼя'), {
      target: { value: 'Петро' },
    });
    fireEvent.change(screen.getByPlaceholderText('Прізвище'), {
      target: { value: 'Іваненко' },
    });
    fireEvent.change(screen.getByPlaceholderText('Телефон'), {
      target: { value: '+380501234567' },
    });

    expect(screen.queryByText(PHONE_INVALID_MESSAGE)).not.toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith({
      newCoach: {
        firstName: 'Петро',
        lastName: 'Іваненко',
        phone: '+380501234567',
      },
    });
  });
});
