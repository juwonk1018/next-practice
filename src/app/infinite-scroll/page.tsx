"use client";

// 무한 스크롤 실습 페이지 — 빈 뼈대.
// mock API 는 이미 준비되어 있고 (src/app/api/items/route.ts), 나머지는 전부 직접 구현한다.
//
// ── API 계약 ──────────────────────────────────────────────
// GET /api/items?cursor=<마지막으로 받은 id>&limit=20
//  - 첫 요청은 cursor 없이 보낸다.
//  - 응답: { items: Item[], nextCursor: number | null } — 정확한 타입은
//    src/types/items.ts 의 GetItemsResponse (성공/에러 union) 참고.
//  - nextCursor 가 null 이면 끝. 다음 요청의 cursor 로 nextCursor 를 그대로 쓰면 된다.
//  - 응답까지 ~800ms 걸린다 (로딩 UI 를 눈으로 확인할 수 있게 일부러 지연을 둠).
//
// ── 구현 순서 가이드 ──────────────────────────────────────
// 1. 상태 설계
//    - 쌓인 items, 다음 요청에 쓸 nextCursor, 로딩 여부, 에러 정도가 필요하다.
//    - "더 가져올 게 있는가(hasMore)"를 어떤 상태로 표현할지 먼저 정해보자.
//
// 2. 페이지 로드 함수
//    - fetch 로 다음 페이지를 받아 기존 items 뒤에 이어붙인다.
//    - 이미 로딩 중이거나 hasMore 가 false 면 요청하지 않는 가드가 반드시 필요하다.
//      (sentinel 이 보이는 동안 IntersectionObserver 가 여러 번 발화할 수 있다.)
//
// 3. IntersectionObserver 로 하단 감지
//    - 리스트 맨 아래 sentinel(빈 div)을 관찰하다가, 화면에 들어오면 2번 함수를 호출한다.
//    - new IntersectionObserver(callback, options) → observer.observe(el)
//    - options 의 rootMargin 을 주면 "바닥에 닿기 200px 전"처럼 미리 로드할 수 있다.
//    - cleanup(observer.disconnect)을 잊지 말 것. ref 콜백 또는 useEffect 어느 쪽으로
//      observer 를 붙일지 고민해보는 것도 연습 포인트다.
//
// 4. 화면 상태 처리
//    - 첫 로딩 / 추가 로딩 / 에러 / 끝 도달("마지막입니다") 각각 표시해보자.
//
// ── 타입 연습 포인트 (고급 TypeScript) ────────────────────
// - 1번 상태 설계를 boolean 플래그 조합 대신 discriminated union 으로 모델링해보자.
//   type ListState =
//     | { status: "loading" }
//     | { status: "error"; error: string; cursor: number | null }
//     | { status: "loaded"; items: Item[]; nextCursor: number | null }
//   처럼 "불가능한 상태 조합"(예: 로딩 중인데 에러) 자체를 타입으로 막는 방식이다.
//   switch (state.status) 분기 안에서 타입이 자동으로 좁혀지는 것(narrowing)을 확인해보자.
// - fetch 응답 파싱 함수를 제네릭으로 일반화해보자: fetchJson<T>(url: string): Promise<T>
//
// ── 심화 과제 (기본이 끝나면) ─────────────────────────────
// - route.ts 의 FAILURE_RATE 를 0.3 으로 올리고: 에러 시 재시도 버튼, 실패한 cursor 유지
// - 언마운트 후 응답이 도착하는 race condition 을 AbortController 로 정리
// - 빠르게 스크롤할 때 중복 요청이 없는지 Network 탭으로 검증
// - limit 을 5 로 줄여 sentinel 이 첫 화면부터 보이는 경우의 동작 확인

import { GetItemsError, GetItemsSuccess, type Item } from "@/types/items";
import { EndOfList, ErrorCard, ItemCard, SkeletonCard } from "./ui";
import { useEffect, useRef, useState } from "react";
import axios, { isAxiosError } from "axios";

export default function InfiniteScrollPracticePage() {
  const [items, setItems] = useState<Item[]>([]);

  const isLoadingRef = useRef<boolean>(false);
  const cursor = useRef<unknown | null>(null);

  async function fetchItems() {
    try {
      isLoadingRef.current = true;
      const result = await axios.get<GetItemsSuccess>("/api/items", {
        params: { cursor: cursor.current, limit: 20 },
      });
      const nextItems = result.data?.items;
      const nextCursor = result.data?.nextCursor;

      if (nextCursor) {
        cursor.current = nextCursor;
      }
      setItems((items) => [...items, ...nextItems]);
    } catch (err) {
      if (isAxiosError<GetItemsError>(err)) {
        console.error(err.response?.data?.error);
      }
    } finally {
      isLoadingRef.current = false;
    }
  }

  const observerCallback = (
    entries: IntersectionObserverEntry[],
    observer: IntersectionObserver,
  ) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        console.log(items.length);
        if (entry.intersectionRatio >= 0.75 && !isLoadingRef.current) {
          fetchItems();
        }
      }
    });
  };

  const observerOptions = {
    root: null, // ViewPort 기준
    threshold: 0.75, // 0.8 -> 0.7, 0.7 -> 0.8같이 threshold를 기준으로 넘나든 이후의 intersectionRatio를 출력함.
  };

  useEffect(() => {
    fetchItems();

    const observer = new IntersectionObserver(
      observerCallback,
      observerOptions,
    );

    const target = document.querySelector(".intersection-observer");
    if (target) {
      observer.observe(target);
    }
  }, []);

  return (
    <main id="list" className="mx-auto w-full max-w-2xl p-6">
      <h1 className="text-xl font-semibold">무한 스크롤 실습</h1>
      <p className="mb-6 mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        엔드포인트:{" "}
        <code className="font-mono">/api/items?cursor=&amp;limit=20</code>
      </p>

      <ul className="flex flex-col gap-3">
        {items && items.map((item) => <ItemCard key={item.id} item={item} />)}
        {/* <SkeletonCard /> */}
        {/* <ErrorCard
          message="미리보기 에러 (onRetry 를 넘기면 버튼이 생깁니다)"
          onRetry={() => {}}
        /> */}
      </ul>

      {/* TODO: 이 sentinel 을 IntersectionObserver 로 관찰한다 */}
      <div className="intersection-observer" style={{ height: 10 }} />

      {/* TODO: 로딩 / 에러 / 끝 도달 상태 표시. 끝 도달 시: */}
      <EndOfList total={items?.length ?? 0} />
    </main>
  );
}
