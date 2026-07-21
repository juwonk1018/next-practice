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
      <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{item.body}</p>
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

// ── 스크롤 확보용 필러 ────────────────────────────────────
// sentinel 이 첫 화면에 바로 보이면 IntersectionObserver 가 마운트 직후 발화해버려서
// "스크롤을 내려야 로드된다"는 동작을 눈으로 확인할 수 없다. 리스트 위를 채워서
// sentinel 을 화면 밖으로 밀어낸다. 어차피 자리를 채울 거면 읽을 거리로 채운다.

type ObserverNote = { term: string; summary: string; detail: string };

// `as const` 로 리터럴 타입을 유지하면서 `satisfies` 로 각 항목의 모양을 검증한다.
// 타입 어노테이션(`: ObserverNote[]`)을 달면 리터럴이 string 으로 넓어지고 readonly 도 풀리는데,
// satisfies 는 "검사만" 하고 추론된 타입은 그대로 두기 때문에 둘 다 챙길 수 있다.
const OBSERVER_NOTES = [
  {
    term: "root",
    summary: "교차를 판정할 기준 영역",
    detail:
      "null 이면 뷰포트 기준. 스크롤되는 조상 엘리먼트를 넘기면 그 박스 안쪽을 기준으로 판정한다. 모달 안 리스트처럼 뷰포트가 아닌 곳이 스크롤될 때 쓴다.",
  },
  {
    term: "rootMargin",
    summary: "판정 박스를 늘리거나 줄인다",
    detail:
      'CSS margin 문법 그대로. "200px" 을 주면 root 박스가 사방 200px 커진 것처럼 계산되어, 바닥에 닿기 200px 전에 미리 로드할 수 있다. 음수면 반대로 더 깊이 들어와야 발화한다.',
  },
  {
    term: "threshold",
    summary: "얼마나 겹쳐야 발화할지",
    detail:
      "0 은 1px 이라도 걸치면, 1 은 전부 들어와야 발화. 배열로 [0, 0.5, 1] 처럼 여러 개를 주면 각 경계를 넘나들 때마다 콜백이 호출된다.",
  },
  {
    term: "isIntersecting",
    summary: "들어왔는지 / 나갔는지",
    detail:
      "콜백은 들어올 때뿐 아니라 나갈 때도 호출된다. entry.isIntersecting 을 확인하지 않으면 화면 밖으로 사라지는 순간에도 로직이 돈다.",
  },
  {
    term: "intersectionRatio",
    summary: "실제로 겹친 비율",
    detail:
      "threshold 를 넘나든 직후의 비율이 담긴다. 관찰 대상이 root 보다 크면 절대 1 이 되지 않으므로, 높이가 큰 sentinel 에 threshold: 1 을 주면 영원히 발화하지 않는다.",
  },
  {
    term: "첫 발화",
    summary: "observe 직후 한 번은 무조건 호출된다",
    detail:
      "observe() 를 부르면 교차 여부와 상관없이 현재 상태를 담은 콜백이 곧바로 한 번 실행된다. 즉 화면 밖에 있는 sentinel 도 isIntersecting: false 로 한 번 들어온다.",
  },
  {
    term: "stale closure",
    summary: "콜백은 등록 시점의 state 를 붙잡는다",
    detail:
      "observer 는 한 번만 만들어지므로 콜백 안의 state 는 첫 렌더링 값으로 박제된다. 최신 콜백을 ref 에 담아두고 얇은 래퍼에서 ref.current 를 호출하면 풀린다.",
  },
  {
    term: "중복 요청 가드",
    summary: "sentinel 이 보이는 동안 여러 번 발화한다",
    detail:
      "한 번 보였다고 끝이 아니다. 로딩 중이거나 더 가져올 게 없으면 즉시 return 하는 가드가 없으면 같은 cursor 로 요청이 연달아 나간다.",
  },
  {
    term: "cleanup",
    summary: "disconnect 를 잊지 말 것",
    detail:
      "useEffect 의 정리 함수에서 observer.disconnect() 를 부르지 않으면 언마운트된 컴포넌트의 콜백이 계속 살아 있다. 개발 모드의 StrictMode 이중 마운트에서 특히 티가 난다.",
  },
] as const satisfies readonly ObserverNote[];

export function ObserverNotes() {
  return (
    <section className="mb-8 flex flex-col gap-3">
      <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
        IntersectionObserver 복습 — 아래로 스크롤하면 실제 아이템이 로드된다
      </h2>
      {OBSERVER_NOTES.map((note) => (
        <article
          key={note.term}
          className="rounded-xl border border-dashed border-black/10 p-4 dark:border-white/15"
        >
          <div className="mb-1.5 flex items-baseline gap-2">
            <code className="rounded-md bg-black/5 px-1.5 py-0.5 font-mono text-xs text-neutral-600 dark:bg-white/10 dark:text-neutral-300">
              {note.term}
            </code>
            <span className="text-sm font-medium">{note.summary}</span>
          </div>
          <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            {note.detail}
          </p>
        </article>
      ))}
    </section>
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
