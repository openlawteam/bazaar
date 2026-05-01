"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { REGEXP_ONLY_DIGITS } from "input-otp";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";

type OtpStartResponse = {
  ok: boolean;
  expiresAt?: string;
  devCode?: string;
  smsStatus?: "sent" | "demo" | "failed";
  error?: string;
};

type OtpVerifyResponse = {
  ok: boolean;
  error?: string;
  reason?: string;
};

function formatVerifyError(payload: OtpVerifyResponse): string {
  switch (payload.reason) {
    case "bad_code":
      return "That code didn't match. Double-check and try again.";
    case "expired":
      return "That code expired. Tap Back and request a new one.";
    case "too_many_attempts":
      return "Too many tries. Tap Back and request a new code.";
    case "no_code":
      return "We don't have a pending code for that number. Tap Back and request one.";
    default:
      return payload.error ?? "That code did not work. Try again.";
  }
}

export function AuthForm() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [smsStatus, setSmsStatus] = useState<OtpStartResponse["smsStatus"]>();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function startOtp() {
    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/auth/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phoneNumber }),
      });
      const payload = (await response.json()) as OtpStartResponse;
      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "Could not send a code. Check the phone number and try again.");
        return;
      }
      setDevCode(payload.devCode ?? null);
      setSmsStatus(payload.smsStatus);
      setStep("otp");
    });
  }

  function verifyOtp() {
    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phoneNumber, code }),
      });
      const payload = (await response.json()) as OtpVerifyResponse;
      if (!response.ok || !payload.ok) {
        setError(formatVerifyError(payload));
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <Card className="mx-auto w-full max-w-md border-black bg-white">
      <CardHeader>
        <div className="mb-2 inline-flex w-fit rounded-full border-2 border-black bg-[#e30613] px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-white">
          Demo pass
        </div>
        <CardTitle className="text-3xl font-black uppercase tracking-tight">Confirm your phone</CardTitle>
        <CardDescription className="font-semibold text-black/70">
          Phone auth is demo-only for now. Use the surfaced code to continue.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {step === "phone" ? (
          <div className="space-y-2">
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              inputMode="tel"
              placeholder="+15555550123"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Verification code</Label>
              <InputOTP
                maxLength={6}
                pattern={REGEXP_ONLY_DIGITS}
                value={code}
                onChange={setCode}
                containerClassName="justify-center"
              >
                <InputOTPGroup>
                  {Array.from({ length: 6 }).map((_, index) => (
                    <InputOTPSlot key={index} index={index} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            {devCode ? (
              <p className="rounded-2xl border-2 border-black bg-[#fff3a3] px-4 py-3 text-sm font-semibold text-black">
                {smsStatus === "demo" ? "Demo mode — use this code:" : "Dev code:"}{" "}
                <button
                  type="button"
                  className="font-mono text-foreground underline underline-offset-2 hover:opacity-70"
                  onClick={() => setCode(devCode)}
                >
                  {devCode}
                </button>
              </p>
            ) : null}
          </div>
        )}

        {error ? (
          <p className="rounded-2xl border-2 border-black bg-[#e30613] px-4 py-3 text-sm font-black text-white">
            {error}
          </p>
        ) : null}

        <div className="flex gap-2">
          {step === "otp" ? (
            <Button type="button" variant="outline" onClick={() => setStep("phone")} disabled={isPending}>
              Back
            </Button>
          ) : null}
          <Button
            type="button"
            className="flex-1"
            onClick={step === "phone" ? startOtp : verifyOtp}
            disabled={isPending || !phoneNumber || (step === "otp" && code.length < 4)}
          >
            {isPending ? "Working..." : step === "phone" ? "Text me a code" : "Verify and continue"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
