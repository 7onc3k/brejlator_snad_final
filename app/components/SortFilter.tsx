import type {SyntheticEvent} from 'react';
import {useMemo, useState} from 'react';
import {Menu, Disclosure} from '@headlessui/react';
import type {Location} from '@remix-run/react';
import {
  Link,
  useLocation,
  useSearchParams,
  useNavigate,
} from '@remix-run/react';
import useDebounce from 'react-use/esm/useDebounce';
import type {
  Filter,
  ProductFilter,
} from '@shopify/hydrogen/storefront-api-types';

import {Heading, Text} from '~/components/Text';
import {IconFilters, IconCaret, IconXMark} from '~/components/Icon';

export type AppliedFilter = {
  label: string;
  filter: ProductFilter;
};

export type SortParam =
  | 'price-low-high'
  | 'price-high-low'
  | 'best-selling'
  | 'newest'
  | 'featured';

type Props = {
  filters: Filter[];
  appliedFilters?: AppliedFilter[];
  children: React.ReactNode;
  collections?: Array<{handle: string; title: string}>;
};
export const FILTER_URL_PREFIX = 'filter.';

export function SortFilter({
  filters,
  appliedFilters = [],
  children,
  collections = [],
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <div className="flex items-center justify-between w-full">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={
            'relative flex items-center justify-center w-8 h-8 focus:ring-primary/5'
          }
        >
          <IconFilters />
        </button>
        <SortMenu />
      </div>
      <div className="flex flex-col flex-wrap md:flex-row">
        <div
          className={`transition-all duration-200 ${
            isOpen
              ? 'opacity-100 min-w-full md:min-w-[240px] md:w-[240px] md:pr-8 max-h-full'
              : 'opacity-0 md:min-w-[0px] md:w-[0px] pr-0 max-h-0 md:max-h-full'
          }`}
        >
          <FiltersDrawer filters={filters} appliedFilters={appliedFilters} />
        </div>
        <div className="flex-1">{children}</div>
      </div>
    </>
  );
}

export function FiltersDrawer({
  filters = [],
  appliedFilters = [],
}: Omit<Props, 'children'>) {
  const [params] = useSearchParams();
  const location = useLocation();

  const filterMarkup = (filter: Filter, option: Filter['values'][0]) => {
    switch (filter.type) {
      case 'PRICE_RANGE':
        const priceFilter = params.get(`${FILTER_URL_PREFIX}price`);
        const price = priceFilter
          ? (JSON.parse(priceFilter) as ProductFilter['price'])
          : undefined;
        const min = isNaN(Number(price?.min)) ? undefined : Number(price?.min);
        const max = isNaN(Number(price?.max)) ? undefined : Number(price?.max);

        return <PriceRangeFilter min={min} max={max} />;

      default:
        const to = getFilterLink(option.input as string, params, location);
        return (
          <Link
            className="focus:underline hover:underline"
            prefetch="intent"
            to={to}
          >
            {translateFilterLabel(option.label)}
          </Link>
        );
    }
  };

  return (
    <>
      <nav className="py-8">
        {appliedFilters.length > 0 ? (
          <div className="pb-8">
            <AppliedFilters filters={appliedFilters} />
          </div>
        ) : null}

        <Heading as="h4" size="lead" className="pb-4">
          Filtrovat podle
        </Heading>
        <div className="divide-y">
          {filters.map((filter: Filter) => (
            <Disclosure as="div" key={filter.id} className="w-full">
              {({open}) => (
                <>
                  <Disclosure.Button className="flex justify-between w-full py-4">
                    <Text size="lead">
                      {translateFilterLabel(filter.label)}
                    </Text>
                    <IconCaret direction={open ? 'up' : 'down'} />
                  </Disclosure.Button>
                  <Disclosure.Panel key={filter.id}>
                    <ul key={filter.id} className="py-2">
                      {filter.values?.map((option) => {
                        return (
                          <li key={option.id} className="pb-4">
                            {filterMarkup(filter, option)}
                          </li>
                        );
                      })}
                    </ul>
                  </Disclosure.Panel>
                </>
              )}
            </Disclosure>
          ))}
        </div>
      </nav>
    </>
  );
}

function AppliedFilters({filters = []}: {filters: AppliedFilter[]}) {
  const [params] = useSearchParams();
  const location = useLocation();
  return (
    <>
      <Heading as="h4" size="lead" className="pb-4">
        Použité filtry
      </Heading>
      <div className="flex flex-wrap gap-2">
        {filters.map((filter: AppliedFilter) => {
          return (
            <Link
              to={getAppliedFilterLink(filter, params, location)}
              className="flex px-2 border rounded-full gap"
              key={`${filter.label}-${JSON.stringify(filter.filter)}`}
            >
              <span className="flex-grow">{filter.label}</span>
              <span>
                <IconXMark />
              </span>
            </Link>
          );
        })}
      </div>
    </>
  );
}

function getAppliedFilterLink(
  filter: AppliedFilter,
  params: URLSearchParams,
  location: Location,
) {
  const paramsClone = new URLSearchParams(params);
  Object.entries(filter.filter).forEach(([key, value]) => {
    const fullKey = FILTER_URL_PREFIX + key;
    paramsClone.delete(fullKey, JSON.stringify(value));
  });
  return `${location.pathname}?${paramsClone.toString()}`;
}

function getSortLink(
  sort: SortParam,
  params: URLSearchParams,
  location: Location,
) {
  params.set('sort', sort);
  return `${location.pathname}?${params.toString()}`;
}

function getFilterLink(
  rawInput: string | ProductFilter,
  params: URLSearchParams,
  location: ReturnType<typeof useLocation>,
) {
  const paramsClone = new URLSearchParams(params);
  const newParams = filterInputToParams(rawInput, paramsClone);
  return `${location.pathname}?${newParams.toString()}`;
}

const PRICE_RANGE_FILTER_DEBOUNCE = 500;

function PriceRangeFilter({max, min}: {max?: number; min?: number}) {
  const location = useLocation();
  const params = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const navigate = useNavigate();

  const [minPrice, setMinPrice] = useState(min);
  const [maxPrice, setMaxPrice] = useState(max);

  useDebounce(
    () => {
      if (minPrice === undefined && maxPrice === undefined) {
        params.delete(`${FILTER_URL_PREFIX}price`);
        navigate(`${location.pathname}?${params.toString()}`);
        return;
      }

      const price = {
        ...(minPrice === undefined ? {} : {min: minPrice}),
        ...(maxPrice === undefined ? {} : {max: maxPrice}),
      };
      const newParams = filterInputToParams({price}, params);
      navigate(`${location.pathname}?${newParams.toString()}`);
    },
    PRICE_RANGE_FILTER_DEBOUNCE,
    [minPrice, maxPrice],
  );

  const onChangeMax = (event: SyntheticEvent) => {
    const value = (event.target as HTMLInputElement).value;
    const newMaxPrice = Number.isNaN(parseFloat(value))
      ? undefined
      : parseFloat(value);
    setMaxPrice(newMaxPrice);
  };

  const onChangeMin = (event: SyntheticEvent) => {
    const value = (event.target as HTMLInputElement).value;
    const newMinPrice = Number.isNaN(parseFloat(value))
      ? undefined
      : parseFloat(value);
    setMinPrice(newMinPrice);
  };

  return (
    <div className="flex flex-col space-y-4">
      <label className="flex flex-col">
        <span className="mb-2">od</span>
        <input
          name="minPrice"
          className="w-full px-3 py-2 text-black text-right rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          type="number"
          value={minPrice ?? ''}
          placeholder={'Kč'}
          onChange={onChangeMin}
        />
      </label>
      <label className="flex flex-col">
        <span className="mb-2">do</span>
        <input
          name="maxPrice"
          className="w-full px-3 py-2 text-black text-right rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          type="number"
          value={maxPrice ?? ''}
          placeholder={'Kč'}
          onChange={onChangeMax}
        />
      </label>
    </div>
  );
}

function filterInputToParams(
  rawInput: string | ProductFilter,
  params: URLSearchParams,
) {
  const input =
    typeof rawInput === 'string'
      ? (JSON.parse(rawInput) as ProductFilter)
      : rawInput;

  Object.entries(input).forEach(([key, value]) => {
    if (params.has(`${FILTER_URL_PREFIX}${key}`, JSON.stringify(value))) {
      return;
    }
    if (key === 'price') {
      // For price, we want to overwrite
      params.set(`${FILTER_URL_PREFIX}${key}`, JSON.stringify(value));
    } else {
      params.append(`${FILTER_URL_PREFIX}${key}`, JSON.stringify(value));
    }
  });

  return params;
}

export default function SortMenu() {
  const items: {label: string; key: SortParam}[] = [
    {label: 'Doporučené', key: 'featured'},
    {label: 'Cena: Od nejnižší', key: 'price-low-high'},
    {label: 'Cena: Od nejvyšší', key: 'price-high-low'},
    {label: 'Nejprodávanější', key: 'best-selling'},
    {label: 'Nejnovější', key: 'newest'},
  ];
  const [params] = useSearchParams();
  const location = useLocation();
  const activeItem = items.find((item) => item.key === params.get('sort'));

  return (
    <Menu as="div" className="relative z-40">
      <Menu.Button className="flex items-center">
        <span className="px-2">
          <span className="px-2 font-medium">Seřadit podle:</span>
          <span>{(activeItem || items[0]).label}</span>
        </span>
        <IconCaret />
      </Menu.Button>

      <Menu.Items
        as="nav"
        className="absolute right-0 flex flex-col p-4 text-right rounded-sm bg-contrast"
      >
        {items.map((item) => (
          <Menu.Item key={item.label}>
            {() => (
              <Link
                className={`block text-sm pb-2 px-3 ${
                  activeItem?.key === item.key ? 'font-bold' : 'font-normal'
                }`}
                to={getSortLink(item.key, params, location)}
              >
                {item.label}
              </Link>
            )}
          </Menu.Item>
        ))}
      </Menu.Items>
    </Menu>
  );
}

// Přidejte tuto pomocnou funkci pro překlad názvů filtrů
function translateFilterLabel(label: string): string {
  switch (label.toLowerCase()) {
    case 'availability':
      return 'Dostupnost';
    case 'price':
      return 'Cena';
    default:
      return label;
  }
}
