import {useEffect, useState} from 'react';
import {
  json,
  type MetaArgs,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@shopify/remix-oxygen';
import {useLoaderData, useNavigate, useFetcher} from '@remix-run/react';
import {useInView} from 'react-intersection-observer';
import type {
  Filter,
  ProductCollectionSortKeys,
  ProductFilter,
} from '@shopify/hydrogen/storefront-api-types';
import {
  Pagination,
  flattenConnection,
  getPaginationVariables,
  Analytics,
  getSeoMeta,
} from '@shopify/hydrogen';
import invariant from 'tiny-invariant';

import {PageHeader, Section, Text} from '~/components/Text';
import {Grid} from '~/components/Grid';
import {Button} from '~/components/Button';
import {ProductCard} from '~/components/ProductCard';
import {SortFilter, type SortParam} from '~/components/SortFilter';
import {PRODUCT_CARD_FRAGMENT} from '~/data/fragments';
import {routeHeaders} from '~/data/cache';
import {seoPayload} from '~/lib/seo.server';
import {FILTER_URL_PREFIX} from '~/components/SortFilter';
import {getImageLoadingPriority} from '~/lib/const';
import {parseAsCurrency} from '~/lib/utils';
import type {I18nLocale} from '~/lib/type';

type CollectionLoaderData = SerializeFrom<typeof loader>;

export const headers = routeHeaders;

export async function loader({params, request, context}: LoaderFunctionArgs) {
  const {collectionHandle} = params;
  const searchParams = new URL(request.url).searchParams;
  const cursor = searchParams.get('cursor');

  const {sortKey, reverse} = getSortValuesFromParam(
    searchParams.get('sort') as SortParam,
  );
  const filters = [...searchParams.entries()].reduce(
    (filters, [key, value]) => {
      if (key.startsWith(FILTER_URL_PREFIX)) {
        const filterKey = key.substring(FILTER_URL_PREFIX.length);
        filters.push({
          [filterKey]: JSON.parse(value),
        });
      }
      return filters;
    },
    [] as ProductFilter[],
  );

  const {collection} = await context.storefront.query(COLLECTION_QUERY, {
    variables: {
      handle: collectionHandle!,
      cursor,
      pageBy: 8,
      country: context.storefront.i18n.country,
      language: context.storefront.i18n.language,
      filters,
      sortKey,
      reverse,
    },
  });

  if (!collection) {
    throw new Response('collection', {status: 404});
  }

  const appliedFilters = getAppliedFilters(
    collection.products.filters,
    filters,
    context.storefront.i18n,
  );

  return json({
    collection,
    appliedFilters,
  });
}

export const meta = ({matches}: MetaArgs<typeof loader>) => {
  return getSeoMeta(...matches.map((match) => (match.data as any).seo));
};

export default function Collection() {
  const {collection, appliedFilters} = useLoaderData<CollectionLoaderData>();
  const [products, setProducts] = useState(collection.products.nodes);
  const [cursor, setCursor] = useState(collection.products.pageInfo.endCursor);
  const [hasNextPage, setHasNextPage] = useState(
    collection.products.pageInfo.hasNextPage,
  );
  const fetcher = useFetcher<CollectionLoaderData>();

  const loadMore = () => {
    if (!hasNextPage) return;
    fetcher.load(`?cursor=${cursor}`);
  };

  useEffect(() => {
    if (
      fetcher.data &&
      'collection' in fetcher.data &&
      fetcher.data.collection
    ) {
      const collectionData = fetcher.data.collection;
      setProducts((prevProducts: typeof products) => [
        ...prevProducts,
        ...collectionData.products.nodes,
      ]);
      setCursor(collectionData.products.pageInfo.endCursor);
      setHasNextPage(collectionData.products.pageInfo.hasNextPage);
    }
  }, [fetcher.data]);

  return (
    <>
      <PageHeader heading={collection.title}>
        {collection?.description && (
          <div className="flex items-baseline justify-between w-full">
            <div>
              <Text format width="narrow" as="p" className="inline-block">
                {collection.description}
              </Text>
            </div>
          </div>
        )}
      </PageHeader>
      <Section className="min-h-screen pb-20">
        {' '}
        {/* Přidáno min-h-screen a padding-bottom */}
        <SortFilter
          filters={collection.products.filters as Filter[]}
          appliedFilters={appliedFilters}
          collections={[]}
        >
          <Grid layout="products">
            {products.map((product: any, i: number) => (
              <ProductCard
                key={product.id}
                product={product}
                loading={getImageLoadingPriority(i)}
              />
            ))}
          </Grid>
          {hasNextPage && (
            <div className="flex items-center justify-center mt-6">
              <Button
                onClick={loadMore}
                disabled={fetcher.state !== 'idle'}
                variant="secondary"
                width="auto"
              >
                {fetcher.state !== 'idle' ? 'Načítání...' : 'Načíst další'}
              </Button>
            </div>
          )}
        </SortFilter>
      </Section>
      <Analytics.CollectionView
        data={{
          collection: {
            id: collection.id,
            handle: collection.handle,
          },
        }}
      />
    </>
  );
}

const COLLECTION_QUERY = `#graphql
  query CollectionDetails(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
    $pageBy: Int!
    $cursor: String
    $filters: [ProductFilter!]
    $sortKey: ProductCollectionSortKeys!
    $reverse: Boolean
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      seo {
        description
        title
      }
      image {
        id
        url
        width
        height
        altText
      }
      products(first: $pageBy, after: $cursor, filters: $filters, sortKey: $sortKey, reverse: $reverse) {
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
          endCursor
          startCursor
        }
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
` as const;

function getSortValuesFromParam(sortParam: SortParam | null): {
  sortKey: ProductCollectionSortKeys;
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
        sortKey: 'CREATED',
        reverse: true,
      };
    case 'featured':
      return {
        sortKey: 'MANUAL',
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
  filters: Filter[],
  appliedFilters: ProductFilter[],
  locale: I18nLocale,
) {
  const allFilterValues = filters.flatMap((filter) => filter.values);
  return appliedFilters
    .map((filter) => {
      const foundValue = allFilterValues.find((value) => {
        const valueInput = JSON.parse(value.input as string) as ProductFilter;
        if (valueInput.price && filter.price) {
          return true;
        }
        return JSON.stringify(valueInput) === JSON.stringify(filter);
      });
      if (!foundValue) {
        // console.error('Could not find filter value for filter', filter);
        return null;
      }
      if (foundValue.id === 'filter.v.price') {
        const input = JSON.parse(foundValue.input as string) as ProductFilter;
        const min = parseAsCurrency(input.price?.min ?? 0, locale);
        const max = input.price?.max
          ? parseAsCurrency(input.price.max, locale)
          : '';
        const label = min && max ? `${min} - ${max}` : 'Cena';
        return {filter, label};
      }
      return {filter, label: foundValue.label};
    })
    .filter((filter): filter is NonNullable<typeof filter> => filter !== null);
}
