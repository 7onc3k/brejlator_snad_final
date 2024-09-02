import React from 'react';

export function NewsletterSignup() {
  return (
    <div className="bg-primary dark:bg-contrast dark:text-primary text-contrast p-6 rounded-lg">
      <h3 className="text-lg font-bold mb-4">Přihlaste se k odběru novinek</h3>
      <form className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="Váš email"
          className="p-2 rounded border border-gray-300"
        />
        <button
          type="submit"
          className="bg-contrast text-primary p-2 rounded hover:bg-primary hover:text-contrast transition"
        >
          Přihlásit se
        </button>
      </form>
    </div>
  );
}
