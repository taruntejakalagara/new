/**
 * VehicleInfoPage - Retrieval focused (after 2+ hours)
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Car, Clock, Loader, AlertCircle, Key, Shield, Sparkles, ChevronRight, Phone, CheckCircle, CreditCard, Calendar } from 'lucide-react';
import { VENUE } from '../config/venue';

export default function VehicleInfoPage() {
  const { cardId } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [valetFee, setValetFee] = useState(VENUE.defaultValetFee || 15.00);

  useEffect(() => {
    loadVehicleData();
    loadPricing();
  }, [cardId]);

  const loadPricing = async () => {
    try {
      const res = await fetch('${API_BASE_URL}/pricing');
      const data = await res.json();
      if (data.success && data.pricing) setValetFee(data.pricing.base_fee || data.pricing.base_valet_fee || 15);
    } catch (e) {}
  };

  const loadVehicleData = async () => {
    try {
      const response = await fetch('${API_BASE_URL}/vehicles');
      const data = await response.json();
      const vehicles = data.vehicles || data.data || data || [];
      const found = vehicles.find(v => v.unique_card_id === cardId);
      if (found) {
        setVehicle(found);
        // Check existing request
        const queueRes = await fetch('${API_BASE_URL}/queue');
        const queueData = await queueRes.json();
        if ((queueData.requests || []).find(r => r.unique_card_id === cardId && ['pending', 'assigned', 'in_progress', 'ready'].includes(r.status))) {
          navigate(`/status/${cardId}`, { replace: true });
        }
      } else {
        setError('Vehicle not found.');
      }
    } catch (err) {
      setError('Failed to load vehicle.');
    } finally {
      setLoading(false);
    }
  };

  const getTimeSinceCheckIn = () => {
    if (!vehicle?.check_in_time) return '--';
    const diffMs = Date.now() - new Date(vehicle.check_in_time).getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] to-[#16213e] flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-10 h-10 text-[#C9A962] animate-spin mx-auto mb-4" />
          <p className="text-white/60">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Vehicle Not Found</h2>
            <p className="text-white/60">{error}</p>
          </div>
          <div className="p-6">
            <button onClick={() => navigate('/')} className="w-full py-4 bg-gradient-to-r from-[#C9A962] to-[#B8983F] text-[#1a1a2e] rounded-xl font-bold">
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <div className="bg-gradient-to-b from-[#1a1a2e] to-[#16213e] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#C9A962]/10 rounded-full blur-3xl" />
        <div className="relative px-6 pt-6 pb-10">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => navigate('/')} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full border border-white/20">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 text-xs font-medium">Parked</span>
            </div>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-[1px] bg-gradient-to-r from-[#C9A962] to-transparent" />
            <span className="text-[#C9A962] text-xs font-medium tracking-[0.3em] uppercase">Your Vehicle</span>
          </div>
          <h1 className="text-3xl font-semibold text-white mb-1">{vehicle.make} {vehicle.model}</h1>
          <p className="text-white/60">{vehicle.color} • {vehicle.license_plate}</p>
        </div>
      </div>

      <div className="px-6 py-6 -mt-4 space-y-6">
        <div className="bg-white rounded-2xl shadow-lg border border-[#E8E2D9]/50 overflow-hidden">
          <div className="p-6 text-center border-b border-[#E8E2D9]">
            <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#C9A962]/20 to-[#C9A962]/5 flex items-center justify-center">
              <Car className="w-12 h-12 text-[#C9A962]" />
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 rounded-full">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-green-700 font-medium text-sm">Safely Parked</span>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F5F2ED] flex items-center justify-center"><Key className="w-5 h-5 text-[#C9A962]" /></div>
                <span className="text-[#8A8A8A] text-sm">Hook Number</span>
              </div>
              <span className="font-semibold text-[#1a1a2e]">#{vehicle.key_slot}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F5F2ED] flex items-center justify-center"><Clock className="w-5 h-5 text-[#C9A962]" /></div>
                <span className="text-[#8A8A8A] text-sm">Parked At</span>
              </div>
              <span className="font-semibold text-[#1a1a2e]">{new Date(vehicle.check_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F5F2ED] flex items-center justify-center"><Calendar className="w-5 h-5 text-[#C9A962]" /></div>
                <span className="text-[#8A8A8A] text-sm">Duration</span>
              </div>
              <span className="font-semibold text-[#1a1a2e]">{getTimeSinceCheckIn()}</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#C9A962]/10 rounded-full blur-2xl" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Valet Fee</p>
              <p className="text-[#C9A962] font-bold text-3xl">${valetFee.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-xs mb-1">Est. Wait</p>
              <p className="text-white font-semibold">5-10 min</p>
            </div>
          </div>
        </div>

        <button onClick={() => navigate(`/amenities/${cardId}`)} className="w-full p-4 bg-gradient-to-r from-[#C9A962]/10 to-[#C9A962]/5 border border-[#C9A962]/30 rounded-2xl hover:border-[#C9A962]/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#C9A962]/20 flex items-center justify-center"><Sparkles className="w-6 h-6 text-[#C9A962]" /></div>
            <div className="flex-1 text-left">
              <div className="font-semibold text-[#1a1a2e]">Explore Hotel Services</div>
              <div className="text-xs text-[#8A8A8A]">Dining, spa, attractions</div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#C9A962]" />
          </div>
        </button>

        <button onClick={() => navigate(`/request/${cardId}`)} className="w-full py-4 bg-gradient-to-r from-[#C9A962] to-[#B8983F] text-[#1a1a2e] rounded-2xl font-bold text-lg shadow-lg shadow-[#C9A962]/20 flex items-center justify-center gap-3">
          <Car className="w-6 h-6" />
          Request My Car
        </button>

        <a href={`tel:${VENUE.valetPhone}`} className="flex items-center gap-4 p-5 bg-white rounded-2xl shadow-sm border border-[#E8E2D9]/50">
          <div className="w-12 h-12 rounded-xl bg-[#F5F2ED] flex items-center justify-center"><Phone className="w-6 h-6 text-[#C9A962]" /></div>
          <div className="flex-1">
            <p className="font-semibold text-[#1a1a2e]">Need Assistance?</p>
            <p className="text-[#8A8A8A] text-sm">Contact valet station</p>
          </div>
          <ChevronRight className="w-5 h-5 text-[#C9A962]" />
        </a>

        <div className="flex items-center justify-center gap-2">
          <Shield className="w-4 h-4 text-green-500" />
          <span className="text-[#8A8A8A] text-xs">Your vehicle is secured & insured</span>
        </div>
      </div>
      <div className="h-8" />
    </div>
  );
}
