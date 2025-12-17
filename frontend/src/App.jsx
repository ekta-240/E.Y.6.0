import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './styles.css';

const API_BASE = 'http://127.0.0.1:8000';

// =====================
// 🔹 EXPLAIN API HELPER
// =====================
async function explainDecision(payload) {
  const res = await axios.post(`${API_BASE}/explain`, payload);
  return res.data; // { explanation }
}

// --- Components ---

function Badge({ band, value }) {
  if (value == null) return <span className="badge">N/A</span>;
  return <span className={`badge ${band}`}>PCS {value.toFixed(1)} ({band})</span>;
}

function DriftChip({ bucket }) {
  if (!bucket) return <span className="chip">Drift N/A</span>;
  return <span className={`chip drift-${bucket.toLowerCase()}`}>Drift: {bucket}</span>;
}

function ProgressBar({ value, max = 100, color = '#4caf50' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="progress-bar-bg">
      <div className="progress-bar-fill" style={{ background: color, width: `${pct}%` }} />
    </div>
  );
}

// Chatbot Component
function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m your AI assistant. Ask me anything about provider data, PCS scores, or any general questions!' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = React.useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    setInput('');
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await axios.post('/chat', {
        message: userMessage,
        history: newMessages.slice(-6)
      });
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.data.response
      }]);
    } catch (err) {
      const errorMsg = err.response?.status === 429 
        ? 'Rate limit reached. Please wait a moment before sending more messages.'
        : 'Sorry, I encountered an error. Please try again.';
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: errorMsg
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chatbot-container">
      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <span>💬 AI Assistant</span>
            <button className="chatbot-close" onClick={() => setIsOpen(false)}>×</button>
          </div>
          <div className="chatbot-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`chatbot-message ${msg.role}`}>
                {msg.content}
              </div>
            ))}
            {isLoading && (
              <div className="chatbot-message assistant">
                <span className="typing-indicator">●●●</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="chatbot-input-area">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything..."
              disabled={isLoading}
            />
            <button onClick={handleSend} disabled={isLoading || !input.trim()}>
              ➤
            </button>
          </div>
        </div>
      )}
      <button className="chatbot-fab" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? '✕' : '💬'}
      </button>
    </div>
  );
}

// Pie Chart Component
function PieChart({ data }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  if (total === 0) return <div className="pie-chart" style={{ background: '#1a1a2e' }} />;
  
  const high = data.High || 0;
  const medium = data.Medium || 0;
  const low = data.Low || 0;
  
  const highPct = (high / total) * 100;
  const mediumPct = (medium / total) * 100;
  
  const gradient = `conic-gradient(
    #ef4444 0% ${highPct}%,
    #f59e0b ${highPct}% ${highPct + mediumPct}%,
    #10b981 ${highPct + mediumPct}% 100%
  )`;
  
  return (
    <div className="pie-chart-wrapper">
      <div className="pie-chart" style={{ background: gradient }} />
      <div className="pie-center">
        <span className="pie-center-value">{total}</span>
        <span className="pie-center-label">Total</span>
      </div>
    </div>
  );
}

// Bar Chart Component  
function BarChart({ data }) {
  const entries = Object.entries(data || {});
  const maxVal = Math.max(...Object.values(data || {}), 1);
  
  return (
    <div className="bar-chart-container">
      {entries.map(([key, val], idx) => (
        <div key={key} className="bar-item">
          <span className="bar-value">{val}</span>
          <div className="bar-wrapper">
            <div 
              className={`bar range-${idx % 5}`} 
              style={{ height: `${Math.max((val / maxVal) * 150, 8)}px` }}
            />
          </div>
          <span className="bar-label">{key}</span>
        </div>
      ))}
    </div>
  );
}

// Line Chart Component
function LineChart({ trend }) {
  if (!trend || trend.length === 0) {
    return <div style={{ color: '#8892a0', textAlign: 'center', padding: '2rem' }}>No trend data available</div>;
  }
  
  const maxAuto = Math.max(...trend.map(t => t.auto_updates || 0), 1);
  const maxManual = Math.max(...trend.map(t => t.manual_reviews || 0), 1);
  const maxVal = Math.max(maxAuto, maxManual, 100);
  
  const width = 100;
  const height = 100;
  const padding = 10;
  
  const getX = (idx) => padding + (idx / (trend.length - 1 || 1)) * (width - 2 * padding);
  const getY = (val) => height - padding - (val / maxVal) * (height - 2 * padding);
  
  const autoPath = trend.map((t, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(t.auto_updates || 0)}`).join(' ');
  const manualPath = trend.map((t, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(t.manual_reviews || 0)}`).join(' ');
  
  return (
    <div>
      <div className="trend-legend">
        <div className="trend-legend-item">
          <div className="trend-legend-line auto"></div>
          <span>Auto-Updates</span>
        </div>
        <div className="trend-legend-item">
          <div className="trend-legend-line manual"></div>
          <span>Manual Reviews</span>
        </div>
      </div>
      <div className="line-chart-container">
        <div className="y-axis-labels">
          <span>100</span>
          <span>75</span>
          <span>50</span>
          <span>25</span>
          <span>0</span>
        </div>
        <svg className="line-chart-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          <path d={autoPath} fill="none" stroke="#4caf50" strokeWidth="2" />
          <path d={manualPath} fill="none" stroke="#ffc107" strokeWidth="2" />
          {trend.map((t, i) => (
            <React.Fragment key={i}>
              <circle cx={getX(i)} cy={getY(t.auto_updates || 0)} r="3" fill="#4caf50" />
              <circle cx={getX(i)} cy={getY(t.manual_reviews || 0)} r="3" fill="#ffc107" />
            </React.Fragment>
          ))}
        </svg>
      </div>
      <div className="x-axis-labels">
        {trend.map((t, i) => (
          <span key={i}>{t.date || `Run ${i + 1}`}</span>
        ))}
      </div>
    </div>
  );
}

function Dashboard({ stats, manualReviewCount }) {
  if (!stats) return <div style={{ color: '#fff', padding: '2rem' }}>Loading stats...</div>;
  
  const { latest_run, avg_pcs, drift_distribution, pcs_distribution, trend } = stats;
  
  // Format date nicely
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + 
           date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
  };
  
  // Calculate auto-update percentage
  const totalFields = (latest_run?.auto_updates || 0) + (manualReviewCount || 0);
  const autoPercent = totalFields > 0 ? ((latest_run?.auto_updates || 0) / totalFields * 100).toFixed(1) : 0;

  return (
    <div className="dashboard-container">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <h1>Command Center</h1>
        <p>Real-time provider data validation and monitoring</p>
      </div>

      {/* Stats Row */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon blue">🕐</div>
          <div className="stat-label">Last Run</div>
          <div className="stat-value">{formatDate(latest_run?.started_at)}</div>
          <div className="stat-sub">{latest_run?.type || 'Daily'} Batch</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon purple">👥</div>
          <div className="stat-label">Processed</div>
          <div className="stat-value">{latest_run?.count_processed || 0}</div>
          <div className="stat-sub">Providers Analyzed</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon green">✓</div>
          <div className="stat-label">Auto-Updated</div>
          <div className="stat-value success">
            {latest_run?.auto_updates || 0} Fields
            <span className="stat-trend up">↑ {autoPercent}%</span>
          </div>
          <div className="stat-sub">High Confidence Updates</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon orange">⚡</div>
          <div className="stat-label">Manual Review</div>
          <div className="stat-value warning">{manualReviewCount || 0}</div>
          <div className="stat-sub">Pending Actions</div>
          {manualReviewCount > 0 && <span className="warning-badge">!</span>}
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-row">
        <div className="chart-card">
          <h3>
            <span className="icon" style={{background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.05) 100%)'}}>🎯</span>
            Drift Risk Distribution
          </h3>
          <div className="pie-chart-container">
            <PieChart data={drift_distribution || {}} />
            <div className="pie-legend">
              <div className="legend-item">
                <span className="legend-dot high"></span>
                <span className="legend-text">High Risk</span>
                <span className="legend-value">{drift_distribution?.High || 0}</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot medium"></span>
                <span className="legend-text">Medium</span>
                <span className="legend-value">{drift_distribution?.Medium || 0}</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot low"></span>
                <span className="legend-text">Low</span>
                <span className="legend-value">{drift_distribution?.Low || 0}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="chart-card">
          <h3>
            <span className="icon" style={{background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(139, 92, 246, 0.05) 100%)'}}>📊</span>
            PCS Score Distribution
          </h3>
          <BarChart data={pcs_distribution} />
        </div>
      </div>

      {/* Trend Chart */}
      <div className="trend-card">
        <h3>
          <span className="icon" style={{background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.05) 100%)'}}>📈</span>
          Automation Trend (Last 5 Runs)
        </h3>
        <LineChart trend={trend} />
      </div>
    </div>
  );
}

/* =====================
   PROVIDER LIST
   ===================== */

function ProviderList({ providers, onSelect }) {
  return (
    <div className="card">
      <h2>🏥 Provider Directory</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Specialty</th>
            <th>Phone</th>
            <th>PCS Score</th>
            <th>Drift Risk</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {providers.map((p) => (
            <tr key={p.id} onClick={() => onSelect(p.id)} className="clickable-row">
              <td>{p.id}</td>
              <td>{p.name}</td>
              <td>{p.specialty}</td>
              <td>{p.phone}</td>
              <td><Badge band={p.pcs_band} value={p.pcs} /></td>
              <td><DriftChip bucket={p.drift_bucket} /></td>
              <td><button className="btn-small">View Details</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* =====================
   PROVIDER DETAIL
   ===================== */

function ProviderDetail({ providerId, onBack }) {
  const [data, setData] = useState(null);
  const [ocr, setOcr] = useState(null);
  const [qaHistory, setQaHistory] = useState([]);

  // 🔹 EXPLAIN STATE
  const [explanations, setExplanations] = useState({});
  const [loadingField, setLoadingField] = useState(null);
  const [explainError, setExplainError] = useState(null);

  useEffect(() => {
    if (!providerId) return;
    axios.get(`/providers/${providerId}/details`).then(res => setData(res.data));
    axios.get(`/providers/${providerId}/ocr`).then(res => setOcr(res.data));
    axios.get(`/providers/${providerId}/qa`).then(res => setQaHistory(res.data));
  }, [providerId]);

  if (!data) return <div>Loading details...</div>;

  const { provider, validation, pcs, drift, enrichment } = data;

  // 🔹 EXPLAIN HANDLER
  const handleExplain = async (field, info) => {
    setLoadingField(field);
    setExplainError(null);

    try {
      const payload = {
        field,
        current_value: provider[field],
        candidates: (info.sources || []).map(s => ({
          source: s.source,
          value: s.value,
        })),
        chosen_value: provider[field],
        confidence: info.confidence,
        decision: info.confidence >= 0.7 ? 'auto_update' : 'manual_review',
      };

      const res = await explainDecision(payload);

      setExplanations(prev => ({ ...prev, [field]: res.explanation }));
    } catch (err) {
      setExplainError(
        err.response?.status === 429
          ? 'Rate limit exceeded. Please wait.'
          : 'Failed to generate explanation.'
      );
    } finally {
      setLoadingField(null);
    }
  };

  return (
    <div className="detail-container">
      <button onClick={onBack} className="btn-back">← Back to Directory</button>

      <div className="header-card card">
        <div className="header-info">
          <h1>{provider.name}</h1>
          <p>{provider.specialty} | {provider.address}</p>
          <div className="badges">
            <Badge band={pcs?.band} value={pcs?.score} />
            <DriftChip bucket={drift?.bucket} />
          </div>
        </div>
        <div className="drift-explanation">
          <strong>Drift Analysis:</strong> {drift?.explanation}
        </div>
      </div>

      <div className="detail-grid">
        <div className="left-col">
          <div className="card">
            <h3>✅ Validated Data & Confidence</h3>

            {explainError && <div className="error-banner">{explainError}</div>}

            <table className="validation-table">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Value</th>
                  <th>Confidence</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(validation).map(([field, info]) => (
                  <React.Fragment key={field}>
                    <tr>
                      <td>{field}</td>
                      <td>{provider[field]}</td>
                      <td>
                        <div className="confidence-wrapper">
                          <ProgressBar
                            value={info.confidence * 100}
                            color={info.confidence >= 0.7 ? '#4caf50' : '#ff9800'}
                          />
                          <span>{(info.confidence * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td>
                        {info.confidence >= 0.7
                          ? <span className="badge-green">Auto-Updated</span>
                          : <span className="badge-red">Manual Review</span>}

                        <div style={{ marginTop: '6px' }}>
                          <button
                            className="btn-small"
                            disabled={loadingField === field}
                            onClick={() => handleExplain(field, info)}
                          >
                            {loadingField === field ? 'Explaining…' : 'Explain'}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {explanations[field] && (
                      <tr>
                        <td colSpan="4">
                          <div className="explanation-box">
                            {explanations[field]}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* OCR PANEL */}
          <div className="card">
            <h3>📄 Document Extraction Panel (OCR)</h3>
            {ocr && ocr.exists ? (
              <div className="ocr-panel">
                <div className="ocr-meta">
                  <span><strong>Type:</strong> {ocr.doc_type}</span>
                  <span><strong>Confidence:</strong> {(ocr.ocr_confidence * 100).toFixed(1)}%</span>
                </div>
                <div className="ocr-preview">
                  <pre>{ocr.ocr_text}</pre>
                </div>
              </div>
            ) : (
              <p>No documents found for this provider.</p>
            )}
          </div>

          <div className="card">
            <h3>📊 Confidence History</h3>
            {qaHistory.length === 0 ? (
              <p>No validation history available.</p>
            ) : (
              <table className="qa-history-table">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Confidence</th>
                    <th>Sources</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {qaHistory.slice(0, 10).map((qa, idx) => (
                    <tr key={idx}>
                      <td>{qa.field_name}</td>
                      <td>
                        <ProgressBar value={qa.confidence * 100} max={100} color={qa.confidence >= 0.7 ? '#4caf50' : '#ff9800'} />
                        <span style={{fontSize: '0.8rem', marginLeft: '0.5rem'}}>{(qa.confidence * 100).toFixed(0)}%</span>
                      </td>
                      <td>{qa.sources ? qa.sources.join(', ') : 'N/A'}</td>
                      <td>{qa.created_at ? new Date(qa.created_at).toLocaleDateString() : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="right-col">
          <div className="card">
            <h3>🛡️ PCS Breakdown</h3>
            <div className="pcs-grid">
              {Object.entries(pcs?.components || {}).map(([key, val]) => (
                <div key={key} className="pcs-item">
                  <span className="pcs-label">{key.toUpperCase()}</span>
                  <ProgressBar value={val} max={100} color="#2196f3" />
                  <span className="pcs-val">{val.toFixed(0)}</span>
                </div>
              ))}
            </div>
            <div className="pcs-legend">
              <small>SRM: Source Reliability | FR: Freshness | ST: Stability | MB: Mismatch Burden</small>
              <small>DQ: Doc Quality | RP: Responsiveness | LH: License Health | HA: History</small>
            </div>
          </div>
{/* 
          {enrichment && (
            <div className="card">
              <h3>🧠 Enrichment Summary</h3>
              <p>{enrichment.summary || "No summary available (LLM disabled or no data)."}</p>
              <div className="enrich-grid">
                {enrichment.certifications && (
                  <div>
                    <strong>Certifications</strong>
                    <ul>
                      {enrichment.certifications.map((c, idx) => <li key={idx}>{c}</li>)}
                    </ul>
                  </div>
                )}
                {enrichment.affiliations && (
                  <div>
                    <strong>Affiliations</strong>
                    <ul>
                      {enrichment.affiliations.map((a, idx) => <li key={idx}>{a}</li>)}
                    </ul>
                  </div>
                )}
                {enrichment.education && (
                  <div>
                    <strong>Education</strong>
                    <p>{enrichment.education}</p>
                  </div>
                )}
                {enrichment.secondary_specialties && enrichment.secondary_specialties.length > 0 && (
                  <div>
                    <strong>Secondary Specialties</strong>
                    <ul>
                      {enrichment.secondary_specialties.map((s, idx) => <li key={idx}>{s}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )} */}
        </div>
      </div>
    </div>
  );
}

/* =====================
   MANUAL REVIEW
   ===================== */

function ManualReview({ items, onAction }) {
  const [explanations, setExplanations] = useState({});
  const [loadingExplanation, setLoadingExplanation] = useState({});

  const getAIExplanation = async (item) => {
    setLoadingExplanation({ ...loadingExplanation, [item.id]: true });
    try {
      const response = await axios.post('/explain', {
        field: item.field_name,
        current_value: item.current_value,
        candidates: [], // Could be enhanced with actual candidates
        chosen_value: item.suggested_value,
        confidence: 0.5, // Default confidence for manual review items
        decision: 'manual_review'
      });
      setExplanations({ ...explanations, [item.id]: response.data.explanation });
    } catch (err) {
      if (err.response?.status === 429) {
        alert('Rate limit exceeded. Please wait before requesting more explanations.');
      } else {
        alert('Failed to get AI explanation');
      }
    } finally {
      setLoadingExplanation({ ...loadingExplanation, [item.id]: false });
    }
  };

  return (
    <div className="card">
      <h2>📝 Manual Review Queue</h2>
      {items.length === 0 ? <p>No items pending review.</p> : (
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Provider ID</th>
              <th>Field</th>
              <th>Current Value</th>
              <th>Suggested Value</th>
              <th>Reason</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <React.Fragment key={i.id}>
                <tr>
                  <td>{i.id}</td>
                  <td>{i.provider_id}</td>
                  <td>{i.field_name}</td>
                  <td className="text-strike">{i.current_value}</td>
                  <td className="text-highlight">{i.suggested_value}</td>
                  <td>{i.reason}</td>
                  <td className="actions-cell">
                    <button className="btn-approve" onClick={() => onAction(i.id, 'approve')}>Approve</button>
                    <button className="btn-override" onClick={() => {
                      const val = window.prompt('Enter override value:', i.suggested_value);
                      if (val) onAction(i.id, 'override', val);
                    }}>Override</button>
                    <button className="btn-reject" onClick={() => onAction(i.id, 'reject')}>Reject</button>
                    <button 
                      className="btn-explain" 
                      onClick={() => getAIExplanation(i)}
                      disabled={loadingExplanation[i.id]}
                    >
                      {loadingExplanation[i.id] ? '...' : '🤖 Explain'}
                    </button>
                  </td>
                </tr>
                {explanations[i.id] && (
                  <tr>
                    <td colSpan="7" className="explanation-row">
                      <div className="ai-explanation">
                        <strong>🤖 AI Analysis:</strong> {explanations[i.id]}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* =====================
   MAIN APP
   ===================== */

export default function App() {
  const [view, setView] = useState('dashboard');
  const [selectedProviderId, setSelectedProviderId] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  const [stats, setStats] = useState(null);
  const [providers, setProviders] = useState([]);
  const [manualItems, setManualItems] = useState([]);

  // Apply dark mode to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  const loadData = async () => {
    try {
      const [s, p, m] = await Promise.all([
        axios.get('/stats'),
        axios.get('/providers'),
        axios.get('/manual-review'),
      ]);
      setStats(s.data);
      setProviders(p.data);
      setManualItems(m.data.filter(i => i.status === 'pending'));
    } catch (err) {
      console.error('Error loading data', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const runBatch = async () => {
    if (window.confirm('Run daily batch process? This may take a moment.')) {
      await axios.post('/run-batch?type=daily');
      await loadData();
      alert('Batch run complete!');
    }
  };

  const downloadReport = async () => {
    try {
      const response = await axios.get('/reports/latest', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `validation_report_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download report');
    }
  };

  const handleManualAction = async (id, action, value) => {
    try {
      if (action === 'approve') {
        await axios.post(`/manual-review/${id}/approve`);
      } else if (action === 'reject') {
        await axios.post(`/manual-review/${id}/reject`);
      } else {
        await axios.post(`/manual-review/${id}/override?value=${encodeURIComponent(value)}`);
      }
      await loadData();
    } catch {
      alert('Action failed');
    }
  };

  const navigateToDetail = (id) => {
    setSelectedProviderId(id);
    setView('detail');
  };

  return (
    <div className="app-layout">
      {/* Left Sidebar */}
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand">
            <span className="ey-logo">EY</span>
            <h2>Agentic AI</h2>
            <p>Provider Data Command Center</p>
          </div>
          <button className="theme-toggle" onClick={toggleDarkMode} title="Toggle dark mode">
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
        <nav className="sidebar-nav">
          <button className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}>
            📊 Dashboard
          </button>
          <button className={view === 'providers' ? 'active' : ''} onClick={() => setView('providers')}>
            🏥 Providers
          </button>
          <button className={view === 'manual' ? 'active' : ''} onClick={() => setView('manual')}>
            📝 Manual Review
            {manualItems.length > 0 && <span className="badge-count">{manualItems.length}</span>}
          </button>
        </nav>
        <div className="sidebar-footer">
          <button className="btn-run-batch" onClick={runBatch}>
            ▷ Run Daily Batch
          </button>
          <button className="btn-download" onClick={downloadReport}>
            ↓ Download Report
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {view === 'dashboard' && <Dashboard stats={stats} manualReviewCount={manualItems.length} />}
        {view === 'providers' && <ProviderList providers={providers} onSelect={navigateToDetail} />}
        {view === 'detail' && <ProviderDetail providerId={selectedProviderId} onBack={() => setView('providers')} />}
        {view === 'manual' && <ManualReview items={manualItems} onAction={handleManualAction} />}
      </main>

      {/* Chatbot */}
      <Chatbot />
    </div>
  );
}
