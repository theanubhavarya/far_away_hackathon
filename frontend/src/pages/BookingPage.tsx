import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { createBooking } from '../lib/api';
import { useTripStore } from '../stores';
import { formatCurrency } from '../types';
import toast from 'react-hot-toast';

const STEPS = ['Confirm Journey', 'Traveler Details', 'Payment', 'Confirmed!'];

function StepIndicator({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32 }}>
      {STEPS.map((step, i) => (
        <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: i < current ? 'var(--color-success)' : i === current ? 'var(--color-primary)' : 'var(--bg-elevated)',
            border: `2px solid ${i <= current ? (i < current ? 'var(--color-success)' : 'var(--color-primary)') : 'var(--border-default)'}`,
            fontSize: '0.8rem', fontWeight: 700, color: i <= current ? '#fff' : 'var(--text-muted)',
            transition: 'all 0.3s',
          }}>
            {i < current ? '✓' : i + 1}
          </div>
          {i < STEPS.length - 1 && (
            <div style={{
              flex: 1, height: 2,
              background: i < current ? 'var(--color-success)' : 'var(--border-default)',
              transition: 'background 0.3s',
            }} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function BookingPage() {
  const { routeId } = useParams();
  const navigate = useNavigate();
  const { selectedRoute } = useTripStore();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    traveler_name: '', traveler_age: '', id_type: 'Aadhaar', id_number: '', phone: '+91 ', payment_method: 'UPI',
  });
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [confirmation, setConfirmation] = useState<any>(null);

  const bookMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: (data) => {
      setConfirmation(data);
      setStep(3);
    },
    onError: () => toast.error('Booking failed. Please try again.'),
  });

  if (!selectedRoute) { navigate('/plan'); return null; }

  const handlePayment = () => {
    setPaymentProcessing(true);
    setTimeout(() => {
      bookMutation.mutate({
        route_id: routeId!,
        traveler_name: form.traveler_name || 'Guest Traveler',
        traveler_age: parseInt(form.traveler_age) || 25,
        id_type: form.id_type,
        id_number: form.id_number || 'DEMO1234',
        phone: form.phone || '+91 98765 43210',
        payment_method: form.payment_method,
      });
    }, 2500);
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', padding: '32px 24px', maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: 8 }}>Book Your Journey</h1>
      <StepIndicator current={step} />

      <AnimatePresence mode="wait">
        {/* Step 0: Confirm */}
        {step === 0 && (
          <motion.div key="step0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            <div className="glass-card" style={{ marginBottom: 24 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: 16 }}>Journey Summary</h2>
              {selectedRoute.segments.map((seg, i) => (
                <div key={i} style={{ marginBottom: 12, padding: '10px', background: 'var(--bg-base)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontWeight: 600 }}>{seg.operator} — {seg.class_type}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {seg.origin_stop.city} → {seg.destination_stop.city} • {seg.departure_time}–{seg.arrival_time}
                  </div>
                  <div style={{ color: 'var(--color-accent)', fontWeight: 700, fontSize: '0.9rem', marginTop: 4 }}>
                    {formatCurrency(seg.fare_inr)}
                  </div>
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: 12, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                <span>Total</span>
                <span style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-mono)', fontSize: '1.1rem' }}>
                  {formatCurrency(selectedRoute.total_cost_inr)}
                </span>
              </div>
            </div>
            <button onClick={() => setStep(1)} className="btn btn-primary btn-lg btn-full" id="confirm-journey-btn">
              Continue →
            </button>
          </motion.div>
        )}

        {/* Step 1: Traveler Details */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            <div className="glass-card" style={{ marginBottom: 24 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: 20 }}>Traveler Details</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { key: 'traveler_name', label: 'Full Name', type: 'text', placeholder: 'As on ID card' },
                  { key: 'traveler_age', label: 'Age', type: 'number', placeholder: 'e.g. 28' },
                  { key: 'id_number', label: 'ID Number', type: 'text', placeholder: 'Enter ID number' },
                  { key: 'phone', label: 'Phone', type: 'tel', placeholder: '+91 98765 43210' },
                ].map(({ key, label, type, placeholder }) => (
                  <div key={key}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                      {label.toUpperCase()}
                    </label>
                    <input
                      type={type}
                      value={(form as any)[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      placeholder={placeholder}
                      className="input-field"
                      id={`field-${key}`}
                    />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>ID TYPE</label>
                  <select
                    value={form.id_type}
                    onChange={(e) => setForm({ ...form, id_type: e.target.value })}
                    className="input-field"
                    id="field-id-type"
                  >
                    {['Aadhaar', 'PAN Card', 'Passport', 'Voter ID'].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setStep(0)} className="btn btn-ghost" style={{ flex: 1 }}>← Back</button>
              <button onClick={() => setStep(2)} className="btn btn-primary" style={{ flex: 2 }} id="traveler-details-btn">Continue →</button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Payment */}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            <div className="glass-card" style={{ marginBottom: 24 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: 20 }}>Payment</h2>
              <div style={{
                padding: '8px 12px', background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--radius-md)',
                fontSize: '0.78rem', color: 'var(--color-warning)', marginBottom: 20,
              }}>
                Payment simulation only. No actual payment will be processed.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {[
                  { id: 'UPI', icon: '📱', label: 'UPI', sub: 'Google Pay, PhonePe, Paytm' },
                  { id: 'Card', icon: '💳', label: 'Debit / Credit Card', sub: 'Visa, Mastercard, RuPay' },
                  { id: 'Wallet', icon: '👜', label: 'Mobile Wallets', sub: 'Paytm, PhonePe, Amazon Pay' },
                ].map(({ id, icon, label, sub }) => (
                  <button
                    key={id}
                    onClick={() => setForm({ ...form, payment_method: id })}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                      background: form.payment_method === id ? 'rgba(59,158,255,0.1)' : 'var(--bg-base)',
                      border: `1px solid ${form.payment_method === id ? 'var(--color-primary)' : 'var(--border-default)'}`,
                      borderRadius: 'var(--radius-md)', cursor: 'pointer', width: '100%',
                      transition: 'all var(--transition-fast)', textAlign: 'left',
                    }}
                    id={`payment-${id.toLowerCase()}`}
                  >
                    <span style={{ fontSize: '1.4rem' }}>{icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{label}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sub}</div>
                    </div>
                    {form.payment_method === id && (
                      <div style={{ marginLeft: 'auto', width: 16, height: 16, borderRadius: '50%', background: 'var(--color-primary)' }} />
                    )}
                  </button>
                ))}
              </div>

              {paymentProcessing ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    border: '3px solid var(--border-default)',
                    borderTopColor: 'var(--color-primary)',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 12px',
                  }} />
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Processing payment...</div>
                  <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                </div>
              ) : (
                <motion.button
                  onClick={handlePayment}
                  whileHover={{ scale: 1.02 }}
                  className="btn btn-primary btn-lg btn-full"
                  id="pay-btn"
                >
                  Pay {formatCurrency(selectedRoute.total_cost_inr)}
                </motion.button>
              )}
            </div>
            <button onClick={() => setStep(1)} className="btn btn-ghost btn-full">← Back</button>
          </motion.div>
        )}

        {/* Step 3: Confirmed! */}
        {step === 3 && confirmation && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 100 }}
            style={{ textAlign: 'center' }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
              style={{ marginBottom: 24 }}
            >
              <CheckCircle size={64} color="var(--color-success)" style={{ margin: '0 auto' }} />
            </motion.div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: 8 }}>Booking Confirmed!</h2>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '1.2rem', color: 'var(--color-accent)',
              padding: '12px 24px', background: 'rgba(245,158,11,0.1)',
              border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius-md)',
              display: 'inline-block', margin: '12px auto',
            }}>
              {confirmation.booking_ref}
            </div>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: '0.9rem' }}>
              Paid: {formatCurrency(confirmation.total_paid_inr)} • Traveler: {confirmation.traveler_name}
            </p>

            {/* E-tickets */}
            {selectedRoute.segments.map((seg, i) => (
              <div key={i} className="glass-card" style={{ marginBottom: 12, textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>{seg.operator}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {seg.origin_stop.city} → {seg.destination_stop.city}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{seg.class_type}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>{seg.departure_time}</div>
                    <div style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{formatCurrency(seg.fare_inr)}</div>
                  </div>
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button
                onClick={() => toast.success('Share link generated!')}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >💬 Share on WhatsApp</button>
              <button
                onClick={() => navigate('/')}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >Plan Another Trip</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
