// SSE(Server-Sent Events) 엔드포인트 — 서버가 클라이언트로 단방향 실시간 푸시를 보낸다.
//
// 핵심 개념
// - HTTP 연결 하나를 끊지 않고 열어둔 채(long-lived), 서버가 원할 때마다 데이터를 흘려보낸다.
// - 응답 Content-Type 은 반드시 `text/event-stream`.
// - 메시지 포맷은 텍스트 기반이며 `field: value\n` 으로 쓰고, 빈 줄(\n\n)로 한 메시지를 끝낸다.
// - 클라이언트는 브라우저 내장 `EventSource` 로 받으면 자동 재연결까지 지원된다.

// 캐시/프리렌더링을 끄고 매 요청마다 실행되도록 강제한다 (스트리밍 응답에 필요).
export const dynamic = "force-dynamic";

const TICK_INTERVAL_MS = 1000;
// 클라이언트 자동 재연결 간격 힌트(ms). EventSource 가 끊겼을 때 이 값을 참고한다.
const RECONNECT_DELAY_MS = 3000;

const encoder = new TextEncoder();

interface SseMessage {
  data: string;
  event?: string;
  id?: string;
  retry?: number;
}

// 하나의 SSE 메시지를 와이어 포맷(바이트)으로 변환한다.
function encodeSseMessage({ data, event, id, retry }: SseMessage): Uint8Array {
  let chunk = "";
  if (event) chunk += `event: ${event}\n`;
  if (id) chunk += `id: ${id}\n`;
  if (retry) chunk += `retry: ${retry}\n`;
  chunk += `data: ${data}\n\n`; // 빈 줄로 메시지 종료
  return encoder.encode(chunk);
}

export async function GET(request: Request) {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let count = 0;

      const sendTick = () => {
        count += 1;
        const payload = JSON.stringify({
          count,
          time: new Date().toISOString(),
        });
        controller.enqueue(
          encodeSseMessage({
            event: "tick", // 클라이언트에서 addEventListener("tick", ...) 로 받는다
            id: String(count), // 마지막 수신 id 는 재연결 시 Last-Event-ID 헤더로 다시 전달된다
            data: payload,
          })
        );
      };

      // 연결 직후 재연결 간격 힌트를 한 번 보내고, 곧바로 첫 tick 을 전송한다.
      controller.enqueue(encodeSseMessage({ retry: RECONNECT_DELAY_MS, data: "connected" }));
      sendTick();

      const timer = setInterval(sendTick, TICK_INTERVAL_MS);

      // 클라이언트가 연결을 끊으면(탭 닫기, EventSource.close 등) 정리한다.
      request.signal.addEventListener("abort", () => {
        clearInterval(timer);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
