export default function Footer() {
  return (
    <footer className="bg-(--branding-800) h-25 w-full flex items-center">
      <p className="w-full text-center">
        Copyright ©<span>{new Date().getFullYear()}</span>{" "}
        <span className="font-syne italic font-bold">RHE ENTERPRISES</span>, LLC
      </p>
    </footer>
  );
}
