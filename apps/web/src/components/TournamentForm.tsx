import { DISCIPLINE_LABELS_RU, Discipline, ParticipationFormat, ScoringMode, TournamentLevel, type UpsertTournament } from '@sindikat/domain';

const LEVELS: Record<TournamentLevel, string> = { SPRINT: 'Sprint', QUALIFIER: 'Qualifier', OPEN: 'Open', MAJOR: 'Major', GRAND_FINAL: 'Grand Final' };
const SCORING: Record<ScoringMode, string> = { LENGTH_SUM: 'сумма длин N рыб', TOTAL_WEIGHT: 'общий вес', DUEL_POINTS: 'дуэли (форель)', PLACE_SUM: 'сумма мест по турам', BIGGEST_FISH: 'одна самая крупная рыба' };
const FORMATS: Record<ParticipationFormat, string> = { SOLO: 'личный', PAIR: 'парный', TEAM: 'командный', CREW: 'экипаж' };

/** datetime-local ожидает локальное время без зоны; храним UTC → показываем по Москве. */
const toLocal = (iso?: string | null) => (iso ? new Date(new Date(iso).getTime() + 3 * 3600_000).toISOString().slice(0, 16) : '');

type Initial = Partial<UpsertTournament> & { id?: string };

export function TournamentForm({ initial, action, submitLabel }: { initial?: Initial; action: (fd: FormData) => Promise<void>; submitLabel: string }) {
  const i = initial ?? {};
  return (
    <form action={action} className="form card">
      <label>название<input name="title" defaultValue={i.title} required minLength={3} className="input" /></label>
      <label>описание<textarea name="description" defaultValue={i.description ?? ''} className="textarea" /></label>
      <div className="row">
        <label>дисциплина
          <select name="discipline" defaultValue={i.discipline ?? 'STREET'} className="select">
            {Object.values(Discipline).map((d) => <option key={d} value={d}>{DISCIPLINE_LABELS_RU[d]}</option>)}
          </select>
        </label>
        <label>уровень
          <select name="level" defaultValue={i.level ?? 'SPRINT'} className="select">
            {Object.values(TournamentLevel).map((l) => <option key={l} value={l}>{LEVELS[l]}</option>)}
          </select>
        </label>
      </div>
      <div className="row">
        <label>зачёт
          <select name="scoringMode" defaultValue={i.scoringMode ?? 'LENGTH_SUM'} className="select">
            {Object.values(ScoringMode).map((m) => <option key={m} value={m}>{SCORING[m]}</option>)}
          </select>
        </label>
        <label>форматы участия
          <div>
            {Object.values(ParticipationFormat).map((f) => (
              <span key={f} className="check"><input type="checkbox" name="formats" value={f} defaultChecked={(i.formats ?? ['SOLO', 'PAIR']).includes(f)} />{FORMATS[f]}</span>
            ))}
          </div>
        </label>
      </div>
      <div className="row">
        <label>ёмкость, участников<input name="capacity" type="number" min={2} max={500} defaultValue={i.capacity ?? 40} required className="input" /></label>
        <label>взнос, ₽ (0 — бесплатно)<input name="entryFee" type="number" min={0} step={50} defaultValue={i.entryFeeMinor !== undefined && i.entryFeeMinor !== null ? i.entryFeeMinor / 100 : 0} className="input" /></label>
      </div>
      <div className="row">
        <label>старт (МСК)<input name="startsAt" type="datetime-local" defaultValue={toLocal(i.startsAt)} required className="input" /></label>
        <label>финиш (МСК)<input name="endsAt" type="datetime-local" defaultValue={toLocal(i.endsAt)} required className="input" /></label>
      </div>
      <div className="row">
        <label>открытие регистрации<input name="registrationOpensAt" type="datetime-local" defaultValue={toLocal(i.registrationOpensAt)} className="input" /></label>
        <label>закрытие регистрации<input name="registrationClosesAt" type="datetime-local" defaultValue={toLocal(i.registrationClosesAt)} className="input" /></label>
      </div>
      <div className="row">
        <label>резервная дата<input name="reserveDate" type="datetime-local" defaultValue={toLocal(i.reserveDate)} className="input" /></label>
        <label>окно протестов после финиша, мин<input name="protestDeadlineMinutes" type="number" min={0} max={240} defaultValue={i.protestDeadlineMinutes ?? 30} className="input" /></label>
      </div>
      <h2 style={{ marginTop: 8 }}>Локация и сбор</h2>
      <div className="row">
        <label>площадка<input name="loc.title" defaultValue={i.location?.title} required className="input" placeholder="Лужнецкая набережная" /></label>
        <label>точный адрес<input name="loc.address" defaultValue={i.location?.address} required className="input" /></label>
      </div>
      <div className="row">
        <label>точка регистрации<input name="loc.meetingPoint" defaultValue={i.location?.meetingPoint ?? ''} className="input" /></label>
        <label>парковка<input name="loc.parking" defaultValue={i.location?.parking ?? ''} className="input" /></label>
      </div>
      <h2 style={{ marginTop: 8 }}>Тайминг</h2>
      <p className="muted" style={{ margin: 0 }}>По одной строке: <code>09:00 регистрация и выдача маркеров</code>. Время — по Москве в день старта.</p>
      <textarea name="schedule" className="textarea" defaultValue={(i.schedule ?? []).map((s) => `${toLocal(s.at).slice(11)} ${s.title}`).join('\n')} placeholder={'08:00 регистрация\n09:00 старт тура\n12:00 финиш\n13:00 награждение'} />
      <div><button className="btn" type="submit">{submitLabel}</button></div>
    </form>
  );
}

/** FormData → UpsertTournament (datetime-local интерпретируем как МСК → UTC). */
export function parseTournamentForm(fd: FormData): UpsertTournament {
  const s = (k: string) => String(fd.get(k) ?? '').trim();
  const dt = (k: string) => (s(k) ? new Date(`${s(k)}:00+03:00`).toISOString() : null);
  const startsAt = dt('startsAt')!;
  const day = s('startsAt').slice(0, 10);
  const schedule = s('schedule')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [time, ...rest] = l.split(/\s+/);
      return { at: new Date(`${day}T${time}:00+03:00`).toISOString(), title: rest.join(' ') };
    });
  const fee = Number(s('entryFee') || 0);
  return {
    title: s('title'),
    description: s('description') || null,
    discipline: s('discipline') as Discipline,
    level: s('level') as TournamentLevel,
    scoringMode: s('scoringMode') as ScoringMode,
    formats: fd.getAll('formats').map(String) as ParticipationFormat[],
    capacity: Number(s('capacity')),
    entryFeeMinor: fee > 0 ? Math.round(fee * 100) : null,
    startsAt,
    endsAt: dt('endsAt')!,
    reserveDate: dt('reserveDate'),
    registrationOpensAt: dt('registrationOpensAt'),
    registrationClosesAt: dt('registrationClosesAt'),
    protestDeadlineMinutes: Number(s('protestDeadlineMinutes') || 30),
    location: { title: s('loc.title'), address: s('loc.address'), meetingPoint: s('loc.meetingPoint') || null, parking: s('loc.parking') || null },
    schedule,
  };
}
