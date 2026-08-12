import { WalletClient } from "@/components/account/WalletClient";

export default function WalletPage() {
  return (
    <main className="min-h-[70vh] bg-[#eef2f7]">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <WalletClient />
      </div>
    </main>
  );
}
