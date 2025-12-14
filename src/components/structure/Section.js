export default function Section({ className, children }) {
  return (
    <section
      className={`flex flex-col gap-5 p-5 md:px-15 lg:px-25 ${className}`}
    >
      {children}
    </section>
  );
}
