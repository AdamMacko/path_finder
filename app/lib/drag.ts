/** Sleduje pohyb myši, kým sa tlačidlo nepustí. Listenery sú na okne, takže ťahanie funguje aj mimo prvku. */
export function trackDrag(onMove: (ev: MouseEvent) => void) {
  const up = () => {
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", up);
  };
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", up);
}
