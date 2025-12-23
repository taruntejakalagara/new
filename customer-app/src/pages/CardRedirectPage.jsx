/**
 * CardRedirectPage
 * Smart router based on parking duration
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Car, Shield, Sparkles } from 'lucide-react';
import { VENUE } from '../config/venue';
import { API_BASE_URL } from '../config/api';

export default function CardRedirectPage() {
  const { cardId } = useParams();
  const navigate = useNavigate();
  const [loadingStep, setLoadingStep] = useState(0);

  const loadingSteps = [
    'Authenticating your card...',
    'Checking vehicle status...',
    'Preparing your experience...'
  ];

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setLoadingStep(prev => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
    }, 500);
    checkVehicleAndRoute();
    return () => clearInterval(stepInterval);
  }, [cardId]);

  const checkVehicleAndRoute = async () => {
    try {
      const vehiclesRes = await fetch(`${API_BASE_URL}/vehicles`);
      const vehiclesData = await vehiclesRes.json();
      const vehicles = vehiclesData.vehicles || vehiclesData.data || vehiclesData || [];
      const vehicle = vehicles.find(v => v.unique_card_id === cardId);

      if (!vehicle || vehicle.status === 'retrieved') {
        setTimeout(() => navigate(`/vehicle-info/${cardId}`), 1000);
        return;
      }

      // Check for existing retrieval request
      try {
        const queueRes = await fetch(`${API_BASE_URL}/queue`);
        const queueData = await queueRes.json();
        const requests = queueData.requests || [];
        console.log('Queue requests:', requests);
        
        const activeRequest = requests.find(r => 
          r.unique_card_id === cardId && 
          ['pending', 'assigned', 'in_progress', 'ready'].includes(r.status)
        );
        
        if (activeRequest) {
          console.log('Found active request, going to status:', activeRequest);
          setTimeout(() => navigate(`/status/${cardId}`, { replace: true }), 800);
          return;
        }

        const handoversRes = await fetch(`${API_BASE_URL}/pending-handovers`);
        const handoversData = await handoversRes.json();
        console.log('Handovers:', handoversData.handovers);
        
        const activeHandover = (handoversData.handovers || []).find(h => h.unique_card_id === cardId);
        if (activeHandover) {
          console.log('Found active handover, going to status:', activeHandover);
          setTimeout(() => navigate(`/status/${cardId}`, { replace: true }), 800);
          return;
        }
      } catch (e) { console.error('Queue check error:', e); }

      // Route based on parking duration
      console.log('Vehicle found:', vehicle);
      console.log('Check-in time:', vehicle.check_in_time);
      
      if (vehicle.check_in_time) {
        const checkInTime = new Date(vehicle.check_in_time + 'Z'); // Add Z for UTC
        const now = new Date();
        const hoursParked = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
        const threshold = VENUE.amenitiesThreshold || 2;
        
        console.log('Hours parked:', hoursParked, 'Threshold:', threshold);
        
        if (hoursParked < threshold) {
          console.log('Going to WELCOME page');
          setTimeout(() => navigate(`/welcome/${cardId}`, { replace: true }), 1200);
        } else {
          console.log('Going to VEHICLE-INFO page (parked too long)');
          setTimeout(() => navigate(`/vehicle-info/${cardId}`, { replace: true }), 1200);
        }
      } else {
        console.log('No check-in time, going to VEHICLE-INFO page');
        setTimeout(() => navigate(`/vehicle-info/${cardId}`, { replace: true }), 1200);
      }
    } catch (error) {
      console.error('Error:', error);
      setTimeout(() => navigate(`/vehicle-info/${cardId}`, { replace: true }), 1500);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#1a1a2e] flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#C9A962]/10 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#C9A962]/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#C9A962]/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 text-center px-8">
        <div className="mb-10">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-12 h-[1px] bg-gradient-to-r from-transparent to-[#C9A962]" />
            <Sparkles className="w-5 h-5 text-[#C9A962]" />
            <div className="w-12 h-[1px] bg-gradient-to-l from-transparent to-[#C9A962]" />
          </div>
          <h2 className="text-[#C9A962] text-xs font-medium tracking-[0.4em] uppercase">{VENUE.name}</h2>
        </div>

        <div className="relative mb-10">
          <div className="absolute inset-0 w-32 h-32 mx-auto">
            <div className="w-full h-full rounded-full border-2 border-[#C9A962]/20 animate-spin" style={{ borderTopColor: '#C9A962', animationDuration: '1.5s' }} />
          </div>
          <div className="absolute inset-0 w-32 h-32 mx-auto flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-[#C9A962]/10 animate-ping" style={{ animationDuration: '2s' }} />
          </div>
          <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#C9A962]/20 to-[#C9A962]/5 backdrop-blur-sm flex items-center justify-center border border-[#C9A962]/30">
              <Car className="w-9 h-9 text-[#C9A962]" />
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-light text-white mb-3">Welcome <span className="font-semibold italic">Back</span></h1>
          <p className="text-white/60 text-sm h-5 transition-all duration-300">{loadingSteps[loadingStep]}</p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          {loadingSteps.map((_, index) => (
            <div key={index} className={`h-1.5 rounded-full transition-all duration-500 ${index <= loadingStep ? 'w-8 bg-[#C9A962]' : 'w-1.5 bg-white/20'}`} />
          ))}
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-sm rounded-full border border-white/10">
          <Shield className="w-4 h-4 text-green-400" />
          <span className="text-white/60 text-xs">Secure NFC Verified</span>
        </div>

        <div className="mt-6">
          <p className="text-white/30 text-xs font-mono tracking-wider">Card ID: {cardId?.slice(0, 8).toUpperCase()}...</p>
        </div>
      </div>

      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-white/20 text-xs tracking-widest uppercase">Powered by The Digital Key</p>
      </div>
    </div>
  );
}
