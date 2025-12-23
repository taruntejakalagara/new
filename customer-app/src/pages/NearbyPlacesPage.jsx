/**
 * NearbyPlacesPage - Local attractions
 */

import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Navigation, ExternalLink, Star } from 'lucide-react';
import { VENUE } from '../config/venue';
import { NEARBY_PLACES } from '../config/amenities';

export default function NearbyPlacesPage() {
  const { cardId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <div className="bg-gradient-to-b from-[#1a1a2e] to-[#16213e] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#C9A962]/10 rounded-full blur-3xl" />
        <div className="relative px-6 pt-6 pb-8">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => navigate(-1)} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full border border-white/20">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-[1px] bg-gradient-to-r from-[#C9A962] to-transparent" />
            <span className="text-[#C9A962] text-xs font-medium tracking-[0.3em] uppercase">Explore</span>
          </div>
          <h1 className="text-3xl font-light text-white mb-2">Nearby <span className="font-semibold italic">Attractions</span></h1>
          <p className="text-white/60 text-sm">Discover what's around {VENUE.shortName}</p>
        </div>
      </div>

      <div className="px-6 py-6 -mt-2 space-y-4">
        {NEARBY_PLACES.map((place, index) => (
          <button
            key={place.id}
            onClick={() => {
              // Open in maps
              window.open(`https://maps.google.com/?q=${encodeURIComponent(place.name + ' Pittsburgh')}`, '_blank');
            }}
            className="w-full bg-white rounded-2xl shadow-sm border border-[#E8E2D9]/50 overflow-hidden hover:shadow-lg transition-all text-left"
            style={{ animation: `fadeInUp 0.4s ease-out ${index * 80}ms both` }}
          >
            <div className="flex">
              <div className="w-28 h-28 flex-shrink-0 relative">
                <img src={place.image} alt={place.name} className="w-full h-full object-cover" />
                <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded-full">
                  <span className="text-white text-xs">{place.distance}</span>
                </div>
              </div>
              <div className="flex-1 p-4">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <h3 className="font-semibold text-[#1a1a2e]">{place.name}</h3>
                    <p className="text-[#C9A962] text-xs font-medium">{place.type}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-[#C9A962] flex-shrink-0" />
                </div>
                <p className="text-[#8A8A8A] text-xs mt-2 line-clamp-2">{place.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Clock className="w-3.5 h-3.5 text-[#8A8A8A]" />
                  <span className="text-[#8A8A8A] text-xs">{place.walkTime} walk</span>
                </div>
              </div>
            </div>
          </button>
        ))}

        {/* Map Link */}
        <a
          href={`https://maps.google.com/?q=${encodeURIComponent(VENUE.address)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 p-5 bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-2xl text-white"
        >
          <div className="w-12 h-12 rounded-xl bg-[#C9A962]/20 flex items-center justify-center">
            <Navigation className="w-6 h-6 text-[#C9A962]" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">Open in Maps</p>
            <p className="text-white/60 text-sm">Get directions from {VENUE.shortName}</p>
          </div>
          <ExternalLink className="w-5 h-5 text-[#C9A962]" />
        </a>
      </div>
      <div className="h-8" />

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
