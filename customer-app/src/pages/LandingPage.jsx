/**
 * Landing Page
 * First screen users see - NFC tap or manual entry
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Car, Sparkles, Clock, Shield, Wifi, ChevronRight,
  MapPin, CreditCard, Phone
} from 'lucide-react';
import { VENUE } from '../config/venue';

export default function LandingPage() {
  const navigate = useNavigate();
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [cardId, setCardId] = useState('');
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(prev => !prev);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (cardId.trim()) {
      navigate(`/v/${cardId.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#1a1a2e] flex flex-col relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#C9A962]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#C9A962]/5 rounded-full blur-3xl" />
        <div className="absolute top-20 right-0 w-64 h-64 bg-[#C9A962]/5 rounded-full blur-3xl" />
        
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #C9A962 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      <div className="relative z-10 flex-1 px-6 pt-12 pb-8 flex flex-col">
        {/* Hotel Branding */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-[1px] bg-gradient-to-r from-transparent to-[#C9A962]" />
            <Sparkles className="w-5 h-5 text-[#C9A962]" />
            <div className="w-12 h-[1px] bg-gradient-to-l from-transparent to-[#C9A962]" />
          </div>
          <h1 className="text-[#C9A962] text-sm font-medium tracking-[0.4em] uppercase mb-1">
            {VENUE.name}
          </h1>
          <p className="text-white/40 text-xs tracking-wider">{VENUE.tagline}</p>
        </div>

        {/* Title Section */}
        <div className="text-center text-white mb-10">
          <h2 className="text-4xl font-light mb-3 tracking-wide">
            Welcome to <span className="font-semibold italic">Valet</span>
          </h2>
          <p className="text-white/60 text-base">Tap your card to begin</p>
        </div>

        {/* Main Card */}
        <div className="bg-white/[0.03] backdrop-blur-xl rounded-3xl p-8 border border-white/10 mb-8 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#C9A962]/10 rounded-full blur-3xl" />

          {!showManualEntry ? (
            <div className="relative">
              {/* NFC Animation */}
              <div className="relative w-40 h-40 mx-auto mb-8">
                <div className={`absolute inset-0 rounded-full border-2 border-[#C9A962]/30 ${isAnimating ? 'animate-ping' : ''}`} style={{ animationDuration: '2s' }} />
                <div className={`absolute inset-2 rounded-full border border-[#C9A962]/20 ${isAnimating ? 'animate-ping' : ''}`} style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
                
                <div className="absolute inset-4 rounded-full bg-gradient-to-br from-[#C9A962]/20 to-[#C9A962]/5 flex items-center justify-center border border-[#C9A962]/30">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#C9A962] to-[#B8983F] flex items-center justify-center shadow-lg shadow-[#C9A962]/20">
                    <Wifi className="w-10 h-10 text-[#1a1a2e]" />
                  </div>
                </div>
              </div>

              <p className="text-white text-xl font-semibold mb-2 text-center">
                Tap Your NFC Card
              </p>
              <p className="text-white/50 text-sm mb-8 text-center leading-relaxed">
                Hold your phone near your premium metal valet card
              </p>

              <button
                onClick={() => setShowManualEntry(true)}
                className="w-full bg-gradient-to-r from-[#C9A962] to-[#B8983F] hover:from-[#D4B36D] hover:to-[#C9A962] text-[#1a1a2e] py-4 rounded-2xl font-bold text-base shadow-lg shadow-[#C9A962]/20 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 mb-4"
              >
                <Wifi className="w-5 h-5" />
                Activate NFC Reader
              </button>

              <button
                onClick={() => setShowManualEntry(true)}
                className="w-full text-white/60 hover:text-[#C9A962] font-medium text-sm transition-colors flex items-center justify-center gap-1"
              >
                Enter card number manually
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#C9A962]/20 to-[#C9A962]/5 flex items-center justify-center border border-[#C9A962]/30">
                <Car className="w-10 h-10 text-[#C9A962]" />
              </div>

              <h3 className="text-xl font-semibold text-white mb-2 text-center">
                Enter Card Number
              </h3>
              <p className="text-white/50 text-sm mb-6 text-center">
                Located on the back of your valet card
              </p>

              <form onSubmit={handleManualSubmit}>
                <div className="relative mb-4">
                  <input
                    type="text"
                    placeholder="NFC-XXXXXXXXXXXX"
                    value={cardId}
                    onChange={(e) => setCardId(e.target.value.toUpperCase())}
                    className="w-full px-5 py-4 bg-white/5 border-2 border-white/10 focus:border-[#C9A962]/50 rounded-xl text-white text-center font-mono text-lg tracking-wider placeholder:text-white/30 focus:outline-none transition-colors"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={!cardId.trim()}
                  className="w-full bg-gradient-to-r from-[#C9A962] to-[#B8983F] hover:from-[#D4B36D] hover:to-[#C9A962] text-[#1a1a2e] py-4 rounded-2xl font-bold text-base shadow-lg shadow-[#C9A962]/20 active:scale-[0.98] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none mb-4"
                >
                  Continue
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowManualEntry(false);
                    setCardId('');
                  }}
                  className="w-full text-white/60 hover:text-white font-medium text-sm transition-colors"
                >
                  ← Back to NFC
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="space-y-4 mt-auto">
          <div className="flex items-center justify-center gap-6">
            <FeatureItem icon={<Clock className="w-4 h-4" />} text="Real-time tracking" />
            <div className="w-1 h-1 rounded-full bg-white/20" />
            <FeatureItem icon={<Shield className="w-4 h-4" />} text="Secure & insured" />
          </div>
          <div className="flex items-center justify-center gap-6">
            <FeatureItem icon={<CreditCard className="w-4 h-4" />} text="Easy tipping" />
            <div className="w-1 h-1 rounded-full bg-white/20" />
            <FeatureItem icon={<MapPin className="w-4 h-4" />} text="GPS updates" />
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="relative z-10 bg-white/[0.03] backdrop-blur-sm border-t border-white/10 py-5 px-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/40 text-xs mb-0.5">Need assistance?</p>
            <p className="text-white/70 text-sm font-medium">Visit our valet station</p>
          </div>
          <a
            href={`tel:${VENUE.valetPhone}`}
            className="px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm font-medium transition-all border border-white/10 flex items-center gap-2"
          >
            <Phone className="w-4 h-4" />
            Call Valet
          </a>
        </div>
      </div>

      {/* Powered By */}
      <div className="relative z-10 text-center py-4 bg-[#1a1a2e]">
        <p className="text-white/20 text-xs tracking-widest uppercase">
          Powered by The Digital Key
        </p>
      </div>
    </div>
  );
}

function FeatureItem({ icon, text }) {
  return (
    <div className="flex items-center gap-2 text-white/50">
      <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center">
        {icon}
      </div>
      <span className="text-xs font-medium">{text}</span>
    </div>
  );
}
