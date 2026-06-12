import { Link, useParams } from 'react-router-dom';

export default function GroupResultsPage() {
  const { groupId } = useParams();

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', padding: '32px 24px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div className="glass-card">
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: 8 }}>
            Group results
          </h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
            {groupId ? `Group ${groupId} is ready for results.` : 'Group results are ready.'}
          </p>
          <Link to="/group" className="btn btn-primary">
            Back to group planning
          </Link>
        </div>
      </div>
    </div>
  );
}
