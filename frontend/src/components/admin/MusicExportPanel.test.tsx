import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
  onlineManager,
} from '@tanstack/react-query';
import MusicExportPanel from './MusicExportPanel';

const queueMusicExport = vi.fn();
const getMusicExportJob = vi.fn();

vi.mock('../../lib/musicExport', () => ({
  queueMusicExport: (...args: unknown[]) => queueMusicExport(...args),
  getMusicExportJob: (...args: unknown[]) => getMusicExportJob(...args),
}));

beforeEach(() => {
  queueMusicExport.mockReset();
  getMusicExportJob.mockReset();
});

// Reset focus/online back to their real defaults so these simulated
// transitions don't leak into other tests. onlineManager (unlike
// focusManager) has no browser-driven fallback — it stays at whatever
// was last passed in, so it must be reset to `true` explicitly.
afterEach(() => {
  focusManager.setFocused(undefined);
  onlineManager.setOnline(true);
});

async function startExportAndAwaitCompletion() {
  queueMusicExport.mockResolvedValue({ jobId: 'job-1' });
  getMusicExportJob.mockResolvedValue({
    status: 'completed',
    progress: 100,
    fileUrl: 'https://example.com/archive.zip',
    missing: [],
  });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MusicExportPanel competitionId="c1" canManage />
    </QueryClientProvider>,
  );

  fireEvent.click(screen.getByRole('button', { name: /Скачати архів музики/ }));

  const link = await screen.findByRole('link', { name: /Завантажити .zip/ });
  await waitFor(() => expect(getMusicExportJob).toHaveBeenCalledTimes(1));
  return link;
}

describe('MusicExportPanel — кешований завершений job', () => {
  it('не перезапитує job при поверненні фокусу вікна', async () => {
    const link = await startExportAndAwaitCompletion();
    getMusicExportJob.mockClear();

    // Force an actual blurred → focused transition — jsdom already reports
    // "focused" by default, so a bare focus event alone is a no-op.
    focusManager.setFocused(false);
    focusManager.setFocused(true);
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(getMusicExportJob).not.toHaveBeenCalled();
    expect(link).toHaveAttribute('href', 'https://example.com/archive.zip');
  });

  it('не перезапитує job при відновленні з\'єднання', async () => {
    const link = await startExportAndAwaitCompletion();
    getMusicExportJob.mockClear();

    // Force an actual offline → online transition — jsdom already reports
    // "online" by default, so a bare online event alone is a no-op.
    onlineManager.setOnline(false);
    onlineManager.setOnline(true);
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(getMusicExportJob).not.toHaveBeenCalled();
    expect(link).toHaveAttribute('href', 'https://example.com/archive.zip');
  });
});
