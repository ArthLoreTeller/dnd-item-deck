import { calculateLoad } from '../data/weight';
import { pounds } from '../data/units';
export function LoadSummary({ profile, equipment }) {
  const load = calculateLoad(profile, equipment);
  return <section className="load-summary" aria-label="Carrying capacity">
    <div><span className="eyebrow">CARRIED LOAD {load.unknownCount ? '· PARTIAL' : ''}</span><p className="load-number">{pounds(load.knownWeightLb)} <small>/ {pounds(load.capacityLb)} lb</small></p></div>
    <div className="load-status"><strong>{load.status === 'over' ? 'Over carrying capacity' : load.unknownCount ? `${load.unknownCount} carried ${load.unknownCount === 1 ? 'entry needs' : 'entries need'} a weight` : load.capacityLb === null ? 'Set Strength and size on your character' : `${pounds(load.remainingLb)} lb remaining`}</strong><p>{load.dragLiftPushLb !== null ? `Push / drag / lift: ${pounds(load.dragLiftPushLb)} lb` : 'Capacity is unknown.'}</p>{profile.capacityOverrideLb !== null && <p>Override: {profile.capacityOverrideReason || 'Table ruling'}</p>}</div>
    <p className="load-note">2024 rules · Coins are tracked separately and excluded from this load.{load.unknownCount > 0 && ' Remaining capacity is provisional until all carried weights are entered.'}</p>
  </section>;
}
