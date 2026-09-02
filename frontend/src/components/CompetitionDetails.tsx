import { getCompetitionStatus } from '../lib/competitions';
import type { Competition } from '../lib/competitions';
import styles from './CompetitionDetails.module.css';

interface CompetitionDetailsProps {
  competition: Competition;
  entriesCount: number | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateRange(dateFrom: string, dateTo: string): string {
  return dateFrom === dateTo
    ? `${formatDate(dateFrom)} р.`
    : `${formatDate(dateFrom)} – ${formatDate(dateTo)} р.`;
}

export default function CompetitionDetails({
  competition,
  entriesCount,
}: CompetitionDetailsProps) {
  const payment = competition.paymentDetails ?? null;

  return (
    <>
      <section className={styles.section}>
        <div className={`${styles.grid} ${styles.grid3}`}>
          <div className={styles.item}>
            <div className={styles.itemLabel}>Статус</div>
            <div className={styles.itemValue}>
              {getCompetitionStatus(competition)}
            </div>
          </div>
          <div className={styles.item}>
            <div className={styles.itemLabel}>Дата</div>
            <div className={styles.itemValue}>
              {formatDateRange(competition.dateFrom, competition.dateTo)}
            </div>
          </div>
          <div className={styles.item}>
            <div className={styles.itemLabel}>Місце</div>
            <div className={styles.itemValue}>{competition.location || '—'}</div>
          </div>
          <div className={styles.item}>
            <div className={styles.itemLabel}>Організатор</div>
            <div className={styles.itemValue}>{competition.organizer || '—'}</div>
          </div>
          <div className={styles.item}>
            <div className={styles.itemLabel}>Реєстрація</div>
            <div className={styles.itemValue}>
              {formatDateRange(
                competition.registrationFrom,
                competition.registrationTo,
              )}
            </div>
          </div>
          {entriesCount !== null && (
            <div className={styles.item}>
              <div className={styles.itemLabel}>Заявок подано</div>
              <div className={styles.itemValue}>{entriesCount}</div>
            </div>
          )}
        </div>
        {competition.description && (
          <p className={styles.description}>{competition.description}</p>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Контакти</h2>
        <div className={`${styles.grid} ${styles.grid2}`}>
          <div className={styles.item}>
            <div className={styles.itemLabel}>Телефон</div>
            <div className={styles.itemValue}>
              {competition.contactNumber ? (
                <a href={`tel:${competition.contactNumber}`}>
                  {competition.contactNumber}
                </a>
              ) : (
                '—'
              )}
            </div>
          </div>
          <div className={styles.item}>
            <div className={styles.itemLabel}>Email</div>
            <div className={styles.itemValue}>
              {competition.contactEmail ? (
                <a href={`mailto:${competition.contactEmail}`}>
                  {competition.contactEmail}
                </a>
              ) : (
                '—'
              )}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Реквізити для оплати</h2>
        {payment ? (
          <>
            <p className={styles.sectionNote}>
              Оплата приймається лише переказом за реквізитами, без оплати через
              застосунок.
            </p>
            <div className={`${styles.grid} ${styles.grid2}`}>
              <div className={styles.item}>
                <div className={styles.itemLabel}>Отримувач</div>
                <div className={styles.itemValue}>{payment.beneficiary}</div>
              </div>
              <div className={styles.item}>
                <div className={styles.itemLabel}>Картка / IBAN</div>
                <div className={styles.itemValue}>{payment.account}</div>
              </div>
              {payment.bankName && (
                <div className={styles.item}>
                  <div className={styles.itemLabel}>Банк</div>
                  <div className={styles.itemValue}>{payment.bankName}</div>
                </div>
              )}
              {payment.taxId && (
                <div className={styles.item}>
                  <div className={styles.itemLabel}>ЄДРПОУ / ІПН</div>
                  <div className={styles.itemValue}>{payment.taxId}</div>
                </div>
              )}
            </div>
            {payment.destination && (
              <div className={styles.grid} style={{ marginTop: 20 }}>
                <div className={styles.item}>
                  <div className={styles.itemLabel}>Призначення платежу</div>
                  <div className={styles.itemValue}>{payment.destination}</div>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className={styles.sectionNote}>
            Організатор не вказав реквізити для оплати.
          </p>
        )}
      </section>
    </>
  );
}
