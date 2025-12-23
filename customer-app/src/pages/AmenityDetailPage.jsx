/**
 * AmenityDetailPage
 * Full details for a single amenity/service
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Clock, MapPin, Phone, Star, Check,
  ChevronRight, Percent, Share2, Heart, Calendar,
  ExternalLink, Shield, Sparkles
} from 'lucide-react';
import { VENUE } from '../config/venue';
import { AMENITIES } from '../config/amenities';

export default function AmenityDetailPage() {
  const { cardId, amenityId } = useParams();
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(false);

  const amenity = AMENITIES.find(a => a.id === amenityId);

  if (!amenity) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-[#8A8A8A]">Amenity not found</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 text-[#C9A962] font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: amenity.name,
          text: `${amenity.name} at ${VENUE.name}`,
          url: window.location.href
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    }
  };

  const handleBookOrCall = () => {
    if (amenity.reservationRequired) {
      // Navigate to booking page
      if (amenity.id === 'fl2-restaurant' || amenity.id === 'andys-wine-bar') {
        navigate(`/reservations/${cardId}`);
      } else if (amenity.category === 'wellness') {
        navigate(`/spa-booking/${cardId}`);
      }
    } else if (amenity.phone) {
      window.location.href = `tel:${amenity.phone}`;
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* Hero Image */}
      <div className="relative h-72">
        <img
          src={amenity.image}
          alt={amenity.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a2e] via-[#1a1a2e]/50 to-transparent" />

        {/* Header actions */}
        <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-full transition-all border border-white/20"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handleShare}
              className="p-2.5 bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-full transition-all border border-white/20"
            >
              <Share2 className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={() => setIsFavorite(!isFavorite)}
              className={`p-2.5 backdrop-blur-md rounded-full transition-all border ${
                isFavorite
                  ? 'bg-red-500 border-red-500'
                  : 'bg-white/10 border-white/20 hover:bg-white/20'
              }`}
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'text-white fill-white' : 'text-white'}`} />
            </button>
          </div>
        </div>

        {/* Title on image */}
        <div className="absolute bottom-6 left-6 right-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-[#C9A962] rounded-full text-[#1a1a2e] text-xs font-semibold capitalize">
              {amenity.category}
            </span>
            <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-xs">
              {amenity.priceRange}
            </span>
          </div>
          <h1 className="text-3xl font-semibold text-white">{amenity.name}</h1>
          <p className="text-[#C9A962] font-medium">{amenity.tagline}</p>
        </div>
      </div>

      {/* Quick Info Bar */}
      <div className="bg-white border-b border-[#E8E2D9]">
        <div className="grid grid-cols-2 divide-x divide-[#E8E2D9]">
          <div className="p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-[#1a1a2e] mb-1">
              <MapPin className="w-4 h-4 text-[#C9A962]" />
              <span className="font-semibold">{amenity.floor}</span>
            </div>
            <p className="text-xs text-[#8A8A8A]">Location</p>
          </div>
          <div className="p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-[#1a1a2e] mb-1">
              <Clock className="w-4 h-4 text-[#C9A962]" />
              <span className="font-semibold text-sm">{amenity.hours}</span>
            </div>
            <p className="text-xs text-[#8A8A8A]">Hours</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6 space-y-6">
        {/* Special Offer */}
        {amenity.specialOffer && (
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            
            <div className="relative flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Percent className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-white/80 text-xs uppercase tracking-wider mb-0.5">Valet Guest Offer</p>
                <p className="text-white font-semibold text-lg">{amenity.specialOffer.text}</p>
                {amenity.specialOffer.code && (
                  <p className="text-white/80 text-sm mt-1">
                    Code: <span className="font-mono font-bold">{amenity.specialOffer.code}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Description */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E8E2D9]/50 overflow-hidden">
          <div className="p-5 border-b border-[#E8E2D9]">
            <h3 className="font-semibold text-[#1a1a2e]">About</h3>
          </div>
          <div className="p-5">
            <p className="text-[#6B6B6B] leading-relaxed">{amenity.description}</p>
          </div>
        </div>

        {/* Features */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E8E2D9]/50 overflow-hidden">
          <div className="p-5 border-b border-[#E8E2D9]">
            <h3 className="font-semibold text-[#1a1a2e]">Features & Services</h3>
          </div>
          <div className="p-5">
            <div className="flex flex-wrap gap-2">
              {amenity.features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-2 bg-[#F5F2ED] rounded-lg"
                >
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-[#1a1a2e] text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contact Details */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E8E2D9]/50 overflow-hidden">
          <div className="p-5 border-b border-[#E8E2D9]">
            <h3 className="font-semibold text-[#1a1a2e]">Contact & Location</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#F5F2ED] flex items-center justify-center">
                <MapPin className="w-5 h-5 text-[#C9A962]" />
              </div>
              <div>
                <p className="text-xs text-[#8A8A8A]">Location</p>
                <p className="text-[#1a1a2e] font-medium">{amenity.floor}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#F5F2ED] flex items-center justify-center">
                <Clock className="w-5 h-5 text-[#C9A962]" />
              </div>
              <div>
                <p className="text-xs text-[#8A8A8A]">Hours</p>
                <p className="text-[#1a1a2e] font-medium">{amenity.hours}</p>
              </div>
            </div>

            {amenity.phone && (
              <a 
                href={`tel:${amenity.phone}`}
                className="flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-lg bg-[#F5F2ED] flex items-center justify-center">
                  <Phone className="w-5 h-5 text-[#C9A962]" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-[#8A8A8A]">Phone</p>
                  <p className="text-[#C9A962] font-medium">{amenity.phone}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-[#C9A962]" />
              </a>
            )}
          </div>
        </div>

        {/* Reservation Notice */}
        {amenity.reservationRequired && (
          <div className="bg-[#C9A962]/10 border border-[#C9A962]/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-[#C9A962] flex-shrink-0 mt-0.5" />
              <p className="text-[#6B6B6B] text-sm">
                <span className="font-semibold text-[#1a1a2e]">Reservations recommended.</span> Book in advance to secure your preferred time.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#FDFBF7] via-[#FDFBF7] to-transparent">
        <div className="flex gap-3">
          {amenity.phone && (
            <a
              href={`tel:${amenity.phone}`}
              className="flex-1 py-4 bg-white border border-[#E8E2D9] text-[#1a1a2e] rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              <Phone className="w-5 h-5" />
              Call
            </a>
          )}
          <button
            onClick={handleBookOrCall}
            className="flex-[2] py-4 bg-gradient-to-r from-[#C9A962] to-[#B8983F] text-[#1a1a2e] rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#C9A962]/20"
          >
            {amenity.reservationRequired ? (
              <>
                <Calendar className="w-5 h-5" />
                Book Now
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Visit Now
              </>
            )}
          </button>
        </div>
      </div>

      {/* Bottom Spacer */}
      <div className="h-28" />
    </div>
  );
}
