/**
 * PaymentPage - Online payment processing
 */

import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, CreditCard, Lock, CheckCircle, Loader, Shield } from 'lucide-react';
import { VENUE } from '../config/venue';

export default function PaymentPage() {
  const { cardId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { requestId, tip = 0, amount = 15 } = location.state || {};
  
  const [processing, setProcessing] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [name, setName] = useState('');

  const total = amount + tip;

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : value;
  };

  const formatExpiry = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);

    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // In production, this would integrate with Stripe/Square
    try {
      await fetch(`${API_BASE_URL}/retrieval/${requestId}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: total,
          tip,
          paymentMethod: 'card',
          last4: cardNumber.slice(-4),
        }),
      });
    } catch (e) {}

    navigate(`/status/${cardId}`);
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <div className="bg-gradient-to-b from-[#1a1a2e] to-[#16213e] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#C9A962]/10 rounded-full blur-3xl" />
        <div className="relative px-6 pt-6 pb-8">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => navigate(-1)} disabled={processing} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full border border-white/20 disabled:opacity-50">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 rounded-full border border-green-500/30">
              <Lock className="w-4 h-4 text-green-400" />
              <span className="text-green-400 text-xs font-medium">Secure</span>
            </div>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-[1px] bg-gradient-to-r from-[#C9A962] to-transparent" />
            <span className="text-[#C9A962] text-xs font-medium tracking-[0.3em] uppercase">{VENUE.shortName}</span>
          </div>
          <h1 className="text-3xl font-light text-white mb-2">Complete <span className="font-semibold italic">Payment</span></h1>
          <p className="text-white/60 text-sm">Secure payment processing</p>
        </div>
      </div>

      <div className="px-6 py-6 -mt-2">
        {/* Amount Summary */}
        <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-2xl p-6 mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#C9A962]/10 rounded-full blur-2xl" />
          <div className="relative text-center">
            <p className="text-white/60 text-sm mb-1">Total Amount</p>
            <p className="text-[#C9A962] font-bold text-4xl">${total.toFixed(2)}</p>
            <div className="flex items-center justify-center gap-4 mt-3 text-sm">
              <span className="text-white/50">Service: ${amount.toFixed(2)}</span>
              {tip > 0 && <span className="text-white/50">Tip: ${tip.toFixed(2)}</span>}
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-[#E8E2D9]/50 overflow-hidden">
            <div className="p-5 border-b border-[#E8E2D9]">
              <h3 className="font-semibold text-[#1a1a2e] flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#C9A962]" />
                Card Details
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm text-[#8A8A8A] mb-2">Cardholder Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Smith"
                  required
                  disabled={processing}
                  className="w-full px-4 py-3 bg-[#F5F2ED] border border-[#E8E2D9] rounded-xl focus:outline-none focus:border-[#C9A962] disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm text-[#8A8A8A] mb-2">Card Number</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  placeholder="4242 4242 4242 4242"
                  maxLength={19}
                  required
                  disabled={processing}
                  className="w-full px-4 py-3 bg-[#F5F2ED] border border-[#E8E2D9] rounded-xl focus:outline-none focus:border-[#C9A962] font-mono disabled:opacity-50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#8A8A8A] mb-2">Expiry</label>
                  <input
                    type="text"
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    placeholder="MM/YY"
                    maxLength={5}
                    required
                    disabled={processing}
                    className="w-full px-4 py-3 bg-[#F5F2ED] border border-[#E8E2D9] rounded-xl focus:outline-none focus:border-[#C9A962] font-mono disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#8A8A8A] mb-2">CVV</label>
                  <input
                    type="text"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="123"
                    maxLength={4}
                    required
                    disabled={processing}
                    className="w-full px-4 py-3 bg-[#F5F2ED] border border-[#E8E2D9] rounded-xl focus:outline-none focus:border-[#C9A962] font-mono disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={processing || !cardNumber || !expiry || !cvv || !name}
            className="w-full py-4 bg-gradient-to-r from-[#C9A962] to-[#B8983F] text-[#1a1a2e] rounded-2xl font-bold text-lg shadow-lg shadow-[#C9A962]/20 disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {processing ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Lock className="w-5 h-5" />
                <span>Pay ${total.toFixed(2)}</span>
              </>
            )}
          </button>
        </form>

        {/* Security Info */}
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-green-800 font-medium text-sm">Secure Payment</p>
              <p className="text-green-700 text-xs mt-1">Your payment information is encrypted and secure. We never store your full card details.</p>
            </div>
          </div>
        </div>

        {/* Accepted Cards */}
        <div className="mt-6 text-center">
          <p className="text-[#8A8A8A] text-xs mb-3">Accepted Payment Methods</p>
          <div className="flex items-center justify-center gap-3">
            {['Visa', 'Mastercard', 'Amex', 'Discover'].map(card => (
              <div key={card} className="px-3 py-1.5 bg-white border border-[#E8E2D9] rounded-lg">
                <span className="text-xs font-medium text-[#6B6B6B]">{card}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="h-8" />
    </div>
  );
}
