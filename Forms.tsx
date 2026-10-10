"use client";
import { useActionState } from "react";
import Link from "next/link";
import { signInAction, signUpAction, forgotPasswordAction, resetPasswordAction, type FormState } from "@/app/auth/actions";
import { Field, Submit, Msg, Divider, GoogleButton, googleEnabled } from "./AuthUI";

const init: FormState = {};
const link = "font-medium text-[#8a6d35] underline underline-offset-2 hover:text-neutral-900";

export function LoginForm({ next, notice }: { next: string; notice?: string }) {
  const [s, action] = useActionState(signInAction, init);
  return (
    <>
      {notice && <Msg>{notice}</Msg>}
      {googleEnabled && <><GoogleButton label="Sign In with Google" next={next} /><Divider /></>}
      <form action={action} noValidate>
        <input type="hidden" name="next" value={next} />
        {s.message && <Msg>{s.message}</Msg>}
        <Field id="email" label="Email address" type="email" autoComplete="email" error={s.errors?.email} />
        <Field id="password" label="Password" type="password" autoComplete="current-password" error={s.errors?.password} />
        <div className="mb-5 flex items-center justify-between gap-3 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" name="remember" defaultChecked className="h-4 w-4" /> Remember me</label>
          <Link href="/forgot-password" className={link}>Forgot Password?</Link>
        </div>
        <Submit>Log In</Submit>
      </form>
      <p className="mt-5 text-center text-sm text-neutral-700">Don&apos;t have an account? <Link href="/signup" className={link}>Sign Up</Link></p>
    </>
  );
}

export function SignUpForm() {
  const [s, action] = useActionState(signUpAction, init);
  if (s.ok) return <Msg ok>{s.message}</Msg>;
  return (
    <>
      {googleEnabled && <><GoogleButton label="Sign Up with Google" next="/journal" /><Divider /></>}
      <form action={action} noValidate>
        {s.message && <Msg>{s.message}</Msg>}
        <div className="grid gap-x-3 sm:grid-cols-2">
          <Field id="firstName" label="First name" autoComplete="given-name" error={s.errors?.firstName} />
          <Field id="lastName" label="Last name" autoComplete="family-name" error={s.errors?.lastName} />
        </div>
        <Field id="email" label="Email address" type="email" autoComplete="email" error={s.errors?.email} />
        <Field id="password" label="Password (min. 8 characters)" type="password" autoComplete="new-password" error={s.errors?.password} />
        <Field id="confirmPassword" label="Confirm password" type="password" autoComplete="new-password" error={s.errors?.confirmPassword} />
        <Submit>Create account</Submit>
      </form>
      <p className="mt-5 text-center text-sm text-neutral-700">Already have an account? <Link href="/login" className={link}>Log In</Link></p>
    </>
  );
}

export function ForgotForm() {
  const [s, action] = useActionState(forgotPasswordAction, init);
  return (
    <>
      {s.ok && <Msg ok>{s.message}</Msg>}
      <form action={action} noValidate>
        {s.message && !s.ok && <Msg>{s.message}</Msg>}
        <Field id="email" label="Email address" type="email" autoComplete="email" error={s.errors?.email} />
        <Submit>Send reset link</Submit>
      </form>
      <p className="mt-5 text-center text-sm"><Link href="/login" className={link}>Back to Log In</Link></p>
    </>
  );
}

export function ResetForm() {
  const [s, action] = useActionState(resetPasswordAction, init);
  return (
    <form action={action} noValidate>
      {s.message && <Msg>{s.message}</Msg>}
      <Field id="password" label="New password (min. 8 characters)" type="password" autoComplete="new-password" error={s.errors?.password} />
      <Field id="confirmPassword" label="Confirm new password" type="password" autoComplete="new-password" error={s.errors?.confirmPassword} />
      <Submit>Update password</Submit>
    </form>
  );
}
