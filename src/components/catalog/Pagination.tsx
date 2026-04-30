"use client";

import ReactPaginate from "react-paginate";

import styles from "@/components/catalog/Catalog.module.css";

interface PaginationProps {
  pageCount: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  pageCount,
  currentPage,
  onPageChange,
}: PaginationProps) {
  if (pageCount <= 1) {
    return null;
  }

  return (
    <nav aria-label="Пагінація каталогу">
      <ReactPaginate
        breakLabel="..."
        breakAriaLabels={{
          forward: "Наступні сторінки",
          backward: "Попередні сторінки",
        }}
        nextLabel="Далі"
        nextAriaLabel="Наступна сторінка"
        previousLabel="Назад"
        previousAriaLabel="Попередня сторінка"
        ariaLabelBuilder={(page) => `Сторінка ${page}`}
        onPageChange={({ selected }) => onPageChange(selected + 1)}
        pageRangeDisplayed={3}
        marginPagesDisplayed={1}
        pageCount={pageCount}
        forcePage={Math.max(0, currentPage - 1)}
        containerClassName={styles.pagination}
        pageClassName={styles.pageItem}
        pageLinkClassName={styles.pageLink}
        previousClassName={styles.pageItem}
        previousLinkClassName={styles.pageLink}
        nextClassName={styles.pageItem}
        nextLinkClassName={styles.pageLink}
        breakClassName={styles.pageItem}
        breakLinkClassName={styles.pageLink}
        activeClassName={styles.pageItemActive}
        disabledClassName={styles.pageItemDisabled}
      />
    </nav>
  );
}
