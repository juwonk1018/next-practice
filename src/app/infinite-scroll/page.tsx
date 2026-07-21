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
// - fetch 응답 파싱 함수를 제네릭으로 일반화해보자: fetchJson<T>(url: string): Promise<T>
//
// ── 심화 과제 (기본이 끝나면) ─────────────────────────────
// - route.ts 의 FAILURE_RATE 를 0.3 으로 올리고: 에러 시 재시도 버튼, 실패한 cursor 유지
// - 언마운트 후 응답이 도착하는 race condition 을 AbortController 로 정리
// - 빠르게 스크롤할 때 중복 요청이 없는지 Network 탭으로 검증

import { GetItemsError, GetItemsSuccess, type Item } from "@/types/items";
import { EndOfList, ErrorCard, ItemCard, ObserverNotes, SkeletonCard } from "./ui";
import { useEffect, useRef, useState } from "react";
import axios, { isAxiosError } from "axios";

// 타입 연습 포인트 (고급 TypeScript) ────────────────────
// - 1번 상태 설계를 boolean 플래그 조합 대신 discriminated union 으로 모델링해보자.
//   type ListState =
//     | { status: "loading" }
//     | { status: "error"; error: string; cursor: number | null }
//     | { status: "loaded"; items: Item[]; nextCursor: number | null }
//   처럼 "불가능한 상태 조합"(예: 로딩 중인데 에러) 자체를 타입으로 막는 방식
//   switch (state.status) 분기 안에서 타입이 자동으로 좁혀지는 것(narrowing)을 확인 가능.

type Fetch =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: string | undefined }
  | { status: "success" };

// 최초 호출: status가 idle이면서 nextCursor가 null
// 리스트 마지막 호출: status가 success이면서 nextCursor가 null
type ListState = {
  fetch: Fetch;
  data: Item[];
  nextCursor: number | null;
};

export default function InfiniteScrollPracticePage() {
  const observerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef<
    (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => void
  >(() => {});
  const [state, setState] = useState<ListState>({
    fetch: { status: "idle" },
    data: [],
    nextCursor: null,
  });

  async function fetchItems(): Promise<void> {
    if (state.fetch.status === "loading") return;
    if (state.fetch.status === "success" && state.nextCursor === null) return;

    try {
      setState((state) => ({ ...state, fetch: { status: "loading" } }));

      // limit 을 5 로 줄여 sentinel 이 첫 화면부터 보이는 경우의 동작 확인 필요.
      // TODO: 5로 줄이면, 그 다음의 fetch가 일어나지 않음.
      const result = await axios.get<GetItemsSuccess>("/api/items", {
        params: { cursor: state.nextCursor, limit: 20 },
      });
      const nextItems = result.data?.items;
      const nextCursor = result.data?.nextCursor ?? null;

      setState((state) => ({
        fetch: { status: "success" },
        data: [...state.data, ...nextItems],
        nextCursor,
      }));
    } catch (err) {
      let error: string | undefined = "unknown error";
      if (isAxiosError<GetItemsError>(err)) {
        error = err.response?.data?.error;
        console.error(error);
      }

      setState((state) => ({ ...state, fetch: { status: "error", error } }));
    }
  }

  const observerCallback = (
    entries: IntersectionObserverEntry[],
    observer: IntersectionObserver,
  ) => {
    if (state.fetch.status === "error") return;
    if (entries.some((entry) => entry.isIntersecting)) fetchItems();
  };

  const observerOptions = {
    root: null, // null로 지정 시 ViewPort 기준으로 판단.
    threshold: 0.75, // threshold를 기준으로 넘나든 이후의 intersectionRatio를 출력함. 예시) 0.8 -> 0.7, 0.7 -> 0.8 로 넘어가는 시점
  };

  useEffect(() => {
    callbackRef.current = observerCallback;
  });

  useEffect(() => {
    // callback을 observer가 감지한 순간 매번 새로 호출하여 최신 state를 받아온다.
    // observerCallback을 그대로 쓰면, 여전히 stale state를 받아옴
    // useEffect는 첫 번째 렌더링 시 함수를 observerCallback으로 넣는데, 처음 렌더링 될 시점의 state가 observerCallback에 박제됨.
    // -> useEffect 밖에서 선언되는 함수를 button의 onClick으로 호출 시,
    //    최신 값을 내뱉는 이유는 매 렌더링마다 해당 함수가 새로 호출되기 때문인데, callback은 그렇지 않음.
    // 따라서, observerRef를 써서 latestRef로 observerCallback을 유지하면 정상적으로 상태가 업데이트 됨.

    // TODO: 범용적으로 쓸 수 있는 useIntersectionObsrever hook을 만들어보기.
    const observer = new IntersectionObserver((entries, observer) => {
      callbackRef.current(entries, observer);
    }, observerOptions);
    const target = observerRef.current;

    if (target) {
      observer.observe(target);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <main id="list" className="mx-auto w-full max-w-2xl p-6">
      <h1 className="text-xl font-semibold">무한 스크롤 실습</h1>
      <p className="mt-1 mb-6 text-sm text-neutral-500 dark:text-neutral-400">
        엔드포인트: <code className="font-mono">/api/items?cursor=&amp;limit=20</code>
      </p>

      {/* sentinel 을 첫 화면 밖으로 밀어내는 필러. 지우면 마운트 직후 바로 로드된다. */}
      <ObserverNotes />

      <ul className="flex flex-col gap-3">
        {state.data && state.data.map((item) => <ItemCard key={item.id} item={item} />)}
        {state.fetch.status === "loading" && <SkeletonCard />}
        {state.fetch.status === "error" && (
          <ErrorCard
            message="데이터 호출 실패"
            onRetry={() => {
              fetchItems();
            }}
          />
        )}
      </ul>

      {/* observer가 관찰하는 div는 height이 0이라도 동작은 함. */}
      <div ref={observerRef} style={{ height: 10 }} />
      <EndOfList total={state.data?.length ?? 0} />
    </main>
  );
}
