export default function Card({ children, className }) {
  return (
    <article className={`flex flex-col gap-5 p-5 rounded-2xl ${className}`}>
      {children}
    </article>
  );
}
