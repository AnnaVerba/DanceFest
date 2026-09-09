import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CoachRoster from './CoachRoster';

const createParticipant = vi.fn();
const getParticipants = vi.fn();

vi.mock('../lib/participants', () => ({
  createParticipant: (...args: unknown[]) => createParticipant(...args),
  getParticipants: (...args: unknown[]) => getParticipants(...args),
}));

beforeEach(() => {
  createParticipant.mockReset();
  getParticipants.mockReset();
  getParticipants.mockResolvedValue([]);
});

async function openForm() {
  const utils = render(<CoachRoster />);
  await waitFor(() => expect(getParticipants).toHaveBeenCalled());
  fireEvent.click(screen.getByRole('button', { name: /Додати/ }));
  return utils;
}

function saveButton() {
  return screen.getByRole('button', { name: /Зберегти/ });
}

describe('CoachRoster — додавання учасника', () => {
  it('тримає кнопку "Зберегти" неактивною, поки дані некоректні', async () => {
    const { container } = await openForm();

    expect(saveButton()).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('Імʼя'), {
      target: { value: 'Іван' },
    });
    fireEvent.change(screen.getByPlaceholderText('Прізвище'), {
      target: { value: 'Іванов' },
    });
    // Incomplete phone — still invalid.
    const tel = container.querySelector('input[type="tel"]') as HTMLInputElement;
    fireEvent.change(tel, { target: { value: '+38050' } });
    fireEvent.change(container.querySelector('input[type="date"]')!, {
      target: { value: '2012-03-10' },
    });

    expect(saveButton()).toBeDisabled();
  });

  it('активує "Зберегти" і надсилає запит, коли всі поля коректні', async () => {
    createParticipant.mockResolvedValue({
      id: '1',
      firstName: 'Іван',
      lastName: 'Іванов',
      phone: '+380501234567',
      birthDate: '2012-03-10',
      hasPassword: false,
    });
    const { container } = await openForm();

    fireEvent.change(screen.getByPlaceholderText('Імʼя'), {
      target: { value: 'Іван' },
    });
    fireEvent.change(screen.getByPlaceholderText('Прізвище'), {
      target: { value: 'Іванов' },
    });
    const tel = container.querySelector('input[type="tel"]') as HTMLInputElement;
    fireEvent.change(tel, { target: { value: '+380501234567' } });
    fireEvent.change(container.querySelector('input[type="date"]')!, {
      target: { value: '2012-03-10' },
    });

    expect(saveButton()).toBeEnabled();

    fireEvent.click(saveButton());
    await waitFor(() => expect(createParticipant).toHaveBeenCalledTimes(1));
    expect(createParticipant).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: 'Іван',
        lastName: 'Іванов',
        phone: '+380501234567',
        birthDate: '2012-03-10',
      }),
    );
  });
});
