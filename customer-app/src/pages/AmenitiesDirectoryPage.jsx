/**
 * AmenitiesDirectoryPage
 * Full directory of all hotel amenities & services
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Search, Clock, MapPin, Phone,
  ChevronRight, Star, Percent, Filter, X
} from 'lucide-react';
import { VENUE } from '../config/venue';
import { AMENITY_CATEGORIES, AMENITIES } from '../config/amenities';

export default function AmenitiesDirectoryPage() {
  const { cardId } = useParams();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const filteredAmenities = AMENITIES.filter(amenity => {
    const matchesCategory = activeCategory === 'all' || amenity.category === activeCategory;
    const matchesSearch = !searchQuery || 
      amenity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      amenity.tagline.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const groupedByCategory = AMENITY_CATEGORIES.filter(c => c.id !== 'all').map(category => ({
    ...category,
    items: filteredAmenities.filter(a => a.category === category.id)
  })).filter(g => g.items.length > 0);

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#1a1a2e] to-[#16213e] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#C9A962]/10 rounded-full blur-3xl" />

        <div className="relative px-6 pt-6 pb-8">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate(-1)}
              className="p-2.5 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-full transition-all duration-300 border border-white/20"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>

            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-2.5 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-full transition-all duration-300 border border-white/20"
            >
              {showSearch ? (
                <X className="w-5 h-5 text-white" />
              ) : (
                <Search className="w-5 h-5 text-white" />
              )}
            </button>
          </div>

          {/* Title */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-[1px] bg-gradient-to-r from-[#C9A962] to-transparent" />
            <span className="text-[#C9A962] text-xs font-medium tracking-[0.3em] uppercase">{VENUE.shortName}</span>
          </div>

          <h1 className="text-3xl font-light text-white mb-2">
            Hotel <span className="font-semibold italic">Directory</span>
          </h1>
          <p className="text-white/60 text-sm">
            Everything you need, all in one place
          </p>

          {/* Search box */}
          {showSearch && (
            <div className="mt-6 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="text"
                placeholder="Search amenities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-[#C9A962]/50"
                autoFocus
              />
            </div>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="sticky top-0 z-20 bg-[#FDFBF7]/95 backdrop-blur-md border-b border-[#E8E2D9]">
        <div className="px-6 py-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {AMENITY_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                  activeCategory === cat.id
                    ? 'bg-[#1a1a2e] text-white shadow-lg'
                    : 'bg-white text-[#1a1a2e] border border-[#E8E2D9] hover:border-[#C9A962]'
                }`}
              >
                <cat.icon className="w-4 h-4" />
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Amenities List */}
      <div className="px-6 py-6">
        {activeCategory === 'all' ? (
          // Grouped view
          <div className="space-y-8">
            {groupedByCategory.map((group) => (
              <div key={group.id}>
                <div className="flex items-center gap-2 mb-4">
                  <group.icon className="w-5 h-5 text-[#C9A962]" />
                  <h2 className="font-semibold text-[#1a1a2e]">{group.name}</h2>
                  <span className="text-[#8A8A8A] text-sm">({group.items.length})</span>
                </div>
                <div className="space-y-3">
                  {group.items.map((amenity) => (
                    <AmenityCard 
                      key={amenity.id} 
                      amenity={amenity} 
                      cardId={cardId}
                      navigate={navigate}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Flat view for specific category
          <div className="space-y-3">
            {filteredAmenities.map((amenity, index) => (
              <AmenityCard 
                key={amenity.id} 
                amenity={amenity}
                cardId={cardId}
                navigate={navigate}
                index={index}
              />
            ))}
          </div>
        )}

        {filteredAmenities.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-[#E8E2D9] mx-auto mb-4" />
            <p className="text-[#8A8A8A]">No amenities found</p>
          </div>
        )}
      </div>

      {/* Need Help Card */}
      <div className="px-6 pb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-[#E8E2D9]/50 p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#F5F2ED] flex items-center justify-center">
              <Phone className="w-6 h-6 text-[#C9A962]" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-[#1a1a2e]">Can't find something?</p>
              <p className="text-[#8A8A8A] text-sm">Our concierge can help</p>
            </div>
            <a
              href={`tel:${VENUE.phone}`}
              className="px-4 py-2 bg-[#1a1a2e] text-white rounded-lg text-sm font-medium"
            >
              Call
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Spacer */}
      <div className="h-8" />

      {/* Styles */}
      <style>{`
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

function AmenityCard({ amenity, cardId, navigate, index = 0 }) {
  return (
    <button
      onClick={() => navigate(`/amenity/${cardId}/${amenity.id}`)}
      className="w-full bg-white rounded-2xl shadow-sm border border-[#E8E2D9]/50 overflow-hidden hover:shadow-lg transition-all text-left active:scale-[0.98]"
      style={{
        animation: `fadeInUp 0.4s ease-out ${index * 50}ms both`
      }}
    >
      <div className="flex">
        {/* Image */}
        <div className="w-28 h-28 flex-shrink-0 relative">
          <img 
            src={amenity.image} 
            alt={amenity.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10" />
          
          {/* Price badge */}
          <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded-full">
            <span className="text-white text-xs">{amenity.priceRange}</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h3 className="font-semibold text-[#1a1a2e]">{amenity.name}</h3>
              <p className="text-[#C9A962] text-xs font-medium">{amenity.tagline}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-[#C9A962] flex-shrink-0" />
          </div>

          {/* Info */}
          <div className="flex items-center gap-3 mt-2 text-xs text-[#8A8A8A]">
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{amenity.floor}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{amenity.hours}</span>
            </div>
          </div>

          {/* Special offer */}
          {amenity.specialOffer && (
            <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 rounded-full mt-2">
              <Percent className="w-3 h-3 text-green-600" />
              <span className="text-green-700 text-xs font-medium">{amenity.specialOffer.text}</span>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </button>
  );
}
