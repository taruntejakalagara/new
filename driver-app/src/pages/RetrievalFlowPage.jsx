import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Car, CheckCircle, Phone, ArrowLeft,
  Loader2, AlertCircle, Key, Footprints, Navigation,
  DollarSign, CreditCard, Smartphone, X
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { NFCPluginWrapper } from '../plugins/nfc';
import { Capacitor } from '@capacitor/core';

// Step definitions - these match backend statuses
const STEPS = ['accepted', 'keys_picked', 'walking', 'driving', 'ready', 'completed'];

const STEP_UI = {
  accepted: {
    icon: CheckCircle,
    title: 'Task Accepted',
    subtitle: 'Head to hook board',
    color: 'var(--color-primary)',
    buttonText: 'Keys Picked Up',
    showHook: true,
  },
  keys_picked: {
    icon: Key,
    title: 'Keys Picked Up',
    subtitle: 'Walking to parking spot',
    color: 'var(--color-warning)',
    buttonText: 'At the Car',
    showHook: true,
  },
  walking: {
    icon: Footprints,
    title: 'Walking to Car',
    subtitle: 'Finding the vehicle',
    color: 'var(--color-warning)',
    buttonText: 'Driving to Valet',
    showParking: true,
  },
  driving: {
    icon: Navigation,
    title: 'Driving to Valet',
    subtitle: 'Bringing car to valet stand',
    color: 'var(--color-accent)',
    buttonText: 'Car Ready',
  },
  ready: {
    icon: CheckCircle,
    title: 'Car Ready',
    subtitle: 'Waiting for customer',
    color: 'var(--color-success)',
    buttonText: 'Verify & Complete',
    secondaryButtonText: 'Park & Get Next Task',
    showCall: true,
    showHandover: true,
  },
  completed: {
    icon: CheckCircle,
    title: 'Complete!',
    subtitle: 'Vehicle handed over',
    color: 'var(--color-success)',
  },
};

// LocalStorage helpers
const STORAGE_KEY = 'activeRetrievalTask';

const saveTask = (data) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

const loadTask = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const clearTask = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export default function RetrievalFlowPage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [step, setStep] = useState('accepted');
  const [task, setTask] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Handover state
  const [showHandoverFlow, setShowHandoverFlow] = useState(false);
  const [cashCollected, setCashCollected] = useState(false);
  const [nfcVerified, setNfcVerified] = useState(false);
  const [nfcStatus, setNfcStatus] = useState('idle'); // idle, scanning, success, error
  const [nfcMessage, setNfcMessage] = useState('');
  
  const initialized = useRef(false);

  // Initialize once on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    
    const navTask = location.state?.request;
    const savedData = loadTask();
    
    console.log('Init - navTask:', navTask);
    console.log('Init - savedData:', savedData);
    
    if (navTask) {
      const vehicleData = {
        license_plate: navTask.license_plate,
        make: navTask.make,
        model: navTask.model,
        color: navTask.color,
        hook_number: navTask.hook_number,
        parking_spot: navTask.parking_spot,
        customer_phone: navTask.customer_phone,
        payment_method: navTask.payment_method || 'cash',
        amount: navTask.amount || 15,
      };
      
      setTask(navTask);
      setVehicle(vehicleData);
      
      let initialStep = navTask.status || 'assigned';
      if (initialStep === 'assigned') initialStep = 'accepted';
      
      if (savedData && savedData.taskId === navTask.id) {
        const savedIndex = STEPS.indexOf(savedData.step);
        const serverIndex = STEPS.indexOf(initialStep);
        if (savedIndex > serverIndex) {
          initialStep = savedData.step;
        }
      }
      
      setStep(initialStep);
      saveTask({ taskId: navTask.id, step: initialStep, vehicle: vehicleData, task: navTask });
      
    } else if (savedData) {
      setTask(savedData.task);
      setVehicle(savedData.vehicle);
      setStep(savedData.step);
    } else {
      setError('No task data');
    }
  }, []);

  const goToNextStep = async () => {
    if (loading) return;
    
    // If on ready step, show handover flow instead of completing
    if (step === 'ready') {
      setShowHandoverFlow(true);
      // Auto-set cash collected if paid online
      if (vehicle?.payment_method === 'online') {
        setCashCollected(true);
      }
      return;
    }
    
    const currentIndex = STEPS.indexOf(step);
    const nextStep = STEPS[currentIndex + 1];
    
    console.log(`Going from ${step} to ${nextStep}`);
    
    if (!nextStep) return;
    
    setLoading(true);
    
    try {
      if (nextStep !== 'completed') {
        await fetch(`${API_BASE_URL}/retrieval/${task?.id}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStep }),
        });
      }
      
      setStep(nextStep);
      saveTask({ taskId: task?.id, step: nextStep, vehicle, task });
      
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const parkAndGetNext = async () => {
    if (loading) return;
    setLoading(true);
    
    try {
      clearTask();
      navigate('/tasks?type=retrieval');
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Cancel/abandon the task
  const cancelTask = async () => {
    if (!confirm('Cancel this task? It will return to the queue for another driver.')) {
      return;
    }
    
    setLoading(true);
    try {
      const driverId = localStorage.getItem('driverId');
      
      const response = await fetch(`${API_BASE_URL}/retrieval/${task.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          driverId,
          reason: 'Driver cancelled'
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        clearTask();
        alert('Task cancelled and returned to queue');
        navigate('/dashboard');
      } else {
        alert('Error: ' + (data.message || 'Could not cancel'));
      }
    } catch (err) {
      console.error('Cancel error:', err);
      alert('Error cancelling task');
    } finally {
      setLoading(false);
    }
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
        verifyCard(task?.unique_card_id);
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
    const expectedCardId = task?.unique_card_id;
    
    if (scannedCardId?.toUpperCase() !== expectedCardId?.toUpperCase()) {
      setNfcStatus('error');
      setNfcMessage(`Wrong card! This is not ${vehicle?.license_plate}`);
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

    setLoading(true);
    
    try {
      const driverId = localStorage.getItem('driverId');
      
      await fetch(`${API_BASE_URL}/complete-retrieval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unique_card_id: task?.unique_card_id,
          cardId: task?.unique_card_id,
          requestId: task?.id,
          driver_id: parseInt(driverId),
          driverId: parseInt(driverId),
        }),
      });

      clearTask();
      setStep('completed');
      
      setTimeout(() => navigate('/dashboard'), 2500);
      
    } catch (err) {
      console.error('Error:', err);
      alert('Error completing handover');
    } finally {
      setLoading(false);
    }
  };

  // Error state
  if (error) {
    return (
      <div className="page">
        <div className="card text-center p-xl">
          <AlertCircle size={48} className="text-error mx-auto mb-md" />
          <h2 className="mb-sm">Error</h2>
          <p className="text-muted mb-lg">{error}</p>
          <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const ui = STEP_UI[step] || STEP_UI.accepted;
  const Icon = ui.icon;
  const stepIndex = STEPS.indexOf(step);
  const isPaidOnline = vehicle?.payment_method === 'online';

  // Handover Flow UI
  if (showHandoverFlow && step === 'ready') {
    return (
      <div className="page">
        <div className="page-header">
          <button className="btn btn-icon btn-ghost" onClick={() => setShowHandoverFlow(false)}>
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
              <div className="font-semibold">{vehicle?.license_plate}</div>
              <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                {vehicle?.color} {vehicle?.make} {vehicle?.model}
              </div>
            </div>
            {isPaidOnline && (
              <div className="badge badge-success">
                <CreditCard size={14} />
                Paid
              </div>
            )}
          </div>
        </div>

        {/* Step 1: Cash Collection (if cash payment) */}
        {!isPaidOnline && !cashCollected && (
          <div className="card mb-lg" style={{ background: 'var(--color-warning)', color: 'white' }}>
            <div className="text-center mb-md">
              <DollarSign size={32} style={{ opacity: 0.8 }} />
              <p style={{ fontSize: '0.875rem', opacity: 0.9, marginTop: '0.5rem' }}>
                Step 1: Collect Cash Payment
              </p>
              <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>
                ${(vehicle?.amount || 15).toFixed(2)}
              </div>
            </div>
            <button 
              onClick={handleCollectCash} 
              className="btn btn-lg w-full"
              style={{ background: 'white', color: 'var(--color-warning)' }}
            >
              <CheckCircle size={20} />
              Cash Collected
            </button>
          </div>
        )}

        {/* Payment Confirmed Badge */}
        {cashCollected && (
          <div className="alert alert-success mb-lg">
            <CheckCircle size={18} />
            <span>
              {isPaidOnline ? 'Paid Online' : `Cash Collected - $${(vehicle?.amount || 15).toFixed(2)}`}
            </span>
          </div>
        )}

        {/* Step 2: NFC Verification */}
        {cashCollected && (
          <div className="card mb-lg">
            <p className="text-muted mb-md" style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
              {isPaidOnline ? 'Step 1' : 'Step 2'}: Verify Customer's Card
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
            disabled={loading}
            className="btn btn-success btn-lg w-full"
          >
            {loading ? (
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

  // Main Flow UI
  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <button className="btn btn-icon btn-ghost" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="mb-0">Retrieval Task</h1>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>
            Step {stepIndex + 1} of {STEPS.length - 1}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex gap-xs mb-lg">
        {STEPS.slice(0, -1).map((s, i) => (
          <div 
            key={s}
            className="flex-1"
            style={{ 
              height: 4, 
              borderRadius: 2,
              background: i <= stepIndex ? ui.color : 'var(--color-border)',
              transition: 'background 0.3s',
            }} 
          />
        ))}
      </div>

      {/* Main Card */}
      <div className="card p-lg">
        {/* Status */}
        <div className="text-center mb-lg">
          <div 
            className="w-20 h-20 rounded-full mx-auto mb-md flex items-center justify-center"
            style={{ background: `color-mix(in srgb, ${ui.color} 15%, transparent)` }}
          >
            <Icon size={40} style={{ color: ui.color }} />
          </div>
          <h2 className="mb-xs">{ui.title}</h2>
          <p className="text-muted">{ui.subtitle}</p>
        </div>

        {/* Hook Number */}
        {ui.showHook && vehicle?.hook_number && (
          <div 
            className="text-center p-lg mb-lg rounded-xl"
            style={{ background: 'var(--color-primary)', color: 'white' }}
          >
            <p style={{ opacity: 0.7, fontSize: '0.75rem', textTransform: 'uppercase' }}>
              Hook Number
            </p>
            <p style={{ fontSize: '3.5rem', fontWeight: 700, lineHeight: 1 }}>
              {vehicle.hook_number}
            </p>
          </div>
        )}

        {/* Parking Location */}
        {ui.showParking && vehicle?.parking_spot && (
          <div 
            className="text-center p-lg mb-lg rounded-xl"
            style={{ background: 'var(--color-warning)', color: 'white' }}
          >
            <p style={{ opacity: 0.7, fontSize: '0.75rem', textTransform: 'uppercase' }}>
              Parking Location
            </p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>
              {vehicle.parking_spot}
            </p>
          </div>
        )}

        {/* Vehicle Info */}
        <div className="vehicle-card mb-lg">
          <div className="vehicle-icon">
            <Car size={24} />
          </div>
          <div className="vehicle-info">
            <div className="vehicle-plate">{vehicle?.license_plate || 'N/A'}</div>
            <div className="vehicle-details">
              {vehicle?.color} {vehicle?.make} {vehicle?.model}
            </div>
          </div>
          {isPaidOnline && (
            <div className="badge badge-success">
              <CreditCard size={14} />
              Paid
            </div>
          )}
        </div>

        {/* Call Customer */}
        {ui.showCall && vehicle?.customer_phone && (
          <a href={`tel:${vehicle.customer_phone}`} className="btn btn-outline btn-lg w-full mb-md">
            <Phone size={20} />
            Call Customer
          </a>
        )}

        {/* Action Button */}
        {step !== 'completed' && (
          <button 
            onClick={goToNextStep}
            disabled={loading}
            className="btn btn-lg w-full"
            style={{ background: ui.color, color: 'white' }}
          >
            {loading ? (
              <>
                <Loader2 size={20} className="spinner" />
                Updating...
              </>
            ) : (
              <>
                <CheckCircle size={20} />
                {ui.buttonText}
              </>
            )}
          </button>
        )}

        {/* Secondary Button - Park & Get Next Task */}
        {step === 'ready' && ui.secondaryButtonText && (
          <button 
            onClick={parkAndGetNext}
            disabled={loading}
            className="btn btn-outline btn-lg w-full mt-md"
          >
            <Car size={18} />
            {ui.secondaryButtonText}
          </button>
        )}

        {/* Completed Message */}
        {step === 'completed' && (
          <div className="text-center p-lg">
            <div 
              className="w-20 h-20 rounded-full mx-auto mb-md flex items-center justify-center"
              style={{ background: 'var(--color-success)' }}
            >
              <CheckCircle size={40} color="white" />
            </div>
            <h2 className="text-success mb-sm">Handover Complete!</h2>
            <p className="text-muted">Returning to dashboard...</p>
          </div>
        )}

        {/* Cancel Button - show before completion */}
        {step !== 'completed' && step !== 'ready' && (
          <button 
            onClick={cancelTask}
            disabled={loading}
            className="btn btn-ghost w-full mt-lg"
            style={{ color: 'var(--color-error)' }}
          >
            <X size={18} />
            Cancel Task
          </button>
        )}
      </div>
    </div>
  );
}
