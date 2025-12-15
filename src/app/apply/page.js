"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";

export default function Apply() {
  return (
    <div className="grid grid-flow-row w-full h-full gap-7 mt-25 p-5 md:px-35 lg:px-65">
      <div className="flex flex-col gap-4">
        <h2 className="font-syne text-3xl md:text-5xl lg:text-7xl font-bold">
          Rental Application
        </h2>
        <p className="text-neutral-600 px-3 py-0.5 rounded-full bg-neutral-400 border-2 border-neutral-500 w-fit">
          Updated November 2025
        </p>
      </div>
      <Form />
    </div>
  );
}

function Form() {
  const inputClass =
    "p-3 border border-neutral-700 rounded-lg bg-neutral-800 text-neutral-50 focus:outline-none focus:ring-2 focus:ring-(--branding-700)";

  const [formData, setFormData] = useState({});

  const handleChange = (e) => {
    const { name, value, type, files, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "file" ? files : type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Application Submitted:", formData);
  };

  return (
    <Card className="w-full max-w-5x1 mx-auto bg-neutral-800 shadow-xl p-8 rounded-2xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold text-neutral-50">Apply Now</h2>
          <p className="text-sm text-neutral-400">
            Secure application form — your information is encrypted and
            confidential.
          </p>
        </header>
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            name="ownerFirstName"
            placeholder="Principal Owner First Name"
            className={inputClass}
            required
          />
          <input
            name="ownerLastName"
            placeholder="Principal Owner Last Name"
            className={inputClass}
            required
          />
          <input
            name="partnerFirstName"
            placeholder="Partner First Name (if applicable)"
            className={inputClass}
          />
          <input
            name="partnerLastName"
            placeholder="Partner Last Name (if applicable)"
            className={inputClass}
          />
        </section>
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="email"
            name="email"
            placeholder="Email"
            className={inputClass}
            required
          />
          <input
            name="phone"
            placeholder="Phone"
            className={inputClass}
            required
          />
        </section>
        <section className="flex flex-col gap-4">
          <h3 className="font-bold text-neutral-200">Owner Address</h3>
          <input
            name="ownerAddress"
            placeholder="Street Address"
            className={inputClass}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input name="ownerCity" placeholder="City" className={inputClass} />
            <input
              name="ownerRegion"
              placeholder="Country / Region"
              className={inputClass}
            />
            <input
              name="ownerZip"
              placeholder="Zip / Postal Code"
              className={inputClass}
            />
          </div>
        </section>
        <section className="flex flex-col gap-4">
          <h3 className="font-bold text-neutral-200">Company Information</h3>
          <input
            name="companyName"
            placeholder="Company Name *"
            className={inputClass}
            required
          />
          <input
            name="companyAddress"
            placeholder="Street Address"
            className={inputClass}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              name="companyCity"
              placeholder="City"
              className={inputClass}
            />
            <input
              name="companyRegion"
              placeholder="Country / Region"
              className={inputClass}
            />
            <input
              name="companyZip"
              placeholder="Zip / Postal Code"
              className={inputClass}
            />
          </div>
        </section>
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            name="ein"
            placeholder="Federal Tax ID (EIN) *"
            className={inputClass}
            required
          />
          <input
            name="mcNumber"
            placeholder="MC Number *"
            className={inputClass}
            required
          />
          <input
            name="usdot"
            placeholder="USDOT Number *"
            className={inputClass}
            required
          />
        </section>

        <input
          name="rentalDuration"
          placeholder="Duration of Rental *"
          className={inputClass}
          required
        />
        <section className="flex flex-col gap-4">
          <h3 className="font-bold text-neutral-200">Required Documents</h3>
          {[
            "Utility Bill (1 of 2)",
            "Utility Bill (2 of 2)",
            "Driver License (Front)",
            "Driver License (Back)",
            "Tractor License Plate Photo",
          ].map((label, i) => (
            <label
              key={i}
              className="flex flex-col gap-1 text-sm text-neutral-400"
            >
              {label}
              <input
                type="file"
                name={`file_${i}`}
                onChange={handleChange}
                className={inputClass}
                required
              />
            </label>
          ))}
        </section>
        <section className="flex flex-col gap-4">
          <h3 className="font-bold text-neutral-200">Personal References</h3>
          {[1, 2, 3].map((n) => (
            <div key={n} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                name={`ref${n}Name`}
                placeholder={`Reference ${n} Name`}
                className={inputClass}
              />
              <input
                name={`ref${n}Phone`}
                placeholder={`Reference ${n} Phone`}
                className={inputClass}
              />
            </div>
          ))}
        </section>
        <section className="flex flex-col gap-2">
          <input
            name="ssn"
            placeholder="Social Security Number *"
            className={inputClass}
            required
          />
          <p className="text-xs text-neutral-400 leading-relaxed">
            Your SSN is collected for identity verification only and will not be
            used for credit approval. It is securely stored in accordance with
            our Privacy Policy.
          </p>
        </section>
        <section className="flex flex-col gap-4 text-sm text-neutral-300">
          <label className="flex gap-2">
            <input type="checkbox" name="ssnAuth" required />I authorize D1
            Trailers, LLC to securely store my SSN under the conditions
            described.
          </label>

          <label className="flex gap-2">
            <input type="checkbox" name="insurance" required />I agree to
            maintain Agreed Value insurance naming D1 Trailers, LLC as
            additional insured.
          </label>

          <label className="flex gap-2">
            <input type="checkbox" name="maintenance" required />I accept
            responsibility for all maintenance and inspections.
          </label>
        </section>
        <button
          type="submit"
          className="mt-4 bg-neutral-900 hover:bg-neutral-950 transition-colors text-neutral-50 py-4 rounded-xl font-bold text-lg"
        >
          Submit Application
        </button>
      </form>
    </Card>
  );
}
