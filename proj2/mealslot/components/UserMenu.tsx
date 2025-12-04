"use client";

import { Fragment } from "react";
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
        <Menu.Button className="inline-flex w-full justify-center rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
          Hi {user.name}
          <ChevronDownIcon className="ml-2 h-5 w-5" aria-hidden="true" />
        </Menu.Button>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
            <div className="py-1">
              {/* Account Setting */}
              <Menu.Item>
                {({ active }) => (
                  <Link
                    href="/account" // Updated to your AccountPage
                    className={`${active ? "bg-gray-100" : ""} block px-4 py-2 text-sm text-gray-700`}
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
                    className={`${active ? "bg-gray-100" : ""} block px-4 py-2 text-sm text-gray-700`}
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
                    className={`${active ? "bg-gray-100" : ""} block px-4 py-2 text-sm text-gray-700`}
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
                    className={`${active ? "bg-gray-100" : ""} w-full text-left px-4 py-2 text-sm text-red-600`}
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
