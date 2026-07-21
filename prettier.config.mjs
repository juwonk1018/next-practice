// Prettier 설정.
// .prettierrc(JSON) 대신 .mjs 를 쓰면 주석을 달 수 있고, 아래 JSDoc 타입으로
// 에디터에서 옵션 자동완성 + 오타 검증까지 받을 수 있다.

/** @type {import("prettier").Config} */
const config = {
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  printWidth: 100,
  tabWidth: 2,
  arrowParens: "always",

  // className 안의 Tailwind 클래스를 공식 권장 순서로 자동 정렬한다.
  plugins: ["prettier-plugin-tailwindcss"],

  // Tailwind v4 는 CSS 파일(@import "tailwindcss")이 설정의 원천이다.
  // 플러그인이 이 프로젝트의 테마를 읽어야 정렬 순서를 정확히 계산할 수 있으므로
  // 진입 CSS 경로를 알려준다. (v3 의 tailwindConfig 옵션을 대체)
  tailwindStylesheet: "./src/app/globals.css",
};

export default config;
