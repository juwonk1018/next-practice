import Link from "next/link";
import { getPracticeRoutes } from "@/lib/routes";

// 서버 컴포넌트라서 async 로 선언하고 fs 스캔 결과를 그대로 await 할 수 있다.
// dynamic API 를 쓰지 않으므로 이 페이지는 빌드 타임에 프리렌더된다.
export default async function Home() {
  const routes = await getPracticeRoutes();

  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Next.js 실습</h1>
      <p className="mt-2 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
        아래 목록은 <code className="font-mono">src/app</code> 을 훑어서 만든다. 새 폴더에{" "}
        <code className="font-mono">page.tsx</code> 를 추가하면 여기에 자동으로 나타난다. 이름과
        설명을 다듬고 싶으면 <code className="font-mono">src/lib/routes.ts</code> 의{" "}
        <code className="font-mono">ROUTE_META</code> 에 등록하면 된다.
      </p>

      {routes.length === 0 ? (
        <p className="mt-8 text-sm text-neutral-400 dark:text-neutral-500">
          아직 실습 페이지가 없다. src/app 아래에 폴더를 만들고 page.tsx 를 추가해보자.
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {routes.map((route) => (
            <li key={route.href}>
              <Link
                href={route.href}
                className="block rounded-xl border border-black/10 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-white/15 dark:bg-white/5"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">{route.label}</span>
                  <code className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
                    {route.href}
                  </code>
                </div>
                {route.description && (
                  <p className="mt-1.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                    {route.description}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
