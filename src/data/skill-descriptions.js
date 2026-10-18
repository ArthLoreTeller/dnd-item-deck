// Owns the transient hover/focus state independently from the character draft.
export function createSkillDescriptions(onChange) {
  let hovered = null, focused = null, pinned = null;
  let leaveTimer = null;
  const cancelLeave = () => { clearTimeout(leaveTimer); leaveTimer = null; };
  const publish = () => onChange(pinned ?? focused ?? hovered);
  const dismiss = () => { cancelLeave(); hovered = null; focused = null; pinned = null; publish(); };
  return {
    enter(id) { cancelLeave(); hovered = id; publish(); },
    leave() {
      cancelLeave();
      // Allow the pointer to cross the small gap into the tooltip descendant.
      leaveTimer = setTimeout(() => { leaveTimer = null; hovered = null; publish(); }, 150);
    },
    focus(id) { cancelLeave(); hovered = null; focused = id; publish(); },
    blur: dismiss,
    toggle(id) { cancelLeave(); hovered = null; focused = null; pinned = pinned === id ? null : id; publish(); },
    dismiss,
    dispose: cancelLeave,
  };
}
