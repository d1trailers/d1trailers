import Card from "@/components/ui/Card";

export default function Login() {
  return (
    <div className="flex flex-col min-h-screen w-full h-full gap-7 p-5 md:px-35 lg:px-65 items-center justify-center">
      <Card className="w-full max-w-lg mx-auto bg-neutral-200 dark:bg-neutral-800 shadow-sm p-8 gap-15">
        <section className="flex flex-col gap-3">
          <h2 className="text-2xl font-bold text-neutral-950 dark:text-neutral-50">
            PORTAL LOGIN
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 text-balance">
            Access Your Portal Now.{" "}
            <span className="hidden md:inline">
              View your rental agreement, billing schedule, and trailer details.
            </span>
          </p>
        </section>
        <section className="flex flex-col gap-1">
          <input
            type="email"
            name="email"
            placeholder="Email"
            className="p-3 border border-neutral-700 rounded-lg bg-neutral-200 dark:bg-neutral-800 text-neutral-950 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-(--branding-700)"
            required
          />
          <button
            type="submit"
            className="mt-4 bg-neutral-900 hover:bg-neutral-950 transition-colors text-neutral-50 py-4 rounded-xl font-bold text-lg"
          >
            Access Portal
          </button>
        </section>
        <section className="flex flex-col gap-3 w-full text-center font-bold">
          <a>Already have a Stripe billing link?</a>
          <a>Need help accessing your portal?</a>
        </section>
      </Card>
    </div>
  );
}
