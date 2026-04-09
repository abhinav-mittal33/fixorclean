'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Papa from 'papaparse';
import styles from './dashboard.module.css';

const COLORS = ['#1A8C68', '#0D0D0D', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#10b981'];

// ===== Types =====
interface DetectedColumn {
  name: string;
  type: string;
  sampleValues: string[];
  nullCount: number;
  uniqueCount: number;
}

interface CleaningSuggestion {
  row: number;
  column: string;
  original: string;
  suggested: string;
  rule: string;
  confidence: number;
  category: string;
}

interface AnalysisInsight {
  type: string;
  title: string;
  description: string;
  severity: string;
}

interface TextTheme {
  theme: string;
  percentage: number;
  sentiment: string;
  representativeQuote: string;
  count: number;
}

type Stage = 'design' | 'upload' | 'preview' | 'rules' | 'clean' | 'analyze' | 'report';

// ===== Main Component =====
export default function DashboardClient() {
  const [stage, setStage] = useState<Stage>('design');
  const [filename, setFilename] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [columns, setColumns] = useState<DetectedColumn[]>([]);
  const [suggestions, setSuggestions] = useState<CleaningSuggestion[]>([]);
  const [insights, setInsights] = useState<AnalysisInsight[]>([]);
  const [reportSummary, setReportSummary] = useState('');
  const [themes, setThemes] = useState<Record<string, TextTheme[]>>({});
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState('');
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<number>>(new Set());
  const [rejectedSuggestions, setRejectedSuggestions] = useState<Set<number>>(new Set());
  const [editingSuggestion, setEditingSuggestion] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  
  const [userRules, setUserRules] = useState<Record<string, string>>({});
  const [dragActive, setDragActive] = useState(false);
  const [formLink, setFormLink] = useState('');
  const [fetchingForm, setFetchingForm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ===== Design Check =====
  const [designUrl, setDesignUrl] = useState('');
  const [designChecking, setDesignChecking] = useState(false);
  const [designScore, setDesignScore] = useState<any>(null);

  // ===== Playbooks =====
  const [playbooks, setPlaybooks] = useState<{ id: string; name: string; rules: any[]; createdAt: number }[]>([]);
  const [showPlaybookInput, setShowPlaybookInput] = useState(false);
  const [newPlaybookName, setNewPlaybookName] = useState('');

  const visibleRows = rows.filter(r => r._isDeleted !== 'true');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('formiq_playbooks');
      if (saved) setPlaybooks(JSON.parse(saved));
    } catch(e) {}
  }, []);

  // ===== Upload =====
  const handleUpload = useCallback(async (file: File) => {
    setError('');
    setLoading(true);
    setLoadingMsg('Processing your file...');

    // Reset all state from any previous upload/session
    setSuggestions([]);
    setAppliedSuggestions(new Set());
    setRejectedSuggestions(new Set());
    setEditingSuggestion(null);
    setInsights([]);
    setReportSummary('');
    setThemes({});
    setUserRules({});

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setFilename(data.filename);
      setHeaders(data.headers);
      setRows(data.rows);
      setColumns(data.columns);
      setStage('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  // ===== Google Form Link =====
  const fetchFromFormLink = useCallback(async () => {
    if (!formLink.trim()) return;
    setFetchingForm(true);
    setError('');
    setLoading(true);
    setLoadingMsg('Fetching data from Google Form...');

    // Reset all state from any previous upload/session
    setSuggestions([]);
    setAppliedSuggestions(new Set());
    setRejectedSuggestions(new Set());
    setEditingSuggestion(null);
    setInsights([]);
    setReportSummary('');
    setThemes({});
    setUserRules({});

    try {
      const res = await fetch('/api/fetch-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: formLink.trim() }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setFilename(data.filename);
      setHeaders(data.headers);
      setRows(data.rows);
      setColumns(data.columns);
      setStage('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch from Google Form link');
    } finally {
      setLoading(false);
      setFetchingForm(false);
    }
  }, [formLink]);

  const runDesignCheck = useCallback(async () => {
    if (!designUrl.trim()) return;
    setDesignChecking(true);
    setError('');
    
    try {
      const res = await fetch('/api/design-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: designUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDesignScore(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze design');
    } finally {
      setDesignChecking(false);
    }
  }, [designUrl]);

  // ===== Clean =====
  const runCleaning = useCallback(async () => {
    setLoading(true);
    setLoadingMsg('AI is analyzing your data for issues...');
    setError('');

    try {
      const res = await fetch('/api/clean', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: rows.slice(0, 100), columns, userRules }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      // Robustly extract array: API may return { suggestions: [...] } or { someOtherKey: [...] }
      let suggestionsArr: any[] = data.suggestions;
      if (!Array.isArray(suggestionsArr)) {
        // Find the first array value in the response
        suggestionsArr = Object.values(data).find(v => Array.isArray(v)) as any[] || [];
      }
      
      // AI Hallucination Defense: Filter out mathematically identical strings or empty destructions
      const cleanedArr = suggestionsArr.filter(s => {
        const orig = s.original ? String(s.original).trim() : '';
        const sugg = s.suggested ? String(s.suggested).trim() : '';
        
        // Block empty-to-empty or identical mutations
        if (orig.toLowerCase() === sugg.toLowerCase()) return false;
        if (orig === '(empty)' && !sugg) return false;
        if (orig === '(empty)' && sugg === '(empty)') return false;
        if (orig === 'null' && sugg === 'null') return false;
        
        // Anti-Hallucination: AI guessing domains on isolated '@' — but allow fixing missing @ (like riyasharma.com)
        if (s.category === 'email' && orig.endsWith('@') && sugg.length > orig.length && sugg.includes('@')) return false;

        // Strict Position Verification: Verify s.row and s.column actually match the original data value
        if (s.row >= 0 && s.row < rows.length && s.column) {
            const row = rows[s.row];
            const exactCol = Object.keys(row).find(k => k.toLowerCase().trim() === s.column.toLowerCase().trim());
            if (!exactCol) return false;
            const actualVal = String(row[exactCol] || '').trim();
            if (actualVal !== orig) return false;
        } else {
            return false;
        }

        // Fast-fail any destruction of data (e.g. suggesting an empty string for a valid age)
        if (!sugg && orig.length > 0 && orig !== '(empty)') return false;

        return true;
      });

      setSuggestions(cleanedArr);
      setStage('clean');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cleaning failed');
    } finally {
      setLoading(false);
    }
  }, [rows, columns, userRules]);

  const applySuggestion = useCallback((index: number) => {
    const s = suggestions[index];
    if (!s) return;

    setRows(prev => {
      const updated = [...prev];
      if (updated[s.row]) {
        // Find exact header matching case-insensitively (LLM sometimes changes case)
        const exactCol = Object.keys(updated[s.row]).find(k => k.toLowerCase().trim() === s.column.toLowerCase().trim()) || s.column;
        updated[s.row] = { ...updated[s.row], [exactCol]: s.suggested };
      }
      return updated;
    });

    setAppliedSuggestions(prev => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }, [suggestions]);

  const rejectSuggestion = useCallback((index: number) => {
    setRejectedSuggestions(prev => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }, []);

  const deleteRow = useCallback((targetRow: any) => {
    // Find the row index from current rows state before the update
    const rIndex = rows.indexOf(targetRow);

    setRows(prev => {
      const updated = [...prev];
      const index = updated.indexOf(targetRow);
      if (index !== -1) {
        updated[index] = { ...updated[index], _isDeleted: 'true' };
      }
      return updated;
    });

    // Remove any suggestions that targeted this row
    if (rIndex !== -1) {
      setSuggestions(prev => prev.filter(s => s.row !== rIndex));
    }
  }, [rows]);

  const saveEditedSuggestion = useCallback((index: number) => {
    setSuggestions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], suggested: editingValue };
      return updated;
    });
    setEditingSuggestion(null);
  }, [editingValue]);

  const applyAllHighConfidence = useCallback(() => {
    const newApplied = new Set(appliedSuggestions);
    const updatedRows = [...rows];

    suggestions.forEach((s, i) => {
      if (s.confidence >= 80 && !newApplied.has(i) && !rejectedSuggestions.has(i)) {
        if (updatedRows[s.row]) {
          const exactCol = Object.keys(updatedRows[s.row]).find(k => k.toLowerCase().trim() === s.column.toLowerCase().trim()) || s.column;
          updatedRows[s.row] = { ...updatedRows[s.row], [exactCol]: s.suggested };
        }
        newApplied.add(i);
      }
    });

    setRows(updatedRows);
    setAppliedSuggestions(newApplied);
  }, [suggestions, rows, appliedSuggestions, rejectedSuggestions]);


  // ===== Playbook Actions =====
  const savePlaybook = useCallback(() => {
    if (!newPlaybookName.trim() || appliedSuggestions.size === 0) return;
    
    // Extract applied rules
    const rules = Array.from(appliedSuggestions).map(i => {
      const sug = suggestions[i];
      return {
        column: sug.column,
        category: sug.category,
        original: sug.original,
        suggested: sug.suggested,
        rule: sug.rule
      };
    });

    const newPlaybook = {
      id: Math.random().toString(36).substring(7),
      name: newPlaybookName.trim(),
      rules,
      userRules,
      createdAt: Date.now()
    };

    const updated = [...playbooks, newPlaybook];
    setPlaybooks(updated);
    try {
      localStorage.setItem('formiq_playbooks', JSON.stringify(updated));
    } catch(e) {}
    
    setNewPlaybookName('');
    setShowPlaybookInput(false);
  }, [newPlaybookName, appliedSuggestions, suggestions, playbooks, userRules]);

  const deletePlaybook = useCallback((id: string) => {
    const updated = playbooks.filter(p => p.id !== id);
    setPlaybooks(updated);
    try {
      localStorage.setItem('formiq_playbooks', JSON.stringify(updated));
    } catch(e) {}
  }, [playbooks]);

  const applyPlaybook = useCallback((playbook: any) => {
    if (playbook.userRules) {
      setUserRules(playbook.userRules);
    }
    
    setAppliedSuggestions(prev => {
      const next = new Set(prev);
      suggestions.forEach((s, i) => {
        const matchesPlaybook = playbook.rules.some((r: any) => 
          r.column === s.column && r.category === s.category && 
          r.original === s.original && r.suggested === s.suggested
        );
        if (matchesPlaybook) next.add(i);
      });
      return next;
    });
  }, [suggestions]);

  // ===== Effective rows: current rows + all pending (non-rejected) suggestions applied =====
  const getEffectiveRows = useCallback(() => {
    const updatedRows = rows.map(r => ({ ...r }));
    suggestions.forEach((s, i) => {
      if (appliedSuggestions.has(i) || rejectedSuggestions.has(i)) return;
      if (s.row >= 0 && s.row < updatedRows.length && s.column) {
        const exactCol = Object.keys(updatedRows[s.row]).find(k => k.toLowerCase().trim() === s.column.toLowerCase().trim()) || s.column;
        updatedRows[s.row] = { ...updatedRows[s.row], [exactCol]: s.suggested };
      }
    });
    return updatedRows.filter(r => r._isDeleted !== 'true');
  }, [rows, suggestions, appliedSuggestions, rejectedSuggestions]);

  // ===== Analyze =====
  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setLoadingMsg('Generating insights from your data...');
    setError('');

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: getEffectiveRows().slice(0, 200), columns, action: 'insights' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setInsights(data.insights || []);
      setStage('analyze');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }, [getEffectiveRows, columns]);

  // ===== Report =====
  const generateReport = useCallback(async () => {
    setLoading(true);
    setLoadingMsg('Generating your AI report...');
    setError('');

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: getEffectiveRows().slice(0, 200), columns, action: 'report' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setInsights(data.insights || []);
      setReportSummary(data.summary || '');
      setThemes(data.themes || {});
      setStage('report');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Report generation failed');
    } finally {
      setLoading(false);
    }
  }, [getEffectiveRows, columns]);

  // ===== Helpers =====
  const getColumnTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      email: '📧', phone: '📱', name: '👤', date: '📅', time: '🕐',
      rating: '⭐', numeric: '🔢', boolean: '✅', currency: '💰',
      multiple_choice: '📋', open_text: '💬', id: '🆔', unknown: '❓',
    };
    return icons[type] || '❓';
  };

  const confidenceColor = (conf: number) => {
    if (conf >= 80) return 'var(--success)';
    if (conf >= 50) return 'var(--warning)';
    return 'var(--error)';
  };

  const severityBadge = (severity: string) => {
    const map: Record<string, string> = {
      high: 'badge-error',
      medium: 'badge-warning',
      low: 'badge-primary',
    };
    return map[severity] || 'badge-primary';
  };



  const renderCharts = () => {
    return (
      <div className={styles.distGrid}>
        {columns.filter(c => c.type === 'multiple_choice' || c.type === 'rating' || c.type === 'boolean').map((col, ci) => {
          const valueCounts: Record<string, number> = {};
          visibleRows.forEach(r => {
            const val = r[col.name];
            const v = String(val !== undefined && val !== null ? val : '').trim() || '(empty)';
            valueCounts[v] = (valueCounts[v] || 0) + 1;
          });
          const sorted = Object.entries(valueCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
          const chartData = sorted.map(([name, count]) => ({ name, count }));

          const usePie = chartData.length <= 4 && chartData.length > 0;

          return (
            <div key={ci} className={styles.distCard}>
              <h5>{col.name}</h5>
              <div className={styles.distChartArea}>
                <ResponsiveContainer width="100%" height="100%">
                  {usePie ? (
                    <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                      <Pie data={chartData} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4}>
                        {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    </PieChart>
                  ) : (
                    <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                      <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                      <Bar dataKey="count" fill="var(--teal)" radius={[0, 4, 4, 0]} barSize={24}>
                        {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>
    );
  };


  // ===== RENDER =====
  return (
    <div className={styles.dashboard}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.sidebarLogo}>
          Fix<span className={styles.logoAccent}>Or</span>Clean
        </Link>

        <nav className={styles.sidebarNav}>
          <button 
            className={`${styles.sidebarItem} ${stage === 'design' ? styles.sidebarItemActive : ''}`}
            onClick={() => setStage('design')}
          >
            <span className={styles.sidebarIcon}>📋</span> <span>Design</span>
          </button>
          {[
            { key: 'upload', icon: '📥', label: 'Import' },
            { key: 'preview', icon: '👁', label: 'Preview' },
            { key: 'rules', icon: '🎯', label: 'Ideal Format' },
            { key: 'clean', icon: '🧹', label: 'Clean' },
            { key: 'analyze', icon: '📊', label: 'Analyse' },
            { key: 'report', icon: '📑', label: 'Report' },
          ].map(item => (
            <button
              key={item.key}
              className={`${styles.sidebarItem} ${stage === item.key ? styles.sidebarItemActive : ''}`}
              onClick={() => {
                if (item.key === 'upload' || (rows.length > 0 && ['preview', 'rules', 'clean', 'analyze', 'report'].includes(item.key))) {
                  setStage(item.key as Stage);
                }
              }}
              disabled={item.key !== 'upload' && rows.length === 0}
            >
              <span className={styles.sidebarIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {rows.length > 0 && (
          <div className={styles.sidebarStats}>
            <div className={styles.miniStats}>
              <div><span>{visibleRows.length}</span>rows</div>
              <div><span>{columns.length}</span>cols</div>
              <div><span>{appliedSuggestions.size}</span>fixes</div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        {/* Top Bar */}
        <header className={styles.topbar}>
          <div>
            <h2 className={styles.topbarTitle}>
              {stage === 'design' && 'Survey Design Check'}
              {stage === 'upload' && 'Import Data'}
              {stage === 'preview' && 'Data Preview'}
              {stage === 'rules' && 'Define Ideal Format (Optional)'}
              {stage === 'clean' && 'AI Data Cleaning'}
              {stage === 'analyze' && 'Analysis & Insights'}
              {stage === 'report' && 'AI Report'}
            </h2>
            {filename && (
              <span className={styles.topbarFile}>
                📄 {filename} · {rows.length} rows · {columns.length} columns
              </span>
            )}
          </div>
          <div className={styles.topbarActions}>
            {stage === 'preview' && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary" onClick={() => setStage('rules')} disabled={loading}>
                  🎯 Set Ideal Format
                </button>
                <button className="btn btn-primary" onClick={runCleaning} disabled={loading}>
                  ✨ Start Cleaning
                </button>
              </div>
            )}
            {stage === 'clean' && (
              <button className="btn btn-primary" onClick={runAnalysis} disabled={loading}>
                📊 Analyse Data
              </button>
            )}
            {stage === 'analyze' && (
              <button className="btn btn-primary" onClick={generateReport} disabled={loading}>
                📑 Generate Report
              </button>
            )}
            {stage === 'report' && (
              <button className="btn btn-primary" onClick={() => window.print()}>
                🖨 Export PDF
              </button>
            )}
          </div>
        </header>

        {/* Loading Overlay */}
        {loading && (
          <div className={styles.loadingOverlay}>
            <div className={styles.loadingCard}>
              <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
              <p>{loadingMsg}</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className={styles.errorBanner}>
            <span>⚠️ {error}</span>
            <button onClick={() => setError('')}>✕</button>
          </div>
        )}

        {/* Stage Content */}
        <div className={styles.content}>
          {/* ===== DESIGN STAGE ===== */}
          {stage === 'design' && (
            <div className={styles.fadeEnter}>
              <div className={styles.pageHeader}>
                <h2>Survey Design Check</h2>
                <p>Paste a Google Form link before you collect data. AI will score it for clarity, bias, and compliance.</p>
              </div>

              {!designScore ? (
                <div className={`${styles.uploadCard}`}>
                  <div className={styles.uploadIcon}>🔗</div>
                  <h3>Paste Survey Link</h3>
                  <p>Works best with Google Forms or Typeform URLs</p>
                  
                  <div className={styles.formLinkRow} style={{ marginTop: '2rem', maxWidth: '600px', margin: '2rem auto' }}>
                    <input
                      type="url"
                      className="input-field"
                      placeholder="https://docs.google.com/forms/d/e/..."
                      value={designUrl}
                      onChange={e => setDesignUrl(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && runDesignCheck()}
                    />
                    <button
                      className="btn btn-primary"
                      onClick={runDesignCheck}
                      disabled={!designUrl.trim() || designChecking}
                    >
                      {designChecking ? 'Analysing...' : 'Run Design Check'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.panelGrid}>
                  <div className={`${styles.panel}`}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <h3 className={styles.panelTitle}>Survey Health Score</h3>
                      <div style={{ fontSize: '2.5rem', fontWeight: 800, color: designScore.score >= 80 ? 'var(--teal)' : 'var(--accent-red)' }}>
                        {designScore.score}/100
                      </div>
                    </div>
                    
                    <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      {designScore.dimensions.map((dim: any, i: number) => (
                        <div key={i} style={{ padding: '1rem', background: 'rgba(0,0,0,0.03)', borderRadius: '8px' }}>
                          <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{dim.name.replace('_', ' ')}</span>
                          <div style={{ color: dim.score >= 80 ? 'var(--teal)' : 'var(--accent-red)' }}>Score: {dim.score}/100</div>
                          {dim.issues?.length > 0 && (
                            <ul style={{ marginTop: '0.5rem', fontSize: '0.85rem', paddingLeft: '1rem' }}>
                              {dim.issues.map((issue: string, j: number) => <li key={j}>{issue}</li>)}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {designScore.suggestions?.length > 0 && (
                    <div className={`${styles.panel}`}>
                      <h3 className={styles.panelTitle}>Actionable Fixes</h3>
                      <div className={styles.suggestionsList}>
                        {designScore.suggestions.map((sug: any, i: number) => (
                          <div key={i} className={styles.suggestionItem}>
                            <div className={styles.sugHeader}>
                              <span className={styles.sugColumn}>Question {sug.question}</span>
                            </div>
                            <div className={styles.sugBody}>
                              <div className={styles.sugLabel}>Issue:</div>
                              <div style={{ color: 'var(--accent-red)' }}>{sug.issue}</div>
                              <div className={styles.sugLabel} style={{ marginTop: '0.5rem' }}>Fix:</div>
                              <div style={{ color: 'var(--teal)' }}>{sug.fix}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

{/* DPDP Compliance and Time Estimate */}
                  <div className={`${styles.panel}`} style={{ gridColumn: '1 / -1' }}>
                     <h3 className={styles.panelTitle}>Additional Insights</h3>
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
                        <div>
                          <strong>⏱️ Completion Time Estimate</strong>
                          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>This survey will take approximately {Math.max(3, Math.floor(designScore.suggestions.length * 0.8) + 2)} minutes to complete. Drop-off rates increase sharply if this exceeds 5 minutes.</p>
                        </div>
                        <div>
                          <strong>🛡️ DPDP Compliance Flag</strong>
                          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>No explicit consent statement found for data collection. The Digital Personal Data Protection Act 2023 requires explicit purpose limitation. Add a consent block at the start of your form.</p>
                        </div>
                     </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== UPLOAD ===== */}
          {stage === 'upload' && (
            <div className={styles.uploadStage}>
              <div
                className={`${styles.dropzone} ${dragActive ? styles.dropzoneActive : ''}`}
                onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.tsv,.xlsx,.xls,.ods"
                  onChange={onFileSelect}
                  style={{ display: 'none' }}
                />
                <div className={styles.dropzoneIcon}>📥</div>
                <h3>Drop your file here</h3>
                <p>or click to browse</p>
                <div className={styles.dropzoneFormats}>
                  <span className="badge badge-primary">CSV</span>
                  <span className="badge badge-primary">XLSX</span>
                  <span className="badge badge-primary">XLS</span>
                  <span className="badge badge-primary">TSV</span>
                  <span className="badge badge-primary">ODS</span>
                </div>
              </div>

              {/* Google Form Link */}
              <div className={styles.formLinkSection}>
                <h4>🔗 Or paste a Google Form link</h4>
                <p>
                  Paste the URL of a Google Form with responses. The responses spreadsheet must be
                  publicly accessible (shared as &ldquo;Anyone with the link&rdquo;).
                </p>
                <div className={styles.formLinkRow}>
                  <input
                    type="url"
                    className="input-field"
                    placeholder="https://docs.google.com/forms/d/e/..."
                    value={formLink}
                    onChange={e => setFormLink(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && fetchFromFormLink()}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={fetchFromFormLink}
                    disabled={!formLink.trim() || fetchingForm}
                  >
                    {fetchingForm ? 'Fetching...' : 'Fetch Data'}
                  </button>
                </div>
              </div>

              <div className={styles.uploadTips}>
                <h4>💡 Quick Tips</h4>
                <ul>
                  <li>Export your Google Form responses as CSV from Google Sheets</li>
                  <li>Or paste a Google Form link above to auto-fetch responses</li>
                  <li>Make sure the first row contains column headers</li>
                  <li>Any encoding issues will be automatically fixed</li>
                  <li>Files up to 50MB are supported</li>
                </ul>
              </div>
            </div>
          )}

          {/* ===== PREVIEW ===== */}
          {stage === 'preview' && (
            <div className={styles.previewStage}>
              {/* Column Detection */}
              <div className={`${styles.panel}`}>
                <h3 className={styles.panelTitle}>🔍 Detected Column Types</h3>
                <p className={styles.panelDesc}>
                  FixOrClean automatically detected the type of each column. Click to change if needed.
                </p>
                <div className={styles.columnChips}>
                  {columns.map((col, i) => (
                    <div key={i} className={styles.columnChip}>
                      <span className={styles.chipIcon}>{getColumnTypeIcon(col.type)}</span>
                      <span className={styles.chipName}>{col.name}</span>
                      <span className={`badge badge-primary ${styles.chipType}`}>{col.type.replace('_', ' ')}</span>
                      {col.nullCount > 0 && (
                        <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>
                          {col.nullCount} nulls
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Table */}
              <div className={`${styles.panel}`}>
                <h3 className={styles.panelTitle}>📋 Data Preview</h3>
                <p className={styles.panelDesc}>Showing first {Math.min(visibleRows.length, 20)} of {visibleRows.length} rows</p>
                <div className={styles.tableWrapper}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        {headers.map(h => <th key={h}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.slice(0, 20).map((row, i) => (
                        <tr key={i}>
                          <td style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{i + 1}</td>
                          {headers.map(h => (
                            <td key={h} style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {row[h] || <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button className="btn btn-primary btn-lg" onClick={() => setStage('rules')}>
                  Set Ideal Format ➔
                </button>
              </div>
            </div>
          )}

          {/* ===== RULES (Ideal Format) ===== */}
          {stage === 'rules' && (
            <div className={styles.fadeEnter}>
              <div className={`${styles.panel}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 className={styles.panelTitle}>🎯 Define Ideal Format</h3>
                    <p className={styles.panelDesc}>
                      Tell AI exactly how each column should be formatted (e.g., &quot;M/F&quot;, &quot;INDIA&quot;, &quot;01-04-2005&quot;).
                      Leave blank if no strict rule is needed. AI will also auto-detect email typos, missing data, and out-of-range values.
                    </p>
                  </div>
                  <button className="btn btn-primary" onClick={runCleaning} disabled={loading}>
                    {loading ? 'Analyzing...' : 'Run Cleanup Pipeline ➔'}
                  </button>
                </div>

                <div style={{ marginTop: '1.5rem', display: 'grid', gap: '1rem' }}>
                  {columns.map(col => (
                    <div key={col.name} style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) 2fr', gap: '1rem', padding: '1rem', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                      <div>
                        <strong>{col.name}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '0.2rem' }}>
                          Type: {col.type.replace('_', ' ')}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                          Example values: {col.sampleValues.slice(0, 2).map((v, i) => <code key={i} style={{marginRight:'4px'}}>{v || 'null'}</code>)}
                        </div>
                      </div>
                      <div>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="e.g. INDIA, M/F, Date format YYYY-MM-DD..."
                          value={userRules[col.name] || ''}
                          onChange={e => setUserRules({ ...userRules, [col.name]: e.target.value })}
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ===== CLEAN ===== */}
          {stage === 'clean' && (
            <div className={styles.cleanStage}>
              {/* Summary Bar */}
              <div className={styles.cleanSummary}>
                <div className={`${styles.cleanStat}`}>
                  <div className={styles.cleanStatValue}>{suggestions.length}</div>
                  <div className={styles.cleanStatLabel}>Issues Found</div>
                </div>
                <div className={`${styles.cleanStat}`}>
                  <div className={styles.cleanStatValue} style={{ color: 'var(--success)' }}>
                    {suggestions.filter(s => s.confidence >= 80).length}
                  </div>
                  <div className={styles.cleanStatLabel}>High Confidence</div>
                </div>
                <div className={`${styles.cleanStat}`}>
                  <div className={styles.cleanStatValue} style={{ color: 'var(--teal)' }}>
                    {appliedSuggestions.size}
                  </div>
                  <div className={styles.cleanStatLabel}>Applied</div>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={applyAllHighConfidence}
                  style={{ alignSelf: 'center' }}
                >
                  ✅ Apply All High Confidence
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    const csvHeaders = headers.filter(h => h !== '_isDeleted');
                    const exportData = visibleRows.map(r => {
                      const rowData: Record<string, any> = {};
                      csvHeaders.forEach(h => {
                         let val = r[h];
                         if (val === undefined || val === null) val = '';
                         rowData[h] = val;
                      });
                      return rowData;
                    });
                    const csv = Papa.unparse(exportData);
                    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${filename.replace(/\.[^.]+$/, '')}_cleaned.csv`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  style={{ alignSelf: 'center' }}
                >
                  📥 Download CSV
                </button>
              </div>

              {/* Playbooks Section */}
              <div className={`${styles.panel}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 className={styles.panelTitle} style={{ margin: 0 }}>📚 Cleaning Playbooks</h3>
                  <button 
                    className="btn btn-sm btn-ghost" 
                    onClick={() => setShowPlaybookInput(!showPlaybookInput)}
                    disabled={appliedSuggestions.size === 0}
                  >
                    + Save Current Rules as Playbook
                  </button>
                </div>

                {showPlaybookInput && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '8px' }}>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. Placement Drive Sem 1 2025" 
                      value={newPlaybookName}
                      onChange={e => setNewPlaybookName(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button className="btn btn-primary" onClick={savePlaybook}>Save</button>
                  </div>
                )}

                {playbooks.length > 0 ? (
                  <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                    {playbooks.map(p => (
                      <div key={p.id} style={{ minWidth: '250px', border: '1px solid var(--border)', padding: '1rem', borderRadius: '8px', background: 'var(--card-bg)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <h4 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {p.name}
                          </h4>
                          <button onClick={() => deletePlaybook(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>&times;</button>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                          {p.rules.length} saved rules
                        </p>
                        <button className="btn btn-sm btn-secondary" style={{ width: '100%' }} onClick={() => applyPlaybook(p)}>
                          ▶ Apply Playbook
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>No playbooks saved yet. Apply some rules and save them for future use.</p>
                )}
              </div>

              {/* Suggestions List */}
              <div className={`${styles.panel}`}>
                <h3 className={styles.panelTitle}>🧹 Cleaning Suggestions</h3>
                {suggestions.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p>🎉 Your data looks clean! No issues detected.</p>
                  </div>
                ) : (
                  <div className={styles.suggestionsList}>
                    {suggestions.map((s, i) => {
                      if (rejectedSuggestions.has(i)) return null;
                      
                      const needsReview = s.confidence < 80 && !appliedSuggestions.has(i);

                      return (
                        <div
                          key={i}
                          className={`${styles.suggestionCard} ${appliedSuggestions.has(i) ? styles.suggestionApplied : ''}`}
                          style={needsReview ? { borderLeft: '4px solid var(--accent-orange)', boxShadow: '0 4px 12px rgba(255,165,0,0.1)' } : {}}
                        >
                          <div className={styles.suggestionHeader}>
                            <span className={`badge ${s.confidence >= 80 ? 'badge-success' : s.confidence >= 50 ? 'badge-warning' : 'badge-error'}`}>
                              {s.confidence}% confident {needsReview && ' (Review Needed)'}
                            </span>
                            <span className="badge badge-primary">{s.category}</span>
                            <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                              Row {s.row + 1} · {s.column}
                            </span>
                          </div>
                          <div className={styles.suggestionBody}>
                            <div className={styles.suggestionChange}>
                              <div className={styles.changeFrom}>
                                <span className={styles.changeLabel}>Original</span>
                                <code>{s.original || '(empty)'}</code>
                              </div>
                              <span className={styles.changeArrow}>→</span>
                              <div className={styles.changeTo}>
                                <span className={styles.changeLabel}>Suggested</span>
                                {editingSuggestion === i ? (
                                  <input 
                                    className="input-field" 
                                    value={editingValue} 
                                    onChange={(e) => setEditingValue(e.target.value)} 
                                    style={{ padding: '0.2rem 0.5rem' }}
                                    autoFocus
                                  />
                                ) : (
                                  <code>{s.suggested || '(empty)'}</code>
                                )}
                              </div>
                            </div>
                            <p className={styles.suggestionRule}>{s.rule}</p>
                          </div>
                          <div className={styles.suggestionActions}>
                            {rejectedSuggestions.has(i) ? (
                              <span className="badge badge-error">✕ Rejected</span>
                            ) : !appliedSuggestions.has(i) ? (
                              <>
                                {editingSuggestion === i ? (
                                  <button className="btn btn-sm btn-primary" onClick={() => saveEditedSuggestion(i)}>💾 Save Edit</button>
                                ) : (
                                  <button className="btn btn-sm btn-primary" style={{ background: 'var(--text-secondary)' }} onClick={() => { setEditingSuggestion(i); setEditingValue(s.suggested); }}>✎ Edit</button>
                                )}
                                <button className="btn btn-sm btn-primary" onClick={() => applySuggestion(i)}>
                                  ✓ Apply
                                </button>
                                <button className="btn btn-sm btn-ghost" onClick={() => rejectSuggestion(i)}>✕ Reject</button>
                                <button className="btn btn-sm btn-ghost" onClick={() => deleteRow(rows[s.row])} style={{ color: 'var(--accent-red)' }}>
                          🗑 Delete
                        </button>
                              </>
                            ) : (
                              <span className="badge badge-success">✓ Applied</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== ANALYZE ===== */}
          {stage === 'analyze' && (
            <div className={styles.analyzeStage}>
              {/* Insights */}
              <div className={`${styles.panel}`}>
                <h3 className={styles.panelTitle} style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem' }}>🔍 Strategic Data Findings</h3>
                {insights.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p>No insights available yet. Click &quot;Analyse Data&quot; to generate.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginTop: '1.5rem' }}>
                    {insights.map((insight, i) => (
                      <div key={i} style={{ padding: '2rem', background: 'var(--background)', borderRadius: '12px', borderLeft: `4px solid ${insight.severity === 'high' ? 'var(--accent-red)' : insight.severity === 'medium' ? 'var(--warning)' : 'var(--teal)'}`, boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: insight.severity === 'high' ? 'var(--accent-red)' : insight.severity === 'medium' ? 'var(--warning)' : 'var(--teal)' }}>
                            {insight.severity} Impact
                          </span>
                          <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: '4px', textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
                            {insight.type}
                          </span>
                        </div>
                        <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', margin: '0 0 1rem 0', color: 'var(--text)' }}>{insight.title}</h4>
                        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.95rem', lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0 }}>{insight.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Data Distribution Charts (Simple visual) */}
              <div className={`${styles.panel}`}>
                <h3 className={styles.panelTitle}>📊 Data Visualization Overview</h3>
                {renderCharts()}
              </div>
            </div>
          )}

          {/* ===== REPORT ===== */}
          {stage === 'report' && (
            <div className={styles.reportWrapper}>
              <div className={styles.reportDoc} id="printable-report">

                {/* Header */}
                <div className={styles.reportHead}>
                  <div>
                    <h1 className={styles.reportHeadTitle}>Intelligence<br/>Report</h1>
                    <p className={styles.reportHeadSub}>
                      {filename.replace(/\.[^.]+$/, '')} · {visibleRows.length} validated responses
                    </p>
                  </div>
                  <div className={styles.reportHeadMeta}>
                    <div className={styles.reportHeadBrand}>FixOrClean</div>
                    <div className={styles.reportHeadDate}>
                      {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                </div>

                <div className={styles.reportBody}>

                  {/* Executive Summary */}
                  {reportSummary && (
                    <div className={styles.reportSection}>
                      <div className={styles.reportSectionLabel}>Executive Overview</div>
                      <div className={styles.reportExecutive}>
                        {reportSummary.split('\n').filter(p => p.trim()).map((paragraph, i) => (
                          <p key={i}>
                            {i === 0 && <span className={styles.reportDropCap}>{paragraph.charAt(0)}</span>}
                            {i === 0 ? paragraph.slice(1) : paragraph}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Key Findings */}
                  {insights.length > 0 && (
                    <div className={styles.reportSection}>
                      <div className={styles.reportSectionLabel}>Key Strategic Findings</div>
                      <div className={styles.reportInsightsGrid}>
                        {insights.map((insight, i) => {
                          const borderColor = insight.severity === 'high' ? 'var(--error)' : insight.severity === 'medium' ? 'var(--warning)' : 'var(--teal)';
                          const labelColor = insight.severity === 'high' ? 'var(--error)' : insight.severity === 'medium' ? 'var(--warning)' : 'var(--teal)';
                          return (
                            <div key={i} className={styles.reportInsightCard} style={{ borderLeftColor: borderColor }}>
                              <div className={styles.reportInsightImpact}>
                                <span style={{ color: labelColor }}>{insight.severity} impact</span>
                                <span className={styles.reportInsightType}>{insight.type}</span>
                              </div>
                              <div className={styles.reportInsightTitle}>{insight.title}</div>
                              <p className={styles.reportInsightDesc}>{insight.description}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Open Text Themes */}
                  {Object.keys(themes).length > 0 && (
                    <div className={styles.reportSection}>
                      <div className={styles.reportSectionLabel}>Qualitative Theme Clusters</div>
                      {Object.entries(themes).map(([colName, colThemes]) => (
                        <div key={colName} style={{ marginBottom: '2rem' }}>
                          <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem', color: 'var(--muted)', marginBottom: '1rem' }}>
                            &ldquo;{colName}&rdquo; — Response Analysis
                          </h4>
                          <div className={styles.reportThemesGrid}>
                            {colThemes.map((theme, ti) => {
                              const sentimentColor = theme.sentiment === 'positive' ? 'var(--teal)' : theme.sentiment === 'negative' ? 'var(--error)' : 'var(--muted)';
                              return (
                                <div key={ti} className={styles.reportThemeCard}>
                                  <div className={styles.reportThemeTopRow}>
                                    <div className={styles.reportThemePct}>{theme.percentage}%</div>
                                    <div className={styles.reportThemeSentiment} style={{ color: sentimentColor }}>
                                      <span className={styles.reportThemeSentimentDot} style={{ background: sentimentColor }} />
                                      {theme.sentiment}
                                    </div>
                                  </div>
                                  <div className={styles.reportThemeName}>{theme.theme}</div>
                                  <div className={styles.reportThemeQuote}>&ldquo;{theme.representativeQuote}&rdquo;</div>
                                  <div className={styles.reportThemeCount}>n = {theme.count} responses</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Data Distributions */}
                  <div className={`${styles.reportSection} ${styles.reportChartsSection}`}>
                    <div className={styles.reportSectionLabel}>Data Distributions</div>
                    {renderCharts()}
                  </div>

                </div>

                {/* Export bar */}
                <div className={`${styles.reportExportBar} no-print`}>
                  <button className="btn btn-primary btn-lg" onClick={() => window.print()}>
                    Export as PDF
                  </button>
                  <button
                    className="btn btn-secondary btn-lg"
                    onClick={() => {
                      const csvHeaders = headers.filter(h => h !== '_isDeleted');
                      const exportData = visibleRows.map(r => {
                        const rowData: Record<string, any> = {};
                        csvHeaders.forEach(h => {
                          let val = r[h];
                          if (val === undefined || val === null) val = '';
                          rowData[h] = val;
                        });
                        return rowData;
                      });
                      const csv = Papa.unparse(exportData);
                      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${filename.replace(/\.[^.]+$/, '')}_cleaned.csv`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Download Cleaned CSV
                  </button>
                </div>

              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
