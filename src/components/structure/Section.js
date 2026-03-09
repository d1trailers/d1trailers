export default function Section({ className, children }) {
  return (
    <section
      className={`motion-enter flex flex-col gap-6 p-5 md:px-15 lg:px-25 ${className}`}
    >
      {children}
    </section>
  );
}
