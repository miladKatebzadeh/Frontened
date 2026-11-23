'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api').replace(/\/$/, '')

function apiHeaders(extra?: HeadersInit, json = true): HeadersInit {
  const headers: Record<string, string> = {}
  if (json) headers['Content-Type'] = 'application/json'
  const apiKey = process.env.NEXT_PUBLIC_OPSHUB_API_KEY
  if (apiKey) headers['X-API-Key'] = apiKey
  return { ...headers, ...(extra as Record<string, string> | undefined) }
}

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    signal: options?.signal ?? AbortSignal.timeout(90000),
    headers: apiHeaders(options?.headers),
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    const detail = typeof payload.detail === 'string'
      ? payload.detail
      : Object.entries(payload).flatMap(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : String(messages)}`).join(' | ')
    throw new Error(detail || `Backend request failed (${response.status})`)
  }
  return response.status === 204 ? (undefined as T) : response.json()
}
import { Activity, AlertTriangle, ArrowUpRight, Bot, CheckCircle2, CircleDot, ClipboardList, Clock3, Code2, Cpu, Database, FileCode2, Gauge, Layers3, MessageSquare, Network, Play, Search, Server, Settings2, Sparkles, Terminal, Trash2, Upload, Wifi, XCircle, Zap } from 'lucide-react'

const tabs = [
  { id: 'analytics', label: 'Live Infrastructure', icon: Activity },
  { id: 'incidents', label: 'Incident Management', icon: AlertTriangle },
  { id: 'knowledge', label: 'ChromaDB Knowledge', icon: Database },
  { id: 'lab', label: 'Hybrid AI & MCP Lab', icon: Bot },
] as const
type TabId = (typeof tabs)[number]['id']
type DynamicTool = { id: string | number; name: string; description: string; code?: string; created?: string }
const codeSample = `def restart_container(name: str) -> str:\n    import docker\n    container = docker.from_env().containers.get(name)\n    container.restart()\n    return f"restarted {name}"`

function StatusDot({ tone = 'green' }: { tone?: 'green' | 'orange' | 'red' }) { return <span className={`status-dot status-${tone}`} aria-label={`${tone} status`} /> }
function PanelHeader({ eyebrow, title, icon: Icon, action }: { eyebrow: string; title: string; icon: typeof Activity; action?: React.ReactNode }) { return <div className="panel-header"><div className="panel-title-wrap"><div className="panel-icon"><Icon size={16} /></div><div><div className="eyebrow">{eyebrow}</div><h2>{title}</h2></div></div>{action}</div> }


interface TelemetryData {
  metrics: { system_health: string; active_containers: string; pipelines_today: string; telemetry_events: string };
  containers: string[][];
  builds: string[][];
  core_metrics: string[][];
}


function AnalyticsView({
  data,
  error,
  loading,
  selectedMetrics,
  setSelectedMetrics
}: {
  data: TelemetryData | null;
  error: string | null;
  loading: boolean;
  selectedMetrics: string[];
  setSelectedMetrics: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfig, setShowConfig] = useState(false);

  if (loading && !data) {
    return <div className="empty-state">Loading infrastructure telemetry...</div>
  }

  if (error) {
    return <div className="empty-state" style={{ color: 'var(--orange)' }}>Error loading telemetry: {error}</div>
  }

  const metrics = data?.metrics ?? { system_health: '0%', active_containers: '0', pipelines_today: '0', telemetry_events: '0 rows' }
  const containers = data?.containers ?? []
  const builds = data?.builds ?? []
  const coreMetrics = data?.core_metrics ?? []

  // 🌟 کل کاتالوگ متریک‌های موجود در دیتابیس برای فیلتر کردن
  const allAvailableFromDb = data?.all_available_metrics ?? [];

  const toggleMetricSelection = (mName: string) => {
    setSelectedMetrics(prev =>
      prev.includes(mName) ? prev.filter(m => m !== mName) : [...prev, mName]
    );
  };

  return (
    <div className="view-stack">
      {/* بخش کارت‌های بالایی داشبورد فیلتر کانتینرها بدون تغییر رندر می‌شود */}
      <div className="metric-grid">
        {[
          ['System health', metrics.system_health, 'Based on active nodes', Gauge, 'green'],
          ['Active containers', metrics.active_containers, 'Live operational fleet', Server, 'blue'],
          ['Tracked builds', metrics.pipelines_today, 'Jenkins builds stored', Network, 'orange'],
          ['Telemetry events', metrics.telemetry_events, 'Flushed rows in DB', Activity, 'purple']
        ].map(([label, value, hint, Icon, tone]) => {
          const MetricIcon = Icon as React.ElementType;
          return (
            <div className="metric-card" key={String(label)}>
              <div className={`metric-icon ${String(tone)}`}><MetricIcon size={17} /></div>
              <span>{String(label)}</span>
              <strong>{String(value)}</strong>
              <small>{String(hint)}</small>
            </div>
          )
        })}
      </div>

      {/* ستون‌های کانتینرها و جنکینز */}
      <div className="data-columns">
        <section className="panel">
          <PanelHeader eyebrow="DOCKER / LIVE TELEMETRY" title="Container fleet" icon={Server} action={<span className="live-pill"><StatusDot /> LIVE</span>} />
          <div className="table-wrap">
            <table>
              <thead><tr><th>Container</th><th>Status</th><th>CPU</th><th>Memory</th></tr></thead>
              <tbody>
                {containers.map((row, idx) => (
                  <tr key={idx}>
                    <td><div className="table-name"><span className="mini-server"><Server size={13} /></span>{row[0]}</div></td>
                    <td><span className="status-text"><StatusDot tone={row[1] === 'running' ? 'green' : 'red'} />{row[1]}</span></td>
                    <td>{row[2]}</td><td>{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {containers.length === 0 && <div className="empty-state">No containers logged in database.</div>}
          </div>
        </section>

        <section className="panel">
          <PanelHeader eyebrow="JENKINS / CI PIPELINES" title="Recent builds" icon={Layers3} />
          <div className="table-wrap">
            <table>
              <thead><tr><th>Pipeline</th><th>Build</th><th>Result</th><th>Duration</th></tr></thead>
              <tbody>
                {builds.map((row, idx) => (
                  <tr className={row[2] === 'FAILURE' ? 'danger-row' : ''} key={idx}>
                    <td>{row[0]}</td><td className="muted">{row[1]}</td>
                    <td><span className={`result ${row[2].toLowerCase()}`}>{row[2] === 'SUCCESS' ? <CheckCircle2 size={13} /> : <XCircle size={13} />}{row[2]}</span></td>
                    <td className="muted">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {builds.length === 0 && <div className="empty-state">No pipeline histories discovered.</div>}
          </div>
        </section>
      </div>

      {/* 🌟 بخش پیشرفته و پویا شده پرومتئوس همراه با منوی فیلتر متریک‌ها */}
      <section className="panel prometheus-panel">
        <PanelHeader
          eyebrow="PROMETHEUS / CUSTOM MONITOR"
          title="Core system metrics"
          icon={Cpu}
          action={
            <button
              className="refresh-button"
              onClick={() => setShowConfig(!showConfig)}
            // style={{ border: showConfig ? '1px solid var(--orange)' : '1px solid #303642' }}
            >
              <Settings2 size={13} /> {showConfig ? 'Close Manager' : 'Manage Metrics'}
            </button>
          }
        />

        {/* پنل انتخاب متریک‌ها (نمایش با دکمه Manage Metrics) */}
        {/* 🌟 تگ‌های HTML بدون استایل‌های کثیف درون‌خطی */}
        {showConfig && (
          <div className="metrics-config-container">
            <div className="search-input-wrap">
              <input
                placeholder="Search metrics catalog..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="metrics-buttons-wrapper">
              {allAvailableFromDb
                .filter(m => m.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(mName => {
                  const isSelected = selectedMetrics.includes(mName);
                  return (
                    <button
                      key={mName}
                      className={isSelected ? 'selected' : ''}
                      onClick={() => toggleMetricSelection(mName)}
                    >
                      {isSelected ? '✓ ' : '+ '} {mName}
                    </button>
                  )
                })}
            </div>
          </div>
        )}


        <div className="metric-log">
          {coreMetrics.map((item, i) => {
            const [metricName, displayValue, description, barPercent] = item;
            return (
              <div className="log-row" key={i}>
                <span className="log-index">0{i + 1}</span>
                <span className="log-key">{metricName}</span>
                <strong>{displayValue}</strong>
                <span className="muted">{description}</span>
                <span className="log-bars"><i style={{ width: `${barPercent}%`, transition: 'width 0.4s ease' }} /></span>
              </div>
            );
          })}
          {coreMetrics.length === 0 && <div className="empty-state">No selected metrics. Click 'Manage Metrics' to add channels.</div>}
        </div>
      </section>
    </div>
  )
}



type IncidentStatus = 'open' | 'acknowledged' | 'investigating' | 'resolved';
type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';
type IncidentRecord = {
  id: number;
  fingerprint: string;
  source: string;
  resource: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  first_seen: string;
  last_seen: string;
  resolved_at: string | null;
  occurrence_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  events?: IncidentEvent[];
};
type IncidentEvent = {
  id: number;
  event_type: string;
  actor: string;
  message: string;
  payload: Record<string, unknown>;
  created_at: string;
};
type IncidentSummary = {
  open: number;
  acknowledged: number;
  investigating: number;
  resolved: number;
  critical: number;
};
type IncidentListResponse = {
  count: number;
  summary: IncidentSummary;
  results: IncidentRecord[];
};

function formatIncidentDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function IncidentView({ refreshToken, onResolveWithAI }: { refreshToken: number; onResolveWithAI: (incident: IncidentRecord) => void }) {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [summary, setSummary] = useState<IncidentSummary>({
    open: 0, acknowledged: 0, investigating: 0, resolved: 0, critical: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [severityFilter, setSeverityFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<IncidentRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    let cancelled = false;
    let firstLoad = true;

    const loadIncidents = async () => {
      if (firstLoad) setLoading(true);
      else setRefreshing(true);

      const params = new URLSearchParams({ limit: '200' });
      if (statusFilter && statusFilter !== 'active') params.set('status', statusFilter);
      if (severityFilter) params.set('severity', severityFilter);
      if (sourceFilter) params.set('source', sourceFilter);
      if (appliedSearch) params.set('q', appliedSearch);

      try {
        const response = await apiRequest<IncidentListResponse>(`/incidents/?${params.toString()}`);
        if (cancelled) return;
        const rows = Array.isArray(response.results) ? response.results : [];
        const visibleRows = statusFilter === 'active' ? rows.filter((item) => item.status !== 'resolved') : rows;
        setIncidents(visibleRows);
        setSummary(response.summary ?? { open: 0, acknowledged: 0, investigating: 0, resolved: 0, critical: 0 });
        setError('');
        setLastUpdated(new Date().toLocaleTimeString());
        setSelectedId((current) => {
          if (current && visibleRows.some((item) => item.id === current)) return current;
          return visibleRows[0]?.id ?? null;
        });
      } catch (requestError) {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Could not load incidents.');
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
        firstLoad = false;
      }
    };

    void loadIncidents();
    const timer = window.setInterval(() => void loadIncidents(), 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [statusFilter, severityFilter, sourceFilter, appliedSearch, refreshToken]);

  useEffect(() => {
    if (selectedId === null) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    const loadDetail = async () => {
      setDetailLoading(true);
      try {
        const response = await apiRequest<IncidentRecord>(`/incidents/${selectedId}/`);
        if (!cancelled) {
          setDetail(response);
          setDetailError('');
        }
      } catch (requestError) {
        if (!cancelled) setDetailError(requestError instanceof Error ? requestError.message : 'Could not load incident details.');
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    };

    void loadDetail();
    const timer = window.setInterval(() => void loadDetail(), 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [selectedId, refreshToken]);

  const updateIncidentStatus = async (nextStatus: 'acknowledged' | 'investigating') => {
    if (!selectedId) return;
    setActionBusy(true);
    setActionMessage('');
    try {
      const previousStatus = detail?.status;
      const updated = await apiRequest<IncidentRecord>(`/incidents/${selectedId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      setDetail(updated);
      setActionMessage(nextStatus === 'acknowledged' ? 'Incident acknowledged.' : 'Investigation started.');
      setRefreshing(true);
      setTimeout(() => setRefreshing(false), 500);
      setIncidents((current) => current.map((item) => item.id === updated.id ? { ...item, ...updated } : item));
      setSummary((current) => {
        const next = { ...current };
        if (previousStatus === 'open') next.open = Math.max(0, next.open - 1);
        if (previousStatus === 'acknowledged') next.acknowledged = Math.max(0, next.acknowledged - 1);
        if (previousStatus === 'investigating') next.investigating = Math.max(0, next.investigating - 1);
        if (updated.status === 'acknowledged') next.acknowledged += 1;
        if (updated.status === 'investigating') next.investigating += 1;
        return next;
      });
    } catch (requestError) {
      setActionMessage(requestError instanceof Error ? requestError.message : 'Could not update incident status.');
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="view-stack incident-view">
      <div className="incident-summary-grid">
        <div className="incident-stat">
          <span>OPEN</span><strong>{summary.open}</strong><small>Awaiting acknowledgement</small>
        </div>
        <div className="incident-stat">
          <span>ACKNOWLEDGED</span><strong>{summary.acknowledged}</strong><small>Seen by an operator</small>
        </div>
        <div className="incident-stat">
          <span>INVESTIGATING</span><strong>{summary.investigating}</strong><small>Under active review</small>
        </div>
        <div className="incident-stat incident-stat-critical">
          <span>ACTIVE CRITICAL</span><strong>{summary.critical}</strong><small>Unresolved critical signals</small>
        </div>
      </div>

      <div className="incident-layout">
        <section className="panel incident-list-panel">
          <PanelHeader
            eyebrow="EVENT CORRELATION / LIVE"
            title="Incident queue"
            icon={ClipboardList}
            action={<span className="live-pill"><StatusDot /> AUTO REFRESH · 15S</span>}
          />

          <div className="incident-toolbar">
            <label className="incident-search">
              <Search size={14} />
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') setAppliedSearch(searchText.trim()); }}
                placeholder="Search incidents or resources…"
              />
            </label>
            <button className="refresh-button" type="button" onClick={() => setAppliedSearch(searchText.trim())}>Search</button>
            <select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="active">Active incidents</option>
              <option value="">All statuses</option>
              <option value="open">Open</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
            </select>
            <select aria-label="Filter by severity" value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)}>
              <option value="">All severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select aria-label="Filter by source" value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
              <option value="">All sources</option>
              <option value="docker">Docker</option>
              <option value="jenkins">Jenkins</option>
              <option value="prometheus">Prometheus</option>
              <option value="alertmanager">Alertmanager</option>
            </select>
          </div>

          {error ? (
            <div className="incident-error"><AlertTriangle size={16} /><div><strong>Incident feed unavailable</strong><span>{error}</span></div></div>
          ) : loading ? (
            <div className="empty-state">Loading incident queue…</div>
          ) : incidents.length === 0 ? (
            <div className="empty-state">No incidents match the current filters.</div>
          ) : (
            <div className="incident-rows">
              {incidents.map((incident) => (
                <button
                  type="button"
                  key={incident.id}
                  className={`incident-row ${selectedId === incident.id ? 'selected' : ''}`}
                  onClick={() => { setSelectedId(incident.id); setActionMessage(''); }}
                >
                  <span className={`incident-severity-mark severity-${incident.severity}`} />
                  <span className="incident-row-main">
                    <strong>{incident.title}</strong>
                    <small>{incident.resource} · {incident.source.toUpperCase()} · {incident.occurrence_count} occurrence{incident.occurrence_count === 1 ? '' : 's'}</small>
                  </span>
                  <span className={`incident-badge severity-badge-${incident.severity}`}>{incident.severity}</span>
                  <span className={`incident-status status-badge-${incident.status}`}>{incident.status.replace('_', ' ')}</span>
                  <small className="incident-last-seen"><Clock3 size={12} />{formatIncidentDate(incident.last_seen)}</small>
                </button>
              ))}
            </div>
          )}

          <div className="incident-list-footer">
            <span>{incidents.length} shown · {lastUpdated ? `Updated ${lastUpdated}` : 'Waiting for first sync'}</span>
            <span>{refreshing ? 'Refreshing…' : 'Polling every 15 seconds'}</span>
          </div>
        </section>

        <section className="panel incident-detail-panel">
          <PanelHeader eyebrow="INCIDENT CONTEXT" title="Investigation details" icon={AlertTriangle} />
          {detailLoading && !detail ? (
            <div className="empty-state">Loading incident details…</div>
          ) : detailError ? (
            <div className="empty-state incident-detail-error">{detailError}</div>
          ) : !detail ? (
            <div className="empty-state">Select an incident to inspect its timeline and status.</div>
          ) : (
            <div className="incident-detail-content">
              <div className="incident-detail-topline">
                <span className={`incident-badge severity-badge-${detail.severity}`}>{detail.severity}</span>
                <span className={`incident-status status-badge-${detail.status}`}>{detail.status.replace('_', ' ')}</span>
              </div>
              <h3>{detail.title}</h3>
              <p>{detail.description || 'No additional description was provided by the telemetry source.'}</p>
              <dl className="incident-facts">
                <div><dt>Resource</dt><dd>{detail.resource}</dd></div>
                <div><dt>Source</dt><dd>{detail.source}</dd></div>
                <div><dt>First seen</dt><dd>{formatIncidentDate(detail.first_seen)}</dd></div>
                <div><dt>Last seen</dt><dd>{formatIncidentDate(detail.last_seen)}</dd></div>
                <div><dt>Occurrences</dt><dd>{detail.occurrence_count}</dd></div>
                <div><dt>Fingerprint</dt><dd title={detail.fingerprint}>{detail.fingerprint.slice(0, 12)}…</dd></div>
              </dl>

              <div className="incident-actions">
                {detail.status !== 'resolved' && (
                  <button type="button" className="incident-action-button primary incident-ai-button" disabled={actionBusy || detailLoading} onClick={() => onResolveWithAI(detail)}>
                    <Sparkles size={14} /> Resolve with AI
                  </button>
                )}
                {detail.status === 'open' && (
                  <button type="button" className="incident-action-button" disabled={actionBusy} onClick={() => updateIncidentStatus('acknowledged')}>
                    <CheckCircle2 size={14} /> Acknowledge
                  </button>
                )}
                {(detail.status === 'open' || detail.status === 'acknowledged') && (
                  <button type="button" className="incident-action-button primary" disabled={actionBusy} onClick={() => updateIncidentStatus('investigating')}>
                    <Activity size={14} /> Start investigation
                  </button>
                )}
                {detail.status === 'investigating' && <span className="incident-action-note">Investigation is in progress.</span>}
                {detail.status === 'resolved' && <span className="incident-action-note">Recovered by telemetry.</span>}
                {actionBusy && <span className="incident-action-note">Updating…</span>}
              </div>
              {actionMessage ? <div className="incident-action-message">{actionMessage}</div> : null}

              <div className="incident-timeline">
                <div className="incident-timeline-heading"><strong>Event history</strong><span>{detail.events?.length ?? 0} events</span></div>
                {detail.events?.length ? detail.events.map((event) => (
                  <div className="incident-event" key={event.id}>
                    <span className="incident-event-dot" />
                    <div>
                      <strong>{event.event_type.replace('_', ' ')}</strong>
                      <p>{event.message || event.actor}</p>
                      <small>{formatIncidentDate(event.created_at)} · {event.actor}</small>
                    </div>
                  </div>
                )) : <div className="incident-no-events">No event history recorded yet.</div>}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function KnowledgeView() {
  const [documents, setDocuments] = useState<any[]>([])
  const [loadError, setLoadError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [docTitle, setDocTitle] = useState('')
  const [docContent, setDocContent] = useState('')
  const [editingDocId, setEditingDocId] = useState<string | null>(null)
  const [chromaStatus, setChromaStatus] = useState<'connected' | 'offline'>('offline')
  const [chromaEndpoint, setChromaEndpoint] = useState('localhost:8001')

  const [searchText, setSearchText] = useState('')

  const fetchDocuments = (query = searchText) => {
    const path = query.trim()
      ? `/knowledge/documents/search/?q=${encodeURIComponent(query.trim())}`
      : '/knowledge/documents/'
    apiRequest<any[]>(path)
      .then((res) => {
        setDocuments(Array.isArray(res) ? res : (res as any).results || [])
      })
      .catch((error) => {
        setLoadError(error.message)
      })
  }

  useEffect(() => {
    fetchDocuments('')
    apiRequest<{ status: string; host?: string; port?: string }>('/knowledge/health/')
      .then((health) => {
        setChromaStatus(health.status === 'connected' ? 'connected' : 'offline')
        if (health.host) setChromaEndpoint(`${health.host}:${health.port ?? '8001'}`)
      })
      .catch(() => setChromaStatus('offline'))
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setSelectedFile(file)
      setDocTitle(file.name.replace(/\.[^/.]+$/, ''))
      setEditingDocId(null)
    }
  }

  const startEditing = (doc: any) => {
    setEditingDocId(doc.id)
    setDocTitle(doc.title)
    setDocContent(doc.content || '')
    setSelectedFile(null)
  }

  const cancelEditing = () => {
    setEditingDocId(null)
    setDocTitle('')
    setDocContent('')
  }

  const handleIngestOrUpdate = async () => {
    if (!selectedFile && !docTitle.trim() && !docContent.trim()) return
    if (selectedFile && selectedFile.size > 25 * 1024 * 1024) {
      setLoadError('File exceeds 25 MB.')
      return
    }
    setUploading(true)

    try {
      const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api').replace(/\/$/, '')

      if (editingDocId) {
        const payload = {
          title: docTitle || 'Untitled Runbook',
          content: docContent,
        }

        const response = await fetch(`${baseUrl}/knowledge/documents/${editingDocId}/`, {
          method: 'PATCH',
          headers: apiHeaders(),
          body: JSON.stringify(payload)
        })

        if (!response.ok) throw new Error(`Update pipeline failed (${response.status})`)

      } else {
        const formData = new FormData()
        if (selectedFile) {
          formData.append('file', selectedFile)
        } else {
          formData.append('content', docContent)
        }
        formData.append('title', docTitle || selectedFile?.name || 'Untitled Runbook')
        formData.append('source', 'Manual Ingestion')

        const response = await fetch(`${baseUrl}/knowledge/documents/`, {
          method: 'POST',
          headers: apiHeaders(undefined, false),
          body: formData,
        })

        if (!response.ok) throw new Error(`Ingestion pipeline failed (${response.status})`)
      }

      setSelectedFile(null)
      setDocTitle('')
      setDocContent('')
      setEditingDocId(null)
      fetchDocuments()
    } catch (error: any) {
      setLoadError(error.message)
    } finally {
      setUploading(false)
    }
  }

  const removeDocument = async (id: string, title: string) => {
    if (!window.confirm(`Delete ${title} from ChromaDB?`)) return
    try {
      await apiRequest(`/knowledge/documents/${id}/?confirm=true`, { method: 'DELETE' })
      if (editingDocId === id) cancelEditing()
      setDocuments((current) => current.filter((doc) => String(doc.id) !== String(id)))
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Delete failed')
    }
  }

  return (
    <div className="view-stack">
      <div className="chroma-hero panel">
        <div className="chroma-brand">
          <div className="chroma-mark"><Database size={22} /></div>
          <div>
            <div className="eyebrow">VECTOR DATABASE CLUSTER</div>
            <h2>ChromaDB knowledge base</h2>
            <p>Semantic memory layer for Revive</p>
          </div>
        </div>
        <div className="connection" style={{ borderColor: chromaStatus === 'connected' ? '#2a4733' : '#a4a2a2', background: chromaStatus === 'connected' ? '#ffffff' : '#ffffff' }}>
          <StatusDot tone={chromaStatus === 'connected' ? 'green' : 'red'} />
          <div>
            <strong>{chromaStatus === 'connected' ? 'Connected' : 'Disconnected'}</strong>

            <span>{chromaEndpoint}</span>
          </div>
          <Wifi size={19} style={{ color: chromaStatus === 'connected' ? '#6ebf88' : '#bf6e6e' }} />
        </div>

      </div>

      {loadError && (
        <div className="empty-state" style={{ color: 'var(--orange)', border: '1px dashed var(--orange)' }}>
          ⚠️ Pipeline Warning: {loadError}
        </div>
      )}

      <div className="knowledge-grid">
        <section className="panel">
          <PanelHeader
            eyebrow="COLLECTION / DEVOPS_KNOWLEDGE_BASE"
            title="Indexed documents"
            icon={FileCode2}
            action={<span className="muted">{documents.length} documents</span>}
          />
          <div className="document-list">
            <label className="search-input-wrap" style={{ margin: '0 0 12px' }}>
              <input
                placeholder="Search runbooks..."
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') fetchDocuments(searchText) }}
              />
            </label>
            {documents.map((doc) => (
              <div className="document" key={doc.id}>
                <div className="doc-icon"><FileCode2 size={15} /></div>
                <div className="doc-info">
                  <strong>{doc.title}</strong>
                  <span>{doc.source ?? 'Knowledge base'} · {doc.content?.length ?? 0} chars</span>
                </div>
                <span className="muted" style={{ marginRight: 'auto', paddingRight: '12px' }}>
                  <button
                    className="row-action"
                    title="Edit Document"
                    onClick={() => startEditing(doc)}
                    style={{ border: editingDocId === doc.id ? '1px solid var(--orange)' : '1px solid #303743' }}
                  >
                    <Settings2 size={13} style={{ color: editingDocId === doc.id ? 'var(--orange)' : 'inherit' }} />
                  </button>
                </span>
                <button
                  className="row-action danger"
                  aria-label={`Delete ${doc.title}`}
                  title="Delete from ChromaDB"
                  onClick={() => removeDocument(String(doc.id), doc.title)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          {documents.length === 0 && <div className="empty-state">No documents in this collection.</div>}
        </section>

        <section className="panel ingest-panel">
          <PanelHeader
            eyebrow="INGESTION PIPELINE"
            title={editingDocId ? "Edit Knowledge Asset" : "Add knowledge"}
            icon={Upload}
          />
          <p className="panel-copy">
            {editingDocId
              ? "Modifying the semantic vector blueprint. Changes will realign inside ChromaDB in real-time."
              : "Push runbooks, incident notes, and system manuals into the semantic retrieval layer."}
          </p>

          <div style={{ padding: '0 18px', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '9px', color: '#68707d', letterSpacing: '.1em' }}>DOCUMENT TITLE</span>
              <input
                style={{ width: '100%', background: '#ffffff', border: '1px solid #c3c3c4', padding: '8px 11px', borderRadius: '5px', fontSize: '11px', outline: 'none' }}
                placeholder="Document Title"
                value={docTitle}
                onChange={e => setDocTitle(e.target.value)}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '9px', color: '#68707d', letterSpacing: '.1em' }}>CONTENT MANUAL</span>
              <textarea
                style={{ width: '100%', minHeight: '120px', resize: 'vertical', background: '#ffffff', border: '1px solid #c3c3c4', padding: '8px 11px', borderRadius: '5px', fontSize: '11px', outline: 'none', fontFamily: 'monospace', lineHeight: '1.6' }}
                placeholder="Write or paste your runbook manual markdown contents directly here..."
                value={docContent}
                onChange={e => setDocContent(e.target.value)}
              />
            </label>
          </div>

          {!editingDocId && (
            <label className="drop-zone" style={{ border: selectedFile ? '1px dashed var(--green)' : '1px dashed #c3c3c4', cursor: 'pointer', margin: '14px 18px' }}>
              <input type="file" accept=".txt,.md,.pdf" onChange={handleFileChange} />
              <Upload size={22} style={{ color: selectedFile ? 'var(--green)' : '#7795be' }} />
              <strong>{selectedFile ? selectedFile.name : 'Drop files to ingest'}</strong>
              <span>Markdown, PDF, TXT up to 25 MB</span>
            </label>
          )}

          <div style={{ display: 'flex', gap: '8px', padding: '0 18px', marginTop: '14px', marginBottom: '18px' }}>
            <button
              className="outline-button"
              onClick={handleIngestOrUpdate}
              disabled={uploading || (!selectedFile && !docTitle.trim() && !docContent.trim())}
              style={{ flex: 1, margin: 0, opacity: uploading ? 0.5 : 1, cursor: uploading ? 'not-allowed' : 'pointer', background: editingDocId ? '#ff7a3515' : 'transparent', color: editingDocId ? 'var(--orange)' : '#c2cad4', borderColor: editingDocId ? 'var(--orange)' : '#c3c3c4' }}
            >
              <Upload size={15} /> {uploading ? 'Processing Vectors...' : editingDocId ? 'Update Asset' : 'Add document'}
            </button>

            {editingDocId && (
              <button
                className="refresh-button"
                onClick={cancelEditing}
                style={{ height: '37px', padding: '0 14px' }}
              >
                Cancel
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

type ChatAction = { triggered: boolean; tool?: string; success?: boolean; resolved?: boolean; message?: string }
type OllamaDiagnosticError = { error_type: string; http_status: number | null; category: string; message: string; model: string; hint: string }
type UserDiagnosticReport = {
  language: string
  status: string
  title: string
  incident_confirmed: boolean
  summary: string
  root_cause: string
  evidence: { text: string; source: string; type: string }[]
  recommended_steps: string[]
  verification_steps: string[]
  ai_status: string
  ai_note: string
  runbook_count: number
  action: string
  recovery_verified: boolean
  source: string
  pipeline_failure?: {
    diagnostic_status?: string
    primary_error?: string | null
    failing_stage?: string | null
    failing_command?: string | null
    evidence_origin?: string | null
  } | null
}
type ChatMessage = {
  role: 'user' | 'assistant'
  text: string
  time: string
  engineStatus?: string
  router?: string
  layaModel?: string
  action?: ChatAction
  requestedRemediation?: boolean
  userReport?: UserDiagnosticReport | null
  ollamaError?: OllamaDiagnosticError | null
  traceId?: string | null
}

function DiagnosticReportCard({ report, error, router, traceId }: {
  report: UserDiagnosticReport
  error?: OllamaDiagnosticError | null
  router?: string
  traceId?: string | null
}) {
  const modelUnavailable = report.ai_status !== 'ok'
  const failure = report.pipeline_failure
  return (
    <article className={`user-diagnostic-card ${modelUnavailable ? 'user-diagnostic-unavailable' : ''}`} dir="ltr" lang="en">
      <div className="user-diagnostic-header">
        <strong>{report.title}</strong>
        <span>{modelUnavailable ? 'Monitoring-based report · AI unavailable' : 'Incident analysis'}</span>
      </div>
      <div className="user-diagnostic-content">
        <p className="user-diagnostic-summary">{report.summary}</p>
        <div className="user-diagnostic-source">
          {report.incident_confirmed
            ? 'Incident confirmed by monitoring. The underlying cause may still require verification.'
            : 'No independent monitoring confirmation of an incident is available.'}
        </div>
        <section>
          <h4>What went wrong</h4>
          <p>{report.root_cause}</p>
        </section>
        {failure && (
          <section className="user-diagnostic-pipeline">
            <h4>Pipeline failure</h4>
            <p><strong>Stage:</strong> {failure.failing_stage || 'Not identified'}</p>
            <p><strong>Observed issue:</strong> {failure.primary_error || 'Jenkins reported failure, but no specific error message was available.'}</p>
            {failure.failing_command && <p><strong>Associated command:</strong> <code>{failure.failing_command}</code></p>}
            <p><strong>Evidence source:</strong> {failure.evidence_origin === 'jenkins_exact_build_refetch'
              ? 'Revive automatically retrieved this specific Jenkins build again.'
              : 'Jenkins build evidence collected by Revive.'}</p>
          </section>
        )}
        <section>
          <h4>Evidence Revive collected</h4>
          {report.evidence.length ? (
            <ul>{report.evidence.map((evidence, index) => (
              <li key={index}><span>{evidence.text}</span> <small>({evidence.source})</small></li>
            ))}</ul>
          ) : <p>No independent error evidence beyond the alert was available.</p>}
        </section>
        <section>
          <h4>Recommended resolution</h4>
          <ol>{report.recommended_steps.map((step, index) => <li key={index}>{step}</li>)}</ol>
        </section>
        <section>
          <h4>How to verify recovery</h4>
          <ol>{report.verification_steps.map((step, index) => <li key={index}>{step}</li>)}</ol>
        </section>
        <div className="user-diagnostic-footer">
          <p>{report.ai_note}</p>
          <p><strong>Action status:</strong> {report.action}</p>
          <p><strong>Matching runbooks:</strong> {report.runbook_count}</p>
        </div>
        {error && (
          <details className="user-diagnostic-debug">
            <summary>Technical details (Ollama)</summary>
            <dl>
              <dt>Error type</dt><dd>{error.error_type}</dd>
              <dt>HTTP status</dt><dd>{error.http_status ?? 'Unknown'}</dd>
              <dt>Model</dt><dd>{error.model}</dd>
              <dt>Provider message</dt><dd>{error.message}</dd>
              <dt>Service guidance</dt><dd>{error.hint}</dd>
            </dl>
          </details>
        )}
        {(traceId || router) && (
          <div className="user-diagnostic-metadata">
            {router && <span>Router: {router}</span>}
            {traceId && <span>Trace ID: <code>{traceId}</code></span>}
          </div>
        )}
      </div>
    </article>
  )
}

function LabView({ incident, onNewChat }: { incident: IncidentRecord | null; onNewChat: () => void }) {
  const [tools, setTools] = useState<DynamicTool[]>([])
  const [toolName, setToolName] = useState('restart_container')
  const [description, setDescription] = useState('Safely restart a named Docker container')
  const [code, setCode] = useState(codeSample)
  const [query, setQuery] = useState('')
  const initialMessages: ChatMessage[] = [{ role: 'assistant', text: 'Ask about a container, build, or metric. I will read the stored telemetry and any indexed runbooks. Saving a tool does not run it until you press the tool or turn on automatic remediation.', time: 'now' }]
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const messagesRef = useRef<ChatMessage[]>(initialMessages)
  const requestInFlight = useRef(false)
  const incidentAutoStarted = useRef(false)
  const [toast, setToast] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  // 🌟 ۱. انتقال صحیح استیت ویرایش ابزار به بالاترین لایه کامپوننت LabView
  const [editingToolId, setEditingDocId] = useState<string | number | null>(null)

  const toolCount = useMemo(() => tools.length, [tools])
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2800) }
  const executeTool = async (tool: DynamicTool) => {
    const target = window.prompt(`Run ${tool.name}. Enter the target resource, or leave it blank.`, '') ?? ''
    try {
      const result = await apiRequest<{ success: boolean; stdout: string; stderr: string; error: string | null }>(`/mcp/tools/${tool.id}/run/`, {
        method: 'POST',
        body: JSON.stringify({ target }),
      })
      const text = result.success ? (result.stdout || 'Tool finished') : (result.stderr || result.error || 'Tool failed')
      notify(text.slice(0, 180))
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Run failed')
    }
  }

  const fetchTools = () => { apiRequest<DynamicTool[]>('/mcp/tools/').then((rows) => setTools(Array.isArray(rows) ? rows : [])).catch(() => undefined) }

  useEffect(() => { fetchTools() }, [])

  const removeTool = async (tool: DynamicTool) => {
    if (!window.confirm(`Remove ${tool.name} from the MCP runtime?`)) return;
    try {
      await apiRequest(`/mcp/tools/${tool.id}/?confirm=true`, { method: 'DELETE' });
      setTools((current) => current.filter((item) => String(item.id) !== String(tool.id)));
      notify(`${tool.name} removed from runtime manager`)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Remove failed')
    }
  }

  // 🌟 ۲. ادغام کامل و یگانه کردن متد register (حل خطای توابع هم‌نام)
  const register = async () => {
    const cleanName = toolName.trim().replace(/\s+/g, '_')
    if (!cleanName) return
    const payload = { name: cleanName, description: description || 'Dynamic MCP runtime tool', code }

    try {
      if (editingToolId) {
        // اگر آیدی ویرایش موجود بود، همان ابزار را PATCH کن
        await apiRequest(`/mcp/tools/${editingToolId}/`, { method: 'PATCH', body: JSON.stringify(payload) })
      } else {
        // در غیر این صورت ابزار جدید بساز
        await apiRequest('/mcp/tools/', { method: 'POST', body: JSON.stringify(payload) })
      }

      fetchTools() // لود مجدد ابزارها در جدول دیتابیس

      // ریسیت کردن کامل فیلدهای فرم بعد از کامپایل موفق
      setEditingDocId(null)
      setToolName('restart_container')
      setDescription('Safely restart a named Docker container')
      setCode(codeSample)

      notify(`${cleanName} synchronized in runtime manager 🎉`)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Register failed')
    }
  }

  const sendMessage = async (override?: string, approveRemediation = false) => {
    const clean = (override ?? query).trim()
    if (!clean || requestInFlight.current) return
    requestInFlight.current = true

    const previous = messagesRef.current
    const history = previous
      .filter((item) => item.text && item.time !== 'now')
      .slice(-8)
      .map(({ role, text }) => ({ role, text }))
    const updatedMessages: ChatMessage[] = [
      ...previous,
      { role: 'user', text: clean, time: new Date().toLocaleTimeString() }
    ]
    messagesRef.current = updatedMessages
    setMessages(updatedMessages)
    setQuery('')
    setAiLoading(true)

    try {
      const res = await apiRequest<{
        reply: string; engine_status?: string; router?: string; laya_model?: string
        incident_id?: number | null; action?: ChatAction
        user_report?: UserDiagnosticReport | null; ollama_error?: OllamaDiagnosticError | null; trace_id?: string | null
      }>('/mcp/chat/', {
        method: 'POST',
        body: JSON.stringify({
          message: clean,
          ...(incident ? { incident_id: incident.id } : {}),
          ...(approveRemediation ? { remediate: true } : {}),
          history
        })
      })
      const assistant: ChatMessage = {
        role: 'assistant',
        text: res.reply,
        engineStatus: res.engine_status,
        router: res.router,
        layaModel: res.laya_model,
        action: res.action,
        userReport: res.user_report,
        ollamaError: res.ollama_error,
        traceId: res.trace_id,
        requestedRemediation: approveRemediation,
        time: new Date().toLocaleTimeString()
      }
      messagesRef.current = [...updatedMessages, assistant]
      setMessages(messagesRef.current)
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unable to contact the diagnostic backend.'
      const failure: ChatMessage = {
        role: 'assistant',
        text: `⚠️ Diagnosis request failed: ${detail}`,
        time: new Date().toLocaleTimeString()
      }
      messagesRef.current = [...updatedMessages, failure]
      setMessages(messagesRef.current)
    } finally {
      requestInFlight.current = false
      setAiLoading(false)
    }
  }

  useEffect(() => {
    if (!incident || incidentAutoStarted.current) return
    incidentAutoStarted.current = true
    void sendMessage('Diagnose this incident using the linked incident record and matching telemetry. Explain the likely root cause, give a safe step-by-step recovery plan, and list verification checks. Do not execute tools or change infrastructure.')
    // Trigger exactly once when a new Incident chat mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incident?.id])

  return (
    <div className="lab-grid">
      {/* 🌟 بخش چت کاملاً در بالای صفحه و تمام‌عرض */}
      <section className="panel console-panel">
        <PanelHeader eyebrow="NATURAL LANGUAGE OPS" title="AI Diagnostic Console" icon={MessageSquare} action={<button type="button" className="refresh-button" onClick={onNewChat}><MessageSquare size={14} /> New chat</button>} />
        {incident && (
          <div className="incident-chat-context" role="status">
            <div><strong>Incident #{incident.id}: {incident.title}</strong><span>{incident.resource} · {incident.source.toUpperCase()} · {incident.severity.toUpperCase()}</span></div>
            <small>AI investigation · No infrastructure changes without explicit approval</small>
            <button
              type="button"
              className="incident-remediate-button"
              disabled={aiLoading || messages.length < 3 || messages[messages.length - 1]?.engineStatus !== 'ok' || messages.some((item) => item.action?.resolved)}
              onClick={() => {
                if (window.confirm(`Approve the AI agent to attempt remediation of ${incident.resource} using an available MCP tool? This may change infrastructure.`)) {
                  void sendMessage('Attempt a suitable, safe remediation for this incident using the registered MCP tools. Verify the resource state after execution. If no appropriate tool is available, give manual recovery steps and do not claim the incident is resolved.', true)
                }
              }}
            >
              <Zap size={13} /> Approve remediation
            </button>
          </div>
        )}
        <div className="chat-toolbar">
          <div className="bot-avatar"><Sparkles size={20} /></div>
          <div><strong>Revive</strong><span>Context: telemetry + ChromaDB + MCP runtime</span></div>
          <span className="secure-badge">SAFE MODE</span>
        </div>

        {/* 🌟 موتور پردازش و رندر شرطی کارت‌های گزارش خطا در page.tsx */}
        {messages.map((message, index) => {
          if (message.role === 'user') {
            return (
              <div className="chat-message user" key={index}>
                <div className="message-body"><p>{message.text}</p></div>
              </div>
            )
          }

          // Always show the structured user-facing report when the API provides it.
          if (message.userReport && typeof message.userReport.summary === 'string') {
            return (
              <div className="chat-message assistant" key={index} style={{ width: '100%', maxWidth: '100%' }}>
                <div className="message-avatar"><Sparkles size={13} /></div>
                <div className="message-body" style={{ flex: 1 }}>
                  <DiagnosticReportCard
                    report={message.userReport}
                    error={message.ollamaError}
                    router={message.router}
                    traceId={message.traceId}
                  />
                </div>
              </div>
            )
          }

          // Legacy API fallback while the new Backend has not been deployed.
          try {
            const report = JSON.parse(message.text || '{}')
            const offline = message.engineStatus === 'offline' || report.engine_status === 'offline'
            const unusable = !offline && (
              message.engineStatus === 'invalid'
              || report.engine_status === 'invalid'
              || typeof report.incident_detected !== 'boolean'
              || typeof report.diagnostic_report !== 'string'
            )
            if (offline || unusable) {
              return (
                <div className="chat-message assistant" key={index} style={{ width: '100%', maxWidth: '100%' }}>
                  <div className="message-avatar"><Sparkles size={13} /></div>
                  <div className="message-body" style={{ flex: 1 }}>
                    <div className="report-box" style={{ margin: '0 0 12px', minHeight: 'auto', background: '#fff7ed', borderColor: '#fdba74' }}>
                      <div className="report-header" style={{ color: '#9a3412', borderBottom: '1px solid #fdba74' }}>{offline ? 'Model offline' : 'Diagnosis unusable'}</div>
                      <div className="report-content" style={{ color: '#7c2d12', padding: '14px' }}>
                        <p style={{ margin: 0 }}>{report.diagnostic_report || message.text}</p>
                      </div>
                    </div>
                    {message.router ? <p className="settings-note">Router: {message.router}{message.layaModel ? ` (${message.layaModel})` : ''}</p> : null}
                  </div>
                </div>
              )
            }
            return (
              <div className="chat-message assistant" key={index} style={{ width: '100%', maxWidth: '100%' }}>
                <div className="message-avatar"><Sparkles size={13} /></div>
                <div className="message-body" style={{ flex: 1 }}>

                  {report.incident_detected ? (
                    <div className="report-box" style={{ margin: '0 0 12px', minHeight: 'auto', background: '#fef2f2', borderColor: '#fca5a5' }}>
                      <div className="report-header" style={{ color: '#991b1b', borderBottom: '1px solid #fca5a5', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>SYSTEM CRITICAL ALERT: {report.error_scope}</span>
                      </div>
                      <div className="report-content" style={{ color: '#7f1d1d', padding: '14px' }}>
                        <p style={{ margin: 0, fontWeight: 'bold' }}>{report.diagnostic_report}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="report-box" style={{ margin: '0 0 12px', minHeight: 'auto', background: incident ? '#fff7ed' : '#f0fdf4', borderColor: incident ? '#fdba74' : '#bbf7d0' }}>
                      <div className="report-header" style={{ color: incident ? '#9a3412' : '#166534', borderBottom: incident ? '1px solid #fdba74' : '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{incident ? 'RECORDED INCIDENT · AI DID NOT CONFIRM' : 'INFRASTRUCTURE TELEMETRY STATUS NOMINAL'}</span>
                      </div>
                      <div className="report-content" style={{ color: incident ? '#7c2d12' : '#14532d', padding: '14px' }}>
                        <p style={{ margin: 0 }}>{report.diagnostic_report}</p>
                      </div>
                    </div>
                  )}

                  {Array.isArray(report.evidence_refs) && report.evidence_refs.length > 0 ? <p className="settings-note">Evidence: {report.evidence_refs.join(', ')}</p> : null}
                  {(message.requestedRemediation || message.action?.triggered) ? (
                    <div className="incident-remediation-result" role="status">
                      <strong>{message.action?.resolved ? 'Resolution verified' : message.action?.triggered ? message.action.success ? 'Tool executed · resolution not verified' : 'Remediation attempt failed' : 'No remediation tool executed'}</strong>
                      {message.action?.triggered && <span>Tool: {message.action.tool || 'unspecified'}</span>}
                      <p>{message.action?.message || (message.action?.triggered ? 'Check the resource state and follow the diagnostic guidance.' : 'The AI did not select an executable tool for this request. Use the proposed manual recovery steps.')}</p>
                    </div>
                  ) : null}
                  {message.router ? <p className="settings-note">Router: {message.router}{message.layaModel ? ` (${message.layaModel})` : ''}</p> : null}

                </div>
              </div>
            )
          } catch {
            // سیستم پشتیبان متنی ساده در صورت نبود ساختار JSON
            return (
              <div className="chat-message assistant" key={index}>
                <div className="message-avatar"><Sparkles size={13} /></div>
                <div className="message-body"><p>{message.text || message.reply}</p></div>
              </div>
            )
          }
        })}


        {aiLoading && <div className="chat-thinking" role="status"><Sparkles size={14} /> AI is analyzing incident evidence and runbooks…</div>}
        <div className="ask-bar">
          <Search size={16} />
          <input aria-label="Ask Revive" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) sendMessage() }} placeholder="Ask about your infrastructure..." />
          <button onClick={() => void sendMessage()} aria-label="Send message" disabled={aiLoading}><ArrowUpRight size={16} /></button>
        </div>
        <div className="console-footer"><span><CheckCircle2 size={13} /> Responses are grounded in connected sources</span><span>Enter to send · Shift+Enter for newline</span></div>
      </section>

      {/* 🌟 بخش ابزارساز MCP کاملاً در زیر چت‌باکس */}
      <section className="panel tool-panel">
        <PanelHeader eyebrow="RUNTIME EXTENSION LAYER" title="Dynamic MCP Tool Creator" icon={Code2} action={<span className="compile-status"><CircleDot size={12} /> READY</span>} />
        <div className="field-grid">
          <label><span>Tool Name</span><input value={toolName} onChange={(e) => setToolName(e.target.value)} placeholder="restart_container" /></label>
          <label><span>Tool Description</span><input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this tool do?" /></label>
        </div>
        <label className="code-editor">
          <div className="editor-top"><span><Code2 size={13} /> tool_definition.py</span><span>PYTHON 3.12</span></div>
          <textarea value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} />
        </label>
        <button className="compile-button" onClick={register}><Zap size={16} /> Save tool <span><Play size={13} /></span></button>

        <div className="section-label"><span>Active hot-pluggable tools</span><small>{toolCount} loaded</small></div>

        <div className="tool-buttons">
          {tools.map((tool) => (
            <div className="tool-row" key={tool.id}>
              <button className="tool-button" onClick={() => executeTool(tool)}>
                <div className="tool-button-icon"><Terminal size={14} /></div>
                <div><strong>{tool.name}</strong><span>{tool.description}</span></div>
                <ArrowUpRight size={14} />
              </button>

              {/* 🛠️ دکمه اصلاح‌شده ادیت با فراخوانی شناسه یگانه استیت */}
              <button
                className="row-action"
                title="Edit MCP Tool"
                onClick={() => {
                  setEditingDocId(tool.id);
                  setToolName(tool.name);
                  setDescription(tool.description);
                  setCode(tool.code || `@mcp.tool()\ndef ${tool.name}():\n    pass`);
                  notify(`Loaded ${tool.name} into workspace`);
                }}
              >
                <Settings2 size={13} />
              </button>

              <button className="row-action danger" aria-label={`Remove ${tool.name}`} title="Remove MCP tool" onClick={() => removeTool(tool)}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </section>

      {toast && <div className="toast"><CheckCircle2 size={15} />{toast}</div>}
    </div>
  )
}


export default function Page() {
  const [activeTab, setActiveTab] = useState<TabId>('analytics');
  const [telemetryData, setTelemetryData] = useState<TelemetryData | null>(null);
  const [telemetryError, setTelemetryError] = useState<string | null>(null);
  const [telemetryLoading, setTelemetryLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [incidentRefresh, setIncidentRefresh] = useState(0);
  const [chatSessionId, setChatSessionId] = useState(0);
  const [incidentForChat, setIncidentForChat] = useState<IncidentRecord | null>(null);
  const [labMounted, setLabMounted] = useState(false);

  const resolveIncidentWithAI = (incident: IncidentRecord) => {
    setIncidentForChat(incident);
    setChatSessionId((current) => current + 1);
    setLabMounted(true);
    setActiveTab('lab');
  };
  const openNewChat = () => {
    setIncidentForChat(null);
    setChatSessionId((current) => current + 1);
  };

  useEffect(() => {
    if (activeTab === 'lab') setLabMounted(true);
  }, [activeTab]);

  // 🌟 ۱. استیت‌های جدید برای مدیریت پنل گرافیکی تنظیمات سیستم
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [ollamaHost, setOllamaHost] = useState('http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState('qwen2.5-coder:7b');
  const [settingsSaving, setSettingsSaving] = useState(false);

  // لود اولیه فیلتر متریک‌ها از LocalStorage
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('opshub_filtered_metrics');
      return saved ? JSON.parse(saved) : ['node_cpu_seconds_total', 'node_memory_MemAvailable_bytes', 'node_filesystem_free_bytes', 'node_network_receive_bytes_total'];
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('opshub_filtered_metrics', JSON.stringify(selectedMetrics));
  }, [selectedMetrics]);

  const fetchTelemetry = async (showSyncIndicator = false) => {
    if (showSyncIndicator) setIsSyncing(true);
    try {
      const metricsParam = encodeURIComponent(JSON.stringify(selectedMetrics));
      const res = await apiRequest<TelemetryData>(`/infrastructure/telemetry/?filtered_metrics=${metricsParam}`);
      setTelemetryData(res);
      setTelemetryError(null);
    } catch (err: any) {
      setTelemetryError(err.message);
    } finally {
      setTelemetryLoading(false)
      if (showSyncIndicator) {
        setTimeout(() => setIsSyncing(false), 600);
      }
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(() => fetchTelemetry(false), 15000);
    return () => clearInterval(interval);
  }, [selectedMetrics]);

  // 🌟 ۲. متد ذخیره پویای کانفیگ‌ها در دیتابیس جنگو
  const handleSaveClusterSettings = async () => {
    setSettingsSaving(true);
    try {
      const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api').replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/mcp/settings/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ollama_host: ollamaHost, ollama_model: ollamaModel })
      });
      if (response.ok) {
        setShowSettingsPanel(false);
        alert('Cluster system configurations synchronized successfully! 🎉');
      } else {
        alert('Failed to save settings to Postgres.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSettingsSaving(false);
    }
  };

  const ActiveIcon = tabs.find((tab) => tab.id === activeTab)?.icon ?? Activity;

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      {/* هدر بالایی وبسایت */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><span /><span /><span /></div>
          <div><strong>RE<span>VIVE</span></strong><small>AI OBSERVABILITY PLATFORM</small></div>
        </div>
        <div className="top-actions">
          <span className="system-status"><StatusDot tone={telemetryError ? 'red' : 'green'} /> {telemetryError ? 'TELEMETRY DEGRADED' : 'TELEMETRY CONNECTED'}</span>

          {/* 🌟 دکمه چرخ‌دنده بالا صفحه اکنون زنده و اکتیو شد */}
          {/* 🌟 اصلاح و زنده کردن دکمه چرخ‌دنده هدر بالا صفحه در page.tsx */}
          {/* 🌟 دکمه چرخ‌دنده هدر در فایل app/page.tsx را به این صورت اصلاح کنید */}
          <button
            className="icon-button"
            aria-label="Settings"
            onClick={() => window.location.href = '/settings'} // هدایت مستقیم مرورگر به صفحه وب مجزا
          >
            <Settings2 size={17} />
          </button>



          <div className="avatar">MK</div>
        </div>
      </header>


      {/* سکشن هیرو و تب‌ها بدون تغییر رندر می‌شوند */}
      <section className="hero">
        <div>
          <div className="hero-kicker"><span /> AIOPS CONTROL PLANE <span className="line" /></div>
          <h1>Infrastructure intelligence,<br /><em>beautifully orchestrated.</em></h1>
          <p>Observe every layer. Query any signal. Deploy intelligence into your runtime.</p>
        </div>
        <div className="hero-meta">
          <div><span>HEALTH</span><strong>{telemetryData?.metrics.system_health ?? '—'}</strong></div>
          <div><span>CONTAINERS</span><strong>{telemetryData?.metrics.active_containers ?? '—'}</strong></div>
          <div><span>LAST SYNC</span><strong>{isSyncing ? 'Syncing...' : 'Just now'}</strong></div>
        </div>
      </section>

      <nav className="tabs" aria-label="Dashboard views">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)}>
              <Icon size={15} />{tab.label}
              <span>{tab.id === 'analytics' ? '01' : tab.id === 'incidents' ? '02' : tab.id === 'knowledge' ? '03' : '04'}</span>
            </button>
          )
        })}
      </nav>

      <div className="active-view">
        <div className="view-heading">
          <div>
            <span className="eyebrow">{activeTab === 'analytics' ? 'REAL-TIME TELEMETRY' : activeTab === 'incidents' ? 'INCIDENT RESPONSE & HISTORY' : activeTab === 'knowledge' ? 'SEMANTIC RETRIEVAL LAYER' : 'EXTENSIBLE INTELLIGENCE'}</span>
            <h2><ActiveIcon size={19} />{tabs.find((tab) => tab.id === activeTab)?.label}</h2>
          </div>
          <div className="view-actions">
            <span className="last-updated"><Activity size={13} /> Auto-refresh enabled</span>
            <button className="refresh-button" onClick={activeTab === 'incidents' ? () => setIncidentRefresh((value) => value + 1) : () => fetchTelemetry(true)} disabled={activeTab === 'analytics' && isSyncing}>
              <Activity size={14} className={isSyncing && activeTab === 'analytics' ? 'animate-spin' : ''} /> {activeTab === 'incidents' ? 'Refresh incidents' : isSyncing ? 'Syncing...' : 'Sync now'}
            </button>
          </div>
        </div>
        {/* 🌟 جایگزین کردن بخش شرطی سه‌تایی تصویر شما با این ساختار تمیز و ۴ کاناله */}
        {activeTab === 'analytics' && (
          <AnalyticsView data={telemetryData} error={telemetryError} loading={telemetryLoading} selectedMetrics={selectedMetrics} setSelectedMetrics={setSelectedMetrics} />
        )}

        {activeTab === 'incidents' && (
          <IncidentView refreshToken={incidentRefresh} onResolveWithAI={resolveIncidentWithAI} />
        )}

        {activeTab === 'knowledge' && (
          <KnowledgeView />
        )}

        {(activeTab === 'lab' || labMounted) && (
          <div style={{ display: activeTab === 'lab' ? 'block' : 'none' }}>
            <LabView key={chatSessionId} incident={incidentForChat} onNewChat={openNewChat} />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="settings-page-wrapper">
            <div className="settings-page-header">
              <Settings2 size={20} style={{ color: 'var(--blue)' }} />
              <h1>Cluster System Environment</h1>
            </div>

            <div className="settings-form-group">
              <div className="settings-input-card">
                <span>OLLAMA EDGE NODE HOST</span>
                <input
                  value={ollamaHost}
                  onChange={(e) => setOllamaHost(e.target.value)}
                  placeholder="http://localhost:11434"
                />
              </div>

              <div className="settings-input-card">
                <span>TARGET LLM MODEL</span>
                <input
                  value={ollamaModel}
                  onChange={(e) => setOllamaModel(e.target.value)}
                  placeholder="qwen2.5-coder:7b"
                />
              </div>

              <div className="settings-action-row">
                <button
                  onClick={handleSaveClusterSettings}
                  disabled={settingsSaving}
                  className="compile-button"
                  style={{ flex: 1, margin: 0, height: '40px', background: 'var(--blue)', color: '#fff' }}
                >
                  {settingsSaving ? 'Syncing Environment...' : 'Apply & Verify Configs'}
                </button>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className="refresh-button"
                  style={{ height: '40px', padding: '0 20px' }}
                >
                  Back to Panel
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
