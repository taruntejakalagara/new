import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Smartphone, Check, AlertTriangle, ArrowLeft, 
  Car, MapPin, Key, Trash2, Loader2, X, CreditCard
} from 'lucide-react';
import { NFCPluginWrapper } from '../plugins/nfc';
import { API_BASE_URL, CUSTOMER_URL } from '../config/api';

// Flow states
const STATES = {
  WAITING: 'waiting',
  CARD_IN_USE: 'card_in_use',
  CONFIRM_ACTIVATE: 'confirm',
  ACTIVATING: 'activating',
  GIVE_CARD: 'give_card',
  VEHICLE_DETAILS: 'vehicle_details',
  PARKING: 'parking',
  KEY_PLACEMENT: 'key_placement',
  COMPLETE: 'complete',
};

export default function NFCCheckInPage() {
  const navigate = useNavigate();
  
  const [flowState, setFlowState] = useState(STATES.WAITING);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  
  const [cardId, setCardId] = useState(null);
  const [assignedHook, setAssignedHook] = useState(null);
  const [existingCardUrl, setExistingCardUrl] = useState(null);
  
  const [vehicleDetails, setVehicleDetails] = useState({
    licensePlate: '',
    make: '',
    model: '',
    color: '',
  });
  
  const [parkingLocation, setParkingLocation] = useState('');

  const [vehicleOnCard, setVehicleOnCard] = useState(null);

  const generateCardId = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11).toUpperCase();
    return `CARD-${timestamp}-${random}`;
  };

  const getNextHook = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/next-hook`);
      const data = await response.json();
      if (data.success && data.hookNumber) {
        return data.hookNumber;
      }
    } catch (error) {
      console.error('Error getting hook:', error);
    }
    return Math.floor(Math.random() * 50) + 1;
  };

  // Step 1: Read card
  const handleTapCard = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setStatusMessage('Reading card...');

    try {
      const readResult = await NFCPluginWrapper.readNdef();
      
      if (readResult.success && readResult.hasData && readResult.isSmartValetCard) {
        setExistingCardUrl(readResult.content);
        
        // Check if vehicle exists in database
        const existingCardId = readResult.content?.split('/v/')[1];
        if (existingCardId) {
          setStatusMessage('Checking vehicle...');
          try {
            const response = await fetch(`${API_BASE_URL}/vehicles/card/${existingCardId}`);
            if (response.ok) {
              const data = await response.json();
              if (data.success && data.vehicle && data.vehicle.status === 'parked') {
                setVehicleOnCard(data.vehicle);
              } else {
                setVehicleOnCard(null);
              }
            } else {
              setVehicleOnCard(null);
            }
          } catch (e) {
            console.log('Vehicle check failed:', e);
            setVehicleOnCard(null);
          }
        }
        
        setFlowState(STATES.CARD_IN_USE);
        setIsProcessing(false);
        return;
      }

      // Card is blank - generate ID but DON'T get hook yet
      const newCardId = generateCardId();
      setCardId(newCardId);
      setFlowState(STATES.CONFIRM_ACTIVATE);
      
    } catch (error) {
      console.error('NFC Error:', error);
      setStatusMessage(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Step 2: Write to card
  const handleConfirmActivate = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setFlowState(STATES.ACTIVATING);
    setStatusMessage('Hold card near phone...');

    try {
      const writeUrl = `${CUSTOMER_URL}/v/${cardId}`;
      const writeResult = await NFCPluginWrapper.writeNdef({ data: writeUrl });

      if (writeResult.success) {
        setFlowState(STATES.GIVE_CARD);
      } else {
        setStatusMessage('Write failed. Try again.');
        setFlowState(STATES.CONFIRM_ACTIVATE);
      }
    } catch (error) {
      console.error('NFC Write Error:', error);
      setStatusMessage(`Error: ${error.message}`);
      setFlowState(STATES.CONFIRM_ACTIVATE);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelBeforeActivate = () => {
    setFlowState(STATES.WAITING);
    setCardId(null);
    setStatusMessage('');
  };

  const handleClearCard = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setStatusMessage('Checking vehicle status...');

    try {
      const existingCardId = existingCardUrl?.split('/v/')[1];
      
      if (existingCardId) {
        const response = await fetch(`${API_BASE_URL}/vehicles/card/${existingCardId}`);
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.vehicle && data.vehicle.status === 'parked') {
            // Vehicle is still parked - DO NOT clear
            setStatusMessage(`Cannot clear: ${data.vehicle.license_plate} is still parked on Hook #${data.vehicle.hook_number}`);
            setIsProcessing(false);
            return;
          }
        }
        // If 404 or vehicle not parked, safe to clear
      }

      // Safe to clear the card
      setStatusMessage('Clearing card...');
      const clearResult = await NFCPluginWrapper.clearNdef();
      
      if (clearResult.success) {
        resetFlow();
        setStatusMessage('Card cleared! Tap again to activate.');
      } else {
        setStatusMessage('Failed to clear card. Try again.');
      }
    } catch (error) {
      // Network error or 404 - assume safe to clear
      console.log('Check failed, attempting clear:', error.message);
      setStatusMessage('Clearing card...');
      try {
        const clearResult = await NFCPluginWrapper.clearNdef();
        if (clearResult.success) {
          resetFlow();
          setStatusMessage('Card cleared!');
          return;
        }
      } catch (e) {
        console.error('Clear failed:', e);
      }
      setStatusMessage('Failed to clear card.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Get hook and complete check-in
  const handleComplete = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setStatusMessage('Saving...');

    try {
      const driverId = localStorage.getItem('driverId');

      const response = await fetch(`${API_BASE_URL}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unique_card_id: cardId,
          license_plate: vehicleDetails.licensePlate || 'PENDING',
          make: vehicleDetails.make || 'Unknown',
          model: vehicleDetails.model || 'Unknown',
          color: vehicleDetails.color || 'Unknown',
          key_slot: assignedHook,
          parking_spot: parkingLocation || 'Not specified',
          driver_id: driverId,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setFlowState(STATES.COMPLETE);
      } else {
        setStatusMessage(data.message || 'Check-in failed');
        alert('Error: ' + (data.message || 'Check-in failed'));
      }
    } catch (error) {
      setStatusMessage(error.message);
      alert('Error: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Get hook number when moving to key placement
  const handleParkingComplete = async () => {
    setIsProcessing(true);
    try {
      const hookNumber = await getNextHook();
      setAssignedHook(hookNumber);
      setFlowState(STATES.KEY_PLACEMENT);
    } catch (error) {
      console.error('Error getting hook:', error);
      setAssignedHook(1);
      setFlowState(STATES.KEY_PLACEMENT);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelAfterActivate = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await NFCPluginWrapper.clearNdef().catch(() => {});
    } catch (e) {}
    resetFlow();
    navigate('/dashboard');
  };

  const resetFlow = () => {
    setFlowState(STATES.WAITING);
    setCardId(null);
    setAssignedHook(null);
    setExistingCardUrl(null);
    setVehicleOnCard(null);
    setVehicleDetails({ licensePlate: '', make: '', model: '', color: '' });
    setParkingLocation('');
    setIsProcessing(false);
    setStatusMessage('');
  };

  // ============ RENDER ============

  // WAITING - Tap card
  if (flowState === STATES.WAITING) {
    return (
      <div className="page">
        <div className="page-header">
          <button className="btn btn-icon btn-ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={24} />
          </button>
          <h1>Check In Vehicle</h1>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div 
            onClick={!isProcessing ? handleTapCard : undefined}
            style={{
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: isProcessing ? 'var(--color-accent)' : 'var(--color-surface)',
              border: '3px solid var(--color-accent)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isProcessing ? 'default' : 'pointer',
              transition: 'all 0.3s',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            }}
          >
            {isProcessing ? (
              <Loader2 size={64} color="white" style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Smartphone size={64} style={{ color: 'var(--color-accent)' }} />
            )}
          </div>
          
          <h2 style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>
            {isProcessing ? 'Reading...' : 'Tap to Scan'}
          </h2>
          <p className="text-muted" style={{ textAlign: 'center' }}>
            Hold NFC card near phone
          </p>
          
          {statusMessage && (
            <p style={{ color: 'var(--color-accent)', marginTop: '1rem' }}>{statusMessage}</p>
          )}
        </div>

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  // CARD IN USE
  if (flowState === STATES.CARD_IN_USE) {
    return (
      <div className="page">
        <div className="page-header">
          <button className="btn btn-icon btn-ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={24} />
          </button>
          <h1>Card In Use</h1>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div className="card" style={{ maxWidth: 360, textAlign: 'center', padding: '2rem' }}>
            {vehicleOnCard ? (
              // Vehicle is parked - show warning, cannot clear
              <>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%',
                  background: 'rgba(239,68,68,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 1.5rem',
                }}>
                  <AlertTriangle size={40} style={{ color: 'var(--color-error)' }} />
                </div>
                
                <h2 style={{ marginBottom: '0.5rem', color: 'var(--color-error)' }}>Vehicle Still Parked!</h2>
                <p className="text-muted" style={{ marginBottom: '1rem' }}>
                  This card is linked to an active vehicle
                </p>

                {/* Vehicle info */}
                <div style={{ 
                  background: 'var(--color-surface-alt)', 
                  borderRadius: 12, 
                  padding: '1rem',
                  marginBottom: '1.5rem',
                  textAlign: 'left',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 12,
                      background: 'var(--color-error)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Car size={24} color="white" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '1.1rem' }}>
                        {vehicleOnCard.license_plate}
                      </div>
                      <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                        {vehicleOnCard.color} {vehicleOnCard.make} {vehicleOnCard.model}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-error)' }}>
                        #{vehicleOnCard.hook_number}
                      </div>
                      <div className="text-muted" style={{ fontSize: '0.625rem', textTransform: 'uppercase' }}>
                        Hook
                      </div>
                    </div>
                  </div>
                </div>

                <div className="alert alert-error" style={{ marginBottom: '1rem', textAlign: 'left' }}>
                  <AlertTriangle size={18} />
                  <span>Cannot clear - vehicle must be retrieved first</span>
                </div>

                <button onClick={() => navigate('/dashboard')} className="btn btn-outline" style={{ width: '100%' }}>
                  Back to Dashboard
                </button>
              </>
            ) : (
              // No vehicle or already retrieved - can clear
              <>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%',
                  background: 'rgba(245,158,11,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 1.5rem',
                }}>
                  <AlertTriangle size={40} style={{ color: 'var(--color-warning)' }} />
                </div>
                
                <h2 style={{ marginBottom: '0.5rem' }}>Card Has Old Data</h2>
                <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
                  No active vehicle found. You can clear this card to reuse it.
                </p>

                {statusMessage && (
                  <div className="alert alert-warning" style={{ marginBottom: '1rem', textAlign: 'left' }}>
                    {statusMessage}
                  </div>
                )}

                <button
                  onClick={handleClearCard}
                  disabled={isProcessing}
                  className="btn btn-success btn-lg"
                  style={{ width: '100%', marginBottom: '0.75rem' }}
                >
                  {isProcessing ? <Loader2 size={20} className="spinner" /> : <Check size={20} />}
                  {isProcessing ? 'Clearing...' : 'Clear & Reuse Card'}
                </button>

                <button onClick={() => navigate('/dashboard')} className="btn btn-ghost" style={{ width: '100%' }}>
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // CONFIRM ACTIVATE
  if (flowState === STATES.CONFIRM_ACTIVATE) {
    return (
      <div className="page">
        <div className="page-header">
          <button className="btn btn-icon btn-ghost" onClick={handleCancelBeforeActivate}>
            <ArrowLeft size={24} />
          </button>
          <h1>Activate Card</h1>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div className="card" style={{ maxWidth: 360, textAlign: 'center', padding: '2rem' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'rgba(59,130,246,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}>
              <CreditCard size={40} style={{ color: 'var(--color-accent)' }} />
            </div>
            
            <h2 style={{ marginBottom: '0.5rem' }}>Ready to Activate?</h2>
            <p className="text-muted" style={{ marginBottom: '2rem' }}>
              This will program the NFC card for a new customer
            </p>

            <button
              onClick={handleConfirmActivate}
              className="btn btn-success btn-lg"
              style={{ width: '100%', marginBottom: '0.75rem' }}
            >
              <Check size={20} />
              Activate Card
            </button>

            <button onClick={handleCancelBeforeActivate} className="btn btn-ghost" style={{ width: '100%' }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ACTIVATING
  if (flowState === STATES.ACTIVATING) {
    return (
      <div className="page">
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 160, height: 160, borderRadius: '50%',
              background: 'var(--color-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.5rem',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}>
              <Smartphone size={64} color="white" />
            </div>
            
            <h2 style={{ marginBottom: '0.5rem' }}>Hold Card Near Phone</h2>
            <p className="text-muted">Programming card...</p>
          </div>
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.05); opacity: 0.8; }
          }
        `}</style>
      </div>
    );
  }

  // GIVE CARD TO CUSTOMER
  if (flowState === STATES.GIVE_CARD) {
    return (
      <div className="page">
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div className="card" style={{ maxWidth: 360, textAlign: 'center', padding: '2rem' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'rgba(16,185,129,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}>
              <Check size={40} style={{ color: 'var(--color-success)' }} />
            </div>
            
            <h2 style={{ color: 'var(--color-success)', marginBottom: '0.5rem' }}>Card Activated!</h2>
            <p className="text-muted" style={{ marginBottom: '2rem' }}>
              Give this card to the customer now
            </p>

            <button
              onClick={() => setFlowState(STATES.VEHICLE_DETAILS)}
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
            >
              Card Given → Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // VEHICLE DETAILS
  if (flowState === STATES.VEHICLE_DETAILS) {
    return (
      <div className="page">
        <div className="page-header">
          <Car size={24} style={{ color: 'var(--color-accent)' }} />
          <div>
            <h1 style={{ marginBottom: 0 }}>Vehicle Details</h1>
            <p className="text-muted" style={{ fontSize: '0.875rem' }}>Optional - can skip</p>
          </div>
        </div>

        <div style={{ padding: '1rem' }}>
          <div className="input-group" style={{ marginBottom: '1rem' }}>
            <label className="input-label">License Plate</label>
            <input
              type="text"
              className="input"
              placeholder="ABC-1234"
              value={vehicleDetails.licensePlate}
              onChange={(e) => setVehicleDetails({ ...vehicleDetails, licensePlate: e.target.value.toUpperCase() })}
              style={{ fontSize: '1.25rem', textAlign: 'center', letterSpacing: '0.1em' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div className="input-group">
              <label className="input-label">Make</label>
              <input
                type="text"
                className="input"
                placeholder="Toyota"
                value={vehicleDetails.make}
                onChange={(e) => setVehicleDetails({ ...vehicleDetails, make: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Model</label>
              <input
                type="text"
                className="input"
                placeholder="Camry"
                value={vehicleDetails.model}
                onChange={(e) => setVehicleDetails({ ...vehicleDetails, model: e.target.value })}
              />
            </div>
          </div>

          <div className="input-group" style={{ marginBottom: '2rem' }}>
            <label className="input-label">Color</label>
            <input
              type="text"
              className="input"
              placeholder="Silver"
              value={vehicleDetails.color}
              onChange={(e) => setVehicleDetails({ ...vehicleDetails, color: e.target.value })}
            />
          </div>

          <button
            onClick={() => setFlowState(STATES.PARKING)}
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginBottom: '0.75rem' }}
          >
            Next
          </button>

          <button
            onClick={() => setFlowState(STATES.PARKING)}
            className="btn btn-ghost"
            style={{ width: '100%' }}
          >
            Skip
          </button>
        </div>
      </div>
    );
  }

  // PARKING
  if (flowState === STATES.PARKING) {
    return (
      <div className="page">
        <div className="page-header">
          <MapPin size={24} style={{ color: 'var(--color-accent)' }} />
          <div>
            <h1 style={{ marginBottom: 0 }}>Park the Vehicle</h1>
            <p className="text-muted" style={{ fontSize: '0.875rem' }}>Note where you parked</p>
          </div>
        </div>

        <div style={{ padding: '1rem' }}>
          {/* Vehicle summary */}
          {vehicleDetails.licensePlate && (
            <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: 'var(--color-surface-alt)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Car size={24} style={{ color: 'var(--color-text-muted)' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '1.1rem' }}>
                    {vehicleDetails.licensePlate}
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                    {vehicleDetails.color} {vehicleDetails.make} {vehicleDetails.model}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="input-group" style={{ marginBottom: '2rem' }}>
            <label className="input-label">Parking Location (optional)</label>
            <input
              type="text"
              className="input"
              placeholder="Row A, Spot 12"
              value={parkingLocation}
              onChange={(e) => setParkingLocation(e.target.value)}
            />
          </div>

          <button
            onClick={handleParkingComplete}
            disabled={isProcessing}
            className="btn btn-success btn-lg"
            style={{ width: '100%' }}
          >
            {isProcessing ? (
              <><Loader2 size={20} className="spinner" /> Getting Hook...</>
            ) : (
              <><Car size={20} /> Vehicle Parked</>
            )}
          </button>
        </div>
      </div>
    );
  }

  // KEY PLACEMENT - Show hook number here
  if (flowState === STATES.KEY_PLACEMENT) {
    return (
      <div className="page">
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ textAlign: 'center', width: '100%', maxWidth: 360 }}>
            {/* Big hook number display */}
            <div style={{
              background: 'linear-gradient(135deg, var(--color-accent) 0%, #6366f1 100%)',
              borderRadius: 24,
              padding: '2.5rem 2rem',
              marginBottom: '2rem',
              boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3)',
            }}>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                Place Keys on Hook
              </div>
              <div style={{ color: 'white', fontSize: '5rem', fontWeight: 700, lineHeight: 1 }}>
                #{assignedHook}
              </div>
            </div>

            {/* Vehicle info */}
            {vehicleDetails.licensePlate && (
              <div style={{ 
                background: 'var(--color-surface)', 
                borderRadius: 12, 
                padding: '1rem',
                marginBottom: '1.5rem',
                border: '1px solid var(--color-border)',
              }}>
                <div style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '1.1rem' }}>
                  {vehicleDetails.licensePlate}
                </div>
                <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                  {vehicleDetails.color} {vehicleDetails.make} {vehicleDetails.model}
                </div>
              </div>
            )}

            <button
              onClick={handleComplete}
              disabled={isProcessing}
              className="btn btn-success btn-lg"
              style={{ width: '100%', padding: '1rem 2rem' }}
            >
              {isProcessing ? (
                <><Loader2 size={20} className="spinner" /> Saving...</>
              ) : (
                <><Key size={20} /> Keys Placed - Complete</>
              )}
            </button>

            {statusMessage && (
              <p style={{ color: 'var(--color-error)', marginTop: '1rem' }}>{statusMessage}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // COMPLETE
  if (flowState === STATES.COMPLETE) {
    return (
      <div className="page">
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ textAlign: 'center', width: '100%', maxWidth: 360 }}>
            <div style={{
              width: 100, height: 100, borderRadius: '50%',
              background: 'var(--color-success)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}>
              <Check size={50} color="white" />
            </div>
            
            <h2 style={{ color: 'var(--color-success)', marginBottom: '0.5rem' }}>Check-In Complete!</h2>
            
            <div style={{ 
              background: 'var(--color-surface-alt)', 
              borderRadius: 16, 
              padding: '1.5rem',
              marginBottom: '2rem',
            }}>
              <div className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                Hook
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--color-success)' }}>
                #{assignedHook}
              </div>
              {vehicleDetails.licensePlate && (
                <div style={{ marginTop: '0.5rem', fontFamily: 'monospace' }}>
                  {vehicleDetails.licensePlate}
                </div>
              )}
            </div>

            <button
              onClick={resetFlow}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginBottom: '0.75rem' }}
            >
              Check In Another
            </button>
            
            <button
              onClick={() => navigate('/dashboard')}
              className="btn btn-outline"
              style={{ width: '100%' }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
