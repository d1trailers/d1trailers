"use client";

import { useState, useEffect } from "react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/20/solid";
import Link from "next/link";
import Image from "next/image";
import Favicon from "./Favicon";

export default function Header() {
  const [active, setActive] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const handleScrollEvent = () => setActive(window.scrollY > 0);
    window.addEventListener("scroll", handleScrollEvent);
    handleScrollEvent();
    return () => window.removeEventListener("scroll", handleScrollEvent);
  }, []);

  return (
    <header
      className={`fixed inset-0 z-50 w-full overflow-hidden transition-[height_backdrop] duration-750 border-b-4 md:border-none
			${
        expanded
          ? "h-85 md:h-25 md:backdrop-blur-none backdrop-blur-sm border-(--branding-700) dark:border-neutral-50"
          : "h-25 backdrop-blur-none border-none"
      }

			${
        active
          ? "bg-(--branding-700) border-transparent dark:border-none text-neutral-50"
          : "bg-transparent"
      }
			`}
    >
      <section className="flex w-full h-25 items-center justify-between px-5 md:px-15 lg:px-25">
        <Favicon />
        <nav className="hidden md:flex gap-10">
          <HeaderNavigator />
        </nav>
        <HeaderMenu expanded={expanded} setExpanded={setExpanded} />
      </section>
      <nav
        className={`${
          expanded
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        } will-change-[opacity] transition-opacity duration-750 ease-out md:hidden flex flex-col justify-end px-5 h-fit`}
        aria-hidden={!expanded}
      >
        <HeaderNavigator />
      </nav>
    </header>
  );
}

function HeaderMenu({ expanded, setExpanded }) {
  return (
    <button
      onClick={() => setExpanded((expanded) => !expanded)}
      className="block md:hidden"
      aria-expanded={expanded}
      aria-label={expanded ? "Close menu" : "Open menu"}
    >
      {expanded ? (
        <XMarkIcon className="w-5 h-5" aria-hidden="true" />
      ) : (
        <Bars3Icon className="w-5 h-5" aria-hidden="true" />
      )}
    </button>
  );
}

function HeaderNavigator() {
  const menuItems = [
    { label: "HOME", href: "/" },
    { label: "CONTACT", href: "/" },
    { label: "ABOUT", href: "/" },
    { label: "POLICY", href: "/" },
    { label: "PORTAL", href: "/" },
  ];

  return (
    <>
      {menuItems.map(({ label, href }) => (
        <div
          key={label}
          className="p-2 font-syne font-bold text-lg dark:text-neutral-50"
        >
          <HeaderItem href={href} label={label} />
        </div>
      ))}
    </>
  );
}

function HeaderItem({ label, href }) {
  return (
    <Link
      href={href}
      className={
        "relative text-lg font-bold text-neutral-50 after:block after:h-0.5 after:w-0 after:bg-current after:transition-all after:duration-750 hover:md:after:w-full"
      }
    >
      {label}
    </Link>
  );
}
