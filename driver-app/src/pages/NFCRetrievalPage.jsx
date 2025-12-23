import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Smartphone, Car, CheckCircle, AlertCircle, 
  ArrowLeft, Loader2, DollarSign, CreditCard,
  Clock, Zap
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { NFCPluginWrapper } from '../plugins/nfc';

const STATES = {
  SCANNING: 'scanning',
  LOADING: 'loading',
  VEHICLE_FOUND: 'vehicle_found',
  PAYMENT: 'payment',
  REQUEST_SENT: 'request_sent',
  ALREADY_REQUESTED: 'already_requested',
  ERROR: 'error',
  NOT_FOUND: 'not_found',
};

export default function NFCRetrievalPage() {
  const navigate = useNavigate();
  const [state, setState] = useState(STATES.SCANNING);
  const [cardId, setCardId] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Payment state
  const [paymentMethod, setPaymentMethod] = useState(null); // 'cash' or 'card'
  const [isPriority, setIsPriority] = useState(false);
  const [amount, setAmount] = useState(15);
  const [priorityFee, setPriorityFee] = useState(10);

  // Manual card ID entry for testing
  const [manualCardId, setManualCardId] = useState('');

  // Handle NFC tap
  const handleTapCard = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setState(STATES.LOADING);

    try {
      const readResult = await NFCPluginWrapper.readNdef();
      console.log('NFC Read result:', readResult);
      
      if (readResult.success && readResult.hasData && readResult.content) {
        const content = readResult.content;
        let extractedCardId = content;
        
        if (content.includes('/v/')) {
          extractedCardId = content.split('/v/')[1];
        }
        
        console.log('Extracted card ID:', extractedCardId);
        setCardId(extractedCardId);
        await lookupVehicle(extractedCardId);
      } else {
        setError('Card is empty or not a valet card');
        setState(STATES.ERROR);
      }
    } catch (err) {
      console.error('NFC Read error:', err);
      setError(err.message || 'Failed to read NFC card');
      setState(STATES.ERROR);
    } finally {
      setIsProcessing(false);
    }
  };

  const lookupVehicle = async (cardIdToLookup) => {
    try {
      // Fetch vehicle by card ID
      const response = await fetch(`${API_BASE_URL}/vehicles/card/${cardIdToLookup}`);
      
      if (!response.ok) {
        setState(STATES.NOT_FOUND);
        return;
      }
      
      const data = await response.json();
      
      if (!data.success || !data.vehicle) {
        setState(STATES.NOT_FOUND);
        return;
      }

      const foundVehicle = data.vehicle;

      if (foundVehicle.status === 'retrieved') {
        setError('This vehicle has already been retrieved');
        setState(STATES.ERROR);
        return;
      }

      setVehicle(foundVehicle);
      setAmount(data.vehicle.parking_fee || 15);

      // Check if there's already a retrieval request
      const queueResponse = await fetch(`${API_BASE_URL}/queue`);
      const queueData = await queueResponse.json();
      const existingRequest = (queueData.requests || []).find(r => 
        r.unique_card_id === cardIdToLookup && 
        ['pending', 'assigned', 'keys_picked', 'walking', 'driving', 'ready'].includes(r.status)
      );

      if (existingRequest) {
        setState(STATES.ALREADY_REQUESTED);
      } else {
        setState(STATES.VEHICLE_FOUND);
      }
      
    } catch (err) {
      console.error('Lookup error:', err);
      setError('Failed to look up vehicle');
      setState(STATES.ERROR);
    }
  };

  const handleManualLookup = async () => {
    if (!manualCardId.trim()) return;
    setIsProcessing(true);
    setState(STATES.LOADING);
    setCardId(manualCardId.trim());
    await lookupVehicle(manualCardId.trim());
    setIsProcessing(false);
  };

  const proceedToPayment = () => {
    setState(STATES.PAYMENT);
  };

  const submitRequest = async () => {
    if (!paymentMethod) {
      alert('Please select a payment method');
      return;
    }

    setIsProcessing(true);
    setState(STATES.LOADING);

    try {
      // Create retrieval request with payment info
      const response = await fetch(`${API_BASE_URL}/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unique_card_id: cardId,
          is_priority: isPriority,
          payment_method: paymentMethod,
          amount: isPriority ? amount + priorityFee : amount,
        }),
      });

      const data = await response.json();
      
      if (data.alreadyRequested) {
        setState(STATES.ALREADY_REQUESTED);
        return;
      }

      if (!data.success) {
        throw new Error(data.message || 'Failed to create request');
      }

      setState(STATES.REQUEST_SENT);

    } catch (err) {
      console.error('Request error:', err);
      setError(err.message);
      setState(STATES.ERROR);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetScan = () => {
    setState(STATES.SCANNING);
    setCardId(null);
    setVehicle(null);
    setError(null);
    setPaymentMethod(null);
    setIsPriority(false);
    setManualCardId('');
  };

  const totalAmount = isPriority ? amount + priorityFee : amount;

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <button className="btn btn-icon btn-ghost" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={24} />
        </button>
        <h1>Customer Pickup</h1>
      </div>

      <div className="p-md">
        {/* SCANNING STATE */}
        {state === STATES.SCANNING && (
          <div>
            <div className="text-center py-xl">
              <div 
                onClick={!isProcessing ? handleTapCard : undefined}
                style={{
                  width: 180,
                  height: 180,
                  borderRadius: '50%',
                  background: isProcessing ? 'var(--color-accent)' : 'var(--color-surface)',
                  border: '3px solid var(--color-accent)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                  cursor: isProcessing ? 'default' : 'pointer',
                  transition: 'all 0.3s',
                }}
              >
                {isProcessing ? (
                  <Loader2 size={56} color="white" style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Smartphone size={56} style={{ color: 'var(--color-accent)' }} />
                )}
              </div>
              
              <h2 style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>
                {isProcessing ? 'Reading...' : 'Tap Customer Card'}
              </h2>
              <p className="text-muted">Hold NFC card near phone</p>
            </div>

            {/* Manual Entry */}
            <div className="card mt-lg" style={{ padding: '1rem' }}>
              <p className="text-muted mb-sm" style={{ fontSize: '0.75rem' }}>Manual lookup:</p>
              <div className="flex gap-sm">
                <input
                  type="text"
                  value={manualCardId}
                  onChange={(e) => setManualCardId(e.target.value)}
                  placeholder="CARD-XXXXX..."
                  className="input flex-1"
                  style={{ fontSize: '0.875rem' }}
                />
                <button 
                  onClick={handleManualLookup}
                  disabled={isProcessing || !manualCardId.trim()}
                  className="btn btn-primary"
                >
                  Look Up
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LOADING STATE */}
        {state === STATES.LOADING && (
          <div className="text-center py-xl">
            <Loader2 size={48} className="mx-auto mb-md" style={{ color: 'var(--color-primary)', animation: 'spin 1s linear infinite' }} />
            <p className="text-muted">Processing...</p>
          </div>
        )}

        {/* VEHICLE FOUND - Show info and proceed to payment */}
        {state === STATES.VEHICLE_FOUND && vehicle && (
          <div>
            <div className="text-center mb-lg">
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'rgba(16,185,129,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1rem',
              }}>
                <Car size={32} style={{ color: 'var(--color-success)' }} />
              </div>
              <h2 style={{ marginBottom: '0.25rem' }}>Vehicle Found</h2>
              <p className="text-muted">Collect payment to request car</p>
            </div>

            {/* Vehicle Details */}
            <div className="card mb-lg" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: 'var(--color-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ color: 'white', fontWeight: 700, fontSize: '1.25rem' }}>
                    #{vehicle.hook_number}
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '1.1rem' }}>
                    {vehicle.license_plate || 'N/A'}
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                    {vehicle.color} {vehicle.make} {vehicle.model}
                  </div>
                </div>
              </div>
              
              {vehicle.parking_duration_hours && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                  <Clock size={16} />
                  <span>Parked for {vehicle.parking_duration_hours} hour(s)</span>
                </div>
              )}
            </div>

            {/* Fee Display */}
            <div className="card mb-lg" style={{ 
              padding: '1.5rem', 
              background: 'linear-gradient(135deg, var(--color-primary) 0%, #6366f1 100%)',
              color: 'white',
              textAlign: 'center',
            }}>
              <div style={{ opacity: 0.8, fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                Valet Fee
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>
                ${amount.toFixed(2)}
              </div>
            </div>

            <button 
              onClick={proceedToPayment}
              className="btn btn-success btn-lg"
              style={{ width: '100%' }}
            >
              <DollarSign size={20} />
              Collect Payment
            </button>
          </div>
        )}

        {/* PAYMENT - Select method and confirm */}
        {state === STATES.PAYMENT && vehicle && (
          <div>
            <div className="text-center mb-lg">
              <h2 style={{ marginBottom: '0.25rem' }}>Payment</h2>
              <p className="text-muted">Select payment method</p>
            </div>

            {/* Vehicle Summary */}
            <div className="card mb-lg" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Car size={24} style={{ color: 'var(--color-text-muted)' }} />
                <div>
                  <div style={{ fontWeight: 600 }}>{vehicle.license_plate}</div>
                  <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                    {vehicle.color} {vehicle.make} {vehicle.model}
                  </div>
                </div>
              </div>
            </div>

            {/* Priority Option */}
            <div 
              onClick={() => setIsPriority(!isPriority)}
              className="card mb-md"
              style={{ 
                padding: '1rem',
                cursor: 'pointer',
                border: isPriority ? '2px solid var(--color-warning)' : '2px solid transparent',
                background: isPriority ? 'rgba(245,158,11,0.1)' : 'var(--color-surface)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: isPriority ? 'var(--color-warning)' : 'var(--color-surface-alt)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Zap size={20} style={{ color: isPriority ? 'white' : 'var(--color-text-muted)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>Priority Retrieval</div>
                  <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                    Skip the queue (+${priorityFee.toFixed(2)})
                  </div>
                </div>
                <div style={{ 
                  width: 24, height: 24, borderRadius: '50%',
                  border: '2px solid',
                  borderColor: isPriority ? 'var(--color-warning)' : 'var(--color-border)',
                  background: isPriority ? 'var(--color-warning)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {isPriority && <CheckCircle size={16} color="white" />}
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <p className="text-muted mb-sm" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>
              Payment Method
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <button
                onClick={() => setPaymentMethod('cash')}
                className="card"
                style={{ 
                  padding: '1.25rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  border: paymentMethod === 'cash' ? '2px solid var(--color-success)' : '2px solid transparent',
                  background: paymentMethod === 'cash' ? 'rgba(16,185,129,0.1)' : 'var(--color-surface)',
                }}
              >
                <DollarSign size={32} style={{ color: paymentMethod === 'cash' ? 'var(--color-success)' : 'var(--color-text-muted)', margin: '0 auto 0.5rem' }} />
                <div style={{ fontWeight: 600 }}>Cash</div>
              </button>
              
              <button
                onClick={() => setPaymentMethod('card')}
                className="card"
                style={{ 
                  padding: '1.25rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  border: paymentMethod === 'card' ? '2px solid var(--color-success)' : '2px solid transparent',
                  background: paymentMethod === 'card' ? 'rgba(16,185,129,0.1)' : 'var(--color-surface)',
                }}
              >
                <CreditCard size={32} style={{ color: paymentMethod === 'card' ? 'var(--color-success)' : 'var(--color-text-muted)', margin: '0 auto 0.5rem' }} />
                <div style={{ fontWeight: 600 }}>Card</div>
              </button>
            </div>

            {/* Total */}
            <div className="card mb-lg" style={{ 
              padding: '1.5rem', 
              background: 'var(--color-success)',
              color: 'white',
              textAlign: 'center',
            }}>
              <div style={{ opacity: 0.8, fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                Total Amount
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>
                ${totalAmount.toFixed(2)}
              </div>
              {isPriority && (
                <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>
                  (Includes ${priorityFee.toFixed(2)} priority fee)
                </div>
              )}
            </div>

            <button 
              onClick={submitRequest}
              disabled={!paymentMethod || isProcessing}
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
            >
              {isProcessing ? (
                <><Loader2 size={20} className="spinner" /> Processing...</>
              ) : (
                <><Car size={20} /> {paymentMethod === 'cash' ? 'Cash Collected - Request Car' : 'Payment Done - Request Car'}</>
              )}
            </button>

            <button 
              onClick={() => setState(STATES.VEHICLE_FOUND)}
              className="btn btn-ghost"
              style={{ width: '100%', marginTop: '0.75rem' }}
            >
              Back
            </button>
          </div>
        )}

        {/* REQUEST SENT - Confirmation */}
        {state === STATES.REQUEST_SENT && (
          <div className="text-center py-xl">
            <div style={{
              width: 100, height: 100, borderRadius: '50%',
              background: 'var(--color-success)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}>
              <CheckCircle size={50} color="white" />
            </div>
            <h2 style={{ color: 'var(--color-success)', marginBottom: '0.5rem' }}>Request Submitted!</h2>
            <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
              A driver will retrieve the vehicle shortly
            </p>
            
            {vehicle && (
              <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <Car size={24} style={{ color: 'var(--color-text-muted)' }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{vehicle.license_plate}</div>
                    <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                      {vehicle.color} {vehicle.make} {vehicle.model}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button onClick={resetScan} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
              Process Another Customer
            </button>
            
            <button onClick={() => navigate('/dashboard')} className="btn btn-ghost" style={{ width: '100%', marginTop: '0.75rem' }}>
              Back to Dashboard
            </button>
          </div>
        )}

        {/* ALREADY REQUESTED */}
        {state === STATES.ALREADY_REQUESTED && (
          <div className="text-center py-xl">
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'rgba(59,130,246,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}>
              <Clock size={40} style={{ color: 'var(--color-accent)' }} />
            </div>
            <h2 style={{ marginBottom: '0.5rem' }}>Already Requested</h2>
            <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
              This vehicle is already being retrieved
            </p>
            
            <button onClick={resetScan} className="btn btn-primary">
              Scan Another Card
            </button>
          </div>
        )}

        {/* NOT FOUND STATE */}
        {state === STATES.NOT_FOUND && (
          <div className="text-center py-lg">
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'rgba(245,158,11,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}>
              <AlertCircle size={40} style={{ color: 'var(--color-warning)' }} />
            </div>
            <h2 style={{ marginBottom: '0.5rem' }}>Vehicle Not Found</h2>
            <p className="text-muted" style={{ marginBottom: '0.5rem' }}>
              No parked vehicle found with this card
            </p>
            <p className="text-muted mb-lg" style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
              Card: {cardId}
            </p>
            <button onClick={resetScan} className="btn btn-primary">
              Scan Again
            </button>
          </div>
        )}

        {/* ERROR STATE */}
        {state === STATES.ERROR && (
          <div className="text-center py-lg">
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'rgba(239,68,68,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}>
              <AlertCircle size={40} style={{ color: 'var(--color-error)' }} />
            </div>
            <h2 style={{ marginBottom: '0.5rem' }}>Error</h2>
            <p className="text-muted mb-lg">{error}</p>
            <button onClick={resetScan} className="btn btn-primary">
              Try Again
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
