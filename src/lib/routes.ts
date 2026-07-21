// 홈에 나열할 실습 페이지 목록을 파일 시스템에서 직접 읽어온다.
// src/app 아래 아무 폴더에 page.tsx 를 만들면 홈 목록에 자동으로 나타난다.
//
// 주의: Node.js API(fs)를 쓰므로 서버 컴포넌트에서만 import 할 수 있다.
// 이 모듈을 쓰는 page.tsx 가 cookies()/headers() 같은 dynamic API 를 쓰지 않는 한
// 스캔은 빌드 타임에 딱 한 번 실행되고 결과가 정적 HTML 에 박힌다.
// (= 런타임마다 디스크를 읽지 않는다. Vercel 같은 서버리스 배포에서는 소스 파일이
//  번들에 없을 수 있어 런타임 스캔이 실패하는데, 빌드 타임 실행이라 문제되지 않는다.)

import { readdir } from "node:fs/promises";
import path from "node:path";

// 템플릿 리터럴 타입. "/" 로 시작하는 문자열만 허용한다.
// 그냥 string 으로 두면 "sse" 처럼 슬래시를 빠뜨린 값이 그대로 통과해버린다.
type RoutePath = `/${string}`;

type RouteMeta = { label?: string; description?: string };

export type PracticeRoute = {
  href: RoutePath;
  label: string;
  description?: string;
};

const APP_DIR = path.join(process.cwd(), "src", "app");
const PAGE_FILE_PATTERN = /^page\.(tsx|ts|jsx|js)$/;

// 페이지가 아니거나 링크를 만들 수 없는 폴더.
// - api      : Route Handler 전용
// - _private : 라우팅되지 않는 폴더 (private folder)
// - @slot    : 병렬 라우트 슬롯, 독립적인 URL 이 아니다
// - [slug]   : 동적 세그먼트, 파라미터 없이는 href 를 만들 수 없다
const IGNORED_DIRECTORIES = ["api"] as const;
const IGNORED_PREFIXES = ["_", "@", "["] as const;

// 여기는 satisfies 가 아니라 타입 어노테이션을 쓴다.
// satisfies 를 쓰면 키가 "/sse" | "/infinite-scroll" | "/ssg" 리터럴로 좁게 추론되는데,
// 우리는 런타임에 스캔한 임의의 경로로 조회해야 해서 오히려 인덱싱이 막힌다.
// 어노테이션을 달면 패턴 인덱스 시그니처(= { [x: `/${string}`]: RouteMeta | undefined })가 되고,
// Partial 덕분에 값이 `| undefined` 로 잡혀 등록 안 된 경로에 옵셔널 체이닝이 강제된다.
const ROUTE_META: Partial<Record<RoutePath, RouteMeta>> = {
  "/sse": {
    label: "SSE",
    description: "EventSource 로 서버가 푸시하는 이벤트 스트림 받기",
  },
  "/infinite-scroll": {
    label: "무한 스크롤",
    description: "IntersectionObserver + cursor 기반 페이지네이션",
  },
  "/ssg": {
    label: "SSG",
    description: "빌드 타임 정적 생성 동작 확인",
  },
};

function isRouteGroup(name: string): boolean {
  return name.startsWith("(") && name.endsWith(")");
}

function isIgnoredDirectory(name: string): boolean {
  if (IGNORED_DIRECTORIES.some((ignored) => ignored === name)) return true;
  return IGNORED_PREFIXES.some((prefix) => name.startsWith(prefix));
}

// "infinite-scroll" → "Infinite Scroll". ROUTE_META 에 없는 새 페이지의 기본 라벨.
function toDefaultLabel(segment: string): string {
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function toPracticeRoute(segments: string[]): PracticeRoute {
  const href: RoutePath = `/${segments.join("/")}`;
  const meta: RouteMeta | undefined = ROUTE_META[href];
  const lastSegment = segments[segments.length - 1];

  return {
    href,
    label: meta?.label ?? toDefaultLabel(lastSegment),
    description: meta?.description,
  };
}

async function collectRoutes(directory: string, segments: string[]): Promise<PracticeRoute[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const routes: PracticeRoute[] = [];

  // segments 가 비어 있으면 src/app 자기 자신(= 홈)이므로 목록에 넣지 않는다.
  const hasPage = entries.some((entry) => entry.isFile() && PAGE_FILE_PATTERN.test(entry.name));
  if (hasPage && segments.length > 0) {
    routes.push(toPracticeRoute(segments));
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || isIgnoredDirectory(entry.name)) continue;

    // 라우트 그룹 "(marketing)" 은 URL 에 나타나지 않으므로 세그먼트를 늘리지 않고 안으로만 들어간다.
    const nextSegments = isRouteGroup(entry.name) ? segments : [...segments, entry.name];
    routes.push(...(await collectRoutes(path.join(directory, entry.name), nextSegments)));
  }

  return routes;
}

export async function getPracticeRoutes(): Promise<PracticeRoute[]> {
  const routes = await collectRoutes(APP_DIR, []);
  return routes.sort((a, b) => a.href.localeCompare(b.href));
}
