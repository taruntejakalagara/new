/**
 * TableReservationPage - Restaurant booking
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Utensils, Users, Clock, Calendar, CheckCircle, Phone } from 'lucide-react';
import { VENUE } from '../config/venue';
import { AMENITIES } from '../config/amenities';

export default function TableReservationPage() {
  const { cardId } = useParams();
  const navigate = useNavigate();
  const [selectedRestaurant, setSelectedRestaurant] = useState('fl2-restaurant');
  const [partySize, setPartySize] = useState(2);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('19:00');
  const [submitted, setSubmitted] = useState(false);

  const restaurants = AMENITIES.filter(a => a.category === 'dining' && a.reservationRequired);
  const selectedInfo = AMENITIES.find(a => a.id === selectedRestaurant);

  const timeSlots = ['17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'];

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white/20 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2">Reservation Submitted!</h2>
            <p className="text-white/80">We'll confirm your booking shortly</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="bg-[#F5F2ED] rounded-xl p-4">
              <div className="flex justify-between mb-2">
                <span className="text-[#8A8A8A] text-sm">Restaurant</span>
                <span className="font-medium text-[#1a1a2e]">{selectedInfo?.name}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-[#8A8A8A] text-sm">Party Size</span>
                <span className="font-medium text-[#1a1a2e]">{partySize} guests</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-[#8A8A8A] text-sm">Date</span>
                <span className="font-medium text-[#1a1a2e]">{new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8A8A8A] text-sm">Time</span>
                <span className="font-medium text-[#1a1a2e]">{time}</span>
              </div>
            </div>
            <button onClick={() => navigate(`/welcome/${cardId}`)} className="w-full py-4 bg-gradient-to-r from-[#C9A962] to-[#B8983F] text-[#1a1a2e] rounded-xl font-bold">
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
        <div className="relative px-6 pt-6 pb-8">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => navigate(-1)} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full border border-white/20">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-[1px] bg-gradient-to-r from-[#C9A962] to-transparent" />
            <span className="text-[#C9A962] text-xs font-medium tracking-[0.3em] uppercase">{VENUE.shortName}</span>
          </div>
          <h1 className="text-3xl font-light text-white mb-2">Table <span className="font-semibold italic">Reservation</span></h1>
          <p className="text-white/60 text-sm">Book your dining experience</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-6 -mt-2 space-y-6">
        {/* Restaurant Selection */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E8E2D9]/50 overflow-hidden">
          <div className="p-5 border-b border-[#E8E2D9]">
            <h3 className="font-semibold text-[#1a1a2e] flex items-center gap-2">
              <Utensils className="w-5 h-5 text-[#C9A962]" />
              Select Restaurant
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {restaurants.map(restaurant => (
              <button
                key={restaurant.id}
                type="button"
                onClick={() => setSelectedRestaurant(restaurant.id)}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${selectedRestaurant === restaurant.id ? 'border-[#C9A962] bg-[#C9A962]/5' : 'border-[#E8E2D9] hover:border-[#C9A962]/50'}`}
              >
                <div className="flex items-center gap-4">
                  <img src={restaurant.image} alt={restaurant.name} className="w-16 h-16 rounded-lg object-cover" />
                  <div className="flex-1">
                    <div className="font-semibold text-[#1a1a2e]">{restaurant.name}</div>
                    <div className="text-xs text-[#8A8A8A]">{restaurant.tagline}</div>
                    {restaurant.specialOffer && (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 rounded-full mt-1">
                        <span className="text-green-700 text-xs font-medium">{restaurant.specialOffer.text}</span>
                      </div>
                    )}
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedRestaurant === restaurant.id ? 'border-[#C9A962] bg-[#C9A962]' : 'border-[#E8E2D9]'}`}>
                    {selectedRestaurant === restaurant.id && <CheckCircle className="w-4 h-4 text-[#1a1a2e]" />}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Party Size */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E8E2D9]/50 overflow-hidden">
          <div className="p-5 border-b border-[#E8E2D9]">
            <h3 className="font-semibold text-[#1a1a2e] flex items-center gap-2">
              <Users className="w-5 h-5 text-[#C9A962]" />
              Party Size
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-6 gap-2">
              {[1, 2, 3, 4, 5, 6].map(size => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setPartySize(size)}
                  className={`py-3 rounded-xl font-semibold transition-all ${partySize === size ? 'bg-[#C9A962] text-[#1a1a2e] shadow-lg' : 'bg-[#F5F2ED] text-[#6B6B6B] hover:bg-[#E8E2D9]'}`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Date */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E8E2D9]/50 overflow-hidden">
          <div className="p-5 border-b border-[#E8E2D9]">
            <h3 className="font-semibold text-[#1a1a2e] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#C9A962]" />
              Date
            </h3>
          </div>
          <div className="p-4">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 bg-[#F5F2ED] border border-[#E8E2D9] rounded-xl focus:outline-none focus:border-[#C9A962]"
            />
          </div>
        </div>

        {/* Time */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E8E2D9]/50 overflow-hidden">
          <div className="p-5 border-b border-[#E8E2D9]">
            <h3 className="font-semibold text-[#1a1a2e] flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#C9A962]" />
              Time
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-3 gap-2">
              {timeSlots.map(slot => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setTime(slot)}
                  className={`py-3 rounded-xl text-sm font-medium transition-all ${time === slot ? 'bg-[#C9A962] text-[#1a1a2e] shadow-lg' : 'bg-[#F5F2ED] text-[#6B6B6B] hover:bg-[#E8E2D9]'}`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Submit */}
        <button type="submit" className="w-full py-4 bg-gradient-to-r from-[#C9A962] to-[#B8983F] text-[#1a1a2e] rounded-2xl font-bold text-lg shadow-lg shadow-[#C9A962]/20 flex items-center justify-center gap-2">
          <CheckCircle className="w-5 h-5" />
          Request Reservation
        </button>

        {/* Call Option */}
        <a href={`tel:${selectedInfo?.phone || VENUE.phone}`} className="flex items-center justify-center gap-2 text-[#C9A962] font-medium">
          <Phone className="w-4 h-4" />
          Or call to make a reservation
        </a>
      </form>
      <div className="h-8" />
    </div>
  );
}
