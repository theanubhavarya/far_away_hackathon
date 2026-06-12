/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, ThumbsUp, Wallet } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { createGroup, voteDestination } from '../lib/api';
import { formatCurrency } from '../types';
import { useTranslation } from '../i18n/useTranslation';
import toast from 'react-hot-toast';

const POPULAR_DESTINATIONS = [
  { name: 'Goa', emoji: '🏖', desc: 'Beach holiday' },
  { name: 'Manali', emoji: '🏔', desc: 'Mountains & snow' },
  { name: 'Jaipur', emoji: '🏰', desc: 'Heritage & culture' },
  { name: 'Rishikesh', emoji: '🌊', desc: 'Adventure & yoga' },
  { name: 'Ooty', emoji: '🌿', desc: 'Tea gardens & cool air' },
  { name: 'Udaipur', emoji: '🎨', desc: 'Lake city & romance' },
];

export default function GroupPage() {
  const [members, setMembers] = useState(['']);
  const [groupName, setGroupName] = useState('');
  const [budget, setBudget] = useState(5000);
  const [group, setGroup] = useState<any>(null);
  const [votes, setVotes] = useState<Record<string, number>>({});
  const { t } = useTranslation();

  const createMutation = useMutation({
    mutationFn: createGroup,
    onSuccess: (data) => {
      setGroup(data);
      setVotes(data.votes?.destination || {});
      toast.success(`Group "${data.group_name}" created!`);
    },
    onError: () => toast.error('Failed to create group'),
  });

  const voteMutation = useMutation({
    mutationFn: ({ dest, member }: { dest: string; member: string }) =>
      voteDestination(group.group_id, dest, member),
    onSuccess: (data) => {
      setVotes(data.votes);
      toast.success('Vote recorded!');
    },
  });

  const handleCreate = () => {
    if (!groupName || members.filter(Boolean).length < 1) {
      toast.error('Enter group name and at least one member');
      return;
    }
    createMutation.mutate({
      group_name: groupName,
      members: members.filter(Boolean),
      destination_options: POPULAR_DESTINATIONS.map((d) => d.name),
      budget_per_person: budget,
    });
  };

  const maxVotes = Math.max(...Object.values(votes), 1);

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', padding: '32px 24px', maxWidth: 760, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: 8 }}>
          {t('group.title')}
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>
          {t('group.subtitle')}
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {!group ? (
          <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="glass-card" style={{ marginBottom: 24 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: 20 }}>{t('group.createYourGroup')}</h2>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>{t('group.groupName')}</label>
                <input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder={t('group.groupNamePlaceholder')}
                  className="input-field"
                  id="group-name-input"
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>{t('group.members')}</label>
                {members.map((m, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input
                      value={m}
                      onChange={(e) => { const arr = [...members]; arr[i] = e.target.value; setMembers(arr); }}
                      placeholder={`${t('group.memberPlaceholder')} ${i + 1}`}
                      className="input-field"
                      id={`member-${i}`}
                    />
                    {i === members.length - 1 && (
                      <button
                        onClick={() => setMembers([...members, ''])}
                        style={{ padding: '0 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '1.2rem' }}
                        aria-label="Add another member"
                      >+</button>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  {t('group.budgetPerPerson')}: {formatCurrency(budget)}
                </label>
                <input
                  type="range" min={1000} max={20000} step={500}
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  aria-label="Budget per person"
                  style={{ width: '100%', accentColor: 'var(--color-accent)', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  <span>₹1,000</span><span>₹20,000</span>
                </div>
              </div>

              <motion.button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                whileHover={{ scale: 1.02 }}
                className="btn btn-primary btn-lg btn-full"
                id="create-group-btn"
              >
                <Users size={18} />
                {t('group.createGroup')}
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="group" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Group header */}
            <div className="glass-card" style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>{group.group_name}</h2>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    {group.members.length} {t('group.members').toLowerCase()} • {t('group.budgetPerPerson')}: {formatCurrency(budget)}
                  </div>
                </div>
                <div style={{
                  padding: '6px 12px', background: 'rgba(59,158,255,0.1)',
                  border: '1px solid rgba(59,158,255,0.3)',
                  borderRadius: 'var(--radius-pill)', fontSize: '0.75rem', color: 'var(--color-primary)',
                  fontFamily: 'var(--font-mono)', fontWeight: 600,
                }}>
                  #{group.group_id.slice(-6)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {group.members.map((m: string) => (
                  <span key={m} style={{
                    padding: '4px 10px', background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-pill)', fontSize: '0.78rem', color: 'var(--text-secondary)',
                  }}>👤 {m}</span>
                ))}
              </div>
            </div>

            {/* Destination voting */}
            <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 16 }}>{t('group.voteOnDest')}</h3>
            <div className="grid-3" style={{ marginBottom: 32 }}>
              {POPULAR_DESTINATIONS.map((dest, i) => {
                const voteCount = votes[dest.name] || 0;
                const barWidth = maxVotes > 0 ? (voteCount / maxVotes) * 100 : 0;
                return (
                  <motion.div
                    key={dest.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ y: -3 }}
                    className="glass-card"
                    style={{ textAlign: 'center', cursor: 'pointer', padding: 16 }}
                    onClick={() => voteMutation.mutate({ dest: dest.name, member: group.members[0] })}
                    role="button"
                    tabIndex={0}
                    id={`vote-${dest.name.toLowerCase()}`}
                    aria-label={`Vote for ${dest.name}`}
                    onKeyDown={(e) => e.key === 'Enter' && voteMutation.mutate({ dest: dest.name, member: group.members[0] })}
                  >
                    <div style={{ fontSize: '2rem', marginBottom: 8 }}>{dest.emoji}</div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{dest.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 12 }}>{dest.desc}</div>
                    {/* Vote bar */}
                    <div style={{ height: 4, background: 'var(--bg-base)', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${barWidth}%` }}
                        style={{ height: '100%', background: 'var(--color-primary)', borderRadius: 2 }}
                      />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: voteCount > 0 ? 'var(--color-primary)' : 'var(--text-muted)' }}>
                      <ThumbsUp size={10} style={{ display: 'inline', marginRight: 3 }} />
                      {voteCount} vote{voteCount !== 1 ? 's' : ''}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Total cost estimate */}
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Wallet size={20} color="var(--color-accent)" />
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>{t('group.totalBudget')}</div>
                <div style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 700 }}>
                  {formatCurrency(budget * group.members.length)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {formatCurrency(budget)} × {group.members.length} {t('group.members').toLowerCase()}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
