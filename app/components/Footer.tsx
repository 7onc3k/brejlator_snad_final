import { Disclosure } from '@headlessui/react';
import React, { Suspense } from 'react';
import { useShop } from '@shopify/hydrogen-react';
import { FaInstagram, FaTiktok } from 'react-icons/fa';

import {Link} from '~/components/Link';
import {Text, Heading, Section} from '~/components/Text';
import {IconCaret} from '~/components/Icon';
import {
  type EnhancedMenu,
  type ChildEnhancedMenuItem,
  useIsHomePath,
} from '~/lib/utils';
import {CountrySelector} from '~/components/CountrySelector';

const SOCIAL_MEDIA_LINKS = [
  {handle: 'instagram', url: 'https://www.instagram.com/vasestranka', icon: FaInstagram},
  {handle: 'tiktok', url: 'https://www.tiktok.com/@vasestranka', icon: FaTiktok},
];

export function Footer({menu}: {menu?: EnhancedMenu}) {
  const isHome = useIsHomePath();
  const itemsCount = menu
    ? menu?.items?.length + 1 > 4
      ? 4
      : menu?.items?.length + 1
    : [];

  const shop = useShop();

  return (
    <Section
      divider={isHome ? 'none' : 'top'}
      as="footer"
      role="contentinfo"
      className={`grid min-h-[25rem] items-start grid-flow-row w-full gap-6 py-8 px-6 md:px-8 lg:px-12 md:gap-8 lg:gap-12 grid-cols-1 md:grid-cols-2 lg:grid-cols-${itemsCount}
        bg-primary dark:bg-contrast dark:text-primary text-contrast overflow-hidden`}
    >
      <FooterMenu menu={menu} />
      <div className="grid gap-8">
        <div className="grid gap-4">
          <Heading size="lead" as="h3">
            Sledujte nás
          </Heading>
          <div className="flex gap-4">
            {SOCIAL_MEDIA_LINKS.map((link) => (
              <a
                key={link.handle}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-black hover:text-primary transition"
              >
                <link.icon size={24} />
              </a>
            ))}
          </div>
        </div>
        <CountrySelector />
      </div>
      
      <div
        className={`self-end pt-8 opacity-50 md:col-span-2 lg:col-span-${itemsCount}`}
      >
        &copy; {new Date().getFullYear()} / {shop.storeDomain}.{' '}
        <Link to="/policies/privacy-policy">Zásady ochrany osobních údajů</Link>
      </div>
    </Section>
  );
}

function FooterLink({item}: {item: ChildEnhancedMenuItem}) {
  if (item.to.startsWith('http')) {
    return (
      <a href={item.to} target={item.target} rel="noopener noreferrer">
        {item.title}
      </a>
    );
  }

  return (
    <Link to={item.to} target={item.target} prefetch="intent">
      {item.title}
    </Link>
  );
}

function FooterMenu({menu}: {menu?: EnhancedMenu}) {
  const styles = {
    section: 'grid gap-4',
    nav: 'grid gap-2 pb-6',
  };

  return (
    <>
      {(menu?.items || []).map((item) => (
        <section key={item.id} className={styles.section}>
          <Disclosure>
            {({open}) => (
              <>
                <Disclosure.Button className="text-left md:cursor-default">
                  <Heading className="flex justify-between" size="lead" as="h3">
                    {item.title}
                    {item?.items?.length > 0 && (
                      <span className="md:hidden">
                        <IconCaret direction={open ? 'up' : 'down'} />
                      </span>
                    )}
                  </Heading>
                </Disclosure.Button>
                {item?.items?.length > 0 ? (
                  <div
                    className={`${
                      open ? `max-h-48 h-fit` : `max-h-0 md:max-h-fit`
                    } overflow-hidden transition-all duration-300`}
                  >
                    <Suspense data-comment="This suspense fixes a hydration bug in Disclosure.Panel with static prop">
                      <Disclosure.Panel static>
                        <nav className={styles.nav}>
                          {item.items.map((subItem: ChildEnhancedMenuItem) => (
                            <FooterLink key={subItem.id} item={subItem} />
                          ))}
                        </nav>
                      </Disclosure.Panel>
                    </Suspense>
                  </div>
                ) : null}
              </>
            )}
          </Disclosure>
        </section>
      ))}
    </>
  );
}

// Odstraňte FOOTER_QUERY, protože již není potřeba
