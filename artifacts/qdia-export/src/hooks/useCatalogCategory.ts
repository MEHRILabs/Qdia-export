import { useCallback, useEffect, useMemo, useState } from "react";
import { useListCategories } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import {
  ALL_CATEGORIES,
  buildCatalogCategoryOptions,
  readCategoryFromUrl,
  writeCategoryToUrl,
} from "@/lib/catalog-categories";
import { platformApi } from "@/lib/platform-api";

export function useCatalogCategory() {
  const [categoryName, setCategoryName] = useState(readCategoryFromUrl);

  useEffect(() => {
    setCategoryName(readCategoryFromUrl());
  }, []);

  const { data: categories } = useListCategories();
  const { data: productCategories } = useQuery({
    queryKey: ["product-categories"],
    queryFn: () => platformApi.getProductCategories(),
  });

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const row of productCategories?.data ?? []) {
      const slug = row.name;
      if (slug) map[slug] = row.count ?? 0;
    }
    return map;
  }, [productCategories]);

  const options = useMemo(() => buildCatalogCategoryOptions(counts), [counts]);

  const categoryId = categoryName !== ALL_CATEGORIES
    ? categories?.find(c => c.name === categoryName)?.id ?? null
    : null;

  const setCategory = useCallback((value: string) => {
    setCategoryName(value);
    writeCategoryToUrl(value);
  }, []);

  return {
    categoryName,
    setCategory,
    categoryId,
    options,
    counts,
  };
}
