import React, {useState} from 'react';

export function NewsletterSignup() {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    // Přidání typu pro 'e'
    e.preventDefault();
    console.log('Submitted email:', email); // Odstranění console.log
    // Zde můžete přidat logiku pro odeslání emailu na server
  };

  return (
    <div className="bg-primary dark:bg-contrast dark:text-primary text-contrast p-6 rounded-lg">
      <h3 className="text-lg font-bold mb-4">Přihlaste se k odběru novinek</h3>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Váš email"
          className="p-2 rounded border border-gray-300"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
