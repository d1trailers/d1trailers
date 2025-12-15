import Card from "@/components/ui/Card";
import Image from "next/image";
import Link from "next/link";

export default function Portal() {
  const rentals = [
    {
      type: "Dry Van Trailer",
      plate: "TX-38472",
      date: "March 12, 2025",
      billing: "Monthly",
      status: "Active",
    },
    {
      type: "Dry Van Trailer",
      plate: "TX-38472",
      date: "March 12, 2025",
      billing: "Monthly",
      status: "Active",
    },
  ];

  const documents = [
    {
      name: "Rental Agreement",
      href: "",
    },
  ];

  return (
    <div className="grid grid-flow-row w-full h-full gap-7 mt-25 p-5 md:px-35 lg:px-65">
      <section className="flex flex-col gap-3">
        <p>Welcome,</p>
        <h3 className="font-bold text-3xl md:text-4xl lg:text-5xl">
          Acme Construction
        </h3>
        <div className="inline-flex gap-1 items-center w-fit bg-green-300 text-green-800 font-semibold text-sm px-4 py-1 rounded-full border-2 border-green-500 shadow-sm">
          <Image src="/Trailer.png" alt="Trailer Icon" width={32} height={32} />
          <span className="ml-2">2 Active Rentals</span>
        </div>
      </section>
      <section className="space-y-5">
        <h4 className="font-bold font-syne text-md md:text-lg lg:text-2xl">
          Rentals Overview
        </h4>
        <div className="flex flex-wrap gap-10 justify-start items-start">
          {rentals.map((rental, index) => (
            <RentalCard key={index} rental={rental} />
          ))}
        </div>
      </section>
      <section className="bg-neutral-100 dark:bg-neutral-800 rounded-2xl p-5 shadow-sm space-y-5">
        <div className="flex justify-between items-center">
          <h4 className="font-bold font-syne text-md md:text-lg lg:text-2xl text-neutral-900 dark:text-neutral-50">
            Billing Overview
          </h4>
          <div className="flex gap-7 font-semibold">
            <Link href="">Manage Billing</Link>
            <Link href="">Pay Now</Link>
          </div>
        </div>
        <Card className="w-full mx-auto bg-neutral-200 dark:bg-neutral-800 shadow-sm p-8 gap-5">
          <div className="flex justify-between">
            <span>Next Billing Date:</span>
            <span className="font-medium">April 12, 2025</span>
          </div>
          <div className="flex justify-between">
            <span>Amount Due:</span>
            <span className="font-semibold text-red-600 dark:text-red-400">
              $475.00
            </span>
          </div>
          <div className="flex justify-between">
            <span>Payment Method:</span>
            <span className="font-medium">Card on File</span>
          </div>
        </Card>
      </section>
      <section className="space-y-5">
        <h4 className="font-bold font-syne text-md md:text-lg lg:text-2xl">
          Your Documents
        </h4>
        <div className="flex flex-wrap gap-10 justify-start items-start">
          {documents.map((document, index) => (
            <DocumentCard key={index} document={document} />
          ))}
        </div>
      </section>
    </div>
  );
}

function DocumentCard({ document }) {
  return (
    <Card className="w-full max-w-lg bg-neutral-200 dark:bg-neutral-800 shadow-sm p-5 gap-5">
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 truncate">
        {document.name}
      </h3>
      <Link
        href={document.href}
        className="w-full h-40 flex items-center justify-center bg-neutral-300 dark:bg-neutral-700 rounded-lg overflow-hidden"
      >
        {document.preview ? (
          <Image
            src={document.preview}
            alt={document.name}
            width={160}
            height={160}
            className="object-contain"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-neutral-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span className="text-sm mt-2">No Preview</span>
          </div>
        )}
      </Link>

      {document.size && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Size: {document.size}
        </p>
      )}
      {document.type && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Type: {document.type}
        </p>
      )}
    </Card>
  );
}

function RentalCard({ rental }) {
  return (
    <Card className="w-full max-w-lg bg-neutral-200 dark:bg-neutral-800 shadow-sm p-5 gap-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 truncate">
          {rental.type}
        </h3>
        <span
          className={`px-3 py-1 rounded-full text-sm font-semibold border-2 ${
            rental.status === "Active"
              ? "bg-green-300 text-green-800 border-green-500"
              : "bg-gray-100 text-gray-800 border-gray-300"
          }`}
        >
          {rental.status}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Image
          src="/Trailer.png"
          alt="Trailer Icon"
          width={32}
          height={32}
          className="rounded-full p-1 bg-neutral-400"
        />
        <p className="font-medium text-neutral-700 dark:text-neutral-300">
          {rental.plate}
        </p>
      </div>
      <div className="flex gap-5 justify-between text-sm text-neutral-600 dark:text-neutral-400">
        <p>Rental Started: {rental.date}</p>
        <p>Billing: {rental.billing}</p>
      </div>
    </Card>
  );
}
