import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RegisterPage from './RegisterPage';
import {
  EMAIL_INVALID_MESSAGE,
  NAME_INVALID_MESSAGE,
  PHONE_INVALID_MESSAGE,
} from '../lib/validation.constants';

const register = vi.fn();
const saveSession = vi.fn();

vi.mock('../lib/auth', () => ({
  AuthError: class AuthError extends Error {},
  register: (...args: unknown[]) => register(...args),
  saveSession: (...args: unknown[]) => saveSession(...args),
}));

function renderPage() {
  const utils = render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  );
  return {
    ...utils,
    phoneInput: utils.container.querySelector(
      'input[type="tel"]',
    ) as HTMLInputElement,
  };
}

function setValue(label: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function fillEverythingValid(phoneInput: HTMLInputElement) {
  setValue(/Ім/, 'Іван');
  setValue(/Прізвище/, 'Іванов');
  setValue(/Email/, 'ivan@example.com');
  setValue(/Дата народження/, '2010-05-20');
  setValue(/^Пароль$/, 'secret123');
  setValue(/Повторіть пароль/, 'secret123');
  fireEvent.change(phoneInput, { target: { value: '+380501234567' } });
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: /Зареєструватися/ }));
}

beforeEach(() => {
  register.mockReset();
  saveSession.mockReset();
});

describe('RegisterPage validation', () => {
  it('блокує реєстрацію з некоректним телефоном', async () => {
    const { phoneInput } = renderPage();
    fillEverythingValid(phoneInput);
    fireEvent.change(phoneInput, { target: { value: '+38050' } });

    submit();

    expect(await screen.findByText(PHONE_INVALID_MESSAGE)).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it('блокує реєстрацію, коли email без домену верхнього рівня', async () => {
    // Passes the browser's type="email" check, fails our stricter rule.
    const { phoneInput } = renderPage();
    fillEverythingValid(phoneInput);
    setValue(/Email/, 'user@localhost');

    submit();

    expect(await screen.findByText(EMAIL_INVALID_MESSAGE)).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it('блокує реєстрацію з порожнім імʼям', async () => {
    const { phoneInput } = renderPage();
    fillEverythingValid(phoneInput);
    setValue(/Ім/, ' ');

    submit();

    expect(await screen.findByText(NAME_INVALID_MESSAGE)).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it('надсилає запит, коли всі поля коректні', async () => {
    register.mockResolvedValue({
      accessToken: 'a',
      refreshToken: 'r',
      profile: { id: '1', accessLevel: 'PARTICIPANT' },
    });
    const { phoneInput } = renderPage();
    fillEverythingValid(phoneInput);

    submit();

    await waitFor(() => expect(register).toHaveBeenCalledTimes(1));
    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: 'Іван',
        lastName: 'Іванов',
        phone: '+380501234567',
        email: 'ivan@example.com',
        birthDate: '2010-05-20',
      }),
    );
  });
});
