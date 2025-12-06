"use client";

import React, { Fragment } from "react";
import { Menu, Transition } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import Link from "next/link";

type UserMenuProps = {
  user: { name: string };  // required, no guests
  onSignOut: () => void;   // required
};

export default function UserMenu({ user, onSignOut }: UserMenuProps) {
  return (
    <div className="relative inline-block text-left">
      <Menu as="div" className="relative inline-block text-left">
        <Menu.Button className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[rgba(var(--card-border),0.9)] bg-[rgb(var(--card))] px-4 py-1.5 text-sm font-semibold text-[rgb(var(--fg))] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-[#E5623A]">
          Hi {user.name}
          <ChevronDownIcon className="h-4 w-4 text-[rgb(var(--muted))]" aria-hidden="true" />
        </Menu.Button>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-120"
          enterFrom="transform scale-95 opacity-0"
          enterTo="transform scale-100 opacity-100"
          leave="transition ease-in duration-100"
          leaveFrom="transform scale-100 opacity-100"
          leaveTo="transform scale-95 opacity-0"
        >
          <Menu.Items className="absolute right-0 mt-3 w-56 origin-top-right overflow-hidden rounded-xl border border-[rgba(var(--card-border),0.9)] bg-[rgb(var(--card))] shadow-2xl ring-1 ring-[rgba(var(--card-border),0.6)] backdrop-blur focus:outline-none z-50">
            <div className="py-2">
              {/* Account Setting */}
              <Menu.Item>
                {({ active }) => (
                  <Link
                    href="/account" // Updated to your AccountPage
                    className={`${active ? "bg-gradient-to-r from-brand-coral/10 to-brand-gold/10 text-brand-dusk" : "text-[rgb(var(--fg))]"} block px-4 py-2.5 text-sm font-medium`}
                  >
                    Account Setting
                  </Link>
                )}
              </Menu.Item>

              {/* Saved Meals */}
              <Menu.Item>
                {({ active }) => (
                  <Link
                    href="/favorites"
                    className={`${active ? "bg-gradient-to-r from-brand-coral/10 to-brand-gold/10 text-brand-dusk" : "text-[rgb(var(--fg))]"} block px-4 py-2.5 text-sm font-medium`}
                  >
                    Saved Meals
                  </Link>
                )}
              </Menu.Item>

              {/* Dietary Preferences
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
              </Menu.Item> */}

              {/* Sign Out */}
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={onSignOut}
                    className={`${active ? "bg-gradient-to-r from-red-50 to-amber-50" : ""} w-full text-left px-4 py-2.5 text-sm font-semibold text-red-600`}
                  >
                    Sign Out
                  </button>
                )}
              </Menu.Item>
            </div>
          </Menu.Items>
        </Transition>
      </Menu>
    </div>
  );
}
