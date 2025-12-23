import { useState, useEffect } from 'react';
import { 
  Receipt, DollarSign, CreditCard, Wallet, Users,
  CheckCircle, AlertCircle, Clock, FileText, Send
} from 'lucide-react';
import { API_BASE_URL, ENDPOINTS } from '../config/api';
import { useAuth } from '../context/AuthContext';

export default function CloseoutPage() {
  const { manager, shiftConfig } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [data, setData] = useState({
    shiftStart: null,
    totalRetrievals: 0,
    valetFees: 0,
    tips: 0,
    cashCollected: 0,
    cardPayments: 0,
    expectedCash: 0,
    driverBreakdown: [],
  });

  const [cashCount, setCashCount] = useState({
    hundreds: 0,
    fifties: 0,
    twenties: 0,
    tens: 0,
    fives: 0,
    ones: 0,
    coins: 0,
  });

  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchCloseoutData();
  }, []);

  const fetchCloseoutData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}${ENDPOINTS.CLOSEOUT_CURRENT}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        setData({
          shiftStart: result.data.shiftStart || null,
          totalRetrievals: result.data.totalRetrievals || 0,
          valetFees: result.data.valetFees || 0,
          tips: result.data.tips || 0,
          cashCollected: result.data.cashCollected || 0,
          cardPayments: result.data.cardPayments || 0,
          expectedCash: result.data.expectedCash || 0,
          driverBreakdown: result.data.driverBreakdown || [],
        });
      }
      // If no data returned, keep defaults (all zeros)
    } catch (error) {
      console.error('Error fetching closeout data:', error);
      // Keep defaults on error
    } finally {
      setLoading(false);
    }
  };

  const calculateCashTotal = () => {
    return (
      cashCount.hundreds * 100 +
      cashCount.fifties * 50 +
      cashCount.twenties * 20 +
      cashCount.tens * 10 +
      cashCount.fives * 5 +
      cashCount.ones * 1 +
      cashCount.coins
    );
  };

  const cashTotal = calculateCashTotal();
  const variance = cashTotal - data.expectedCash;

  const handleSubmit = async () => {
    if (!confirm('Submit this closeout? This action cannot be undone.')) return;

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}${ENDPOINTS.CLOSEOUT_SUBMIT}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          managerId: manager?.id,
          cashCounted: cashTotal,
          expectedCash: data.expectedCash,
          variance,
          notes,
          breakdown: cashCount,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setSubmitted(true);
      } else {
        alert('Failed to submit closeout');
      }
    } catch (error) {
      console.error('Error submitting closeout:', error);
      alert('Error submitting closeout');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDuration = (startTime) => {
    if (!startTime) return '--';
    const hours = Math.floor((Date.now() - new Date(startTime).getTime()) / (60 * 60 * 1000));
    return `${hours}h`;
  };

  const hasData = data.totalRetrievals > 0 || data.valetFees > 0 || data.cashCollected > 0;

  if (loading) {
    return (
      <div className="page-content flex items-center justify-center">
        <div className="spinner lg" style={{ color: 'var(--color-accent)' }} />
      </div>
    );
  }

  if (submitted) {
    return (
      <>
        <header className="page-header">
          <div className="page-header-title">
            <h1>Closeout</h1>
            <p>End of shift reconciliation</p>
          </div>
        </header>
        <div className="page-content">
          <div className="card">
            <div className="card-body text-center" style={{ padding: 'var(--space-xl)' }}>
              <div style={{ 
                width: 80, 
                height: 80, 
                background: 'var(--color-success-light)', 
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto var(--space-lg)',
              }}>
                <CheckCircle size={40} style={{ color: 'var(--color-success)' }} />
              </div>
              <h2 style={{ marginBottom: 'var(--space-sm)' }}>Closeout Submitted</h2>
              <p className="text-muted">
                Your shift has been closed out successfully.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <header className="page-header">
        <div className="page-header-title">
          <h1>Closeout</h1>
          <p>End of shift reconciliation</p>
        </div>
        <div className="page-header-actions">
          <div className="flex items-center gap-sm text-muted">
            <Clock size={16} />
            <span>Shift: {formatDuration(data.shiftStart)}</span>
          </div>
        </div>
      </header>

      <div className="page-content">
        {!hasData ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">
                <Receipt size={24} />
              </div>
              <h3>No Shift Data</h3>
              <p>There are no transactions to close out for the current shift.</p>
              <p className="text-muted" style={{ marginTop: 'var(--space-sm)', fontSize: '0.875rem' }}>
                Complete some retrievals first, then return here to close out.
              </p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
            {/* Left Column - Summary */}
            <div>
              {/* Shift Summary */}
              <div className="card mb-lg">
                <div className="card-header">
                  <h2>Shift Summary</h2>
                </div>
                <div className="card-body">
                  <div className="closeout-item">
                    <span className="closeout-label">Total Retrievals</span>
                    <span className="closeout-value">{data.totalRetrievals}</span>
                  </div>
                  <div className="closeout-item">
                    <span className="closeout-label">Valet Fees</span>
                    <span className="closeout-value">${data.valetFees.toFixed(2)}</span>
                  </div>
                  <div className="closeout-item">
                    <span className="closeout-label">Tips Collected</span>
                    <span className="closeout-value">${data.tips.toFixed(2)}</span>
                  </div>
                  <div className="closeout-item total">
                    <span className="closeout-label">Total Revenue</span>
                    <span className="closeout-value">${(data.valetFees + data.tips).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Breakdown */}
              <div className="card mb-lg">
                <div className="card-header">
                  <h2>Payment Methods</h2>
                </div>
                <div className="card-body">
                  <div className="closeout-item">
                    <span className="closeout-label flex items-center gap-sm">
                      <Wallet size={16} /> Cash
                    </span>
                    <span className="closeout-value">${data.cashCollected.toFixed(2)}</span>
                  </div>
                  <div className="closeout-item">
                    <span className="closeout-label flex items-center gap-sm">
                      <CreditCard size={16} /> Card
                    </span>
                    <span className="closeout-value">${data.cardPayments.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Driver Breakdown */}
              {data.driverBreakdown.length > 0 && shiftConfig.tipPolicy === 'pooled' && (
                <div className="card">
                  <div className="card-header">
                    <h2>Driver Tip Split</h2>
                    <span className="badge badge-accent">Pooled</span>
                  </div>
                  <div className="card-body flush">
                    {data.driverBreakdown.map((driver, i) => {
                      const pooledTip = data.tips / data.driverBreakdown.length;
                      return (
                        <div key={i} className="leaderboard-item">
                          <div className="leaderboard-info">
                            <div className="leaderboard-name">{driver.name}</div>
                            <div className="leaderboard-meta">{driver.retrievals} retrievals</div>
                          </div>
                          <div className="leaderboard-value text-success">
                            ${pooledTip.toFixed(2)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {data.driverBreakdown.length > 0 && shiftConfig.tipPolicy === 'individual' && (
                <div className="card">
                  <div className="card-header">
                    <h2>Driver Tips</h2>
                    <span className="badge badge-info">Individual</span>
                  </div>
                  <div className="card-body flush">
                    {data.driverBreakdown.map((driver, i) => (
                      <div key={i} className="leaderboard-item">
                        <div className="leaderboard-info">
                          <div className="leaderboard-name">{driver.name}</div>
                          <div className="leaderboard-meta">{driver.retrievals} retrievals</div>
                        </div>
                        <div className="leaderboard-value text-success">
                          ${(driver.tips || 0).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.driverBreakdown.length === 0 && (
                <div className="card">
                  <div className="card-header">
                    <h2>Driver Breakdown</h2>
                  </div>
                  <div className="card-body">
                    <div className="text-center text-muted" style={{ padding: 'var(--space-md)' }}>
                      <Users size={24} style={{ opacity: 0.3, marginBottom: 'var(--space-sm)' }} />
                      <p>No driver data for this shift</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Cash Count */}
            <div>
              <div className="card mb-lg">
                <div className="card-header">
                  <h2>Cash Count</h2>
                </div>
                <div className="card-body">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-md)' }}>
                    {[
                      { label: '$100 Bills', key: 'hundreds', multiplier: 100 },
                      { label: '$50 Bills', key: 'fifties', multiplier: 50 },
                      { label: '$20 Bills', key: 'twenties', multiplier: 20 },
                      { label: '$10 Bills', key: 'tens', multiplier: 10 },
                      { label: '$5 Bills', key: 'fives', multiplier: 5 },
                      { label: '$1 Bills', key: 'ones', multiplier: 1 },
                    ].map(({ label, key, multiplier }) => (
                      <div key={key} className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">{label}</label>
                        <div className="flex items-center gap-sm">
                          <input
                            type="number"
                            className="form-input"
                            value={cashCount[key]}
                            onChange={(e) => setCashCount({ ...cashCount, [key]: parseInt(e.target.value) || 0 })}
                            min="0"
                            style={{ textAlign: 'center' }}
                          />
                          <span className="text-muted font-mono" style={{ minWidth: 60 }}>
                            = ${(cashCount[key] * multiplier).toFixed(0)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="form-group mt-md" style={{ marginBottom: 0 }}>
                    <label className="form-label">Coins ($)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={cashCount.coins}
                      onChange={(e) => setCashCount({ ...cashCount, coins: parseFloat(e.target.value) || 0 })}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>

              {/* Reconciliation */}
              <div className="card mb-lg">
                <div className="card-header">
                  <h2>Reconciliation</h2>
                </div>
                <div className="card-body">
                  <div className="closeout-item">
                    <span className="closeout-label">Expected Cash</span>
                    <span className="closeout-value">${data.expectedCash.toFixed(2)}</span>
                  </div>
                  <div className="closeout-item">
                    <span className="closeout-label">Cash Counted</span>
                    <span className="closeout-value">${cashTotal.toFixed(2)}</span>
                  </div>
                  <div className="closeout-item total">
                    <span className="closeout-label">Variance</span>
                    <span className={`closeout-value ${variance === 0 ? 'text-success' : variance > 0 ? 'text-warning' : 'text-error'}`}>
                      {variance >= 0 ? '+' : ''}${variance.toFixed(2)}
                    </span>
                  </div>

                  {variance !== 0 && cashTotal > 0 && (
                    <div className={`alert mt-md ${variance > 0 ? 'alert-warning' : 'alert-error'}`}>
                      <AlertCircle className="alert-icon" />
                      <span>
                        {variance > 0 
                          ? `Cash is $${variance.toFixed(2)} over expected`
                          : `Cash is $${Math.abs(variance).toFixed(2)} short`
                        }
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="card mb-lg">
                <div className="card-header">
                  <h2>Shift Notes</h2>
                </div>
                <div className="card-body">
                  <textarea
                    className="form-input"
                    rows={4}
                    placeholder="Any notes for the next shift..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                className="btn btn-accent btn-lg btn-block"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <span className="spinner" style={{ width: 20, height: 20 }} />
                ) : (
                  <>
                    <Send size={20} />
                    Submit Closeout
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
