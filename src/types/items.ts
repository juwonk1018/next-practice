// /api/items 의 API 계약(contract) 타입 — 서버(route.ts)와 클라이언트가 함께 import 하는 단일 정의.
// 관련 상수(DEFAULT_LIMIT 등)는 src/constants/items.ts 에 있다.
//
// 이 파일에는 타입만 둔다. 전부 컴파일 시 지워지므로(erasable)
// 어느 쪽에서 import 해도 번들에 아무것도 추가되지 않는다.

export interface Item {
  id: number;
  title: string;
  body: string;
}

// 성공 응답 (HTTP 200)
export interface GetItemsSuccess {
  items: Item[];
  // 다음 요청의 cursor 로 그대로 사용한다. null 이면 더 가져올 데이터가 없다.
  nextCursor: number | null;
}

// 실패 응답 (HTTP 4xx/5xx)
export interface GetItemsError {
  error: string;
}

// 타입 연습 포인트: 이 union 은 공통 판별 필드(discriminant)가 없어도
// `if ("error" in res)` 처럼 in 연산자 체크만으로 narrowing 된다.
// 클라이언트에서 response.ok 분기 대신 이 방식으로 좁혀보는 것도 연습해볼 것.
export type GetItemsResponse = GetItemsSuccess | GetItemsError;
