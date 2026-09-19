import type { UpsertRules } from '@sindikat/domain';

type Initial = Partial<UpsertRules> & { version?: number };

export function RulesForm({ initial, action }: { initial?: Initial; action: (fd: FormData) => Promise<void> }) {
  const i = initial ?? {};
  const lines = (a?: string[]) => (a ?? []).join('\n');
  return (
    <form action={action} className="form card">
      <p className="muted" style={{ margin: 0 }}>Каждое сохранение создаёт новую версию регламента{i.version ? ` (текущая — v${i.version})` : ''}. Участники видят только опубликованную.</p>
      <div className="row">
        <label>разрешено (по строке)<textarea name="allowedTackle" className="textarea" defaultValue={lines(i.allowedTackle)} /></label>
        <label>запрещено (по строке)<textarea name="forbiddenTackle" className="textarea" defaultValue={lines(i.forbiddenTackle)} /></label>
      </div>
      <label>зачёт<input name="scoringSummary" className="input" required defaultValue={i.scoringSummary} placeholder="Сумма длины 5 лучших рыб, не более 3 одного вида" /></label>
      <label>фиксация<input name="fixationSummary" className="input" required defaultValue={i.fixationSummary} placeholder="Фото на официальной линейке с маркером, немедленный выпуск" /></label>
      <label>штрафы (по строке)<textarea name="penalties" className="textarea" defaultValue={lines(i.penalties)} /></label>
      <div className="row">
        <label>рыб в зачёте<input name="fishCount" type="number" min={1} max={20} className="input" defaultValue={i.scoringParams?.fishCount ?? 5} /></label>
        <label>не более одного вида (пусто — без лимита)<input name="maxPerSpecies" type="number" min={1} max={20} className="input" defaultValue={i.scoringParams?.maxPerSpecies ?? ''} /></label>
      </div>
      <div>
        <span className="check"><input type="checkbox" name="publish" defaultChecked />опубликовать сразу</span>
        <button className="btn" type="submit">сохранить версию регламента</button>
      </div>
    </form>
  );
}

export function parseRulesForm(fd: FormData): UpsertRules {
  const s = (k: string) => String(fd.get(k) ?? '').trim();
  const list = (k: string) => s(k).split('\n').map((l) => l.trim()).filter(Boolean);
  return {
    allowedTackle: list('allowedTackle'),
    forbiddenTackle: list('forbiddenTackle'),
    scoringSummary: s('scoringSummary'),
    fixationSummary: s('fixationSummary'),
    penalties: list('penalties'),
    scoringParams: { fishCount: Number(s('fishCount') || 5), maxPerSpecies: s('maxPerSpecies') ? Number(s('maxPerSpecies')) : null },
    publish: fd.get('publish') === 'on',
  };
}
