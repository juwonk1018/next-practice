// 무한 스크롤 실습용 mock API — cursor 기반 페이지네이션.
//
// 핵심 개념 (cursor 방식)
// - 클라이언트는 "마지막으로 받은 항목의 위치(cursor)"를 다음 요청에 실어 보낸다.
// - 서버는 cursor 다음 항목부터 limit 개를 잘라서 주고, 함께 nextCursor 를 내려준다.
// - nextCursor 가 null 이면 더 가져올 데이터가 없다는 뜻이다 (hasMore = false).
// - page 번호 방식과 달리 중간에 데이터가 삽입/삭제돼도 항목이 밀리거나 중복되지 않는다.
//
// 요청:  GET /api/items?cursor=<마지막으로 받은 id>&limit=<개수>
//        - cursor 를 생략하면 처음부터 (첫 페이지)
//        - limit 생략 시 기본 20개
// 응답:  { items: Item[], nextCursor: number | null }

import type { NextRequest } from "next/server";

// 응답 형태는 API 계약(타입: src/types/items.ts, 상수: src/constants/items.ts)에 정의되어 있다.
// 서버는 계약을 "구현"하고, 클라이언트는 계약을 "소비"한다 — 정의는 한 곳뿐.
import { DEFAULT_LIMIT, MAX_LIMIT } from "@/constants/items";
import type { GetItemsError, GetItemsSuccess, Item } from "@/types/items";

export const dynamic = "force-dynamic";

// 실제 네트워크처럼 느껴지도록 인위적인 지연을 준다. 로딩 UI 확인용.
const ARTIFICIAL_DELAY_MS = 800;

// 0 보다 크게 올리면 그 확률로 500 에러를 반환한다. 에러 처리/재시도 실습할 때 0.3 정도로 바꿔볼 것.
const FAILURE_RATE = 0.3;

// 전체 데이터 개수. limit 20 기준 마지막 페이지가 딱 떨어지지 않도록 일부러 어중간한 수로 둔다.
const TOTAL_ITEMS = 137;

// DB 대신 쓰는 결정적(deterministic) 데이터. 서버가 재시작돼도 항상 같은 내용이 나온다.
const ALL_ITEMS: Item[] = Array.from({ length: TOTAL_ITEMS }, (_, i) => {
  const id = i + 1;
  return {
    id,
    title: `아이템 #${id}`,
    body: `${id}번째 아이템의 본문입니다. cursor 기반 페이지네이션으로 20개씩 내려옵니다.`,
  };
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function GET(request: NextRequest) {
  await sleep(ARTIFICIAL_DELAY_MS);

  if (Math.random() < FAILURE_RATE) {
    // satisfies: 값의 추론 타입은 그대로 두면서 "계약에 맞는지"만 검사한다.
    // Response.json 은 아무 값이나 받기 때문에, 이 검사가 없으면
    // 계약과 어긋난 응답을 보내도 컴파일러가 잡아주지 못한다.
    return Response.json({ error: "일부러 발생시킨 서버 에러" } satisfies GetItemsError, {
      status: 500,
    });
  }

  const searchParams = request.nextUrl.searchParams;

  const rawCursor = searchParams.get("cursor");
  const cursor = rawCursor === null ? 0 : Number(rawCursor);
  if (Number.isNaN(cursor) || cursor < 0) {
    return Response.json({ error: "cursor 는 0 이상의 숫자여야 합니다" } satisfies GetItemsError, {
      status: 400,
    });
  }

  const rawLimit = searchParams.get("limit");
  const limit = rawLimit === null ? DEFAULT_LIMIT : Number(rawLimit);
  if (Number.isNaN(limit) || limit < 1 || limit > MAX_LIMIT) {
    return Response.json(
      {
        error: `limit 는 1~${MAX_LIMIT} 사이의 숫자여야 합니다`,
      } satisfies GetItemsError,
      { status: 400 },
    );
  }

  // cursor(마지막으로 받은 id) 다음 항목부터 limit 개를 자른다.
  const startIndex = ALL_ITEMS.findIndex((item) => item.id > cursor);
  const items = startIndex === -1 ? [] : ALL_ITEMS.slice(startIndex, startIndex + limit);

  // 마지막까지 다 줬으면 nextCursor 는 null — 클라이언트는 이걸로 hasMore 를 판단한다.
  const lastItem = items[items.length - 1];
  const nextCursor = lastItem && lastItem.id < TOTAL_ITEMS ? lastItem.id : null;

  return Response.json({ items, nextCursor } satisfies GetItemsSuccess);
}
