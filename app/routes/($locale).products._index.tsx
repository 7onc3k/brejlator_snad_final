import {
  json,
  type MetaArgs,
  type LoaderFunctionArgs,
} from '@shopify/remix-oxygen';
import {useLoaderData} from '@remix-run/react';
import {
  Pagination,
  getPaginationVariables,
  getSeoMeta,
} from '@shopify/hydrogen';
import type {
  ProductFilter,
  ProductCollectionSortKeys,
  ProductSortKeys,
} from '@shopify/hydrogen/storefront-api-types';

import {Grid} from '~/components/Grid';
import {ProductCard} from '~/components/ProductCard';
import {Section, PageHeader} from '~/components/Text';
import {PRODUCT_CARD_FRAGMENT} from '~/data/fragments';
import {getImageLoadingPriority} from '~/lib/const';
import {seoPayload} from '~/lib/seo.server';
import {routeHeaders} from '~/data/cache';
import {
  SortFilter,
  type SortParam,
  type Filter,
  type AppliedFilter,
} from '~/components/SortFilter';
import {Button} from '~/components/Button';
import {parseAsCurrency} from '~/lib/utils';
import type {I18nLocale} from '~/lib/type';

const PAGE_BY = 8;

export const headers = routeHeaders;

export async function loader({
  request,
  context: {storefront},
}: LoaderFunctionArgs) {
  const searchParams = new URL(request.url).searchParams;
  const {sortKey, reverse} = getSortValuesFromParam(
    searchParams.get('sort') as SortParam,
  );
  const paginationVariables = getPaginationVariables(request, {
    pageBy: PAGE_BY,
  });

  const {products} = await storefront.query(ALL_PRODUCTS_QUERY, {
    variables: {
      ...paginationVariables,
      sortKey,
      reverse,
      country: storefront.i18n.country,
      language: storefront.i18n.language,
    },
  });

  const appliedFilters = getAppliedFilters(
    products.filters,
    searchParams,
    storefront.i18n,
  );

  const seo = seoPayload.collection({
    url: request.url,
    collection: {
      id: 'all-products',
      title: 'Všechny produkty',
      handle: 'products',
      descriptionHtml: 'Všechny produkty v obchodě',
      description: 'Všechny produkty v obchodě',
      seo: {
        title: 'Všechny produkty',
        description: 'Všechny produkty v obchodě',
      },
      metafields: [],
      products,
      updatedAt: '',
    },
  });

  return json({products, appliedFilters, seo});
}

export const meta = ({matches}: MetaArgs<typeof loader>) => {
  return getSeoMeta(...matches.map((match) => (match.data as any).seo));
};

export default function AllProducts() {
  const {products, appliedFilters} = useLoaderData<typeof loader>();

  return (
    <>
      <PageHeader heading="Všechny produkty" />
      <Section>
        <SortFilter
          filters={products.filters as Filter[]}
          appliedFilters={appliedFilters as AppliedFilter[]}
          collections={[]}
        >
          <Pagination connection={products}>
            {({nodes, isLoading, PreviousLink, NextLink}) => (
              <>
                <div className="flex items-center justify-center mb-6">
                  <Button as={PreviousLink} variant="secondary" width="full">
                    {isLoading ? 'Načítání...' : 'Předchozí produkty'}
                  </Button>
                </div>
                <Grid
                  layout="products"
                  className="grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4 lg:gap-6"
                >
                  {nodes.map((product, i) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      loading={getImageLoadingPriority(i)}
                      className="w-full h-full"
                    />
                  ))}
                </Grid>
                <div className="flex items-center justify-center mt-6">
                  <Button as={NextLink} variant="secondary" width="full">
                    {isLoading ? 'Načítání...' : 'Další produkty'}
                  </Button>
                </div>
              </>
            )}
          </Pagination>
        </SortFilter>
      </Section>
    </>
  );
}

const ALL_PRODUCTS_QUERY = `#graphql
  query AllProducts(
    $country: CountryCode
    $language: LanguageCode
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
    $sortKey: ProductSortKeys
    $reverse: Boolean
  ) @inContext(country: $country, language: $language) {
    products(
      first: $first,
      last: $last,
      before: $startCursor,
      after: $endCursor,
      sortKey: $sortKey,
      reverse: $reverse
    ) {
      filters {
        id
        label
        type
        values {
          id
          label
          count
          input
        }
      }
      nodes {
        ...ProductCard
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
` as const;

function getSortValuesFromParam(sortParam: SortParam | null): {
  sortKey: ProductSortKeys;
  reverse: boolean;
} {
  switch (sortParam) {
    case 'price-high-low':
      return {
        sortKey: 'PRICE',
        reverse: true,
      };
    case 'price-low-high':
      return {
        sortKey: 'PRICE',
        reverse: false,
      };
    case 'best-selling':
      return {
        sortKey: 'BEST_SELLING',
        reverse: false,
      };
    case 'newest':
      return {
        sortKey: 'CREATED_AT',
        reverse: true,
      };
    case 'featured':
      return {
        sortKey: 'RELEVANCE',
        reverse: false,
      };
    default:
      return {
        sortKey: 'RELEVANCE',
        reverse: false,
      };
  }
}

function getAppliedFilters(
  filters: any[],
  searchParams: URLSearchParams,
  locale: I18nLocale,
) {
  const appliedFilters: ProductFilter[] = [];
  const entries = searchParams.entries();
  for (const [key, value] of entries) {
    if (key.startsWith('filter.')) {
      const [, field] = key.split('.');
      appliedFilters.push({[field]: value} as ProductFilter);
    }
  }

  return filters
    .flatMap(({values}) => values)
    .filter((value) => {
      if (value.input && typeof value.input === 'string') {
        const [, field] = value.input.split('.');
        return appliedFilters.some(
          (filter) => filter[field as keyof ProductFilter] === value.input,
        );
      }
      return false;
    })
    .map((value) => {
      if (value.input && typeof value.input === 'string') {
        const input = JSON.parse(value.input) as ProductFilter;
        if (input.price) {
          const min = parseAsCurrency(input.price.min ?? 0, locale);
          const max = input.price.max
            ? parseAsCurrency(input.price.max, locale)
            : '';
          const label = min && max ? `${min} - ${max}` : 'Cena';
          return {filter: input, label};
        }
        return {filter: input, label: value.label};
      }
      return null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}
