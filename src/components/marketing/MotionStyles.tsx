// Keyframes for the few events the landing page animates: a check landing, a value updating,
// an incident record appearing. Reduced motion turns all of them off.
export function MotionStyles() {
  return (
    <style>{`
@keyframes rhq-land { 0% { opacity: 0; transform: scaleY(0.3); } 100% { opacity: 1; transform: scaleY(1); } }
@keyframes rhq-flash { 0% { background-color: color-mix(in srgb, var(--foreground) 16%, transparent); } 100% { background-color: transparent; } }
@keyframes rhq-rise { 0% { opacity: 0; transform: translateY(4px); } 100% { opacity: 1; transform: none; } }
.rhq-land { animation: rhq-land 0.4s ease-out both; transform-origin: bottom; }
.rhq-flash { animation: rhq-flash 1.4s ease-out both; }
.rhq-rise { animation: rhq-rise 0.45s ease-out both; }
@media (prefers-reduced-motion: reduce) {
  .rhq-land, .rhq-flash, .rhq-rise { animation: none; }
}
`}</style>
  );
}
