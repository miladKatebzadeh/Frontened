'use client'

import { useEffect, useState } from 'react'
import { Activity, ArrowLeft, Database, Radio, Sparkles } from 'lucide-react'

type Section = 'ollama' | 'telemetry' | 'knowledge' | 'langfuse'
type Service = 'ollama' | 'prometheus' | 'jenkins' | 'chroma' | 'docker' | 'langfuse' | 'langfuse_trace'
type Probe = { status: 'connected' | 'offline' | 'invalid'; latency_ms?: number; message?: string; models?: string[] }

const sections = [
    { id: 'ollama', label: 'Ollama', icon: Sparkles },
    { id: 'telemetry', label: 'Telemetry', icon: Activity },
    { id: 'knowledge', label: 'ChromaDB', icon: Database },
    { id: 'langfuse', label: 'Langfuse', icon: Radio },
] as const

function apiBase() {
    return (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api').replace(/\/$/, '')
}

function apiHeaders(json = false): Record<string, string> {
    const headers: Record<string, string> = {}
    if (json) headers['Content-Type'] = 'application/json'
    if (process.env.NEXT_PUBLIC_OPSHUB_API_KEY) headers['X-API-Key'] = process.env.NEXT_PUBLIC_OPSHUB_API_KEY
    return headers
}

function Field({ label, error, help, children }: { label: string; error?: string; help?: string; children: React.ReactNode }) {
    return (
        <label className="settings-input-card">
            <span>{label}</span>
            {children}
            {help ? <small className="settings-help">{help}</small> : null}
            {error ? <small className="settings-error">{error}</small> : null}
        </label>
    )
}

export default function SettingsPage() {
    const [section, setSection] = useState<Section>('ollama')
    const [saving, setSaving] = useState(false)
    const [notice, setNotice] = useState('')
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [probes, setProbes] = useState<Partial<Record<Service, Probe>>>({})
    const [probing, setProbing] = useState<Service | null>(null)

    const [ollamaHost, setOllamaHost] = useState('http://localhost:11434')
    const [ollamaModel, setOllamaModel] = useState('qwen2.5-coder:7b')
    const [models, setModels] = useState<string[]>([])
    const [prometheusUrl, setPrometheusUrl] = useState('http://127.0.0.1:9090')
    const [jenkinsUrl, setJenkinsUrl] = useState('http://127.0.0.1:8080')
    const [jenkinsUser, setJenkinsUser] = useState('')
    const [jenkinsToken, setJenkinsToken] = useState('')
    const [dockerHost, setDockerHost] = useState('')
    const [tokenIsSet, setTokenIsSet] = useState(false)
    const [scrapeInterval, setScrapeInterval] = useState('15')
    const [autoRemediate, setAutoRemediate] = useState(false)
    const [chromaHost, setChromaHost] = useState('localhost')
    const [chromaPort, setChromaPort] = useState('8001')
    const [embeddingEngine, setEmbeddingEngine] = useState('all-MiniLM-L6-v2')
    const [confirmReindex, setConfirmReindex] = useState(false)
    const [langfuseUrl, setLangfuseUrl] = useState('http://127.0.0.1:3030')
    const [langfusePublicKey, setLangfusePublicKey] = useState('')
    const [langfuseSecret, setLangfuseSecret] = useState('')
    const [langfuseSecretSet, setLangfuseSecretSet] = useState(false)

    useEffect(() => {
        fetch(`${apiBase()}/mcp/settings/`, { headers: apiHeaders() })
            .then((response) => response.ok ? response.json() : null)
            .then((settings) => {
                if (!settings) return
                if (settings.ollama_host) setOllamaHost(settings.ollama_host)
                if (settings.ollama_model) setOllamaModel(settings.ollama_model)
                if (settings.prometheus_url) setPrometheusUrl(settings.prometheus_url)
                if (settings.jenkins_url) setJenkinsUrl(settings.jenkins_url)
                if (settings.docker_host) setDockerHost(settings.docker_host)
                setJenkinsUser(settings.jenkins_user || '')
                if (settings.scrape_interval) setScrapeInterval(String(settings.scrape_interval))
                if (settings.chroma_host) setChromaHost(settings.chroma_host)
                if (settings.chroma_port) setChromaPort(String(settings.chroma_port))
                if (settings.embedding_engine) setEmbeddingEngine(settings.embedding_engine)
                setAutoRemediate(settings.auto_remediate === '1' || settings.auto_remediate === 'true')
                setTokenIsSet(Boolean(settings.jenkins_token_set))
                if (settings.langfuse_base_url) setLangfuseUrl(settings.langfuse_base_url)
                setLangfusePublicKey(settings.langfuse_public_key || '')
                setLangfuseSecretSet(Boolean(settings.langfuse_secret_set))
            })
            .catch(() => undefined)
    }, [])

    const probe = async (service: Service) => {
        setProbing(service)
        const payload: Record<string, string> = { service }
        if (service === 'ollama') {
            payload.ollama_host = ollamaHost
        } else if (service === 'prometheus') {
            payload.prometheus_url = prometheusUrl
        } else if (service === 'jenkins') {
            payload.jenkins_url = jenkinsUrl
            payload.jenkins_user = jenkinsUser
            if (jenkinsToken) payload.jenkins_token = jenkinsToken
        } else if (service === 'docker') {
            payload.docker_host = dockerHost
        } else if (service === 'langfuse' || service === 'langfuse_trace') {
            payload.langfuse_base_url = langfuseUrl
            payload.langfuse_public_key = langfusePublicKey
            if (langfuseSecret) payload.langfuse_secret_key = langfuseSecret
        } else {
            payload.chroma_host = chromaHost
            payload.chroma_port = chromaPort
        }
        try {
            const response = await fetch(`${apiBase()}/mcp/settings/test/`, {
                method: 'POST',
                headers: apiHeaders(true),
                body: JSON.stringify(payload),
            })
            const data = await response.json()
            setProbes((current) => ({ ...current, [service]: data }))
            if (service === 'ollama' && Array.isArray(data.models)) setModels(data.models)
        } catch {
            setProbes((current) => ({ ...current, [service]: { status: 'offline', message: 'Could not reach the API.' } }))
        } finally {
            setProbing(null)
        }
    }

    const save = async (payload: Record<string, string | boolean>) => {
        setSaving(true)
        setNotice('')
        setErrors({})
        try {
            const response = await fetch(`${apiBase()}/mcp/settings/`, {
                method: 'POST',
                headers: apiHeaders(true),
                body: JSON.stringify(payload),
            })
            const data = await response.json().catch(() => ({}))
            if (response.status === 409) {
                setErrors(data.errors || {})
                setNotice('Confirm the knowledge rebuild before saving a new embedding model.')
                return
            }
            if (!response.ok) {
                setErrors(data.errors || {})
                setNotice(data.detail || 'Save failed.')
                return
            }
            if (typeof payload.jenkins_token === 'string' && payload.jenkins_token) {
                setTokenIsSet(true)
                setJenkinsToken('')
            }
            if (typeof payload.langfuse_secret_key === 'string' && payload.langfuse_secret_key) {
                setLangfuseSecretSet(true)
                setLangfuseSecret('')
            }
            const nextCycle = Array.isArray(data.notes) && data.notes.some((note: string) => note.includes('next collector cycle'))
            const reindex = data.reindex
            if (reindex && reindex.reindexed) setNotice(`Saved. Reindexed ${reindex.count} documents.`)
            else if (reindex) setNotice('Saved, but Chroma was offline so the index was not rebuilt.')
            else if (nextCycle) setNotice('Saved. The scrape interval applies on the next collector cycle.')
            else setNotice('Saved.')
        } catch {
            setNotice('Could not reach the API.')
        } finally {
            setSaving(false)
        }
    }

    const probeLine = (service: Service) => {
        const result = probes[service]
        if (probing === service) return <small className="settings-note">Testing…</small>
        if (!result) return null
        const label = result.status === 'connected'
            ? `Connected${typeof result.latency_ms === 'number' ? `, ${result.latency_ms}ms` : ''}`
            : result.status === 'invalid' ? 'Not accepted' : 'Offline'
        return <small className={`settings-probe ${result.status}`}>{label}{result.message ? ` — ${result.message}` : ''}</small>
    }

    return (
        <main className="app-shell" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', paddingBottom: '60px' }}>
            <div className="ambient ambient-one" />
            <div className="ambient ambient-two" />
            <header className="topbar" style={{ flexShrink: 0 }}>
                <div className="brand">
                    <div className="brand-mark"><span /><span /><span /></div>
                    <div><strong>RE<span>VIVE</span></strong><small>SETTINGS</small></div>
                </div>
                <div className="top-actions">
                    <button onClick={() => window.location.href = '/'} className="refresh-button" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <ArrowLeft size={14} /> Back to dashboard
                    </button>
                </div>
            </header>

            <section className="hero" style={{ padding: '42px 0 28px' }}>
                <div>
                    <div className="hero-kicker"><span /> SERVICE ENDPOINTS <span className="line" /></div>
                    <h1 style={{ margin: '12px 0 0', fontSize: '32px' }}>Test an address before you save it</h1>
                </div>
            </section>

            <div style={{ maxWidth: '1260px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <nav className="tabs" style={{ margin: 0, width: '100%' }}>
                    {sections.map((item) => {
                        const Icon = item.icon
                        return (
                            <button key={item.id} className={section === item.id ? 'active' : ''} onClick={() => { setSection(item.id); setNotice(''); setErrors({}) }}>
                                <Icon size={15} />{item.label}
                            </button>
                        )
                    })}
                </nav>

                <section className="panel" style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '8px' }}>
                    {section === 'ollama' && (
                        <div className="field-grid" style={{ gridTemplateColumns: '1fr', padding: '20px 18px' }}>
                            <Field label="Ollama host" error={errors.ollama_host} help="Example: http://192.168.1.20:11434">
                                <input value={ollamaHost} onChange={(event) => setOllamaHost(event.target.value)} placeholder="http://localhost:11434" />
                            </Field>
                            <Field label="Model" error={errors.ollama_model} help="The saved model stays until you pick another one.">
                                {models.length > 0 ? (
                                    <select value={models.includes(ollamaModel) ? ollamaModel : ''} onChange={(event) => setOllamaModel(event.target.value)}>
                                        {!models.includes(ollamaModel) ? <option value="">{ollamaModel} is not on this host</option> : null}
                                        {models.map((name) => <option key={name} value={name}>{name}</option>)}
                                    </select>
                                ) : (
                                    <input value={ollamaModel} onChange={(event) => setOllamaModel(event.target.value)} placeholder="qwen2.5-coder:7b" />
                                )}
                            </Field>
                            {probeLine('ollama')}
                            <div className="settings-action-row">
                                <button className="refresh-button" type="button" onClick={() => probe('ollama')} disabled={probing !== null}>Test connection</button>
                                <button className="compile-button" type="button" style={{ flex: 1, margin: 0 }} disabled={saving} onClick={() => save({ ollama_host: ollamaHost, ollama_model: ollamaModel })}>
                                    {saving ? 'Saving…' : 'Save model'}
                                </button>
                            </div>
                        </div>
                    )}

                    {section === 'telemetry' && (
                        <div className="field-grid" style={{ gridTemplateColumns: '1fr', padding: '20px 18px' }}>
                            <Field label="Docker API" error={errors.docker_host} help="Engine API of any host. Example: http://127.0.0.1:2375. Leave blank to skip collection.">
                                <input value={dockerHost} onChange={(event) => setDockerHost(event.target.value)} placeholder="http://127.0.0.1:2375" />
                            </Field>
                            {probeLine('docker')}
                            <button className="refresh-button" type="button" onClick={() => probe('docker')} disabled={probing !== null}>Test Docker</button>
                            <Field label="Prometheus URL" error={errors.prometheus_url} help="Example: http://10.0.0.5:9090">
                                <input value={prometheusUrl} onChange={(event) => setPrometheusUrl(event.target.value)} placeholder="http://127.0.0.1:9090" />
                            </Field>
                            {probeLine('prometheus')}
                            <button className="refresh-button" type="button" onClick={() => probe('prometheus')} disabled={probing !== null}>Test Prometheus</button>
                            <Field label="Jenkins URL" error={errors.jenkins_url}>
                                <input value={jenkinsUrl} onChange={(event) => setJenkinsUrl(event.target.value)} placeholder="http://127.0.0.1:8080" />
                            </Field>
                            <Field label="Jenkins user" error={errors.jenkins_user} help="Leave blank to clear the saved user.">
                                <input value={jenkinsUser} onChange={(event) => setJenkinsUser(event.target.value)} placeholder="milad" />
                            </Field>
                            <Field label="Jenkins API token" error={errors.jenkins_token} help={tokenIsSet ? 'A token is saved. Leave this blank to keep it.' : 'API token, not the login password.'}>
                                <input type="password" value={jenkinsToken} onChange={(event) => setJenkinsToken(event.target.value)} placeholder={tokenIsSet ? '••••••••' : 'token'} autoComplete="new-password" />
                            </Field>
                            {probeLine('jenkins')}
                            <button className="refresh-button" type="button" onClick={() => probe('jenkins')} disabled={probing !== null}>Test Jenkins</button>
                            <Field label="Scrape interval (seconds)" error={errors.scrape_interval} help="5 to 3600. Applies on the next collector cycle.">
                                <input type="number" min={5} max={3600} value={scrapeInterval} onChange={(event) => setScrapeInterval(event.target.value)} />
                            </Field>
                            <button className="compile-button" type="button" disabled={saving} onClick={() => save({
                                docker_host: dockerHost,
                                prometheus_url: prometheusUrl,
                                jenkins_url: jenkinsUrl,
                                jenkins_user: jenkinsUser,
                                jenkins_token: jenkinsToken,
                                scrape_interval: scrapeInterval,
                            })}>
                                {saving ? 'Saving…' : 'Save telemetry'}
                            </button>

                            <div className="settings-input-card" style={{ marginTop: '8px' }}>
                                <span>Automatic remediation</span>
                                <label className="settings-check">
                                    <input type="checkbox" checked={autoRemediate} onChange={(event) => setAutoRemediate(event.target.checked)} />
                                    <span>Run the matched tool once per incident. It runs on the Django machine, not in a separate sandbox.</span>
                                </label>
                                <button className="refresh-button" type="button" disabled={saving} onClick={() => save({ auto_remediate: autoRemediate ? '1' : '0' })}>
                                    {saving ? 'Saving…' : 'Save remediation'}
                                </button>
                            </div>
                        </div>
                    )}

                    {section === 'knowledge' && (
                        <div className="field-grid" style={{ gridTemplateColumns: '1fr', padding: '20px 18px' }}>
                            <Field label="Chroma host" error={errors.chroma_host} help="Hostname or IP only, no http. Example: 192.168.1.20">
                                <input value={chromaHost} onChange={(event) => setChromaHost(event.target.value)} placeholder="localhost" />
                            </Field>
                            <Field label="Chroma port" error={errors.chroma_port}>
                                <input value={chromaPort} onChange={(event) => setChromaPort(event.target.value)} placeholder="8001" />
                            </Field>
                            {probeLine('chroma')}
                            <button className="refresh-button" type="button" onClick={() => probe('chroma')} disabled={probing !== null}>Test Chroma</button>
                            <Field label="Embedding model" error={errors.embedding_engine} help="Changing this makes the current index incompatible. It has to be rebuilt.">
                                <input value={embeddingEngine} onChange={(event) => { setEmbeddingEngine(event.target.value); setConfirmReindex(false) }} placeholder="all-MiniLM-L6-v2" />
                            </Field>
                            <label className="settings-check">
                                <input type="checkbox" checked={confirmReindex} onChange={(event) => setConfirmReindex(event.target.checked)} />
                                <span>Rebuild the knowledge index. Documents are written to Chroma again from the database.</span>
                            </label>
                            <button className="compile-button" type="button" disabled={saving} onClick={() => save({
                                chroma_host: chromaHost,
                                chroma_port: chromaPort,
                                embedding_engine: embeddingEngine,
                                ...(confirmReindex ? { confirm_reindex: '1' } : {}),
                            })}>
                                {saving ? 'Saving…' : 'Save knowledge'}
                            </button>
                        </div>
                    )}

                    {section === 'langfuse' && (
                        <div className="field-grid" style={{ gridTemplateColumns: '1fr', padding: '20px 18px' }}>
                            <Field label="Langfuse URL" error={errors.langfuse_base_url} help="Address the backend can reach. Inside Docker, 127.0.0.1 is the container itself, not the host.">
                                <input value={langfuseUrl} onChange={(event) => setLangfuseUrl(event.target.value)} placeholder="http://10.0.0.8:3030" />
                            </Field>
                            <Field label="Public key" error={errors.langfuse_public_key}>
                                <input value={langfusePublicKey} onChange={(event) => setLangfusePublicKey(event.target.value)} placeholder="pk-lf-..." autoComplete="off" />
                            </Field>
                            <Field label="Secret key" error={errors.langfuse_secret_key} help={langfuseSecretSet ? 'A secret is saved. Leave this blank to keep it.' : 'Secret key for this Langfuse project.'}>
                                <input type="password" value={langfuseSecret} onChange={(event) => setLangfuseSecret(event.target.value)} placeholder={langfuseSecretSet ? '••••••••' : 'sk-lf-...'} autoComplete="new-password" />
                            </Field>
                            {probeLine('langfuse')}
                            {probeLine('langfuse_trace')}
                            <div className="settings-action-row">
                                <button className="refresh-button" type="button" onClick={() => probe('langfuse')} disabled={probing !== null}>Test access</button>
                                <button className="refresh-button" type="button" onClick={() => probe('langfuse_trace')} disabled={probing !== null}>Send sample trace</button>
                            </div>
                            <button className="compile-button" type="button" disabled={saving} onClick={() => save({
                                langfuse_base_url: langfuseUrl,
                                langfuse_public_key: langfusePublicKey,
                                langfuse_secret_key: langfuseSecret,
                            })}>
                                {saving ? 'Saving…' : 'Save Langfuse'}
                            </button>
                        </div>
                    )}
                    {notice ? <p className="settings-note" style={{ padding: '0 18px 18px' }}>{notice}</p> : null}
                </section>
            </div>
        </main>
    )
}
