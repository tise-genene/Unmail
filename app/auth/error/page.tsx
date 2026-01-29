type Props = {
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
};

function getParam(
  params: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string | undefined {
  const value = params?.[key];
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function AuthErrorPage({ searchParams }: Props) {
  const resolved = searchParams ? await Promise.resolve(searchParams) : undefined;
  const error = getParam(resolved, "error") ?? "Unknown";
  const isCallbackLike = error.toLowerCase().includes("callback") || error.toLowerCase().includes("oauth");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Sign-in error</h1>
      <p className="text-sm text-muted-foreground">
        Error code: <span className="font-medium text-foreground">{error}</span>
      </p>

      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        <div className="font-medium text-foreground">Common fixes</div>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Ensure your Google OAuth consent screen is in Testing and your email is added under Test users.</li>
          <li>Confirm redirect URI includes: <span className="font-medium">http://localhost:3000/api/auth/callback/google</span></li>
          <li>Make sure <span className="font-medium">NEXTAUTH_URL</span> is <span className="font-medium">http://localhost:3000</span></li>
          <li>If using Supabase, ensure <span className="font-medium">DATABASE_URL</span> password is URL-encoded (no raw “?” or “#”).</li>
          {isCallbackLike ? (
            <li>
              If this is a timeout, check server-to-Google connectivity:
              {" "}
              <a className="underline" href="/api/debug/google" target="_blank" rel="noreferrer">
                /api/debug/google
              </a>
            </li>
          ) : null}
        </ul>
      </div>

      <p className="text-sm text-muted-foreground">
        Check your terminal logs for a “NextAuth error …” line with details.
      </p>
    </div>
  );
}
