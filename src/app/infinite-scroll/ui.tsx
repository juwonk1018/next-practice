// 무한 스크롤 실습용 프레젠테이션 컴포넌트 모음.
// 로직(상태, fetch, IntersectionObserver)은 page.tsx 에서 직접 구현하고,
// 여기 있는 컴포넌트는 "그리는 일"만 한다.
//
// 참고: 이 파일에 "use client" 가 없어도 된다. 클라이언트 경계는 진입점(page.tsx)에
// 한 번만 선언하면 되고, 클라이언트 컴포넌트가 import 하는 모듈은 자동으로 클라이언트 번들에 포함된다.

// Item 은 API 계약 모듈에서 가져온다. 서버(route.ts)와 같은 정의를 공유하며,
// 계약 모듈에는 순수 타입/상수만 있어서 어느 쪽에서 import 해도 안전하다.
import type { Item } from "@/types/items";

// 아이템 하나를 보여주는 카드. <ul> 안에 넣을 수 있게 <li> 로 렌더링한다.
export function ItemCard({ item }: { item: Item }) {
  return (
    <li className="rounded-xl border border-black/10 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-white/15 dark:bg-white/5">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="rounded-md bg-black/5 px-1.5 py-0.5 font-mono text-xs text-neutral-500 dark:bg-white/10 dark:text-neutral-400">
          #{item.id}
        </span>
        <h2 className="font-medium">{item.title}</h2>
      </div>
      <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
        {item.body}
      </p>
    </li>
  );
}

// 로딩 중 표시용 스켈레톤 카드. 추가 로딩 시 리스트 끝에 2~3개 붙여주면 된다.
export function SkeletonCard() {
  return (
    <li className="animate-pulse rounded-xl border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-white/5">
      <div className="mb-3 flex items-center gap-2">
        <div className="h-5 w-9 rounded-md bg-black/10 dark:bg-white/10" />
        <div className="h-4 w-28 rounded bg-black/10 dark:bg-white/10" />
      </div>
      <div className="h-3.5 w-full rounded bg-black/5 dark:bg-white/5" />
    </li>
  );
}

// 에러 상태 카드. onRetry 를 넘기면 재시도 버튼이 나타난다.
export function ErrorCard({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <li className="rounded-xl border border-red-300/60 bg-red-50 p-4 dark:border-red-400/30 dark:bg-red-950/30">
      <p className="text-sm text-red-700 dark:text-red-300">불러오기 실패: {message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 rounded-lg border border-red-300/60 px-3 py-1 text-sm text-red-700 transition-colors hover:bg-red-100 dark:border-red-400/30 dark:text-red-300 dark:hover:bg-red-900/30"
        >
          다시 시도
        </button>
      )}
    </li>
  );
}

// 끝 도달 표시. nextCursor 가 null 이 되면 리스트 아래에 렌더링한다.
export function EndOfList({ total }: { total: number }) {
  return (
    <p className="py-6 text-center text-sm text-neutral-400 dark:text-neutral-500">
      — 아이템 {total}개를 모두 불러왔습니다 —
    </p>
  );
}
