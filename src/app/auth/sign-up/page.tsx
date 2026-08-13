import { SignUpForm } from "@/components/auth/SignUpForm";

export default function SignUpPage() {
  return (
    <main className="min-h-[70vh] bg-[#f3f6fb]">
      <div className="bg-[#0a2f6b] px-4 py-10 text-white sm:px-6">
        <div className="mx-auto w-full max-w-md">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Create Account
          </h1>
          <p className="mt-2 text-sm text-white/70">
            Book faster with your TicketPass customer profile.
          </p>
        </div>
      </div>
      <div className="mx-auto w-full max-w-md px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-[#0a2f6b]/10 bg-white p-6 shadow-sm sm:p-8">
          <SignUpForm />
        </div>
      </div>
    </main>
  );
}
