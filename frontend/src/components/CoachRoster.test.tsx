import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CoachRoster from './CoachRoster';
import { PHONE_INVALID_MESSAGE } from '../lib/validation.constants';

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
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <CoachRoster />
    </QueryClientProvider>,
  );
  await waitFor(() => expect(getParticipants).toHaveBeenCalled());
  fireEvent.click(screen.getByRole('button', { name: /Додати/ }));
  return utils;
}

function saveButton() {
  return screen.getByRole('button', { name: /Зберегти/ });
}

describe('CoachRoster — додавання учасника', () => {
  it('показує помилку телефону при спробі зберегти з некоректним номером', async () => {
    const { container } = await openForm();

    fireEvent.change(screen.getByPlaceholderText('Імʼя'), {
      target: { value: 'Іван' },
    });
    fireEvent.change(screen.getByPlaceholderText('Прізвище'), {
      target: { value: 'Іванов' },
    });
    // Incomplete phone — invalid.
    const tel = container.querySelector('input[type="tel"]') as HTMLInputElement;
    fireEvent.change(tel, { target: { value: '+38050' } });
    fireEvent.change(container.querySelector('input[type="date"]')!, {
      target: { value: '2012-03-10' },
    });

    fireEvent.click(saveButton());

    expect(await screen.findByText(PHONE_INVALID_MESSAGE)).toBeInTheDocument();
    expect(createParticipant).not.toHaveBeenCalled();
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
