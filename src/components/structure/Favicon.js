import Link from "next/link";
import Image from "next/image";

export default function Favicon({
  href = "/",
  src = "/favicon.png",
  alt = "D1Trailers.com Favicon",
  className = "",
}) {
  return (
    <Link
      href={href}
      className={`contrast-100 lg:contrast-85 hover:contrast-100 transition-[filter] duration-300 ease-in-out ${className}`}
    >
      <Image src={src} alt={alt} width={100} height={100} />
    </Link>
  );
}
