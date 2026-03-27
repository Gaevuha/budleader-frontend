"use client";

import { useMemo } from "react";

import { useProducts } from "@/hooks/useProducts";

export function ProductsList() {
  const {
    products,
    pagination,
    page,
    search,
    setPage,
    setSearch,
    isFetching,
    isError,
  } = useProducts();

  const totalPages = useMemo(() => {
    return Math.max(1, pagination?.totalPages ?? 1);
  }, [pagination?.totalPages]);

  return (
    <section>
      <div style={{ marginBottom: 16 }}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Пошук товарів..."
          style={{
            width: "100%",
            maxWidth: 420,
            height: 40,
            padding: "0 12px",
          }}
        />
      </div>

      {isFetching ? <p>Завантаження...</p> : null}
      {isError ? <p>Не вдалося завантажити товари.</p> : null}

      <ul
        style={{
          display: "grid",
          gap: 8,
          margin: 0,
          padding: 0,
          listStyle: "none",
        }}
      >
        {products.map((product) => (
          <li
            key={product.id}
            style={{ border: "1px solid #e5e7eb", padding: 12 }}
          >
            <strong>{product.name}</strong>
            <div>{product.price} грн</div>
          </li>
        ))}
      </ul>

      <div
        style={{ display: "flex", gap: 8, marginTop: 16, alignItems: "center" }}
      >
        <button
          onClick={() => setPage(page - 1)}
          disabled={page <= 1 || isFetching}
        >
          Prev
        </button>
        <span>
          {page} / {totalPages}
        </span>
        <button
          onClick={() => setPage(page + 1)}
          disabled={page >= totalPages || isFetching}
        >
          Next
        </button>
      </div>
    </section>
  );
}
