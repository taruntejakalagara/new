/**
 * RequestCarPage - Confirm retrieval request
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Car, Clock, CreditCard, DollarSign, Loader, MapPin, Sparkles, ChevronRight, Shield, Bell } from 'lucide-react';
import { VENUE } from '../config/venue';

export default function RequestCarPage() {
  const { cardId } = useParams();
  const navigate = useNavigate();
  const [valetFee, setValetFee] = useState(VENUE.defaultValetFee || 15.00);
  const [confirming, setConfirming] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [tip, setTip] = useState(0);

  const tipOptions = [0, 3, 5, 10];

  useEffect(() => {
    loadPricing();
  }, []);

  const loadPricing = async () => {
    try {
      const res = await fetch('${API_BASE_URL}/pricing');
      const data = await res.json();
      if (data.success && data.pricing) setValetFee(data.pricing.base_fee || data.pricing.base_valet_fee || 15);
    } catch (e) {}
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const response = await fetch('${API_BASE_URL}/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unique_card_id: cardId, is_priority: false }),
      });
      const data = await response.json();

      if (data.success) {
        const requestId = data.requestId || data.request?.id;
        await fetch(`${API_BASE_URL}/retrieval/${requestId}/payment-method`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentMethod }),
        });

        if (paymentMethod === 'online') {
          navigate(`/payment/${cardId}`, { state: { requestId, tip, amount: valetFee } });
        } else {
          navigate(`/status/${cardId}`);
        }
      } else if (data.alreadyRequested) {
        navigate(`/status/${cardId}`);
      } else {
        alert(data.message || 'Failed to request vehicle.');
        setConfirming(false);
      }
    } catch (error) {
      alert('Failed to request vehicle.');
      setConfirming(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <div className="bg-gradient-to-b from-[#1a1a2e] to-[#16213e] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#C9A962]/10 rounded-full blur-3xl" />
        <div className="relative px-6 pt-6 pb-8">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => navigate(-1)} disabled={confirming} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full border border-white/20 disabled:opacity-50">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full border border-white/20">
              <Clock className="w-4 h-4 text-[#C9A962]" />
              <span className="text-white text-xs font-medium">5-10 min</span>
            </div>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-[1px] bg-gradient-to-r from-[#C9A962] to-transparent" />
            <span className="text-[#C9A962] text-xs font-medium tracking-[0.3em] uppercase">{VENUE.shortName}</span>
          </div>
          <h1 className="text-3xl font-light text-white mb-2">Confirm <span className="font-semibold italic">Request</span></h1>
          <p className="text-white/60 text-sm">Your vehicle will be brought to the main entrance</p>
        </div>
      </div>

      <div className="px-6 py-6 -mt-2">
        <div className="bg-white rounded-2xl shadow-sm border border-[#E8E2D9]/50 overflow-hidden mb-6">
          <div className="p-6 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#C9A962]/20 to-[#C9A962]/5 flex items-center justify-center">
              <Car className="w-10 h-10 text-[#C9A962]" />
            </div>
            <h2 className="text-xl font-semibold text-[#1a1a2e] mb-1">Ready to Request?</h2>
            <p className="text-[#8A8A8A] text-sm">We'll notify you when your vehicle arrives</p>
          </div>
          <div className="mx-6 mb-6 p-4 bg-[#F5F2ED] rounded-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
              <MapPin className="w-5 h-5 text-[#C9A962]" />
            </div>
            <div>
              <p className="text-xs text-[#8A8A8A]">Pickup Location</p>
              <p className="text-[#1a1a2e] font-medium text-sm">Main Entrance - {VENUE.address.split(',')[0]}</p>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E8E2D9]/50 overflow-hidden mb-6">
          <div className="p-5 border-b border-[#E8E2D9]">
            <h3 className="font-semibold text-[#1a1a2e]">Payment Method</h3>
          </div>
          <div className="p-4 space-y-3">
            <button onClick={() => setPaymentMethod('online')} disabled={confirming}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left ${paymentMethod === 'online' ? 'border-[#C9A962] bg-[#C9A962]/5' : 'border-[#E8E2D9] hover:border-[#C9A962]/50'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${paymentMethod === 'online' ? 'bg-[#C9A962]' : 'bg-[#F5F2ED]'}`}>
                  <CreditCard className={`w-6 h-6 ${paymentMethod === 'online' ? 'text-[#1a1a2e]' : 'text-[#8A8A8A]'}`} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-[#1a1a2e]">Pay Now</div>
                  <div className="text-xs text-[#8A8A8A]">Fast & secure online payment</div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'online' ? 'border-[#C9A962] bg-[#C9A962]' : 'border-[#E8E2D9]'}`}>
                  {paymentMethod === 'online' && <CheckCircle className="w-4 h-4 text-[#1a1a2e]" />}
                </div>
              </div>
            </button>

            <button onClick={() => setPaymentMethod('cash')} disabled={confirming}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left ${paymentMethod === 'cash' ? 'border-green-500 bg-green-50' : 'border-[#E8E2D9] hover:border-green-300'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${paymentMethod === 'cash' ? 'bg-green-500' : 'bg-[#F5F2ED]'}`}>
                  <DollarSign className={`w-6 h-6 ${paymentMethod === 'cash' ? 'text-white' : 'text-[#8A8A8A]'}`} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-[#1a1a2e]">Pay at Pickup</div>
                  <div className="text-xs text-[#8A8A8A]">Cash or card when you collect</div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'cash' ? 'border-green-500 bg-green-500' : 'border-[#E8E2D9]'}`}>
                  {paymentMethod === 'cash' && <CheckCircle className="w-4 h-4 text-white" />}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Tip (online only) */}
        {paymentMethod === 'online' && (
          <div className="bg-white rounded-2xl shadow-sm border border-[#E8E2D9]/50 overflow-hidden mb-6">
            <div className="p-5 border-b border-[#E8E2D9]">
              <h3 className="font-semibold text-[#1a1a2e]">Add a Gratuity</h3>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-4 gap-3">
                {tipOptions.map(amount => (
                  <button key={amount} onClick={() => setTip(amount)} disabled={confirming}
                    className={`py-3.5 rounded-xl font-semibold text-sm transition-all ${tip === amount ? 'bg-[#C9A962] text-[#1a1a2e] shadow-lg scale-105' : 'bg-[#F5F2ED] text-[#6B6B6B] hover:bg-[#E8E2D9]'}`}>
                    {amount === 0 ? 'None' : `$${amount}`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-2xl p-6 mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#C9A962]/10 rounded-full blur-2xl" />
          <div className="relative">
            <h3 className="text-white/60 text-xs uppercase tracking-wider mb-4">Summary</h3>
            <div className="space-y-3 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-white/70">Valet Service</span>
                <span className="text-white font-medium">${valetFee.toFixed(2)}</span>
              </div>
              {paymentMethod === 'online' && tip > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Gratuity</span>
                  <span className="text-white font-medium">${tip.toFixed(2)}</span>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-white/10">
              <span className="text-white font-semibold">Total</span>
              <span className="text-[#C9A962] font-bold text-2xl">${paymentMethod === 'online' ? (valetFee + tip).toFixed(2) : valetFee.toFixed(2)}</span>
            </div>
            {paymentMethod === 'cash' && <p className="text-white/40 text-xs mt-3">Payment due at pickup</p>}
          </div>
        </div>

        {/* Explore Services */}
        <button onClick={() => navigate(`/amenities/${cardId}`)} disabled={confirming}
          className="w-full mb-4 p-4 bg-gradient-to-r from-[#C9A962]/10 to-[#C9A962]/5 border border-[#C9A962]/30 rounded-2xl hover:border-[#C9A962]/50 disabled:opacity-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#C9A962]/20 flex items-center justify-center"><Sparkles className="w-6 h-6 text-[#C9A962]" /></div>
            <div className="flex-1 text-left">
              <div className="font-semibold text-[#1a1a2e]">Explore Hotel Services</div>
              <div className="text-xs text-[#8A8A8A]">Dining, spa, amenities & more</div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#C9A962]" />
          </div>
        </button>

        {/* Confirm Button */}
        <button onClick={handleConfirm} disabled={confirming}
          className="w-full py-4 bg-gradient-to-r from-[#C9A962] to-[#B8983F] text-[#1a1a2e] rounded-2xl font-bold text-lg shadow-lg shadow-[#C9A962]/20 disabled:opacity-50 flex items-center justify-center gap-3">
          {confirming ? <><Loader className="w-5 h-5 animate-spin" /><span>Processing...</span></> : <><CheckCircle className="w-5 h-5" /><span>{paymentMethod === 'online' ? 'Continue to Payment' : 'Request Vehicle'}</span></>}
        </button>

        {/* What Happens Next */}
        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-[#E8E2D9]/50 overflow-hidden">
          <div className="p-5 border-b border-[#E8E2D9]"><h3 className="font-semibold text-[#1a1a2e]">What Happens Next?</h3></div>
          <div className="p-5 space-y-4">
            {[{ icon: Bell, text: 'Your request is added to the queue' }, { icon: Car, text: 'A valet attendant retrieves your vehicle' }, { icon: Clock, text: 'Real-time updates on your phone' }, { icon: CheckCircle, text: 'Notification when your car is ready' }].map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center"><item.icon className="w-4 h-4 text-green-600" /></div>
                <span className="text-[#6B6B6B] text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2">
          <Shield className="w-4 h-4 text-green-500" />
          <span className="text-[#8A8A8A] text-xs">Secure request • Real-time tracking</span>
        </div>
      </div>
      <div className="h-8" />
    </div>
  );
}
