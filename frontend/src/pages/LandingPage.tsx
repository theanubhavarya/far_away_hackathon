import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { Zap, Shield, Eye, Sparkles, ChevronDown, Mail } from 'lucide-react';
import { useTripStore } from '../stores';
import { useTranslation } from '../i18n/useTranslation';

// Animated India Map SVG Hero Background
function IndiaMapBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // City coordinates (normalized to canvas)
    const cities = [
      { name: 'Delhi', x: 0.37, y: 0.22 },
      { name: 'Mumbai', x: 0.24, y: 0.52 },
      { name: 'Bangalore', x: 0.35, y: 0.74 },
      { name: 'Chennai', x: 0.43, y: 0.72 },
      { name: 'Kolkata', x: 0.62, y: 0.38 },
      { name: 'Hyderabad', x: 0.40, y: 0.60 },
      { name: 'Jaipur', x: 0.31, y: 0.28 },
      { name: 'Pune', x: 0.27, y: 0.55 },
      { name: 'Ahmedabad', x: 0.22, y: 0.38 },
      { name: 'Lucknow', x: 0.46, y: 0.28 },
    ];

    const journeyPaths = [
      [0, 1], [2, 3], [4, 0], [1, 2], [5, 3], [6, 0], [7, 1], [8, 6], [9, 0],
    ];

    interface Particle { x: number; y: number; pathIndex: number; progress: number; speed: number; }
    const particles: Particle[] = [];

    journeyPaths.forEach((_, i) => {
      particles.push({ x: 0, y: 0, pathIndex: i, progress: Math.random(), speed: 0.002 + Math.random() * 0.002 });
    });

    let animId: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const W = canvas.width;
      const H = canvas.height;

      // Draw journey path lines
      journeyPaths.forEach(([fromIdx, toIdx]) => {
        const from = cities[fromIdx];
        const to = cities[toIdx];
        const gradient = ctx.createLinearGradient(from.x * W, from.y * H, to.x * W, to.y * H);
        gradient.addColorStop(0, 'rgba(59,158,255,0.25)');
        gradient.addColorStop(1, 'rgba(139,92,246,0.25)');
        ctx.beginPath();
        ctx.moveTo(from.x * W, from.y * H);
        // Bezier curve
        const cx = (from.x + to.x) / 2 * W + (Math.random() - 0.5) * 80;
        const cy = (from.y + to.y) / 2 * H - 60;
        ctx.quadraticCurveTo(cx, cy, to.x * W, to.y * H);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // Draw city nodes
      cities.forEach((city) => {
        const x = city.x * W;
        const y = city.y * H;
        // Outer glow
        const glow = ctx.createRadialGradient(x, y, 0, x, y, 18);
        glow.addColorStop(0, 'rgba(59,158,255,0.3)');
        glow.addColorStop(1, 'rgba(59,158,255,0)');
        ctx.beginPath();
        ctx.arc(x, y, 18, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();
        // Core dot
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#3B9EFF';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#E8F4FF';
        ctx.fill();
      });

      // Animate traveling dots along paths
      particles.forEach((p) => {
        p.progress += p.speed;
        if (p.progress > 1) p.progress = 0;

        const [fromIdx, toIdx] = journeyPaths[p.pathIndex];
        const from = cities[fromIdx];
        const to = cities[toIdx];
        const t = p.progress;
        const cx = (from.x + to.x) / 2 * W;
        const cy = (from.y + to.y) / 2 * H - 60;

        // Quadratic bezier position
        const x = (1 - t) * (1 - t) * from.x * W + 2 * (1 - t) * t * cx + t * t * to.x * W;
        const y = (1 - t) * (1 - t) * from.y * H + 2 * (1 - t) * t * cy + t * t * to.y * H;

        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#00D9C0';
        ctx.shadowColor = '#00D9C0';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        opacity: 0.6,
      }}
      aria-hidden="true"
    />
  );
}

// Floating social proof card
const socialProofMessages = [
  { user: 'Priya S.', saved: '₹840', route: 'Delhi → Mumbai', timeKey: 'time.justNow', timeVal: null },
  { user: 'Rahul M.', saved: '₹1,200', route: 'Bangalore → Chennai', timeKey: 'time.minAgo', timeVal: 2 },
  { user: 'Anjali K.', saved: '₹650', route: 'Kolkata → Bhubaneswar', timeKey: 'time.minAgo', timeVal: 5 },
  { user: 'Vikram T.', saved: '₹980', route: 'Jaipur → Agra', timeKey: 'time.minAgo', timeVal: 12 },
  { user: 'Neha R.', saved: '₹1,450', route: 'Hyderabad → Pune', timeKey: 'time.minAgo', timeVal: 18 },
  { user: 'Karan B.', saved: '₹520', route: 'Ahmedabad → Surat', timeKey: 'time.minAgo', timeVal: 22 },
];

function SocialProofCard() {
  const { t } = useTranslation();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIdx((prev) => (prev + 1) % socialProofMessages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const msg = socialProofMessages[idx];
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={idx}
        initial={{ opacity: 0, y: 15, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -15, scale: 0.95 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="glass-card"
        style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, maxWidth: 280 }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'linear-gradient(135deg, #3B9EFF, #8B5CF6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.8rem', fontWeight: 700, color: '#fff', flexShrink: 0,
        }}>
          {msg.user[0]}
        </div>
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600 }}>
            {(() => {
              const template = t('social.savedMessage');
              const parts = template.split('{saved}');
              if (parts.length === 2) {
                return (
                  <>
                    {parts[0].replace('{user}', msg.user)}
                    <span style={{ color: 'var(--color-success)' }}>{msg.saved}</span>
                    {parts[1].replace('{user}', msg.user)}
                  </>
                );
              }
              return template;
            })()}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {msg.route} • {msg.timeVal ? `${msg.timeVal} ${t(msg.timeKey)}` : t(msg.timeKey)}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}


const FAQSection = () => {
  const { t } = useTranslation();
  
  const faqs = [
    {
      q: t('faq.q1'),
      a: t('faq.a1')
    },
    {
      q: t('faq.q2'),
      a: t('faq.a2')
    },
    {
      q: t('faq.q3'),
      a: t('faq.a3')
    },
    {
      q: t('faq.q4'),
      a: t('faq.a4')
    },
    {
      q: t('faq.q5'),
      a: t('faq.a5')
    }
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section style={{ padding: '80px 24px', background: 'var(--bg-base)', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 700, marginBottom: 16 }}><FormatBrandText text={t('faq.title')} /></h2>
        <p style={{ color: 'var(--text-secondary)' }}><FormatBrandText text={t('faq.subtitle')} /></p>
      </div>
      <motion.div layout style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {faqs.map((faq, i) => (
          <motion.div 
            layout
            key={i} 
            initial={false}
            whileHover={{ y: -4, borderColor: 'var(--color-primary)', boxShadow: 'var(--shadow-glow-primary)' }}
            animate={{ 
              y: openIndex === i ? -4 : 0,
              borderColor: openIndex === i ? 'var(--color-primary)' : 'var(--border-default)',
              boxShadow: openIndex === i ? 'var(--shadow-glow-primary)' : 'none'
            }}
            transition={{ duration: 0.2 }}
            style={{ 
              borderStyle: 'solid',
              borderWidth: '1px',
              borderRadius: 'var(--radius-lg)', 
              overflow: 'hidden',
              background: 'var(--bg-surface)'
            }}
          >
            <motion.button
              layout
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              style={{
                width: '100%', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 600
              }}
            >
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                <FormatBrandText text={faq.q} />
              </div>
              <motion.div layout animate={{ rotate: openIndex === i ? 180 : 0 }} transition={{ duration: 0.3 }}>
                <ChevronDown size={20} color="var(--text-muted)" />
              </motion.div>
            </motion.button>
            <AnimatePresence initial={false}>
              {openIndex === i && (
                <motion.div
                  layout
                  key="content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{ padding: '0 24px 24px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    <FormatBrandText text={faq.a} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
};

const PremiumFooter = () => {
  return (
    <footer style={{
      background: '#0a0a0a',
      color: '#a0a0a0',
      padding: '60px 24px 40px',
      fontSize: '0.9rem',
      fontFamily: 'var(--font-sans)',
      borderTop: '1px solid #222'
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 32, marginBottom: 40 }}>
          {/* Left: Branding */}
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: '#ffffff', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, background: 'var(--color-primary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.2rem' }}>Y</div>
              Yatri <span style={{ color: 'var(--color-accent)' }}>AI</span>
            </div>
            <p style={{ margin: 0, color: '#d1d5db' }}>Built for Far Away 2026 International Hackathon</p>
          </div>
          
          {/* Middle: Links */}
          <div style={{ display: 'flex', gap: 24, fontWeight: 500 }}>
            <a href="#" style={{ color: '#a0a0a0', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = '#a0a0a0'}>Privacy</a>
            <a href="#" style={{ color: '#a0a0a0', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = '#a0a0a0'}>Terms</a>
            <a href="#" style={{ color: '#a0a0a0', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = '#a0a0a0'}>Company Disclosure</a>
          </div>

          {/* Right: Social & Contact */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ display: 'flex', gap: 16 }}>
              {[
                { name: 'Instagram', svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg> },
                { name: 'Twitter', svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg> },
                { name: 'LinkedIn', svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg> },
                { name: 'Facebook', svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg> }
              ].map((social, i) => (
                <a key={i} href="#" aria-label={social.name} style={{ color: '#a0a0a0', transition: 'color 0.2s, transform 0.2s' }} onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'scale(1.1)'; }} onMouseLeave={e => { e.currentTarget.style.color = '#a0a0a0'; e.currentTarget.style.transform = 'scale(1)'; }}>
                  {social.svg}
                </a>
              ))}
            </div>
            <a href="mailto:user@support.margmate.ai" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#a0a0a0', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = '#a0a0a0'}>
              <Mail size={16} /> user@support.margmate.ai
            </a>
          </div>
        </div>

        {/* Bottom: Copyright */}
        <div style={{ borderTop: '1px solid #222', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, color: '#d1d5db' }}>
          <p style={{ margin: 0 }}>© 2026 Marg Mate Pvt. Ltd. All rights reserved.</p>
          <p style={{ margin: 0 }}>
            <span style={{ color: 'var(--color-primary)' }}>यात्री</span> means "Traveler" in Hindi & Sanskrit
          </p>
        </div>
      </div>
    </footer>
  );
};

// Global helper for formatting "Yatri AI"
const FormatBrandText = ({ text }: { text: string }) => {
  if (!text) return null;
  const regex = /(Yatri |यात्री |યાત્રી |যাত্রী |யாத்ரி |ಯಾತ್ರಿ |యాత్రి )(AI|एआई|एआय|এআই|ಎಐ)/gi;
  const parts = [];
  let lastIndex = 0;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    parts.push(match[1]);
    parts.push(<span key={match.index} style={{ color: 'var(--color-accent)' }}>{match[2]}</span>);
    lastIndex = regex.lastIndex;
  }
  
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return <>{parts.length > 0 ? parts : text}</>;
};

// Helper components for Animations
const StaggerText = ({ text, delay = 0, interval = 0.05, className = "" }: { text: string, delay?: number, interval?: number, className?: string }) => {
  const aiIndices = new Set<number>();
  const matchRegex = /(Yatri |यात्री |યાત્રી |যাত্রী |யாத்ரி |ಯಾತ್ರಿ |యాత్రి )(AI|एआई|एआय|এআই|ಎಐ)/gi;
  let match;
  while ((match = matchRegex.exec(text)) !== null) {
    const aiStart = match.index + match[1].length;
    const aiEnd = aiStart + match[2].length;
    for (let i = aiStart; i < aiEnd; i++) {
      aiIndices.add(i);
    }
  }

  return (
    <motion.span
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 1 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: interval, delayChildren: delay }
        }
      }}
      className={className}
      style={{ whiteSpace: "pre-wrap" }}
    >
      {text.split('').map((char, i) => (
        <motion.span
          key={i}
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { duration: 0.01 } }
          }}
          style={aiIndices.has(i) ? { color: 'var(--color-accent)' } : undefined}
        >
          {char}
        </motion.span>
      ))}
    </motion.span>
  );
};

const AnimatedTaglines = ({ taglines }: { taglines: string[] }) => {

  
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // Start cycling after an initial delay
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        setIndex((prev) => (prev + 1) % taglines.length);
      }, 3000); 
      return () => clearInterval(interval);
    }, 4000);
    return () => clearTimeout(timeout);
  }, [taglines.length]);

  return (
    <div style={{ position: 'relative', height: '4em', width: '100%', maxWidth: 600, margin: '20px auto 0' }}>
      {taglines.map((tagline, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ 
            opacity: i === index ? 1 : 0, 
            y: i === index ? 0 : -10,
            pointerEvents: i === index ? 'auto' : 'none'
          }}
          transition={{ duration: 0.5 }}
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <p style={{
            textAlign: 'center',
            fontSize: 'clamp(1rem, 2vw, 1.2rem)',
            color: 'var(--text-primary)',
            fontWeight: 500,
            opacity: 0.9,
            textShadow: '0 1px 3px rgba(0,0,0,0.4)',
            lineHeight: 1.7,
            margin: '0',
          }}>
            {tagline}
          </p>
        </motion.div>
      ))}
    </div>
  );
};

const HeroTitle = ({ titles }: { titles: { t1: string, t2: string, t3: string }[] }) => {
  const [index, setIndex] = useState(0);
  const [typedCount, setTypedCount] = useState(0);
  const [phase, setPhase] = useState<'typing' | 'paused' | 'deleting'>('typing');

  useEffect(() => {
    const current = titles[index];
    const fullTextLength = current.t1.length + 1 + current.t2.length + current.t3.length + 1; // +1s for spaces
    const typingSpeed = 50; 
    const deletingSpeed = 30;

    let timeout: ReturnType<typeof setTimeout>;

    if (phase === 'typing') {
      if (typedCount < fullTextLength) {
        timeout = setTimeout(() => setTypedCount(c => c + 1), typingSpeed);
      } else {
        setPhase('paused');
      }
    } else if (phase === 'paused') {
      timeout = setTimeout(() => {
        setPhase('deleting');
      }, 3000);
    } else if (phase === 'deleting') {
      if (typedCount > 0) {
        timeout = setTimeout(() => setTypedCount(c => c - 1), deletingSpeed);
      } else {
        setIndex(prev => (prev + 1) % titles.length);
        setPhase('typing');
      }
    }

    return () => clearTimeout(timeout);
  }, [typedCount, phase, index, titles]);

  const current = titles[index];
  const t1 = current.t1 + ' ';
  const t2 = current.t2;
  const t3 = ' ' + current.t3;

  const t1Typed = t1.slice(0, typedCount);
  const t1Hidden = t1.slice(typedCount);

  const rem1 = Math.max(0, typedCount - t1.length);
  const t2Typed = t2.slice(0, rem1);
  const t2Hidden = t2.slice(rem1);

  const rem2 = Math.max(0, rem1 - t2.length);
  const t3Typed = t3.slice(0, rem2);
  const t3Hidden = t3.slice(rem2);

  const cursor = (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 0] }}
      transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
      style={{
        display: 'inline-block',
        width: '3px',
        height: '1em',
        background: 'var(--color-primary)',
        marginLeft: '4px',
        verticalAlign: 'middle',
        marginTop: '-0.1em'
      }}
    />
  );

  return (
    <h1
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(2.2rem, 6vw, 4rem)',
        fontWeight: 700,
        lineHeight: 1.1,
        maxWidth: 800,
        position: 'relative',
      }}
    >
      <span style={{ whiteSpace: 'pre-wrap' }}>
        <span>{t1Typed}</span>
        {typedCount < t1.length && cursor}
        <span style={{ visibility: 'hidden' }}>{t1Hidden}</span>
      </span>
      <span style={{ filter: 'drop-shadow(0 0 12px rgba(139, 92, 246, 0.9)) drop-shadow(0 0 32px rgba(139, 92, 246, 0.6))' }}>
        <span className="gradient-text" style={{ whiteSpace: 'pre-wrap' }}>
          <span>{t2Typed}</span>
          <span style={{ visibility: 'hidden' }}>{t2Hidden}</span>
        </span>
      </span>
      {typedCount >= t1.length && typedCount < t1.length + t2.length && cursor}
      <span style={{ whiteSpace: 'pre-wrap' }}>
        <span>{t3Typed}</span>
        {typedCount >= t1.length + t2.length && cursor}
        <span style={{ visibility: 'hidden' }}>{t3Hidden}</span>
      </span>
    </h1>
  );
};

const AnimatedHowItWorks = ({ title, subtitle, step1, step2, step3 }: any) => {
  const [loopKey, setLoopKey] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setLoopKey(prev => prev + 1);
    }, 11000);
    return () => clearInterval(interval);
  }, []);

  const typingSpeed = 0.05;
  const d1 = 0;
  const d2 = title.length * typingSpeed;
  const baseDelay = (title.length + subtitle.length) * typingSpeed + 0.5;

  return (
    <div key={loopKey}>
      <div style={{ textAlign: 'center', marginBottom: 48, minHeight: '80px' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 12 }}>
          <StaggerText text={title} delay={d1} interval={typingSpeed} />
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          <StaggerText text={subtitle} delay={d2} interval={typingSpeed} />
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 32, maxWidth: 700, margin: '0 auto', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 32, left: '16%', right: '16%', height: 2, zIndex: 0 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'var(--text-muted)', opacity: 0.15 }} />
          
          <motion.div 
            initial={{ width: '0%' }}
            animate={{ width: ['0%', '50%', '50%', '100%'] }}
            transition={{ duration: 4, times: [0, 0.4, 0.6, 1], delay: baseDelay, ease: "easeInOut" }}
            style={{
              position: 'absolute', top: 0, left: 0, height: '100%',
              background: 'linear-gradient(90deg, var(--color-primary), var(--color-journey-end))',
              boxShadow: '0 0 10px rgba(139,92,246,0.5)'
            }} 
          />
          
          <motion.div
            initial={{ left: '0%', opacity: 0, scale: 0.5 }}
            animate={{ 
              left: ['0%', '50%', '50%', '100%'], 
              opacity: [0, 1, 1, 1, 0], 
              scale: [0.5, 1, 1, 1, 0.5] 
            }}
            transition={{ duration: 4, times: [0, 0.4, 0.6, 1], delay: baseDelay, ease: "easeInOut" }}
            style={{
              position: 'absolute',
              top: -14,
              transform: 'translateX(-50%)',
              fontSize: '1.5rem',
              zIndex: 10
            }}
          >
            ✈️
          </motion.div>
        </div>
        
        <AnimatedStep 
          number="01" title={step1} visual="🗺️" 
          delay={baseDelay + 0.2} 
        />
        <AnimatedStep 
          number="02" title={step2} visual="🤖" 
          delay={baseDelay + 1.6} 
        />
        <AnimatedStep 
          number="03" title={step3} visual="✈️" 
          delay={baseDelay + 4.0} 
        />
      </div>
    </div>
  );
};

const AnimatedStep = ({ number, title, visual, delay }: any) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      style={{ textAlign: 'center', zIndex: 1 }}
    >
      <motion.div 
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: delay }}
        style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'var(--bg-surface)',
          border: '2px solid rgba(59,158,255,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
          fontSize: '1.8rem',
          boxShadow: '0 0 20px rgba(59,158,255,0.15)',
          position: 'relative'
        }}
      >
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(59,158,255,0.1), rgba(139,92,246,0.1))',
        }} />
        {visual}
      </motion.div>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: delay + 0.3 }}
        style={{
          fontSize: '0.7rem', fontFamily: 'var(--font-mono)',
          color: 'var(--color-primary)', fontWeight: 700,
          letterSpacing: '0.1em', marginBottom: 8,
        }}
      >
        {number}
      </motion.div>
      <motion.h3 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: delay + 0.4 }}
        style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--text-primary)' }}
      >
        {title}
      </motion.h3>
    </motion.div>
  );
};

export default function LandingPage() {
  const navigate = useNavigate();
  const { reset } = useTripStore();
  const { t } = useTranslation();
  const featuresRef = useRef(null);
  const isInView = useInView(featuresRef, { once: true });

  // Reset the trip planner completely whenever the user visits the home page
  useEffect(() => {
    reset();
  }, [reset]);

  const handlePlanTrip = () => {
    navigate('/plan');
  };

  return (
    <main>
      {/* ── Hero Section ────────────────────────────────────────── */}
      <section style={{
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        position: 'relative', overflow: 'hidden', textAlign: 'center',
        padding: 'calc(80px + 64px) 24px 80px',
        backgroundColor: 'var(--bg-base)',
        isolation: 'isolate'
      }}>
        {/* Background Video */}
        <video 
          autoPlay 
          muted 
          loop 
          playsInline 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: -1,
            opacity: 0.50
          }}
        >
          <source src="/Margmate.mov" />
        </video>

        {/* Animated India map background */}
        <IndiaMapBackground />

        {/* Gradient overlays */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 50% 50%, rgba(59,158,255,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%',
          background: 'linear-gradient(to top, var(--bg-base), transparent)',
          pointerEvents: 'none',
        }} />

        {/* Hindi subtitle */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 16px', borderRadius: 'var(--radius-pill)',
            background: 'rgba(59,158,255,0.15)', border: '1px solid rgba(59,158,255,0.3)',
            fontSize: '0.8rem', color: 'var(--color-primary)',
            fontWeight: 700, marginBottom: 24, position: 'relative',
            textShadow: '0 1px 3px rgba(0,0,0,0.4)',
          }}
        >
          <Sparkles size={13} />
          {t('hero.badge')}
        </motion.div>

        {/* Headline */}
        <HeroTitle 
          titles={[
            { t1: t('hero.title1'), t2: t('hero.title2'), t3: t('hero.title3') },
            { t1: t('hero.title4'), t2: t('hero.title5'), t3: t('hero.title6') },
            { t1: t('hero.title7'), t2: t('hero.title8'), t3: t('hero.title9') }
          ]}
        />

        <AnimatedTaglines taglines={[
          t('hero.subtitle'),
          t('hero.tagline2'),
          t('hero.tagline3'),
          t('hero.tagline4')
        ]} />

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          style={{ display: 'flex', gap: 12, marginTop: 36, flexWrap: 'wrap', justifyContent: 'center', position: 'relative' }}
        >
          <motion.button
            onClick={handlePlanTrip}
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            className="btn btn-primary btn-lg"
            style={{ minWidth: 160 }}
            id="hero-plan-trip-btn"
            aria-label="Plan a trip with Yatri AI"
          >
            <Zap size={18} />
            {t('hero.planTrip')}
          </motion.button>
          <motion.button
            onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="btn btn-secondary btn-lg"
            style={{ color: 'var(--text-primary)', fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.4)', background: 'rgba(255,255,255,0.05)' }}
            id="hero-how-it-works-btn"
          >
            {t('hero.howItWorks')}
          </motion.button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{
            display: 'flex', gap: 40, marginTop: 48,
            position: 'relative', flexWrap: 'wrap', justifyContent: 'center',
          }}
        >
          {[
            { value: '60+', labelKey: 'stats.cities' },
            { value: '8', labelKey: 'stats.modes' },
            { value: '5', labelKey: 'stats.agents' },
            { value: '0', labelKey: 'stats.hiddenCosts' },
          ].map(({ value, labelKey }) => (
            <div key={labelKey} style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 700,
                color: 'var(--color-primary)', textShadow: '0 1px 3px rgba(0,0,0,0.4)',
              }}>{value}</div>
              <div style={{ 
                fontSize: '0.75rem', color: 'var(--text-primary)', opacity: 0.9, fontWeight: 600, 
                textTransform: 'uppercase', letterSpacing: '0.08em', textShadow: '0 1px 3px rgba(0,0,0,0.4)' 
              }}>{t(labelKey)}</div>
            </div>
          ))}
        </motion.div>

        {/* Floating social proof */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8 }}
          style={{
            position: 'absolute', bottom: 40, right: 24,
            display: 'none',
          }}
          className="social-proof-card"
        >
          <SocialProofCard />
        </motion.div>
      </section>

      {/* ── Feature Highlights ───────────────────────────────────── */}
      <section className="section" ref={featuresRef} style={{ padding: '100px 0' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '80px', alignItems: 'center' }}>
          
          {/* Left Column: Text & Features */}
          <div style={{ paddingRight: '20px' }}>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
              style={{ marginBottom: 40 }}
            >
              <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 16, fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', lineHeight: 1.1, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                {t('features.heading1')}<br />
                <span className="gradient-text" style={{ filter: 'drop-shadow(0 0 12px rgba(139, 92, 246, 0.9)) drop-shadow(0 0 32px rgba(139, 92, 246, 0.6))' }}>{t('features.heading2')}</span>
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: 1.6, maxWidth: 450 }}>
                {t('features.subtitle')}
              </p>
            </motion.div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              {[
                {
                  icon: Zap,
                  title: t('features.multiModal.title'),
                  description: t('features.multiModal.desc'),
                  color: 'var(--color-primary)',
                  bg: 'rgba(59,158,255,0.15)'
                },
                {
                  icon: Shield,
                  title: t('features.disruption.title'),
                  description: t('features.disruption.desc'),
                  color: 'var(--color-disruption)',
                  bg: 'rgba(245,158,11,0.15)'
                },
                {
                  icon: Eye,
                  title: t('features.zeroCosts.title'),
                  description: t('features.zeroCosts.desc'),
                  color: 'var(--color-success)',
                  bg: 'rgba(16,185,129,0.15)'
                },
              ].map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: -30 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.5, delay: i * 0.15 + 0.3 }}
                  style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}
                >
                  <div style={{ 
                    background: feature.bg,
                    color: feature.color, 
                    padding: 12, borderRadius: '12px', flexShrink: 0 
                  }}>
                    <feature.icon size={24} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>{feature.title}</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right Column: Image Collage */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="collage-container"
            style={{ position: 'relative', height: '530px', width: '100%' }}
          >
            {/* --- TOP ROW (SET 1) --- */}
            {/* 1. Image 1 (Top Left - Mountain) */}
            <motion.div
              whileHover={{ rotate: -2, scale: 1.15, zIndex: 20 }}
              style={{
                position: 'absolute',
                left: '-16%',
                top: '-8%',
                width: '56%',
                aspectRatio: '4/3',
                backgroundImage: 'url(/frontend-images/3.jpeg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: '16px',
                border: '6px solid rgba(255,255,255,0.4)',
                boxShadow: '0 15px 35px rgba(0,0,0,0.15), 0 0 15px rgba(255,255,255,0.3)',
                backgroundClip: 'padding-box',
                backdropFilter: 'blur(8px)',
                rotate: -8,
                zIndex: 1,
                cursor: 'pointer',
              }}
            />

            {/* 2. Video 1 (Top Middle) */}
            <motion.div
              whileHover={{ scale: 1.15, zIndex: 20 }}
              style={{
                position: 'absolute',
                left: '18%',
                top: '4%',
                width: '56%',
                aspectRatio: '4/3',
                borderRadius: '16px',
                border: '6px solid rgba(255,255,255,0.4)',
                boxShadow: '0 15px 35px rgba(0,0,0,0.15), 0 0 15px rgba(255,255,255,0.3)',
                backgroundClip: 'padding-box',
                backdropFilter: 'blur(8px)',
                rotate: 2,
                zIndex: 5,
                cursor: 'pointer',
                overflow: 'hidden',
              }}
            >
              <video 
                src="/frontend-images/1-video.mp4" 
                autoPlay muted loop playsInline 
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} 
              />
            </motion.div>

            {/* 3. Image 2 (Top Right - Building) */}
            <motion.div
              whileHover={{ rotate: 2, scale: 1.15, zIndex: 20 }}
              style={{
                position: 'absolute',
                right: '-16%',
                top: '-6%',
                width: '56%',
                aspectRatio: '4/3',
                backgroundImage: 'url(/frontend-images/2.jpeg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: '16px',
                border: '6px solid rgba(255,255,255,0.4)',
                boxShadow: '0 15px 35px rgba(0,0,0,0.15), 0 0 15px rgba(255,255,255,0.3)',
                backgroundClip: 'padding-box',
                backdropFilter: 'blur(8px)',
                rotate: 9,
                zIndex: 2,
                cursor: 'pointer',
              }}
            />

            {/* --- BOTTOM ROW (SET 2) --- */}
            {/* 4. Image 3 (Bottom Left - Bridge) */}
            <motion.div
              whileHover={{ rotate: -2, scale: 1.15, zIndex: 20 }}
              style={{
                position: 'absolute',
                left: '-12%',
                bottom: '-2%',
                width: '56%',
                aspectRatio: '4/3',
                backgroundImage: 'url(/frontend-images/1.jpeg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: '16px',
                border: '6px solid rgba(255,255,255,0.4)',
                boxShadow: '0 15px 35px rgba(0,0,0,0.15), 0 0 15px rgba(255,255,255,0.3)',
                backgroundClip: 'padding-box',
                backdropFilter: 'blur(8px)',
                rotate: -6,
                zIndex: 3,
                cursor: 'pointer',
              }}
            />

            {/* 5. Video 2 (Bottom Middle) */}
            <motion.div
              whileHover={{ scale: 1.15, zIndex: 20 }}
              style={{
                position: 'absolute',
                left: '22%',
                bottom: '-12%',
                width: '56%',
                aspectRatio: '4/3',
                borderRadius: '16px',
                border: '6px solid rgba(255,255,255,0.4)',
                boxShadow: '0 15px 35px rgba(0,0,0,0.15), 0 0 15px rgba(255,255,255,0.3)',
                backgroundClip: 'padding-box',
                backdropFilter: 'blur(8px)',
                rotate: 1,
                zIndex: 6,
                cursor: 'pointer',
                overflow: 'hidden',
              }}
            >
              <video 
                src="/frontend-images/2-video.mp4" 
                autoPlay muted loop playsInline 
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} 
              />
            </motion.div>

            {/* 6. Image 4 (Bottom Right - Train) */}
            <motion.div
              whileHover={{ rotate: 2, scale: 1.15, zIndex: 20 }}
              style={{
                position: 'absolute',
                right: '-12%',
                bottom: '-4%',
                width: '56%',
                aspectRatio: '4/3',
                backgroundImage: 'url(/frontend-images/4.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: '16px',
                border: '6px solid rgba(255,255,255,0.4)',
                boxShadow: '0 15px 35px rgba(0,0,0,0.15), 0 0 15px rgba(255,255,255,0.3)',
                backgroundClip: 'padding-box',
                backdropFilter: 'blur(8px)',
                rotate: 7,
                zIndex: 4,
                cursor: 'pointer',
              }}
            />
          </motion.div>

        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────── */}
      <section id="how-it-works" className="section" style={{ padding: '80px 0', background: 'var(--bg-surface)' }}>
        <div className="container">
          <AnimatedHowItWorks 
            title={t('howItWorks.title')}
            subtitle={t('howItWorks.subtitle')}
            step1={t('howItWorks.step1')}
            step2={t('howItWorks.step2')}
            step3={t('howItWorks.step3')}
          />
        </div>
      </section>

      {/* ── FAQ & Footer ─────────────────────────────────────────── */}
      <FAQSection />
      <PremiumFooter />

      <style>{`
        @media (min-width: 1024px) {
          .social-proof-card { display: block !important; }
        }
      `}</style>
    </main>
  );
}
