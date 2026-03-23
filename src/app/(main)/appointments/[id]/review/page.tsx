"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import IconStar from "@/components/icon/icon-star";
import IconLoader from "@/components/icon/icon-loader";
import IconSend from "@/components/icon/icon-send";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function ReviewPage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = params.id as string;

  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("يرجى اختيار تقييم");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId, rating, comment }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("شكراً! تم إرسال تقييمك بنجاح");
        router.push("/dashboard/patient");
      } else {
        toast.error(data.error || "حدث خطأ");
      }
    } catch {
      toast.error("حدث خطأ، يرجى المحاولة مجدداً");
    } finally {
      setLoading(false);
    }
  };

  const ratingLabels = ["", "سيء", "مقبول", "جيد", "جيد جداً", "ممتاز"];

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <Card className="border-0 shadow-xl">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl">قيّم تجربتك</CardTitle>
          <p className="text-gray-500 text-sm mt-1">
            مشاركتك تساعد المرضى الآخرين في اختيار الطبيب المناسب
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Star Rating */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <IconStar
                    className={`h-10 w-10 transition-colors ${
                      star <= (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>
            {(hoveredRating || rating) > 0 && (
              <p className="text-lg font-semibold text-gray-700">
                {ratingLabels[hoveredRating || rating]}
              </p>
            )}
          </div>

          {/* Comment */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              تعليقك (اختياري)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="شارك تجربتك مع هذا الطبيب..."
              rows={4}
              className="w-full border border-gray-300 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              maxLength={500}
            />
            <p className="text-xs text-gray-400 text-left mt-1">
              {comment.length}/500
            </p>
          </div>

          <Button
            onClick={handleSubmit}
            className="w-full"
            size="lg"
            disabled={loading || rating === 0}
          >
            {loading ? (
              <>
                <IconLoader className="h-4 w-4 animate-spin" />
                جاري الإرسال...
              </>
            ) : (
              <>
                <IconSend className="h-4 w-4" />
                إرسال التقييم
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
