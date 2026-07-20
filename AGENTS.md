<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 학습 목표: 고급 TypeScript

이 프로젝트는 학습용 연습장이다. 코드를 작성하거나 실습 틀을 만들 때 고급 TypeScript를 연습할 기회를 함께 제공하라.

- 실습 틀을 만들 때는 해당 기능과 자연스럽게 맞는 고급 타입 기법을 1~2개 골라 **"타입 연습 포인트"** TODO로 남겨라.
  예: discriminated union으로 로딩/에러/성공 상태 모델링, API 응답 타입을 제네릭으로 일반화, `satisfies`로 설정 객체 검증.
- 완성 코드를 제공할 때도 `any`나 느슨한 타입으로 얼버무리지 말고 실무 수준의 타입을 써라.
  (제네릭 + 제약조건, 조건부 타입, mapped types, 템플릿 리터럴 타입, `infer`, 타입 가드/narrowing, `as const`, `satisfies` 등)
- 처음 등장하는 타입 기법에는 SSE 예제처럼 한국어 주석으로 개념을 짧게 설명하라.
- 단, 기능과 무관한 과시용 타입 체조는 금지 — 실제 코드가 좋아지는 지점에서만 사용할 것.
