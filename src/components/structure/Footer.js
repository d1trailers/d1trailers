"use client";

import { EnvelopeIcon, PhoneIcon } from "@heroicons/react/20/solid";
import Link from "next/link";
import { useState } from "react";
import Card from "../ui/Card";

export default function Footer() {
  return (
    <footer className="bg-neutral-900 text-neutral-50 py-16 px-6 md:px-20 flex flex-col gap-12">
      <div className="flex flex-col md:flex-row gap-12 w-full justify-between items-start">
        <FooterColumn title="Contact Info">
          <div className="flex flex-col gap-3 mt-4 font-bold">
            <div className="flex items-center gap-3">
              <EnvelopeIcon className="w-5 h-5 text-brand" />
              <a href="tel:4693191226" className="hover:text-brand transition">
                469.319.1226
              </a>
            </div>
            <div className="flex items-center gap-3">
              <PhoneIcon className="w-5 h-5 text-brand" />
              <a
                href="mailto:inquiries@d1trailers.com"
                className="hover:text-brand transition"
              >
                inquiries@d1trailers.com
              </a>
            </div>
          </div>
        </FooterColumn>

        <FooterColumn title="Quick Links">
          <div className="flex flex-col gap-2 mt-4 font-bold">
            <Link href="about" className="hover:text-brand transition">
              About
            </Link>
            <Link href="policy" className="hover:text-brand transition">
              Policy
            </Link>
            <Link href="apply" className="hover:text-brand transition">
              Apply
            </Link>
            <Link href="" className="hover:text-brand transition">
              Site Map
            </Link>
          </div>
        </FooterColumn>

        <FooterColumn title="Get In Touch">
          <div className="mt-4">
            <FooterCard />
          </div>
        </FooterColumn>
      </div>

      <p className="w-full text-center text-neutral-400 mt-8 text-sm md:text-base">
        &copy; {new Date().getFullYear()}{" "}
        <span className="font-syne italic font-bold">RHE ENTERPRISES</span>, LLC
      </p>
    </footer>
  );
}

function FooterColumn({ title, children }) {
  return (
    <section className="flex flex-col w-full md:w-1/3">
      <h3 className="font-bold text-lg border-b-2 border-neutral-700 pb-2">
        {title}
      </h3>
      {children}
    </section>
  );
}

function FooterCard() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    duration: "",
    typeOfUse: "Transport",
    phone: "",
    companyName: "",
    referral: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form Submitted:", formData);
  };

  return (
    <Card className="w-full shadow-lg bg-neutral-800 p-6 rounded-xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            placeholder="First Name"
            className="p-3 border border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-(--branding-700)"
            required
          />
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            placeholder="Last Name"
            className="p-3 border border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-(--branding-700)"
            required
          />
        </div>

        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Email"
          className="p-3 border border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-(--branding-700)"
          required
        />

        <input
          type="text"
          name="duration"
          value={formData.duration}
          onChange={handleChange}
          placeholder="Duration of Rental * Required"
          className="p-3 border border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-(--branding-700)"
          required
        />

        <select
          name="typeOfUse"
          value={formData.typeOfUse}
          onChange={handleChange}
          className="p-3 border border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand bg-neutral-800 text-neutral-50"
          required
        >
          <option value="Transport">Transport / On Road Use</option>
          <option value="Storage">Storage</option>
        </select>

        <input
          type="text"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="Phone"
          className="p-3 border border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-(--branding-700)"
        />

        <input
          type="text"
          name="companyName"
          value={formData.companyName}
          onChange={handleChange}
          placeholder="Company Name"
          className="p-3 border border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-(--branding-700)"
        />

        <input
          type="text"
          name="referral"
          value={formData.referral}
          onChange={handleChange}
          placeholder="How did you hear about us?"
          className="p-3 border border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-(--branding-700)"
        />

        <button
          type="submit"
          className="bg-neutral-900 text-neutral-50 py-3 rounded-lg hover:bg-neutral-950 transition-colors duration-200 font-bold"
        >
          Submit
        </button>
      </form>
    </Card>
  );
}
