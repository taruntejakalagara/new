/**
 * StatusTrackingPage - Real-time vehicle retrieval tracking
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Car, Clock, CheckCircle, User, MapPin, Phone, Bell, Sparkles, ChevronRight, AlertCircle, Loader } from 'lucide-react';
import { VENUE } from '../config/venue';

const STATUS_CONFIG = {
  pending: { label: 'Request Received', color: 'amber', icon: Clock, step: 1, message: 'Your request is in the queue' },
  assigned: { label: 'Driver Assigned', color: 'blue', icon: User, step: 2, message: 'A valet is on their way to your vehicle' },
  in_progress: { label: 'Retrieving Vehicle', color: 'blue', icon: Car, step: 3, message: 'Your vehicle is being retrieved' },
  ready: { label: 'Ready for Pickup', color: 'green', icon: CheckCircle, step: 4, message: 'Your vehicle is waiting at the entrance!' },
  completed: { label: 'Completed', color: 'green', icon: CheckCircle, step: 5, message: 'Thank you for using our valet service!' },
};

export default function StatusTrackingPage() {
  const { cardId } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [eta, setEta] = useState(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [cardId]);

  const loadData = async () => {
    try {
      // Get vehicle info
      const vehiclesRes = await fetch('${API_BASE_URL}/vehicles');
      const vehiclesData = await vehiclesRes.json();
      const vehicles = vehiclesData.vehicles || vehiclesData.data || vehiclesData || [];
      const found = vehicles.find(v => v.unique_card_id === cardId);
      if (found) setVehicle(found);

      // Get queue status
      const queueRes = await fetch('${API_BASE_URL}/queue');
      const queueData = await queueRes.json();
      const requests = queueData.requests || [];
      const activeRequest = requests.find(r => r.unique_card_id === cardId && ['pending', 'assigned', 'in_progress', 'ready'].includes(r.status));
      
      if (activeRequest) {
        setRequest(activeRequest);
        // Calculate ETA based on position
        const position = requests.filter(r => ['pending', 'assigned', 'in_progress'].includes(r.status)).findIndex(r => r.id === activeRequest.id);
        if (position >= 0 && activeRequest.status === 'pending') {
          setEta((position + 1) * 3 + 2); // ~3 min per car + buffer
        } else if (activeRequest.status === 'in_progress') {
          setEta(2);
        } else if (activeRequest.status === 'ready') {
          setEta(0);
        }
      } else {
        // Check pending handovers
        const handoversRes = await fetch('${API_BASE_URL}/pending-handovers');
        const handoversData = await handoversRes.json();
        const handover = (handoversData.handovers || []).find(h => h.unique_card_id === cardId);
        if (handover) {
          setRequest({ ...handover, status: 'ready' });
          setEta(0);
        }
      }
    } catch (error) {
      console.error('Error loading status:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentStatus = request?.status || 'pending';
  const statusInfo = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.pending;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] to-[#16213e] flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-10 h-10 text-[#C9A962] animate-spin mx-auto mb-4" />
          <p className="text-white/60">Loading status...</p>
        </div>
      </div>
    );
  }

  if (!request && !loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] p-8 text-center">
            <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No Active Request</h2>
            <p className="text-white/60">You don't have an active retrieval request.</p>
          </div>
          <div className="p-6">
            <button onClick={() => navigate(`/vehicle-info/${cardId}`)} className="w-full py-4 bg-gradient-to-r from-[#C9A962] to-[#B8983F] text-[#1a1a2e] rounded-xl font-bold">
              Request Your Vehicle
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* Header */}
      <div className={`relative overflow-hidden ${currentStatus === 'ready' ? 'bg-gradient-to-b from-green-600 to-green-700' : 'bg-gradient-to-b from-[#1a1a2e] to-[#16213e]'}`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="relative px-6 pt-6 pb-10">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => navigate(`/vehicle-info/${cardId}`)} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full border border-white/20">
              <ChevronRight className="w-5 h-5 text-white rotate-180" />
            </button>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${currentStatus === 'ready' ? 'bg-white/20' : 'bg-[#C9A962]/20'}`}>
              <Bell className={`w-4 h-4 ${currentStatus === 'ready' ? 'text-white' : 'text-[#C9A962]'}`} />
              <span className={`text-xs font-medium ${currentStatus === 'ready' ? 'text-white' : 'text-[#C9A962]'}`}>Live Updates</span>
            </div>
          </div>

          <div className="text-center">
            <div className={`w-24 h-24 mx-auto mb-4 rounded-3xl flex items-center justify-center ${currentStatus === 'ready' ? 'bg-white/20' : 'bg-[#C9A962]/20'}`}>
              <statusInfo.icon className={`w-12 h-12 ${currentStatus === 'ready' ? 'text-white' : 'text-[#C9A962]'}`} />
            </div>
            <h1 className="text-2xl font-semibold text-white mb-2">{statusInfo.label}</h1>
            <p className="text-white/70 text-sm">{statusInfo.message}</p>

            {eta !== null && eta > 0 && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full">
                <Clock className="w-4 h-4 text-white" />
                <span className="text-white font-medium">~{eta} min</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 py-6 -mt-4">
        {/* Progress Steps */}
        <div className="bg-white rounded-2xl shadow-lg border border-[#E8E2D9]/50 overflow-hidden mb-6">
          <div className="p-5">
            <div className="relative">
              {/* Progress Line */}
              <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-[#E8E2D9]" />
              <div 
                className="absolute left-6 top-8 w-0.5 bg-[#C9A962] transition-all duration-500"
                style={{ height: `${Math.min((statusInfo.step - 1) * 33, 100)}%` }}
              />

              <div className="space-y-6">
                {Object.entries(STATUS_CONFIG).slice(0, 4).map(([key, status], index) => {
                  const isComplete = statusInfo.step > status.step;
                  const isCurrent = currentStatus === key;
                  return (
                    <div key={key} className="flex items-center gap-4 relative">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center z-10 transition-all ${
                        isComplete ? 'bg-[#C9A962]' : isCurrent ? 'bg-[#C9A962]/20 ring-2 ring-[#C9A962]' : 'bg-[#F5F2ED]'
                      }`}>
                        {isComplete ? (
                          <CheckCircle className="w-6 h-6 text-[#1a1a2e]" />
                        ) : (
                          <status.icon className={`w-6 h-6 ${isCurrent ? 'text-[#C9A962]' : 'text-[#8A8A8A]'}`} />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${isCurrent || isComplete ? 'text-[#1a1a2e]' : 'text-[#8A8A8A]'}`}>{status.label}</p>
                        {isCurrent && <p className="text-xs text-[#C9A962]">In progress...</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Vehicle Info */}
        {vehicle && (
          <div className="bg-white rounded-2xl shadow-sm border border-[#E8E2D9]/50 overflow-hidden mb-6">
            <div className="p-5 flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#F5F2ED] flex items-center justify-center">
                <Car className="w-7 h-7 text-[#C9A962]" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[#1a1a2e]">{vehicle.make} {vehicle.model}</p>
                <p className="text-sm text-[#8A8A8A]">{vehicle.color} • {vehicle.license_plate}</p>
              </div>
            </div>
          </div>
        )}

        {/* Pickup Location */}
        {currentStatus === 'ready' && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-green-800 mb-1">Your vehicle is ready!</p>
                <p className="text-green-700 text-sm">Please proceed to the main entrance to collect your vehicle.</p>
              </div>
            </div>
          </div>
        )}

        {/* Explore Services */}
        <button onClick={() => navigate(`/amenities/${cardId}`)} className="w-full mb-4 p-4 bg-gradient-to-r from-[#C9A962]/10 to-[#C9A962]/5 border border-[#C9A962]/30 rounded-2xl hover:border-[#C9A962]/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#C9A962]/20 flex items-center justify-center"><Sparkles className="w-6 h-6 text-[#C9A962]" /></div>
            <div className="flex-1 text-left">
              <div className="font-semibold text-[#1a1a2e]">While You Wait</div>
              <div className="text-xs text-[#8A8A8A]">Explore hotel services & amenities</div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#C9A962]" />
          </div>
        </button>

        {/* Contact Valet */}
        <a href={`tel:${VENUE.valetPhone}`} className="flex items-center gap-4 p-5 bg-white rounded-2xl shadow-sm border border-[#E8E2D9]/50">
          <div className="w-12 h-12 rounded-xl bg-[#F5F2ED] flex items-center justify-center">
            <Phone className="w-6 h-6 text-[#C9A962]" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-[#1a1a2e]">Need Help?</p>
            <p className="text-[#8A8A8A] text-sm">Contact valet station</p>
          </div>
          <ChevronRight className="w-5 h-5 text-[#C9A962]" />
        </a>
      </div>
      <div className="h-8" />
    </div>
  );
}
