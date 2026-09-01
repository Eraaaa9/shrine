import { useLang } from '../lang';
import { eventIcon, eventName, eventText } from '../../shared/i18n';
import type { CityEventId } from '../../shared/events';

interface Props {
  eventId: CityEventId | null;
  round: number;
}

export default function EventBanner({ eventId, round }: Props) {
  const { lang, t } = useLang();

  if (!eventId) return null;

  const icon = eventIcon(eventId);
  const name = eventName(lang, eventId);
  const text = eventText(lang, eventId);

  return (
    <div className="event-banner" role="region" aria-label={t('ui.eventsName')}>
      <div className="event-banner-badge">
        <span className="event-banner-round">{t('ui.roundEvent', { round, event: '' }).trim()}</span>
      </div>
      <div className="event-banner-main">
        <span className="event-banner-icon" aria-hidden="true">{icon}</span>
        <div className="event-banner-content">
          <div className="event-banner-title">{name}</div>
          <div className="event-banner-desc">{text}</div>
        </div>
      </div>
    </div>
  );
}
