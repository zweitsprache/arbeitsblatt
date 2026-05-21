"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpRight, Loader2, ShieldCheck, TrendingUp } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SignupVerificationFlowProps = {
  locale: string;
  path: string;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object") {
    const message = "message" in error ? error.message : undefined;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

function isEmailVerificationError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const message = "message" in error ? error.message : undefined;
  return typeof message === "string" && /email\s+not\s+verified|verify\s+your\s+email/i.test(message);
}

function getNextPath(locale: string, searchParams: URLSearchParams) {
  const redirectTo = searchParams.get("next") ?? searchParams.get("redirectTo");

  if (redirectTo && redirectTo.startsWith("/")) {
    return redirectTo;
  }

  return `/${locale}/account/settings`;
}

function buildAuthHref(
  locale: string,
  path: string,
  options: {
    email?: string;
    nextPath?: string;
  } = {},
) {
  const params = new URLSearchParams();

  if (options.email) {
    params.set("email", options.email);
  }

  if (options.nextPath?.startsWith("/")) {
    params.set("next", options.nextPath);
  }

  const query = params.toString();
  return `/${locale}/auth/${path}${query ? `?${query}` : ""}`;
}

const authInputClassName =
  "h-12 rounded-xl border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 shadow-none focus-visible:border-[#98a2ff] focus-visible:ring-[#98a2ff]/35";

const authButtonClassName =
  "h-12 w-full rounded-xl bg-[#4254f4] text-sm font-semibold text-white shadow-[0_18px_36px_rgba(66,84,244,0.28)] hover:bg-[#3649ee]";

export function SignupVerificationFlow({ locale, path }: SignupVerificationFlowProps) {
  if (path === "sign-in") {
    return <SignInCard locale={locale} />;
  }

  if (path === "verify-email-code") {
    return <VerifyEmailCodeCard locale={locale} />;
  }

  return <SignUpCard locale={locale} />;
}

function AuthShell({
  locale,
  title,
  description,
  footer,
  children,
}: {
  locale: string;
  title: string;
  description: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const t = useTranslations("authFlow");

  return (
    <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center">
      <div className="w-full max-w-6xl overflow-hidden rounded-[32px] border border-white/80 bg-white shadow-[0_30px_90px_rgba(52,57,92,0.18)]">
        <div className="grid lg:min-h-[720px] lg:grid-cols-[minmax(0,0.88fr)_minmax(420px,1.12fr)]">
          <section className="flex items-center justify-center px-6 py-8 sm:px-10 lg:px-14 lg:py-12">
            <div className="flex w-full max-w-[360px] flex-col">
              <Link
                className="mb-10 inline-flex w-fit items-center gap-3 text-sm font-semibold text-slate-950"
                href={`/${locale}`}
              >
                <span className="flex size-11 items-center justify-center rounded-2xl bg-slate-950/[0.05] ring-1 ring-slate-200">
                  <Image
                    alt="Arbeitsblatt"
                    height={18}
                    src="/logo/arbeitsblatt_logo_icon.svg"
                    width={18}
                  />
                </span>
                <span>Arbeitsblatt</span>
              </Link>

              <div className="mb-8 space-y-3">
                <h1 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-[2rem]">
                  {title}
                </h1>
                <p className="text-sm leading-6 text-slate-500">{description}</p>
              </div>

              {children}

              {footer ? <div className="mt-7 border-t border-slate-100 pt-6">{footer}</div> : null}

              <p className="mt-auto pt-10 text-xs text-slate-400">2026 Arbeitsblatt. All rights reserved.</p>
            </div>
          </section>

          <aside className="relative hidden overflow-hidden bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.18),transparent_28%),linear-gradient(160deg,#4b58f4_0%,#4253f2_50%,#2e39c8_100%)] px-8 py-8 text-white lg:flex lg:flex-col lg:px-10 lg:py-10">
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.06),transparent_24%,transparent_74%,rgba(18,24,88,0.18))]" />

            <div className="relative max-w-sm space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.24em] text-white/80">
                <ShieldCheck className="size-4" />
                Secure workspace
              </div>
              <h2 className="max-w-xs text-4xl font-semibold leading-tight tracking-[-0.04em]">
                {t("heroTitle")}
              </h2>
              <p className="max-w-sm text-sm leading-6 text-white/80">{t("heroDescription")}</p>
            </div>

            <div className="relative mt-10 rounded-[28px] border border-white/20 bg-white/96 p-5 text-slate-900 shadow-[0_28px_70px_rgba(17,24,84,0.22)]">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Operations
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">Workspace overview</p>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-[#eef1ff] px-3 py-1 text-xs font-medium text-[#4254f4]">
                  <TrendingUp className="size-3.5" />
                  Live sync
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-slate-500">Completion</p>
                      <p className="mt-1 text-2xl font-semibold text-slate-950">85%</p>
                    </div>
                    <div className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                      +12.4%
                    </div>
                  </div>
                  <div className="mt-5 flex h-28 items-end gap-2">
                    <div className="h-10 flex-1 rounded-t-full bg-[#dbe0ff]" />
                    <div className="h-14 flex-1 rounded-t-full bg-[#c9d0ff]" />
                    <div className="h-12 flex-1 rounded-t-full bg-[#afb9ff]" />
                    <div className="h-20 flex-1 rounded-t-full bg-[#7e8dff]" />
                    <div className="h-24 flex-1 rounded-t-full bg-[#4254f4]" />
                    <div className="h-16 flex-1 rounded-t-full bg-[#6474ff]" />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Today</span>
                      <span>12 tasks</span>
                    </div>
                    <div className="mt-4 space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>Editing</span>
                          <span>78%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100">
                          <div className="h-2 w-[78%] rounded-full bg-[#4254f4]" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>Review</span>
                          <span>64%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100">
                          <div className="h-2 w-[64%] rounded-full bg-[#8f9aff]" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-950 p-4 text-white shadow-[0_16px_36px_rgba(15,23,42,0.18)]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-white/50">Capacity</p>
                        <p className="mt-2 text-2xl font-semibold">24.6 h</p>
                      </div>
                      <div className="flex size-12 items-center justify-center rounded-2xl bg-white/10">
                        <ArrowUpRight className="size-5" />
                      </div>
                    </div>
                    <p className="mt-4 text-sm text-white/65">Steady output across editors, reviews, and delivery.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-8 text-sm text-white/72">
              <span>Booking.com</span>
              <span>Google</span>
              <span>Spotify</span>
              <span>Stripe</span>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function SignInCard({ locale }: { locale: string }) {
  const t = useTranslations("authFlow");
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = getNextPath(locale, searchParams);
  const signUpHref = useMemo(
    () => buildAuthHref(locale, "sign-up", { nextPath }),
    [locale, nextPath],
  );
  const forgotPasswordHref = useMemo(
    () => buildAuthHref(locale, "forgot-password", { nextPath }),
    [locale, nextPath],
  );
  const currentQuery = searchParams.toString();

  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim()) {
      setErrorMessage(t("emailRequired"));
      return;
    }

    if (!password) {
      setErrorMessage(t("passwordRequired"));
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await authClient.signIn.email({
        email: email.trim(),
        password,
        fetchOptions: { throw: true },
      });

      if (
        result &&
        typeof result === "object" &&
        "twoFactorRedirect" in result &&
        result.twoFactorRedirect
      ) {
        router.push(`/${locale}/auth/two-factor${currentQuery ? `?${currentQuery}` : ""}`);
        return;
      }

      router.replace(nextPath);
      router.refresh();
    } catch (error) {
      if (isEmailVerificationError(error)) {
        try {
          await authClient.emailOtp.sendVerificationOtp({
            email: email.trim(),
            type: "email-verification",
            fetchOptions: { throw: true },
          });
        } catch {
          // Ignore resend failures here and continue to the verification form.
        }

        const params = new URLSearchParams();
        params.set("email", email.trim());
        params.set("next", nextPath);
        router.push(`/${locale}/auth/verify-email-code?${params.toString()}`);
        return;
      }

      setErrorMessage(getErrorMessage(error, t("signInFailed")));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      description={t("signInDescription")}
      footer={
        <p className="text-sm text-slate-500">
          {t("noAccountYet")} {" "}
          <Link className="font-semibold text-[#4254f4] hover:text-[#3649ee]" href={signUpHref}>
            {t("createAccount")}
          </Link>
        </p>
      }
      locale={locale}
      title={t("signInTitle")}
    >
      <form className="grid gap-5" onSubmit={handleSubmit}>
        <div className="grid gap-2">
          <Label className="text-sm font-medium text-slate-700" htmlFor="sign-in-email">
            {t("email")}
          </Label>
          <Input
            autoComplete="email"
            className={authInputClassName}
            id="sign-in-email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t("emailPlaceholder")}
            type="email"
            value={email}
          />
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-4">
            <Label className="text-sm font-medium text-slate-700" htmlFor="sign-in-password">
              {t("password")}
            </Label>
            <Link className="text-xs font-semibold text-[#4254f4] hover:text-[#3649ee]" href={forgotPasswordHref}>
              {t("forgotPassword")}
            </Link>
          </div>
          <Input
            autoComplete="current-password"
            className={authInputClassName}
            id="sign-in-password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder={t("passwordPlaceholder")}
            type="password"
            value={password}
          />
        </div>

        {errorMessage ? <p className="text-sm font-medium text-rose-600">{errorMessage}</p> : null}

        <Button className={authButtonClassName} disabled={isSubmitting} type="submit">
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : t("backToSignIn")}
        </Button>
      </form>
    </AuthShell>
  );
}

function SignUpCard({ locale }: { locale: string }) {
  const t = useTranslations("authFlow");
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = getNextPath(locale, searchParams);
  const signInHref = useMemo(
    () => buildAuthHref(locale, "sign-in", { nextPath }),
    [locale, nextPath],
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim()) {
      setErrorMessage(t("emailRequired"));
      return;
    }

    if (!password) {
      setErrorMessage(t("passwordRequired"));
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage(t("passwordMismatch"));
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const callbackURL = `${window.location.origin}${nextPath}`;
      const result = await authClient.signUp.email({
        email: email.trim(),
        password,
        name: name.trim(),
        callbackURL,
        fetchOptions: { throw: true },
      });

      if ("token" in result && result.token) {
        router.replace(nextPath);
        router.refresh();
        return;
      }

      const params = new URLSearchParams();
      params.set("email", email.trim());
      params.set("next", nextPath);
      router.push(`/${locale}/auth/verify-email-code?${params.toString()}`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t("signUpFailed")));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      description={t("signUpDescription")}
      footer={
        <p className="text-sm text-slate-500">
          {t("alreadyHaveAccount")} {" "}
          <Link className="font-semibold text-[#4254f4] hover:text-[#3649ee]" href={signInHref}>
            {t("backToSignIn")}
          </Link>
        </p>
      }
      locale={locale}
      title={t("signUpTitle")}
    >
      <form className="grid gap-5" onSubmit={handleSubmit}>
        <div className="grid gap-2">
          <Label className="text-sm font-medium text-slate-700" htmlFor="sign-up-name">
            {t("name")}
          </Label>
          <Input
            autoComplete="name"
            className={authInputClassName}
            id="sign-up-name"
            onChange={(event) => setName(event.target.value)}
            placeholder={t("namePlaceholder")}
            value={name}
          />
        </div>
        <div className="grid gap-2">
          <Label className="text-sm font-medium text-slate-700" htmlFor="sign-up-email">
            {t("email")}
          </Label>
          <Input
            autoComplete="email"
            className={authInputClassName}
            id="sign-up-email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t("emailPlaceholder")}
            type="email"
            value={email}
          />
        </div>
        <div className="grid gap-2">
          <Label className="text-sm font-medium text-slate-700" htmlFor="sign-up-password">
            {t("password")}
          </Label>
          <Input
            autoComplete="new-password"
            className={authInputClassName}
            id="sign-up-password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder={t("passwordPlaceholder")}
            type="password"
            value={password}
          />
        </div>
        <div className="grid gap-2">
          <Label className="text-sm font-medium text-slate-700" htmlFor="sign-up-confirm-password">
            {t("confirmPassword")}
          </Label>
          <Input
            autoComplete="new-password"
            className={authInputClassName}
            id="sign-up-confirm-password"
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder={t("confirmPasswordPlaceholder")}
            type="password"
            value={confirmPassword}
          />
        </div>
        {errorMessage ? <p className="text-sm font-medium text-rose-600">{errorMessage}</p> : null}
        <Button className={authButtonClassName} disabled={isSubmitting} type="submit">
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : t("createAccount")}
        </Button>
      </form>
    </AuthShell>
  );
}

function VerifyEmailCodeCard({ locale }: { locale: string }) {
  const t = useTranslations("authFlow");
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const nextPath = getNextPath(locale, searchParams);
  const signInHref = useMemo(
    () => buildAuthHref(locale, "sign-in", { email, nextPath }),
    [email, locale, nextPath],
  );
  const changeEmailHref = useMemo(
    () => buildAuthHref(locale, "sign-up", { email, nextPath }),
    [email, locale, nextPath],
  );

  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [verifiedWithoutSession, setVerifiedWithoutSession] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email) {
      setErrorMessage(t("verificationEmailMissing"));
      return;
    }

    if (!code.trim()) {
      setErrorMessage(t("verificationCodeRequired"));
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      const result = await authClient.emailOtp.verifyEmail({
        email,
        otp: code.trim(),
        fetchOptions: { throw: true },
      });

      if (result.token) {
        router.replace(nextPath);
        router.refresh();
        return;
      }

      setVerifiedWithoutSession(true);
      setNoticeMessage(t("verificationSuccessNoSession"));
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t("verificationFailed")));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (!email) {
      setErrorMessage(t("verificationEmailMissing"));
      return;
    }

    setIsResending(true);
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
        fetchOptions: { throw: true },
      });
      setNoticeMessage(t("verificationCodeResent"));
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t("verificationResendFailed")));
    } finally {
      setIsResending(false);
    }
  }

  return (
    <AuthShell
      description={email ? t("verificationDescription", { email }) : t("verificationEmailMissing")}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <Link className="font-semibold text-[#4254f4] hover:text-[#3649ee]" href={changeEmailHref}>
            {t("changeEmail")}
          </Link>
          <Link className="font-semibold text-[#4254f4] hover:text-[#3649ee]" href={signInHref}>
            {t("backToSignIn")}
          </Link>
        </div>
      }
      locale={locale}
      title={t("verificationTitle")}
    >
      {verifiedWithoutSession ? (
        <div className="grid gap-4">
          <p className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {noticeMessage}
          </p>
          <Button asChild className={authButtonClassName}>
            <Link href={signInHref}>{t("continueToSignIn")}</Link>
          </Button>
        </div>
      ) : (
        <form className="grid gap-5" onSubmit={handleVerify}>
          <div className="grid gap-2">
            <Label className="text-sm font-medium text-slate-700" htmlFor="verification-code">
              {t("verificationCode")}
            </Label>
            <Input
              className={authInputClassName}
              id="verification-code"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => setCode(event.target.value)}
              placeholder={t("verificationCodePlaceholder")}
              value={code}
            />
            <p className="text-sm leading-6 text-slate-500">{t("verificationCodeHelp")}</p>
          </div>
          {errorMessage ? <p className="text-sm font-medium text-rose-600">{errorMessage}</p> : null}
          {noticeMessage ? (
            <p className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {noticeMessage}
            </p>
          ) : null}
          <Button className={authButtonClassName} disabled={isSubmitting} type="submit">
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : t("verifyCode")}
          </Button>
          <Button
            className="h-12 w-full rounded-xl border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            disabled={isResending}
            onClick={handleResend}
            type="button"
            variant="outline"
          >
            {isResending ? <Loader2 className="size-4 animate-spin" /> : t("resendCode")}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}