export function changeSkill(profile, name, patch) {
  return { ...profile, sheet: { ...profile.sheet, skills: {
    ...profile.sheet.skills, [name]: { ...profile.sheet.skills[name], ...patch },
  } } };
}
