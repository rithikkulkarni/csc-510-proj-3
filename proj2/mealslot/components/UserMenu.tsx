"use client";

import React, { Fragment } from "react";
import { Menu, Transition } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import Link from "next/link";

type UserMenuProps = {
  userName?: string | null;
};

export default function UserMenu({ userName }: UserMenuProps) {
  const displayName = userName || "Guest";

  return (
    <div className="relative inline-block text-left">
      <Menu as="div" className="relative inline-block text-left">
        <div>
          <Menu.Button className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/90 px-4 py-1.5 text-sm font-medium text-neutral-800 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-neutral-300 hover:bg-white hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-rose-500 text-xs font-semibold text-white shadow-sm">
              {displayName.charAt(0).toUpperCase()}
            </span>
            <span className="hidden sm:inline">Hi, {displayName}</span>
            <ChevronDownIcon className="h-4 w-4 text-neutral-500" aria-hidden="true" />
          </Menu.Button>
        </div>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-120"
          enterFrom="transform scale-95 opacity-0"
          enterTo="transform scale-100 opacity-100"
          leave="transition ease-in duration-100"
          leaveFrom="transform scale-100 opacity-100"
          leaveTo="transform scale-95 opacity-0"
        >
          <Menu.Items className="absolute right-0 mt-2 w-52 origin-top-right rounded-xl border border-neutral-200 bg-white/95 shadow-lg ring-1 ring-black/5 focus:outline-none z-50">
            <div className="py-1 text-sm text-neutral-800">
              <Menu.Item>
                {({ active }) => (
                  <Link
                    href="/handler/sign-up"
                    className={`block px-4 py-2 ${
                      active ? "bg-neutral-50 text-neutral-900" : ""
                    }`}
                  >
                    My Account
                  </Link>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <Link
                    href="/saved-meals"
                    className={`block px-4 py-2 ${
                      active ? "bg-neutral-50 text-neutral-900" : ""
                    }`}
                  >
                    Saved Meals
                  </Link>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <Link
                    href="/preferences"
                    className={`block px-4 py-2 ${
                      active ? "bg-neutral-50 text-neutral-900" : ""
                    }`}
                  >
                    Dietary Preferences
                  </Link>
                )}
              </Menu.Item>
            </div>
          </Menu.Items>
        </Transition>
      </Menu>
    </div>
  );
}
