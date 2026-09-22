"use client";

import { useState } from "react";
import { Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

export type BusReviewValue = {
  rating: number;
  comment: string | null;
};

export function BusReviewForm({
  busId,
  busNumber,
  initial,
  onSaved,
}: {
  busId: string;
  busNumber: string;
  initial: BusReviewValue | null;
  onSaved: (review: BusReviewValue) => void;
}) {
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) {
      setError("Choose 1 to 5 stars.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/account/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ busId, rating, comment }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Could not save review.");
      }
      onSaved({ rating: json.data.rating, comment: json.data.comment });
      setMessage(initial ? "Review updated." : "Thanks for your review.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-4 rounded-lg border border-[#e6ebf2] bg-[#f8fafc] p-3"
    >
      <p className="text-xs font-medium text-[#0a2f6b]">
        {initial ? "Update your review" : "Rate this bus"} · {busNumber}
      </p>
      <div className="mt-2 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = n <= (hover || rating);
          return (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(n)}
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
              className={active ? "text-[#f5a623]" : "text-[#cbd5e1]"}
            >
              <Star className="size-5 fill-current" />
            </button>
          );
        })}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={500}
        rows={2}
        placeholder="How was the coach? (optional)"
        className="mt-2 w-full rounded-md border border-[#d7dee8] bg-white px-3 py-2 text-sm text-[#0a2f6b] outline-none focus:border-[#0a2f6b]"
      />
      {error ? <p className="mt-1 text-xs text-red-700">{error}</p> : null}
      {message ? <p className="mt-1 text-xs text-emerald-700">{message}</p> : null}
      <Button
        type="submit"
        disabled={saving}
        className="mt-2 h-9 bg-[#0a2f6b] text-white hover:bg-[#08305f]"
      >
        {saving ? (
          <Loader2 className="size-4 animate-spin" />
        ) : initial ? (
          "Update review"
        ) : (
          "Submit review"
        )}
      </Button>
    </form>
  );
}
