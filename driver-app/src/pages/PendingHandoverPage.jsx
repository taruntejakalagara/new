import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, RefreshCw, Car, Clock, Phone,
  Check, DollarSign, CreditCard, Loader2, AlertCircle,
  Smartphone, CheckCircle
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { NFCPluginWrapper } from '../plugins/nfc';
import { Capacitor } from '@capacitor/core';

export default function PendingHandoverPage() {
  const navigate = useNavigate();
  
  const [handovers, setHandovers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Handover flow state
  const [selectedHandover, setSelectedHandover] = useState(null);
  const [cashCollected, setCashCollected] = useState(false);
  const [nfcVerified, setNfcVerified] = useState(false);
  const [nfcStatus, setNfcStatus] = useState('idle');
  const [nfcMessage, setNfcMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchHandovers();
    const interval = setInterval(fetchHandovers, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchHandovers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/pending-handovers`);
      const data = await response.json();
      if (data.success) {
        setHandovers(data.handovers || []);
      }
    } catch (error) {
      console.error('Error fetching handovers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchHandovers();
    setTimeout(() => setRefreshing(false), 500);
  };

  const getWaitTime = (readyAt) => {
    if (!readyAt) return null;
    const minutes = Math.floor((Date.now() - new Date(readyAt).getTime()) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m waiting`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m waiting`;
  };

  const handleSelectHandover = (handover) => {
    setSelectedHandover(handover);
    setCashCollected(handover.payment_method === 'online' || handover.payment_processed === 1);
    setNfcVerified(false);
    setNfcStatus('idle');
    setNfcMessage('');
  };

  const handleCollectCash = () => {
    setCashCollected(true);
  };

  const startNfcVerification = async () => {
    setNfcStatus('scanning');
    setNfcMessage('Hold customer\'s NFC card near phone...');

    // Web simulation
    if (Capacitor.getPlatform() === 'web') {
      setTimeout(() => {
        verifyCard(selectedHandover?.unique_card_id);
      }, 1500);
      return;
    }

    try {
      const readResult = await NFCPluginWrapper.readNdef();
      
      if (readResult.success && readResult.content) {
        let cardId = readResult.content;
        if (cardId.includes('/v/')) {
          cardId = cardId.split('/v/')[1];
        }
        verifyCard(cardId);
      } else {
        setNfcStatus('error');
        setNfcMessage('Could not read card');
      }
    } catch (err) {
      console.error('NFC Error:', err);
      setNfcStatus('error');
      setNfcMessage('NFC error: ' + (err.message || 'Try again'));
    }
  };

  const verifyCard = async (scannedCardId) => {
    const expectedCardId = selectedHandover?.unique_card_id;
    
    if (scannedCardId?.toUpperCase() !== expectedCardId?.toUpperCase()) {
      setNfcStatus('error');
      setNfcMessage(`Wrong card! This is not ${selectedHandover?.license_plate}`);
      return;
    }

    setNfcStatus('success');
    setNfcMessage('Card verified! Clearing card...');
    setNfcVerified(true);

    // Clear the NFC card
    if (Capacitor.getPlatform() !== 'web') {
      try {
        await NFCPluginWrapper.clearNdef();
      } catch (err) {
        console.log('Clear error (non-critical):', err);
      }
    }

    setNfcMessage('Card cleared! Ready to complete.');
  };

  const completeHandover = async () => {
    if (!nfcVerified) {
      alert('Please verify customer\'s NFC card first');
      return;
    }

    setIsProcessing(true);
    
    try {
      const driverId = localStorage.getItem('driverId');
      
      const response = await fetch(`${API_BASE_URL}/complete-retrieval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unique_card_id: selectedHandover.unique_card_id,
          cardId: selectedHandover.unique_card_id,
          requestId: selectedHandover.id,
          driver_id: parseInt(driverId),
          driverId: parseInt(driverId),
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setNfcMessage('Handover complete!');
        setTimeout(() => {
          setSelectedHandover(null);
          setCashCollected(false);
          setNfcVerified(false);
          setNfcStatus('idle');
          setIsProcessing(false);
          fetchHandovers();
        }, 1500);
      } else {
        alert('Failed to complete: ' + (data.message || 'Unknown error'));
        setIsProcessing(false);
      }
      
    } catch (error) {
      console.error('Error completing handover:', error);
      alert('Error completing handover');
      setIsProcessing(false);
    }
  };

  const handleBack = () => {
    if (selectedHandover) {
      setSelectedHandover(null);
      setCashCollected(false);
      setNfcVerified(false);
      setNfcStatus('idle');
    } else {
      navigate('/dashboard');
    }
  };

  const isPaidOnline = (handover) => handover.payment_method === 'online' || handover.payment_processed === 1;

  // ============ HANDOVER FLOW VIEW ============
  if (selectedHandover) {
    const handover = selectedHandover;
    const paidOnline = isPaidOnline(handover);
    
    return (
      <div className="page">
        <div className="page-header">
          <button className="btn btn-icon btn-ghost" onClick={handleBack} disabled={isProcessing}>
            <ArrowLeft size={24} />
          </button>
          <h1>Complete Handover</h1>
        </div>

        {/* Vehicle Card */}
        <div className="card mb-lg">
          <div className="flex items-center gap-md">
            <div className="vehicle-icon">
              <Car size={24} />
            </div>
            <div className="flex-1">
              <div className="font-semibold">{handover.license_plate}</div>
              <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                {handover.color} {handover.make} {handover.model}
              </div>
              <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                Hook #{handover.hook_number}
              </div>
            </div>
            {paidOnline && (
              <div className="badge badge-success">
                <CreditCard size={14} />
                Paid
              </div>
            )}
          </div>
        </div>

        {/* Step 1: Cash Collection (if cash payment) */}
        {!paidOnline && !cashCollected && (
          <div className="card mb-lg" style={{ background: 'var(--color-warning)', color: 'white' }}>
            <div className="text-center mb-md">
              <DollarSign size={32} style={{ opacity: 0.8 }} />
              <p style={{ fontSize: '0.875rem', opacity: 0.9, marginTop: '0.5rem' }}>
                Step 1: Collect Cash Payment
              </p>
              <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>
                ${(handover.amount || 15).toFixed(2)}
              </div>
            </div>
            <button 
              onClick={handleCollectCash} 
              className="btn btn-lg w-full"
              style={{ background: 'white', color: 'var(--color-warning)' }}
            >
              <Check size={20} />
              Cash Collected
            </button>
          </div>
        )}

        {/* Payment Confirmed Badge */}
        {cashCollected && (
          <div className="alert alert-success mb-lg">
            <CheckCircle size={18} />
            <span>
              {paidOnline ? 'Paid Online' : `Cash Collected - $${(handover.amount || 15).toFixed(2)}`}
            </span>
          </div>
        )}

        {/* Step 2: NFC Verification */}
        {cashCollected && (
          <div className="card mb-lg">
            <p className="text-muted mb-md" style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
              {paidOnline ? 'Step 1' : 'Step 2'}: Verify Customer's Card
            </p>

            {nfcStatus === 'idle' && (
              <button onClick={startNfcVerification} className="btn btn-primary btn-lg w-full">
                <Smartphone size={24} />
                <span>Tap Customer's Card</span>
              </button>
            )}

            {nfcStatus === 'scanning' && (
              <div className="nfc-scan-area nfc-scanning">
                <div className="nfc-icon">
                  <Smartphone size={36} className="text-accent" />
                </div>
                <p className="text-accent font-semibold">{nfcMessage}</p>
              </div>
            )}

            {nfcStatus === 'success' && (
              <div className="text-center p-lg">
                <div className="nfc-icon mx-auto mb-md" style={{ background: 'rgba(16,185,129,0.1)' }}>
                  <CheckCircle size={36} className="text-success" />
                </div>
                <p className="text-success font-semibold">{nfcMessage}</p>
              </div>
            )}

            {nfcStatus === 'error' && (
              <>
                <div className="alert alert-error mb-md">
                  <AlertCircle size={18} />
                  <span>{nfcMessage}</span>
                </div>
                <button onClick={() => setNfcStatus('idle')} className="btn btn-primary w-full">
                  Try Again
                </button>
              </>
            )}
          </div>
        )}

        {/* Complete Button */}
        {nfcVerified && (
          <button 
            onClick={completeHandover}
            disabled={isProcessing}
            className="btn btn-success btn-lg w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 size={20} className="spinner" />
                Completing...
              </>
            ) : (
              <>
                <CheckCircle size={20} />
                Complete Handover
              </>
            )}
          </button>
        )}
      </div>
    );
  }

  // ============ LIST VIEW ============
  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <button className="btn btn-icon btn-ghost" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1">
          <h1 className="mb-0">Pending Handovers</h1>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>
            {handovers.length} ready for pickup
          </p>
        </div>
        <button className="btn btn-icon btn-ghost" onClick={handleRefresh}>
          <RefreshCw size={20} className={refreshing ? 'spinner' : ''} />
        </button>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="empty-state">
          <Loader2 size={32} className="spinner text-accent" />
        </div>
      ) : handovers.length === 0 ? (
        /* Empty State */
        <div className="empty-state fade-in">
          <div className="empty-state-icon">
            <Car size={32} />
          </div>
          <h3 className="mb-sm">No Pending Handovers</h3>
          <p>Cars marked "ready" will appear here</p>
        </div>
      ) : (
        /* Handover List */
        <div className="flex flex-col gap-md">
          {handovers.map((handover, index) => (
            <div 
              key={handover.id}
              className="card card-compact slide-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {/* Vehicle Info */}
              <div className="flex items-start gap-md mb-md">
                <div className="vehicle-icon">
                  <Car size={24} />
                </div>
                <div className="flex-1">
                  <div className="vehicle-name">
                    {handover.make || 'Unknown'} {handover.model || ''}
                  </div>
                  <div className="vehicle-details">
                    {handover.color && `${handover.color} • `}
                    <span className="vehicle-plate">{handover.license_plate}</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="hook-number" style={{ fontSize: '1.75rem', lineHeight: 1 }}>
                    #{handover.hook_number}
                  </div>
                  <div style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    Hook
                  </div>
                </div>
              </div>

              {/* Wait Time */}
              {handover.car_ready_at && (
                <div className="flex items-center gap-xs text-muted mb-md" style={{ fontSize: '0.875rem' }}>
                  <Clock size={14} />
                  {getWaitTime(handover.car_ready_at)}
                </div>
              )}

              {/* Payment Badge */}
              <div className={`payment-badge mb-md ${isPaidOnline(handover) ? 'payment-badge-online' : 'payment-badge-cash'}`}>
                {isPaidOnline(handover) ? (
                  <>
                    <CreditCard size={16} />
                    Paid Online
                  </>
                ) : (
                  <>
                    <DollarSign size={16} />
                    Cash - ${(handover.amount || 15).toFixed(2)} to collect
                  </>
                )}
              </div>

              {/* Call Customer Button */}
              {handover.customer_phone && (
                <a href={`tel:${handover.customer_phone}`} className="btn btn-outline w-full mb-md">
                  <Phone size={18} />
                  Call Customer
                </a>
              )}

              {/* Complete Button */}
              <button
                onClick={() => handleSelectHandover(handover)}
                className="btn btn-success btn-lg w-full"
              >
                <Smartphone size={20} />
                Verify & Complete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
