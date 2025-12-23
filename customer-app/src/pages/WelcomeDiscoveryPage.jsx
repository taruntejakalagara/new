/**
 * WelcomeDiscoveryPage
 * Shown when guest taps NFC within 2 hours of parking
 * Upsells amenities while still allowing car retrieval
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Car, Clock, Sparkles, ChevronRight, MapPin,
  Utensils, Wine, Dumbbell, Gift, Star, Phone,
  ArrowRight, X, Bell, Coffee, Heart, Navigation,
  Shield, Check, Tag, Percent
} from 'lucide-react';
import { VENUE, THEME } from '../config/venue';
import { SPECIAL_OFFERS, QUICK_ACTIONS, AMENITIES, NEARBY_PLACES } from '../config/amenities';

export default function WelcomeDiscoveryPage() {
  const { cardId } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [timeParked, setTimeParked] = useState(null);
  const [showOfferModal, setShowOfferModal] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Update time every minute
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadVehicleData();
  }, [cardId]);

  const loadVehicleData = async () => {
    try {
      const response = await fetch(`${VENUE.apiUrl || '${API_BASE_URL}'}/vehicles`);
      const data = await response.json();
      const vehicles = data.vehicles || data.data || data || [];
      const found = vehicles.find(v => v.unique_card_id === cardId);
      
      if (found) {
        setVehicle(found);
        if (found.check_in_time) {
          const checkIn = new Date(found.check_in_time);
          const now = new Date();
          const diffMs = now - checkIn;
          const diffMins = Math.floor(diffMs / (1000 * 60));
          const hours = Math.floor(diffMins / 60);
          const mins = diffMins % 60;
          setTimeParked({ hours, mins, total: diffMins });
        }
      }
    } catch (error) {
      console.error('Error loading vehicle:', error);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleQuickAction = (action) => {
    if (action.action === 'call') {
      window.location.href = `tel:${action.phone}`;
    } else if (action.route) {
      navigate(`/${action.route}/${cardId}`);
    }
  };

  const featuredOffers = SPECIAL_OFFERS.filter(o => o.featured);
  const featuredAmenities = AMENITIES.filter(a => a.specialOffer).slice(0, 3);

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#1a1a2e]" />
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#C9A962]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#C9A962]/5 rounded-full blur-3xl" />
        
        {/* Subtle pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #C9A962 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }}
        />

        <div className="relative px-6 pt-8 pb-10">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 text-xs font-medium">Vehicle Secured</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
              <Clock className="w-4 h-4 text-[#C9A962]" />
              <span className="text-white text-sm font-medium">{formatTime(currentTime)}</span>
            </div>
          </div>

          {/* Welcome message */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#C9A962]/20 rounded-full mb-4">
              <Sparkles className="w-4 h-4 text-[#C9A962]" />
              <span className="text-[#C9A962] text-xs font-semibold tracking-wider uppercase">Welcome Back</span>
            </div>
            
            <h1 className="text-3xl font-light text-white mb-2">
              Enjoy Your <span className="font-semibold italic">Stay</span>
            </h1>
            <p className="text-white/60 text-sm">
              Discover what {VENUE.shortName} has to offer
            </p>
          </div>

          {/* Vehicle status card */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#C9A962]/20 flex items-center justify-center">
                  <Car className="w-6 h-6 text-[#C9A962]" />
                </div>
                <div>
                  {vehicle ? (
                    <>
                      <p className="text-white font-semibold">{vehicle.make} {vehicle.model}</p>
                      <p className="text-white/50 text-sm">
                        Parked {timeParked ? `${timeParked.hours > 0 ? `${timeParked.hours}h ` : ''}${timeParked.mins}m ago` : 'recently'}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-white font-semibold">Your Vehicle</p>
                      <p className="text-white/50 text-sm">Safely parked</p>
                    </>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => navigate(`/request/${cardId}`)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white text-sm font-medium transition-all"
              >
                Get Car
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Special Offers Section */}
      <div className="px-6 py-6 -mt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-[#C9A962]" />
            <h2 className="font-semibold text-[#1a1a2e]">Exclusive Offers</h2>
          </div>
          <span className="text-xs text-[#C9A962] font-medium">For Valet Guests</span>
        </div>

        <div className="space-y-3">
          {featuredOffers.map((offer, index) => (
            <button
              key={offer.id}
              onClick={() => setShowOfferModal(offer)}
              className="w-full bg-white rounded-2xl shadow-sm border border-[#E8E2D9]/50 overflow-hidden hover:shadow-lg transition-all duration-300 active:scale-[0.98]"
              style={{
                animation: `fadeInUp 0.5s ease-out ${index * 100}ms both`
              }}
            >
              <div className={`h-1.5 bg-gradient-to-r ${offer.color}`} />
              <div className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${offer.color} flex items-center justify-center shadow-lg`}>
                    <offer.icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-[#1a1a2e] text-lg">{offer.title}</span>
                      <Tag className="w-4 h-4 text-[#C9A962]" />
                    </div>
                    <p className="text-[#8A8A8A] text-sm">{offer.subtitle}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#C9A962]" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-6 py-4">
        <h2 className="font-semibold text-[#1a1a2e] mb-3">Quick Actions</h2>
        <div className="grid grid-cols-4 gap-3">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.id}
              onClick={() => handleQuickAction(action)}
              className="flex flex-col items-center p-3 bg-white rounded-xl border border-[#E8E2D9]/50 hover:border-[#C9A962]/50 hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-[#F5F2ED] flex items-center justify-center mb-2">
                <action.icon className="w-5 h-5 text-[#C9A962]" />
              </div>
              <span className="text-[#1a1a2e] text-xs font-medium text-center leading-tight">{action.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Amenities with Offers */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-[#1a1a2e]">Today's Highlights</h2>
          <button 
            onClick={() => navigate(`/amenities/${cardId}`)}
            className="text-[#C9A962] text-sm font-medium flex items-center gap-1"
          >
            View All
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {featuredAmenities.map((amenity, index) => (
            <button
              key={amenity.id}
              onClick={() => navigate(`/amenity/${cardId}/${amenity.id}`)}
              className="w-full bg-white rounded-2xl shadow-sm border border-[#E8E2D9]/50 overflow-hidden hover:shadow-lg transition-all text-left"
            >
              <div className="flex">
                <div className="w-24 h-24 flex-shrink-0 relative">
                  <img 
                    src={amenity.image} 
                    alt={amenity.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20" />
                </div>
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <h3 className="font-semibold text-[#1a1a2e]">{amenity.name}</h3>
                      <p className="text-[#8A8A8A] text-xs">{amenity.tagline}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#C9A962] flex-shrink-0" />
                  </div>
                  {amenity.specialOffer && (
                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 rounded-full mt-2">
                      <Percent className="w-3 h-3 text-green-600" />
                      <span className="text-green-700 text-xs font-medium">{amenity.specialOffer.text}</span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Explore Nearby */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#C9A962]" />
            <h2 className="font-semibold text-[#1a1a2e]">Explore Pittsburgh</h2>
          </div>
          <button 
            onClick={() => navigate(`/nearby/${cardId}`)}
            className="text-[#C9A962] text-sm font-medium flex items-center gap-1"
          >
            See All
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {NEARBY_PLACES.map((place) => (
            <button
              key={place.id}
              onClick={() => navigate(`/place/${cardId}/${place.id}`)}
              className="flex-shrink-0 w-40 bg-white rounded-xl border border-[#E8E2D9]/50 overflow-hidden hover:shadow-lg transition-all"
            >
              <div className="h-24 relative">
                <img 
                  src={place.image} 
                  alt={place.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/50 backdrop-blur-sm rounded-full">
                  <span className="text-white text-xs">{place.walkTime}</span>
                </div>
              </div>
              <div className="p-3">
                <h4 className="font-medium text-[#1a1a2e] text-sm truncate">{place.name}</h4>
                <p className="text-[#8A8A8A] text-xs">{place.type}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Hotel Info Card */}
      <div className="px-6 py-4">
        <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-[#C9A962]/10 rounded-full blur-3xl" />
          
          <div className="relative">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#C9A962]/20 flex items-center justify-center flex-shrink-0">
                <Phone className="w-6 h-6 text-[#C9A962]" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Need Anything?</h3>
                <p className="text-white/60 text-sm mb-3">
                  Our concierge is available 24/7 to assist with any request.
                </p>
                <a
                  href={`tel:${VENUE.phone}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#C9A962] hover:bg-[#D4B36D] text-[#1a1a2e] rounded-lg font-semibold text-sm transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  {VENUE.phone}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom - Get Car Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#FDFBF7] via-[#FDFBF7] to-transparent">
        <button
          onClick={() => navigate(`/request/${cardId}`)}
          className="w-full py-4 bg-white border-2 border-[#1a1a2e] hover:bg-[#1a1a2e] hover:text-white text-[#1a1a2e] rounded-2xl font-bold flex items-center justify-center gap-2 transition-all duration-300 shadow-lg"
        >
          <Car className="w-5 h-5" />
          Request Your Car
        </button>
      </div>

      {/* Bottom Spacer */}
      <div className="h-24" />

      {/* Offer Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
            {/* Modal Header */}
            <div className={`bg-gradient-to-br ${showOfferModal.color} p-6 text-center relative`}>
              <button
                onClick={() => setShowOfferModal(null)}
                className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
              
              <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-white/20 flex items-center justify-center">
                <showOfferModal.icon className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">{showOfferModal.title}</h2>
              <p className="text-white/80">{showOfferModal.subtitle}</p>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <p className="text-[#6B6B6B] text-center mb-6">{showOfferModal.description}</p>
              
              {showOfferModal.code && (
                <div className="bg-[#F5F2ED] rounded-xl p-4 mb-4 text-center">
                  <p className="text-xs text-[#8A8A8A] mb-1">Use code at checkout</p>
                  <p className="text-2xl font-mono font-bold text-[#1a1a2e] tracking-wider">{showOfferModal.code}</p>
                </div>
              )}

              <div className="flex items-center justify-center gap-2 text-[#8A8A8A] text-sm mb-6">
                <Clock className="w-4 h-4" />
                <span>Valid: {showOfferModal.validUntil}</span>
              </div>

              <button
                onClick={() => {
                  setShowOfferModal(null);
                  // Navigate to relevant booking page
                  if (showOfferModal.id.includes('dinner')) {
                    navigate(`/reservations/${cardId}`);
                  } else if (showOfferModal.id.includes('spa')) {
                    navigate(`/amenity/${cardId}/spa`);
                  }
                }}
                className="w-full py-4 bg-gradient-to-r from-[#C9A962] to-[#B8983F] text-[#1a1a2e] rounded-xl font-bold shadow-lg"
              >
                Redeem Offer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animations */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
