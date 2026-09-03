import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  JudgeAuthError,
  clearJudgeSession,
  getJudgeEntries,
  getStoredJudge,
  judgeLogin,
  submitJudgeScore,
} from '../lib/judgeAuth';
import type { JudgeEntry, JudgeProfile } from '../lib/judgeAuth';
import { HTTP_STATUS_UNAUTHORIZED } from '../lib/api.constants';
import styles from './JudgePage.module.css';

export default function JudgePage() {
  const [judge, setJudge] = useState<JudgeProfile | null>(() => getStoredJudge());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const [entries, setEntries] = useState<JudgeEntry[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!judge) return;
    let cancelled = false;
    getJudgeEntries()
      .then((data) => {
        if (cancelled) return;
        setEntries(data);
        setScoreInputs(
          Object.fromEntries(data.map((e) => [e.id, e.score === null ? '' : String(e.score)])),
        );
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof JudgeAuthError && err.status === HTTP_STATUS_UNAUTHORIZED) {
          clearJudgeSession();
          setJudge(null);
          return;
        }
        setLoadError('Не вдалося завантажити номери. Спробуйте оновити сторінку.');
      });
    return () => {
      cancelled = true;
    };
  }, [judge]);

  const total = entries?.length ?? 0;
  const done = useMemo(() => entries?.filter((e) => e.score !== null).length ?? 0, [entries]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoggingIn(true);
    try {
      const profile = await judgeLogin(email.trim(), password);
      setJudge(profile);
    } catch (err) {
      setLoginError(
        err instanceof JudgeAuthError ? err.message : 'Не вдалося увійти. Спробуйте ще раз.',
      );
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    clearJudgeSession();
    setJudge(null);
    setEntries(null);
  };

  const handleScoreChange = (id: string, raw: string) => {
    let next = raw;
    const v = parseFloat(raw);
    if (!Number.isNaN(v)) {
      if (v > 10) next = '10';
      else if (v < 1 && raw.length > 1) next = '1';
    }
    setScoreInputs((prev) => ({ ...prev, [id]: next }));
    setSubmitMessage(null);
  };

  const handleScoreBlur = async (id: string) => {
    const raw = scoreInputs[id];
    if (!raw) return;
    const value = parseFloat(raw);
    if (Number.isNaN(value)) return;

    setSavingId(id);
    try {
      await submitJudgeScore(id, value);
      setEntries((prev) => prev?.map((e) => (e.id === id ? { ...e, score: value } : e)) ?? prev);
    } catch {
      setSubmitMessage('Не вдалося зберегти оцінку. Спробуйте ще раз.');
    } finally {
      setSavingId(null);
    }
  };

  if (!judge) {
    return (
      <main className={styles.main}>
        <div className={styles.loginWrap}>
          <form className={styles.loginCard} onSubmit={handleLogin}>
            <p className={styles.eyebrow}>Кабінет судді</p>
            <h1>Вхід</h1>
            <p className={styles.loginLead}>
              Використайте email і тимчасовий пароль, які надіслав організатор.
            </p>
            {loginError && <p className={styles.error}>{loginError}</p>}
            <div className={styles.field}>
              <label htmlFor="j-email">Email</label>
              <input
                id="j-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="anna.judge@gmail.com"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="j-password">Пароль</label>
              <input
                id="j-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              className={`${styles.btn} ${styles.btnPrimary}`}
              style={{ width: '100%' }}
              disabled={loggingIn}
            >
              {loggingIn ? 'Вхід...' : 'Увійти'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.wrap}>
        <div className={styles.pageHead}>
          <div>
            <p className={styles.eyebrow}>Кабінет судді</p>
            <h1>{judge.competitionName}</h1>
            <p className={styles.metaLine}>Суддя: {judge.name}</p>
          </div>
          <div className={styles.spacer} />
          <button type="button" className={styles.btn} onClick={handleLogout}>
            Вийти
          </button>
        </div>

        {loadError && <p className={styles.status}>{loadError}</p>}

        {!loadError && entries === null && <p className={styles.status}>Завантаження...</p>}

        {!loadError && entries !== null && entries.length === 0 && (
          <p className={styles.status}>Заявок на цей конкурс ще немає.</p>
        )}

        {!loadError && entries !== null && entries.length > 0 && (
          <div className={styles.card}>
            <div className={styles.tableScroll}>
              <table>
                <thead>
                  <tr>
                    <th className={styles.cNo}>№</th>
                    <th className={styles.cTitle}>Назва номеру</th>
                    <th className={styles.cNom}>Номінація</th>
                    <th className={styles.cAge}>Вік. категорія</th>
                    <th className={styles.cLeague}>Ліга</th>
                    <th className={styles.cProg}>Програма</th>
                    <th className={styles.cCount}>К-сть уч.</th>
                    <th className={styles.cStudio}>Студія / хореограф</th>
                    <th className={styles.cScore}>Ваша оцінка (1–10)</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => {
                    const value = scoreInputs[e.id] ?? '';
                    return (
                      <tr key={e.id}>
                        <td className={styles.cNo}>{e.number}</td>
                        <td className={styles.cTitle}>{e.routineName}</td>
                        <td className={styles.cNom}>{e.nomination}</td>
                        <td className={styles.cAge}>{e.ageCategory || '—'}</td>
                        <td className={styles.cLeague}>{e.league || '—'}</td>
                        <td className={styles.cProg}>{e.program || '—'}</td>
                        <td className={styles.cCount}>{e.participantsCount ?? '—'}</td>
                        <td className={styles.cStudio}>
                          {[e.studioName, e.choreographer].filter(Boolean).join(' · ') || '—'}
                        </td>
                        <td className={styles.cScore}>
                          <input
                            className={`${styles.score} ${value ? styles.scoreFilled : ''}`}
                            type="number"
                            min={1}
                            max={10}
                            step={0.5}
                            value={value}
                            placeholder="—"
                            aria-label={`Оцінка за номер ${e.number}`}
                            disabled={savingId === e.id}
                            onChange={(ev) => handleScoreChange(e.id, ev.target.value)}
                            onBlur={() => handleScoreBlur(e.id)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className={styles.foot}>
              <span>
                Оцінено: <strong>{done}</strong> з <strong>{total}</strong>
              </span>
              <span className={styles.spacer} />
              {submitMessage ? (
                <span className={styles.submitMessage}>{submitMessage}</span>
              ) : (
                <span>Оцінки зберігаються автоматично.</span>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
