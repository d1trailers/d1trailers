"use client";

import Section from "@/components/structure/Section";
import Card from "@/components/ui/Card";
import Image from "next/image";
import { XMarkIcon } from "@heroicons/react/20/solid";
import { useState } from "react";

export default function Home() {
  return (
    <div className="grid grid-flow-row h-full gap-7">
      <section className="relative w-full h-[50vh] md:h-[65vh] lg:h-[75vh]">
        <Image
          src="/banner-alternate.png"
          alt="Banner photo"
          fill
          className="object-cover"
          style={{
            WebkitMaskImage:
              "linear-gradient(to bottom, white 70%, transparent 100%)",
            maskImage:
              "linear-gradient(to bottom, white 70%, transparent 100%)",
            filter: "brightness(0.80) contrast(1.2)",
          }}
          priority
        />
        <div className="flex flex-col absolute top-1/2 w-full px-5 md:px-15 lg:px-25 text-neutral-50">
          <h1
            className="w-full text-center scale-y-85 font-extrabold font-syne text-3xl md:text-7xl lg:text-9xl"
            style={{
              textShadow: `
                0 1px 0 var(--branding-700),
                0 2px 0 var(--branding-700),
                0 3px 0 var(--branding-700),
                0 4px 0 var(--branding-700),
                0 5px 0 var(--branding-700)
              `,
            }}
          >
            D1TRAILERS
          </h1>
          <h2 className="w-full text-center font-sarina text-md md:text-lg lg:text-2xl ">
            Affordable Dry Van Rentals
          </h2>
        </div>
      </section>
      <Section>
        <h3 className="font-syne font-bold text-lg md:text-2x1 lg:text-3xl">
          OUR SERVICES
        </h3>
        <p>
          We lease a variety of dry vans for storage and transportation. Our
          trailers are designed for safety, efficiency, and reliability, whether
          you’re transporting goods locally or across the country. Each trailer
          is meticulously maintained to ensure optimal performance and
          compliance with all safety regulations.
        </p>
        <p>
          We offer flexible rental terms to fit your schedule, competitive
          pricing, and personalized customer support, so you can focus on your
          business while we take care of your transportation needs. From small
          shipments to large-scale logistics,{" "}
          <span className="font-syne font-bold">D1Trailers</span> is your
          trusted partner for secure and dependable trailer leasing.
        </p>
        <div className="flex flex-col gap-4 md:gap-6 mt-4">
          <ServiceCard
            key="53' Dry Vans"
            name="53' Dry Vans"
            cost="Inquire For Pricing"
            imageSrc="/Trailer.png"
            info="Perfect for long-distance transport and storage. The 53' dry van is the most common truckload trailer on the road. Dry van trailers are fully enclosed boxes designed to transport a wide range of freight safely and securely."
          />
        </div>
      </Section>
      <Section>
        <h3 className="font-syne font-bold text-lg md:text-2x1 lg:text-3xl">
          FREQUENTLY ASKED QUESTIONS
        </h3>
        <div className="flex flex-col gap-5">
          <QuestionCard title="What are the requirements to rent?">
            <div className="flex flex-col gap-5 justify-start text-left">
              <p>
                To rent a dry van from{" "}
                <span className="font-syne font-bold">D1Trailers</span>, you
                need property damage insurance to cover any potential loss or
                theft. A fully refundable deposit is also required, which will
                be returned if the equipment is in good condition upon return.
              </p>
              <p>
                Additionally, there is a minimum rental period of 3 months to
                ensure you have ample time to use the trailer effectively. These
                steps help us provide a reliable and secure service for all our
                clients.
              </p>
            </div>
          </QuestionCard>
          <QuestionCard title="What does the rental agreement include?">
            <div className="flex flex-col gap-5 justify-start text-left">
              <p>
                Our rental agreement includes trailers with DOT-ready tires and
                brakes for safety and compliance. During the rental period, you
                are responsible for maintaining the trailer, including any
                repairs or maintenance.
              </p>
              <p>
                If you encounter an issue you can't fix, our team will handle
                it, and the cost will be passed on to you. This way, you can
                focus on your needs while we ensure your rental remains
                functional and safe.
              </p>
            </div>
          </QuestionCard>
          <QuestionCard title="How quickly can I rent a trailer, and what is the process?">
            <div className="flex flex-col gap-5 justify-start text-left">
              <p>
                You can rent a trailer from{" "}
                <span className="font-syne font-bold">D1Trailers</span> within
                48 hours! Simply complete an application, and our compliance
                team will review it promptly. Once approved, we'll contact you
                to arrange a convenient time to meet and secure your unit. Our
                streamlined process ensures a quick and hassle-free experience.
              </p>
            </div>
          </QuestionCard>
          <QuestionCard title="What payment methods are accepted?">
            <div className="flex flex-col gap-5 justify-start text-left">
              <p>
                We accept credit card, cash, and Apple Pay for your convenience.
              </p>
            </div>
          </QuestionCard>{" "}
          <QuestionCard title="Do you offer any discounts for long-term rentals?">
            <div className="flex flex-col gap-5 justify-start text-left">
              <p>
                Yes, we offer competitive discounts for long-term rentals.
                Please contact our supprot team for morre details.
              </p>
            </div>
          </QuestionCard>
          <QuestionCard title="What should I do if I encounter an issue with the trailer?">
            <div className="flex flex-col gap-5 justify-start text-left">
              <p>
                If you encounter any issues with the trailer durring the rental
                period, please contact our support team immediately. We will
                assist you in resolving ther problem as quickly as possible.
              </p>
            </div>
          </QuestionCard>
        </div>
      </Section>
    </div>
  );
}

function QuestionCard({ title, children }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className="group bg-neutral-50 dark:bg-neutral-700 dark:hover:bg-neutral-800 hover:bg-neutral-100 ease-in-out shadow-sm p-5 rounded-2xl hover:shadow-md transition-[shadow_colors] duration-300 w-full text-left"
    >
      <div
        className="w-full flex flex-row justify-between items-start border-b-4 pb-4 gap-5"
        style={{ borderColor: "var(--branding-600)" }}
      >
        <h4 className="flex-1 uppercase font-semibold">{title}</h4>
        <div className="shrink-0 flex items-center">
          <XMarkIcon
            className={`w-6 h-6 transform transition-transform duration-300 origin-center ${
              expanded ? "rotate-0" : "rotate-45"
            }`}
          />
        </div>
      </div>
      <div
        className={`w-full overflow-hidden transition-[height_opacity_margin] duration-300 ease-in-out text-neutral-300
    ${expanded ? "max-h-screen opacity-100 mt-5" : "max-h-0 opacity-0 mt-0 "}`}
      >
        <div className="text-neutral-600 dark:text-neutral-400 leading-snug flex flex-col gap-2 mt-2 bg-neutral-50 dark:bg-neutral-800 group-hover:dark:bg-neutral-900 p-3 rounded-lg shadow-inner transition-colors duration-300">
          {children}
        </div>
      </div>
    </button>
  );
}

function ServiceCard({ name, cost, imageSrc, info }) {
  return (
    <Card className="group bg-neutral-50 dark:bg-neutral-700 p-4 md:p-6 rounded-2xl shadow-sm flex flex-col gap-4 hover:shadow-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-[shadow_colors] duration-300">
      <div
        className="flex items-center gap-4 md:gap-6 border-b-4 pb-4"
        style={{ borderColor: "var(--branding-600)" }}
      >
        <div className="relative w-12 h-12 rounded-full overflow-hidden bg-(--branding-300) shadow-inner">
          <Image
            src={imageSrc}
            alt={`${name} Image`}
            fill
            className="object-contain p-1"
            priority
          />
        </div>
        <h4 className="text-lg md:text-2xl font-bold uppercase font-syne text-foreground">
          {name}
        </h4>
      </div>
      <div className="flex flex-col gap-2 mt-2 bg-neutral-50 dark:bg-neutral-800 group-hover:dark:bg-neutral-900 p-3 rounded-lg shadow-inner transition-colors duration-300">
        {cost && (
          <span className="text-neutral-800 dark:text-neutral-100 font-semibold">
            {cost}
          </span>
        )}
        {info && (
          <p className=" text-balance text-neutral-600 dark:text-neutral-400 leading-snug">
            {info}
          </p>
        )}
      </div>
    </Card>
  );
}
