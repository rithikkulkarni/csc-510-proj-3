import { getUserDetails } from "./actions";
import { client } from "../stack/client";
import Link from "next/link";
import Image from "next/image";

export async function Header() {
  const user = await client.getUser();
  const app = client.urls;
  const userProfile = await getUserDetails(user?.id);

  return (
    <header className="w-full border-b border-neutral-200/70 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Left: logo */}
        <div className="flex items-center gap-2">
          <Image
            src="/neon.svg"
            alt="Neon logo"
            width={102}
            height={28}
            priority
          />
        </div>

        {/* Right: user / auth */}
        {user ? (
          <div className="flex items-center gap-4">
            <span className="inline-flex h-8 flex-col items-end justify-center">
              {userProfile?.name && (
                <span className="text-[13px] font-medium text-neutral-700">
                  {`Hello, ${userProfile.name.split(" ")[0]}`}
                </span>
              )}
              <Link
                href={app.signOut}
                className="text-[11px] text-neutral-500 underline underline-offset-2 hover:text-neutral-700 hover:no-underline"
              >
                Sign Out
              </Link>
            </span>

            {userProfile?.raw_json.profile_image_url && (
              <Image
                src={userProfile.raw_json.profile_image_url}
                alt="User avatar"
                width={32}
                height={32}
                className="rounded-full border border-neutral-200 shadow-sm"
              />
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              href={app.signIn}
              className="inline-flex h-8 items-center justify-center rounded-full border border-neutral-200 bg-white px-4 text-[13px] font-medium text-neutral-700 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-neutral-300 hover:bg-neutral-50"
            >
              Log In
            </Link>
            <Link
              href={app.signUp}
              className="inline-flex h-8 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-rose-500 px-6 text-[13px] font-medium text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
