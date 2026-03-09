export default function Card({ children, className }) {
  return (
    <article
      className={`surface-panel motion-fade flex flex-col gap-5 rounded-2xl p-5 ${className}`}
    >
      {children}
    </article>
  );
}
