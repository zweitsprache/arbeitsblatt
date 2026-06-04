"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Heart, Loader2 } from "lucide-react";
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

  return `/${locale}`;
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
  "h-12 rounded-[4px] border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 shadow-none focus-visible:border-[#98a2ff] focus-visible:ring-[#98a2ff]/35";

const authButtonClassName =
  "h-12 w-full rounded-[4px] bg-[#c8553d] text-sm font-semibold text-white hover:bg-[#b14a34]";

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
  title?: string;
  description?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const t = useTranslations("authFlow");

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_2fr]">
      <section className="flex items-center justify-center px-6 py-8 sm:px-10 lg:px-14 lg:py-12">
        <div className="flex w-full max-w-[420px] flex-col">
          <Link
            className="mb-10 inline-flex w-fit items-center text-sm font-semibold text-slate-950"
            href={`/${locale}`}
          >
            <Image
              alt="eduit"
              height={36}
              src="/logo/eduitr_logo.svg"
              width={157}
              priority
            />
          </Link>

          {title || description ? (
            <div className="mb-8 space-y-3">
              {title ? (
                <h1 className="text-3xl font-semibold text-slate-950 sm:text-[2rem]">
                  {title}
                </h1>
              ) : null}
              {description ? (
                <p className="text-sm leading-6 text-slate-500">{description}</p>
              ) : null}
            </div>
          ) : null}

          {children}

          {footer ? <div className="mt-7 border-t border-slate-100 pt-6">{footer}</div> : null}

          <p className="mt-10 text-xs text-slate-400">2026 Arbeitsblatt. All rights reserved.</p>
        </div>
      </section>

      <aside className="relative hidden bg-[#2b2b43] px-12 py-12 text-white lg:flex lg:flex-col lg:px-24 lg:py-20">
        <div className="relative flex flex-1 flex-col justify-center">
          <div className="relative w-full overflow-hidden rounded-[4px] border border-white/20 shadow-[0_28px_70px_rgba(17,24,84,0.22)]">
            <Image
              alt="Arbeitsblatt"
              className="h-auto w-full"
              height={900}
              src="/key_visuals/arbeitsblatt.png"
              width={1200}
            />
            <div className="absolute inset-x-12 bottom-20 rounded-[4px] bg-white/40 px-8 py-6 backdrop-blur-md">
              <h2 className="text-5xl font-medium leading-tight text-slate-950 lg:text-6xl">
                {t.rich("heroTitle", {
                  br: () => <br />,
                  strong: (chunks) => (
                    <span className="font-extrabold text-[#c8553d]">{chunks}</span>
                  ),
                })}
              </h2>
            </div>
          </div>

          <div className="mt-8 grid w-full grid-cols-3 gap-3">
            {[
              { value: "4", label: "Ausgabeformate" },
              { value: "43", label: "Inhaltselement" },
              { value: "XY", label: "Lorem ipsum" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-[4px] border border-white/15 bg-white/5 px-4 py-4 text-center"
              >
                <p className="text-3xl font-extrabold text-white">{stat.value}</p>
                <p className="mt-1 text-xs text-white/70">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mt-10 inline-flex w-full items-center justify-start gap-2 text-xs font-medium uppercase text-white">
          Made in Switzerland with <Heart className="size-4 fill-current" />
        </div>
      </aside>
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
      footer={
        <p className="text-sm text-slate-500">
          {t("noAccountYet")} {" "}
          <Link className="font-semibold text-[#c8553d] hover:text-[#b14a34]" href={signUpHref}>
            {t("createAccount")}
          </Link>
        </p>
      }
      locale={locale}
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
            <Link className="text-xs font-semibold text-[#c8553d] hover:text-[#b14a34]" href={forgotPasswordHref}>
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
          <Link className="font-semibold text-[#c8553d] hover:text-[#b14a34]" href={signInHref}>
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
          <Link className="font-semibold text-[#c8553d] hover:text-[#b14a34]" href={changeEmailHref}>
            {t("changeEmail")}
          </Link>
          <Link className="font-semibold text-[#c8553d] hover:text-[#b14a34]" href={signInHref}>
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