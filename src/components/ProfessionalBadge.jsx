import { CheckCircle, Shield, Award, FileCheck } from 'lucide-react';

export default function ProfessionalBadge({ type, size = 'md', showTooltip = true }) {
  const badges = {
    verified: {
      icon: CheckCircle,
      label: 'Verified Professional',
      color: '#10b981',
      bgColor: '#d1fae5',
      tooltip: 'Identity and credentials verified'
    },
    background_checked: {
      icon: Shield,
      label: 'Background Checked',
      color: '#3b82f6',
      bgColor: '#dbeafe',
      tooltip: 'Criminal background check completed'
    },
    insured: {
      icon: FileCheck,
      label: 'Insured',
      color: '#8b5cf6',
      bgColor: '#ede9fe',
      tooltip: 'Liability insurance coverage active'
    },
    certified: {
      icon: Award,
      label: 'Certified',
      color: '#f59e0b',
      bgColor: '#fef3c7',
      tooltip: 'Professional certification verified'
    }
  };

  const badge = badges[type];
  if (!badge) return null;

  const Icon = badge.icon;

  const sizes = {
    sm: { width: 16, height: 16, fontSize: '0.75rem', padding: '0.25rem 0.5rem', gap: '0.25rem' },
    md: { width: 18, height: 18, fontSize: '0.875rem', padding: '0.375rem 0.75rem', gap: '0.375rem' },
    lg: { width: 20, height: 20, fontSize: '1rem', padding: '0.5rem 1rem', gap: '0.5rem' }
  };

  const sizeStyles = sizes[size];

  const badgeStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: sizeStyles.gap,
    padding: sizeStyles.padding,
    background: badge.bgColor,
    color: badge.color,
    borderRadius: 'var(--radius-md)',
    fontSize: sizeStyles.fontSize,
    fontWeight: 600,
    border: '1px solid transparent',
    cursor: showTooltip ? 'help' : 'default',
    transition: 'all 0.2s ease',
    position: 'relative'
  };

  const handleMouseEnter = (e) => {
    if (!showTooltip) return;
    e.currentTarget.style.borderColor = badge.color;
  };

  const handleMouseLeave = (e) => {
    e.currentTarget.style.borderColor = 'transparent';
  };

  return (
    <div
      style={badgeStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      title={showTooltip ? badge.tooltip : undefined}
      aria-label={badge.label}
    >
      <Icon size={sizeStyles.width} />
      <span>{badge.label}</span>
    </div>
  );
}