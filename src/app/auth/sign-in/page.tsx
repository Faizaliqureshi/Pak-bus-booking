import { SignInForm } from "@/components/auth/SignInForm";

export default function SignInPage() {
  return (
    <main className="min-h-[70vh] bg-[#f3f6fb]">
      <div className="bg-[#0a2f6b] px-4 py-10 text-white sm:px-6">
        <div className="mx-auto w-full max-w-md">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Sign In
          </h1>
          <p className="mt-2 text-sm text-white/70">
            Access your Ticketpass bookings and saved trips.
          </p>
        </div>
      </div>
      <div className="mx-auto w-full max-w-md px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-[#0a2f6b]/10 bg-white p-6 shadow-sm sm:p-8">
          <SignInForm />
        </div>
      </div>
    </main>
  );
}
