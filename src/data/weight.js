const multipliers = { Tiny: 7.5, Small: 15, Medium: 15, Large: 30, Huge: 60, Gargantuan: 120 };
export function abilityModifier(score) { return Number.isFinite(score) ? Math.floor((score - 10) / 2) : null; }
export function calculateLoad(profile, equipment) {
  let knownWeightLb = 0, unknownCount = 0;
  for (const item of equipment) if (item.carried) {
    if (item.unitWeightLb === null) unknownCount++;
    else knownWeightLb += item.quantity * item.unitWeightLb;
  }
  const strength = profile.abilities?.str;
  const capacityLb = profile.capacityOverrideLb ?? (Number.isFinite(strength) && multipliers[profile.size] ? strength * multipliers[profile.size] : null);
  return { knownWeightLb, unknownCount, capacityLb, dragLiftPushLb: capacityLb === null ? null : capacityLb * 2, remainingLb: capacityLb === null ? null : capacityLb - knownWeightLb, status: capacityLb === null ? 'capacity-unknown' : knownWeightLb > capacityLb ? 'over' : unknownCount ? 'incomplete' : 'within' };
}
