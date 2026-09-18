import { FormEvent, useEffect, useMemo, useState } from 'react';
import { loadAnnotations, loadComments, loadProgress, login, logout, saveAnnotation } from './api';
import { Annotation, Comment, Label, Period, Progress, User } from './types';

const labels: Label[] = ['Favorável', 'Contrário', 'Neutro'];

function App() {
  const [user, setUser] = useState<User | null>(() => {
    const stored = sessionStorage.getItem('user');
    return stored ? (JSON.parse(stored) as User) : null;
  });

  if (!user) {
    return <Login onLogin={(nextUser) => setUser(nextUser)} />;
  }
  return <AnnotationWorkspace user={user} onLogout={() => setUser(null)} />;
}

function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(name, password);
      sessionStorage.setItem('access_token', result.tokens.accessToken);
      sessionStorage.setItem('refresh_token', result.tokens.refreshToken);
      sessionStorage.setItem('user', JSON.stringify(result.user));
      onLogin(result.user);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Falha no login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand-mark">A</div>
        <p className="eyebrow">TCC Aviator Annotation</p>
        <h1>Entre para iniciar suas anotações</h1>
        <p className="muted">Cada avaliador trabalha de forma independente.</p>
        <form onSubmit={submit}>
          <label>
            Avaliador
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Avaliador 1" required />
          </label>
          <label>
            Senha
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="primary-button" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
        </form>
      </section>
    </main>
  );
}

function AnnotationWorkspace({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [annotations, setAnnotations] = useState<Map<number, Annotation>>(new Map());
  const [progress, setProgress] = useState<Progress | null>(null);
  const [period, setPeriod] = useState<'todos' | Period>('todos');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    Promise.all([loadComments(), loadAnnotations(), loadProgress()])
      .then(([loadedComments, loadedAnnotations, loadedProgress]) => {
        setComments(loadedComments);
        setAnnotations(new Map(loadedAnnotations.map((annotation) => [annotation.comment_id, annotation])));
        setProgress(loadedProgress);
        if (loadedComments.length) setSelectedId(loadedComments[0].id);
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'Erro ao carregar dados'))
      .finally(() => setLoading(false));
  }, []);

  const visibleComments = useMemo(
    () => comments.filter((comment) => period === 'todos' || comment.period === period),
    [comments, period]
  );
  const selectedComment = visibleComments.find((comment) => comment.id === selectedId) || visibleComments[0];
  const selectedAnnotation = selectedComment ? annotations.get(selectedComment.id) : undefined;

  function changePeriod(nextPeriod: 'todos' | Period) {
    setPeriod(nextPeriod);
    const nextComments = comments.filter((comment) => nextPeriod === 'todos' || comment.period === nextPeriod);
    setSelectedId(nextComments[0]?.id || null);
  }

  async function saveCurrent(payload: { label: Label; note: string; is_difficult: boolean }) {
    if (!selectedComment) return;
    setSaving(true);
    setSavedMessage('');
    setError('');
    try {
      const annotation = await saveAnnotation(selectedComment.id, payload);
      setAnnotations((current) => new Map(current).set(selectedComment.id, annotation));
      setProgress(await loadProgress());
      const annotatedIds = new Set(annotations.keys());
      annotatedIds.add(selectedComment.id);
      const selectedIndex = visibleComments.findIndex((comment) => comment.id === selectedComment.id);
      const nextUnannotated = visibleComments
        .slice(selectedIndex + 1)
        .find((comment) => !annotatedIds.has(comment.id));
      const firstUnannotated = visibleComments.find((comment) => !annotatedIds.has(comment.id));
      const nextComment = nextUnannotated || firstUnannotated;

      setSavedMessage(nextComment ? 'Salvo. Próximo comentário' : 'Todos os comentários foram anotados');
      if (nextComment) {
        setSelectedId(nextComment.id);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Erro ao salvar anotação');
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    try { await logout(); } catch { /* token may already be expired */ }
    sessionStorage.clear();
    onLogout();
  }

  if (loading) return <main className="loading-screen">Carregando comentários...</main>;
  if (error && !comments.length) return <main className="loading-screen"><p className="error">{error}</p></main>;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup"><div className="topbar-mark">A</div><div><p className="eyebrow">AVIATOR ANNOTATION</p><strong>Central de anotações</strong></div></div>
        <div className="user-menu"><span className="user-avatar">{user.name.charAt(user.name.length - 1)}</span><span>{user.name}</span><button className="ghost-button" onClick={signOut}>Sair</button></div>
      </header>
      <main className="dashboard">
        <section className="hero">
          <div><p className="eyebrow">PROGRESSO INDIVIDUAL</p><h1>Classifique os comentários com consistência.</h1><p className="muted">Leia cada comentário e escolha a categoria que melhor representa o posicionamento.</p></div>
          <div className="progress-card"><strong>{progress?.completed_count || 0}<small>/{progress?.total_count || comments.length}</small></strong><span>comentários anotados</span><div className="progress-track"><div style={{ width: `${progress?.percentage || 0}%` }} /></div></div>
        </section>
        <section className="toolbar">
          <div className="filter-tabs">
            {(['todos', 'antes', 'depois'] as const).map((option) => <button key={option} className={period === option ? 'active' : ''} onClick={() => changePeriod(option)}>{option === 'todos' ? 'Todos' : option === 'antes' ? 'Antes de 2025' : 'Depois de 2025'}</button>)}
          </div>
          <span className="muted">{visibleComments.length} comentários</span>
        </section>
        <section className="workspace">
          <aside className="comment-list">
            <div className="list-heading"><div><strong>Comentários</strong><span>Selecione para revisar</span></div><span className="list-count">{visibleComments.length}</span></div>
            {visibleComments.map((comment) => <button key={comment.id} className={`comment-item ${selectedComment?.id === comment.id ? 'selected' : ''}`} onClick={() => setSelectedId(comment.id)}><span className="comment-number">#{comment.annotation_id}</span><span className="comment-preview">{comment.text}</span>{annotations.has(comment.id) && <span className="done-dot" />}</button>)}
          </aside>
          <AnnotationPanel comment={selectedComment} annotation={selectedAnnotation} onSave={saveCurrent} saving={saving} savedMessage={savedMessage} error={error} />
        </section>
      </main>
    </div>
  );
}

function AnnotationPanel({ comment, annotation, onSave, saving, savedMessage, error }: { comment?: Comment; annotation?: Annotation; onSave: (payload: { label: Label; note: string; is_difficult: boolean }) => Promise<void>; saving: boolean; savedMessage: string; error: string }) {
  const [label, setLabel] = useState<Label | ''>(annotation?.label || '');
  const [note, setNote] = useState(annotation?.note || '');
  const [difficult, setDifficult] = useState(Boolean(annotation?.is_difficult));

  useEffect(() => { setLabel(annotation?.label || ''); setNote(annotation?.note || ''); setDifficult(Boolean(annotation?.is_difficult)); }, [annotation, comment?.id]);
  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (event.key >= '1' && event.key <= '3') {
        setLabel(labels[Number(event.key) - 1]);
      }
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && label && !saving) {
        void onSave({ label, note, is_difficult: difficult });
      }
    }
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [difficult, label, note, onSave, saving]);
  if (!comment) return <article className="empty-state">Nenhum comentário encontrado.</article>;
  return <article className="annotation-panel"><div className="panel-meta"><span className="period-badge">{comment.period === 'antes' ? 'ANTES DE 2025' : 'DEPOIS DE 2025'}</span><span>Comentário #{comment.annotation_id}</span></div><blockquote>{comment.text}</blockquote><p className="instruction">Como você classifica este comentário?</p><div className="label-grid">{labels.map((option, index) => <button key={option} className={`label-button ${label === option ? `chosen ${option.toLowerCase()}` : ''}`} onClick={() => setLabel(option)}><span className="label-icon">{option === 'Favorável' ? '+' : option === 'Contrário' ? '−' : '○'}</span>{option}<small>Tecla {index + 1}</small></button>)}</div><label className="note-label">Observação <span>opcional</span><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Adicione um contexto se necessário..." rows={3} /></label><label className="checkbox-label"><input type="checkbox" checked={difficult} onChange={(event) => setDifficult(event.target.checked)} /> Marcar como comentário difícil</label>{error && <p className="error">{error}</p>}<div className="panel-footer"><span className="saved">{savedMessage}</span><button className="primary-button save-button" disabled={!label || saving} onClick={() => label && onSave({ label, note, is_difficult: difficult })}>{saving ? 'Salvando...' : 'Salvar e próximo →'}</button></div></article>;
}

export default App;
